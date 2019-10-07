import * as https from "https";
import * as fs from "fs";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as helmet from "helmet";
import * as bluebird from "bluebird";
import { default as Config, internal } from "./config";
import Database from "./adapters/database";
import MessageBroker from "./adapters/messaging";
import JWTSessionTracker from "./adapters/jwt-session-tracker";
import { Server } from "net";
import { ErrorMapper } from "./middlewares/controller";
import { SupportedLanguage, extractLanguages } from "./language-extractor";
import Logger from "./logger";
import BaseRouter from "./base-router";
import { default as ErrorMap, ErrorConfigurationMapSchema } from "./error-map";
import SuperError from "./super-error";
import EventHandler from "./event-handler";
import { I18NManager, i18n, StringLocalizationSchema } from "./i18n";
import { Router } from "./router";

let packageJSON: any = {};

try {
    packageJSON = JSON.parse(fs.readFileSync("./package.json").toString());
} catch (error) {
    console.error("Cannot read 'package.json' file");
    process.exit(1);
}

export interface ApplicationOptions {
    service?: {
        name: string;
        domain: string;
        code: string;
        version: string;
    };
    module?: NodeModule;
}

export class Application {
    protected i18nManager: I18NManager = new I18NManager();
    protected i18nManagerPromise?: (application: this) => Promise<I18NManager>;
    protected errorMap: ErrorMap = new ErrorMap();
    protected errorMapPromise?: (application: this) => Promise<ErrorMap>;
    protected overrideConfig: object = {};
    protected configPromise?: (application: this) => Promise<object>;
    protected setupCallback?: (application: this) => void;
    protected promises: (() => PromiseLike<any>)[] = [];
    protected startupPromises: (() => PromiseLike<any>)[] = [];
    protected routers: Router<Application>[] = [];
    protected server?: Server;
    protected secureServer?: Server;

    private hasParentModule: boolean = !!module.parent;

    service: {
        name: string;
        domain: string;
        code: string;
        version: string;
    } = {
        name: packageJSON["name"],
        domain: packageJSON["domain"],
        code: packageJSON["code"],
        version: packageJSON["version"]
    };
    config: Config;
    app: express.Application;

    constructor(
        options: ApplicationOptions
    ) {
        Logger.info("Creating application...");
        this.service = Object.assign(this.service, options.service || {});
        console.log(this.service);
        if (
            !this.service.name ||
            !this.service.domain ||
            !this.service.code ||
            !this.service.version
        ) {
            console.error(
                "'package.json' does not contains " +
                "'name', 'domain', 'code' and/or 'version'"
            );
            process.exit(1);
        }
        this.config = new Config({
            serviceName: this.service.name,
            getConfig: this.getConfig.bind(this)
        });
        if (options.module) {
            this.hasParentModule = !!options.module.parent;
        }
        this.app = express();
    }

    private getObjectValue<T>(
        object: any,
        key: string,
        defaultValue: T
    ): Readonly<T> {
        if (!object) {
            return defaultValue;
        }
        let keyComponents = key.split(".");
        let firstKey = keyComponents.shift() || "";
        let keyRest = keyComponents.join(".");
        if (firstKey in object) {
            if (keyComponents.length > 0) {
                return this.getObjectValue(
                    object[firstKey], keyRest, defaultValue
                );
            } else {
                return object[firstKey];
            }
        }
        return defaultValue;
    }

    getConfig<T>(key: string, defaultValue: T): Readonly<T> {
        return this.getObjectValue(this.overrideConfig, key, defaultValue);
    }

    get errorMapper(): ErrorMapper {
        return {
            getResponseForError: (error, language) => this.errorMap.map(
                error, language
            )
        };
    }

    get i18n(): (languages: SupportedLanguage[]) => i18n {
        return this.i18nManager.i18n.bind(this.i18nManager);
    }

    routes(...routers: Router<Application>[]) {
        this.routers = routers;
        return this;
    }

    alsoRoutes(...routers: Router<Application>[]) {
        this.routers = this.routers.concat(routers);
        return this;
    }

    waitFor(...promises: (() => PromiseLike<any>)[]) {
        this.promises = promises;
        return this;
    }

    alsoWaitFor(...promises: (() => PromiseLike<any>)[]) {
        this.promises = this.promises.concat(promises);
        return this;
    }

    startupWaitFor(...promises: (() => PromiseLike<any>)[]) {
        this.startupPromises = promises;
        return this;
    }

    alsoStartupWaitFor(...promises: (() => PromiseLike<any>)[]) {
        this.startupPromises = this.promises.concat(promises);
        return this;
    }

    setup(callback: (application: this) => void) {
        this.setupCallback = callback;
        return this;
    }

    setupI18NManager(promise: (application: this) => Promise<I18NManager>) {
        this.i18nManagerPromise = promise;
        return this;
    }

    setupErrorMap(promise: (application: this) => Promise<ErrorMap>) {
        this.errorMapPromise = promise;
        return this;
    }

    setupConfigurations(promise: (application: this) => Promise<object>) {
        this.configPromise = promise;
        return this;
    }

    stop() {
        Logger.info("Shutting down server...");
        if (this.server) {
            this.server.close();
        }
        if (this.secureServer) {
            this.secureServer.close();
        }

        return this;
    }

    reloadConfigurations() {
        if (this.configPromise) {
            this.configPromise(this).then((configuration) => {
                this.overrideConfig = configuration;
            }).catch((error) => {
                // Omit intended
            });
        }
        if (this.i18nManagerPromise) {
            this.i18nManagerPromise(this).then((i18nManager) => {
                this.i18nManager = i18nManager;
            }).catch((error) => {
                // Omit intended
            });
        }
        if (this.errorMapPromise) {
            this.errorMapPromise(this).then((errorMap) => {
                this.errorMap = errorMap;
            }).catch((error) => {
                // Omit intended
            });
        }
    }

    private showAllWarnings() {
        if (internal.has("request-blocking")) {
            Logger.warn("REQUEST RESTRICTION / BLOCKING IS ENABLED");
        }
        if (internal.has("debug")) {
            Logger.warn("DEBUGGING CONFIGURATIONS ARE ENABLED");
        }
    }

    private asyncStart() {
        Logger.info("Preparing server...");
        if (this.setupCallback) {
            this.setupCallback(this);
        }

        process.on("SIGINT", this.stop.bind(this));
        process.on("unhandledRejection", (reason, promise) => {
            Logger.info(`Unhandled Promise Rejection: ${
                reason instanceof Error ?
                (
                    reason.stack ||
                    `${ reason.name } - ${ reason.message }`
                ) : reason
            }`);
        });
        process.on("uncaughtException", (error) => {
            Logger.info(`Unhandled Error Exception: ${
                error.stack || `${ error.name } - ${ error.message }`
            }`);
        });

        this.startupPromises.push(() => new Promise<void>((resolve, reject) => {
            Logger.info("Loading configurations and error mappings...");
            return bluebird.all<
                bluebird.Inspection<object>,
                bluebird.Inspection<I18NManager>,
                bluebird.Inspection<ErrorMap>
            >([
                bluebird.resolve(
                    this.configPromise ?
                    this.configPromise(this) :
                    Promise.reject(new Error())
                ).reflect(), bluebird.resolve(
                    this.i18nManagerPromise ?
                    this.i18nManagerPromise(this) :
                    Promise.reject(new Error())
                ).reflect(), bluebird.resolve(
                    this.errorMapPromise ?
                    this.errorMapPromise(this) :
                    Promise.reject(new Error())
                ).reflect()
            ]).then((values) => {
                let [configuration, i18nManager, errorMap] = values;
                if (configuration.isFulfilled()) {
                    this.overrideConfig = configuration.value();
                    Logger.info(`Configurations loaded (${
                        Object.keys(this.overrideConfig).length
                    } keys)`);
                } else if (configuration.isRejected()) {
                    Logger.info(`Error while loading configurations: ${
                        configuration.reason()
                    }`);
                }
                if (i18nManager.isFulfilled()) {
                    this.i18nManager = i18nManager.value();
                    Logger.info(`String localizations loaded (${
                        this.i18nManager.length
                    } keys)`);
                } else if (i18nManager.isRejected()) {
                    Logger.info(`Error while loading string localizations: ${
                        i18nManager.reason()
                    }`);
                }
                if (errorMap.isFulfilled()) {
                    this.errorMap = errorMap.value();
                    Logger.info(`Error mappings loaded (${
                        this.errorMap.length
                    } keys)`);
                } else if (errorMap.isRejected()) {
                    Logger.info(`Error while loading error mappings: ${
                        errorMap.reason()
                    }`);
                }
                return resolve();
            }).catch(
                // Resolve intended
                (error) => resolve()
            );
        }));

        Logger.info("Loading connections and preprocessing...");
        return Promise.all(
            this.promises.map((callback) => callback())
        ).then(() => Promise.all(this.startupPromises.map(
            (callback) => callback()
        ))).then(() => {
            Logger.info(`Starting ${
                packageJSON["name"] || "unknown-service"
            } ${
                `v${packageJSON["version"]}` || "unknown-version"
            } ...`);
            EventHandler.registerHandler("config", () => {
                this.reloadConfigurations();
            });
            this.app.use(bodyParser.json());
            this.app.use(bodyParser.raw({
                type: "application/gzip",
                limit: "1mb"
            }), (
                error: any,
                request: express.Request,
                response: express.Response,
                next: express.NextFunction
            ) => {
                let acceptLanguages = extractLanguages(
                    request.header("accept-language")
                );
                if (error && error.message === "incorrect header check") {
                    Logger.info(
                        "BodyParser: 400 rejection due to invalid gzip encoding"
                    );

                    let responseObject = this.errorMapper.getResponseForError(
                        new SuperError("E000004", error), acceptLanguages
                    );

                    if (responseObject) {
                        response.status(responseObject.status || 400).send({
                            error: responseObject.error
                        });
                    } else {
                        response.status(400).send({
                            error: {
                                code: `E${
                                    this.service.domain
                                }000004`,
                                message: (
                                    "Payload is not a valid \"gzip\" encoding"
                                )
                            }
                        });
                    }

                    return;
                } else if (error && error.name === "PayloadTooLargeError") {
                    Logger.info(
                        "BodyParser: 400 rejection due to payload is too large"
                    );

                    let responseObject = this.errorMapper.getResponseForError(
                        new SuperError("E000005", error), acceptLanguages
                    );

                    if (responseObject) {
                        response.status(responseObject.status || 400).send({
                            error: responseObject.error
                        });
                    } else {
                        response.status(400).send({
                            error: {
                                code: `E${
                                    this.service.domain
                                }000005`,
                                message: "Payload is too large"
                            }
                        });
                    }

                    return;
                }

                next();
            });

            let errorHandler = (
                error: any,
                request: express.Request,
                response: express.Response,
                next?: express.NextFunction
            ) => {
                Logger.error(error.message ? error.message : error);

                let acceptLanguages = extractLanguages(
                    request.header("accept-language")
                );
                let responseObject = this.errorMapper.getResponseForError(
                    new SuperError("E000000", error), acceptLanguages
                );

                let details = (
                    process.env["NODE_ENV"] !== "production" && error.message ?
                    [{ code: error.message, message: error.stack }] :
                    undefined
                );

                if (responseObject) {
                    response.status(responseObject.status || 500).send({
                        error: responseObject.error,
                        details: details
                    });
                } else {
                    response.status(500).send({
                        error: {
                            code: `E${
                                this.service.domain
                            }000000`,
                            message: (
                                "Internal server error. " +
                                "Please try again later."
                            )
                        },
                        details: details
                    });
                }
                if (next) {
                    next();
                }
            };

            this.app.use((
                error: any,
                request: express.Request,
                response: express.Response,
                next: express.NextFunction
            ) => {
                if (error instanceof SyntaxError) {
                    let acceptLanguages = extractLanguages(
                        request.header("accept-language")
                    );
                    let responseObject = this.errorMapper.getResponseForError(
                        new SuperError("E000003", error), acceptLanguages
                    );

                    if (responseObject) {
                        response.status(responseObject.status || 400).send({
                            error: responseObject.error
                        });
                    } else {
                        response.status(400).send({
                            error: {
                                code: `E${
                                    this.service.domain
                                }000003`,
                                message: "JSON malformed"
                            }
                        });
                    }

                    return;
                } else if (error) {
                    return errorHandler(error, request, response);
                }
                next();
            });
            this.app.use(helmet());
            this.app.use(BaseRouter.router);
            for (let router of this.routers) {
                this.app.use(router.router);
            }
            this.app.use((
                request, response, next
            ) => {
                response.status(404).send();
            });
            this.app.use(errorHandler);

            this.showAllWarnings();

            if (!this.hasParentModule) {
                let serverPort = this.config.get<number | undefined>(
                    "service-port", undefined
                );
                let secureServerPort = this.config.get<number | undefined>(
                    "secure-service-port", undefined
                );

                if (!serverPort && !secureServerPort) {
                    Logger.warn(
                        "Server port not found. " +
                        "Please check the configuration file."
                    );
                    return;
                }

                if (serverPort) {
                    this.server = this.app.listen(serverPort, () => {
                        Logger.info(`Server started on port ${ serverPort }`);
                    });
                }

                let certificateFile = this.config.get<string | undefined>(
                    "certificate.certificate-file", undefined
                );
                let primaryKeyFile = this.config.get<string | undefined>(
                    "certificate.primary-key-file", undefined
                );
                let pfxCertificateFile = this.config.get<string | undefined>(
                    "certificate.pfx-certificate-file", undefined
                );
                let passphrase = this.config.get<string | undefined>(
                    "certificate.passphrase", undefined
                );
                let cas = this.config.get<string[] | undefined>(
                    "certificate.certificate-authorities", undefined
                );

                let sslOptions: https.ServerOptions = {
                    cert: (
                        certificateFile ?
                        fs.readFileSync(certificateFile) :
                        undefined
                    ),
                    key: (
                        primaryKeyFile ?
                        fs.readFileSync(primaryKeyFile) :
                        undefined
                    ),
                    pfx: (
                        pfxCertificateFile ?
                        fs.readFileSync(pfxCertificateFile) :
                        undefined
                    ),
                    passphrase: passphrase,
                    ca: (
                        cas ?
                        cas.map((ca) => fs.readFileSync(ca)) :
                        undefined
                    )
                };

                if (secureServerPort) {
                    let certificateWarning = (
                        !certificateFile && !primaryKeyFile &&
                        !pfxCertificateFile && !cas
                    );

                    this.secureServer = https.createServer(
                        sslOptions, this.app
                    ).listen(secureServerPort, () => {
                        Logger.info(`Secure server started on port ${
                            secureServerPort
                        }${
                            certificateWarning ? " WITHOUT CERTIFICATES" : ""
                        }`);
                    });
                }
            }
        }).catch((error) => {
            Logger.error(`ApplicationError: ${error}`);
            if (!this.hasParentModule) {
                process.exit(1);
            }
        });
    }

    get async() {
        return {
            start: () => this.asyncStart()
        };
    }

    get test() {
        return this.async;
    }

    start() {
        this.async.start();
        return this;
    }
}

export interface BasicApplicationOptions<
    DB extends Database,
    Broker extends MessageBroker,
    // SessionTracker extends JWTSessionTracker
> extends ApplicationOptions {
    database: DB;
    broker: Broker;
    // sessionTracker: SessionTracker;
}

export class BasicApplication<
    DB extends Database = Database,
    Broker extends MessageBroker = MessageBroker,
    // SessionTracker extends JWTSessionTracker = JWTSessionTracker
> extends Application {
    database: DB;
    broker: Broker;
    // sessionTracker: SessionTracker;

    constructor(
        // options: BasicApplicationOptions<DB, Broker, SessionTracker>,
        options: BasicApplicationOptions<DB, Broker>,
        override?: {
            [env: string]: (
                // Partial<BasicApplicationOptions<DB, Broker, SessionTracker>>
                Partial<BasicApplicationOptions<DB, Broker>>
            );
        }
    ) {
        super(options);

        this.database = options.database;
        this.broker = options.broker;
        // this.sessionTracker = options.sessionTracker;
        let environment = process.env["NODE_ENV"] || "";
        if (override && override[environment]) {
            Logger.info(`Running on ${ environment } environment...`);
            let overrideOptions = override[environment];
            if (overrideOptions.broker) {
                this.broker = overrideOptions.broker;
            }
            if (overrideOptions.database) {
                this.database = overrideOptions.database;
            }
            // if (overrideOptions.sessionTracker) {
            //     this.sessionTracker = overrideOptions.sessionTracker;
            // }
        }

        this.promises = [
            () => this.database.useHandler({
                onConnect: () => {
                    Logger.info("Connecting to database...");
                },
                onConnected: () => {
                    Logger.info("Database connected");
                },
                onError: (error) => {
                    Logger.error(`Database Error: ${ JSON.stringify({
                        code: `${ error.name }: ${ error.message }`,
                        message: error.stack,
                        details: (
                            error instanceof SuperError
                        ) ? error.superErrors.map((superError) => ({
                            code: superError.message,
                            message: superError.stack
                        })) : []
                    }, undefined, 2) }`);
                },
                onDisconnect: () => {
                    Logger.info("Disconnecting database...");
                },
                onDisconnected: () => {
                    Logger.info("Database disconnected");
                }
            }).connect(
                this.config.get<string>(
                    "mongodb.connection-url",
                    `mongodb://127.0.0.1/${ this.service.name }`
                )
            ),
            () => this.broker.useHandler({
                onConnect: () => {
                    Logger.info("Connecting to message broker...");
                },
                onConnected: () => {
                    Logger.info("Message broker connected");
                },
                onError: (error) => {
                    Logger.error(`Message broker Error: ${ JSON.stringify({
                        code: `${ error.name }: ${ error.message }`,
                        message: error.stack,
                        details: (
                            error instanceof SuperError
                        ) ? error.superErrors.map((superError) => ({
                            code: superError.message,
                            message: superError.stack
                        })) : []
                    }, undefined, 2) }`);
                },
                onDisconnect: () => {
                    Logger.info("Disconnecting message broker...");
                },
                onDisconnected: () => {
                    Logger.info("Message broker disconnected");
                }
            }).connect(
                this.config.get<string>(
                    "rabbitmq.connection-url",
                    "amqp://127.0.0.1"
                )
            // ),
            // () => this.sessionTracker.useHandler({
            //     onConnect: () => {
            //         Logger.info("Connecting to session tracker...");
            //     },
            //     onConnected: () => {
            //         Logger.info("Session tracker connected");
            //     },
            //     onError: (error) => {
            //         Logger.error(`Session Tracker Error: ${ JSON.stringify({
            //             code: `${ error.name }: ${ error.message }`,
            //             message: error.stack,
            //             details: (
            //                 error instanceof SuperError
            //             ) ? error.superErrors.map((superError) => ({
            //                 code: superError.message,
            //                 message: superError.stack
            //             })) : []
            //         }, undefined, 2) }`);
            //     },
            //     onDisconnect: () => {
            //         Logger.info("Disconnecting session tracker...");
            //     },
            //     onDisconnected: () => {
            //         Logger.info("Session tracker disconnected");
            //     }
            // }).connect(
            //     this.config.get<string>(
            //         "session-tracker.connection-url",
            //         `mongodb://127.0.0.1/session-tracker`
            //     )
            )
        ];

        this.configPromise = (
            (application) => application.database.getConfigurations()
        );

        this.i18nManagerPromise = (
            (application) => application.database.getStringLocalization().then(
                (stringLocalization) => {
                    let configLocalization = this.config.get<
                        StringLocalizationSchema
                    >(
                        "string-localization",
                        {}
                    );
                    return new I18NManager({
                        ...configLocalization, ...stringLocalization
                    });
                }
            )
        );

        this.errorMapPromise = (
            (application) => application.database.getErrorMap().then(
                (errorMap) => {
                    let configErrorMap = this.config.get<
                        ErrorConfigurationMapSchema
                    >(
                        "error-map",
                        {}
                    );
                    return new ErrorMap({ ...configErrorMap, ...errorMap });
                }
            )
        );
    }

    stop() {
        super.stop();
        this.database.disconnect();
        this.broker.disconnect();
        // this.sessionTracker.disconnect();

        return this;
    }
}
