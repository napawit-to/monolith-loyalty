import * as bluebird from "bluebird";
import * as mongoose from "mongoose";
import * as fs from "fs";
import * as moment from "moment";
import SuperError from "../../super-error";
import { ErrorConfigurationMapSchema } from "../../error-map";
import { StringLocalizationSchema } from "../../i18n";
import {
    ErrorConfiguration,
    MongoErrorConfiguration,
    ErrorConfigurationSchema
} from "../../models/implementations/mongodb-error-configuration";
import {
    ContentConfiguration,
    MongoContentConfiguration,
    ContentConfigurationSchema
} from "../../models/implementations/mongodb-content-configuration";
import {
    ApplicationConfiguration,
    MongoApplicationConfiguration,
    ApplicationConfigurationSchema
} from "../../models/implementations/mongodb-application-configuration";
import {
    TransactionSession,
    MongoTransactionSession,
    TransactionSessionSchema
} from "../../models/implementations/mongodb-transaction-session";
import {
    TransactionFruad,
    MongoTransactionFruad,
    TransactionFruadSchema
} from "../../models/implementations/mongodb-transaction-fruad";
import {
    AuthenticationStatus, AuthenticationType
} from "../../models/authentication-attempt";
import {
    AuthenticationAttempt,
    MongoAuthenticationAttempt,
    AuthenticationAttemptSchema
} from "../../models/implementations/mongodb-authentication-attempt";
import {
    AuthenticationBlacklist,
    MongoAuthenticationBlacklist,
    AuthenticationBlacklistSchema
} from "../../models/implementations/mongodb-authentication-blacklist";
import CircuitBreaker from "../../circuit-breaker";
import { Database, DatabaseEventHandler } from "../database";

interface MongoDBOptions {
    reconnectionTime?: number;
    certificateFile?: string;
    primaryKeyFile?: string;
    passphrase?: string;
    cas?: Readonly<string[]>;
    /** TCP Connection keep alive enabled (default: true) */
    keepAlive?: boolean;
    // tslint:disable-next-line:max-line-length
    /** The number of milliseconds to wait before initiating keepAlive on the TCP socket (default 30000) */
    keepAliveInitialDelay?: number;
}

export default class MongoDBDatabase implements Database {
    name: string = "db";
    protected connection!: mongoose.Connection;
    protected error?: SuperError = new SuperError("E000101");
    protected options: MongoDBOptions = {};
    protected eventHandler?: DatabaseEventHandler;

    protected applicationConfigurationModel!: mongoose.Model<
        MongoApplicationConfiguration
    >;

    protected contentConfigurationModel!: mongoose.Model<
        MongoContentConfiguration
    >;

    protected errorConfigurationModel!: mongoose.Model<
        MongoErrorConfiguration
    >;

    protected transactionSessionModel!: mongoose.Model<MongoTransactionSession>;
    protected transactionFruadModel!: mongoose.Model<MongoTransactionFruad>;

    protected authenticationAttemptModel!: mongoose.Model<
        MongoAuthenticationAttempt
    >;
    protected authenticationBlacklistModel!: mongoose.Model<
        MongoAuthenticationBlacklist
    >;

    constructor(options?: MongoDBOptions) {
        (mongoose as any).Promise = bluebird;
        if (options) {
            this.options = options;
        }
    }

    protected createModels() {
        this.applicationConfigurationModel = this.connection.model<
            MongoApplicationConfiguration
        >(
            "ApplicationConfiguration", ApplicationConfigurationSchema
        );

        this.contentConfigurationModel = this.connection.model<
            MongoContentConfiguration
        >(
            "ContentConfiguration",
            ContentConfigurationSchema
        );

        this.errorConfigurationModel = this.connection.model<
            MongoErrorConfiguration
        >(
            "ErrorConfiguration", ErrorConfigurationSchema
        );

        this.transactionSessionModel = this.connection.model<
            MongoTransactionSession
        >(
            "TransactionSession", TransactionSessionSchema
        );
        this.transactionFruadModel = this.connection.model<
            MongoTransactionFruad
        >(
            "TransactionFruad", TransactionFruadSchema
        );

        this.authenticationAttemptModel = this.connection.model<
            MongoAuthenticationAttempt
        >(
            "AuthenticationAttempt", AuthenticationAttemptSchema
        );
        this.authenticationBlacklistModel = this.connection.model<
            MongoAuthenticationBlacklist
        >(
            "AuthenticationBlacklist", AuthenticationBlacklistSchema
        );
    }

    useHandler(eventHandler: DatabaseEventHandler) {
        this.eventHandler = eventHandler;
        return this;
    }

    connect(url: Readonly<string>, options?: Readonly<any>) {
        return new Promise<this>((resolve, reject) => {
            if (this.eventHandler && this.eventHandler.onConnect) {
                this.eventHandler.onConnect();
            }

            let sslOptions: mongoose.ConnectionOptions = {};

            if (
                this.options.certificateFile || this.options.primaryKeyFile ||
                this.options.cas
            ) {
                sslOptions = {
                    server: {
                        ssl: true,
                        sslCert: (
                            this.options.certificateFile ?
                            fs.readFileSync(this.options.certificateFile) :
                            undefined
                        ),
                        sslKey: (
                            this.options.primaryKeyFile ?
                            fs.readFileSync(this.options.primaryKeyFile) :
                            undefined
                        ),
                        sslPass: this.options.passphrase,
                        sslValidate: true,
                        sslCA: (
                            this.options.cas ?
                            this.options.cas.map(
                                (caFile) => fs.readFileSync(caFile)
                            ) : undefined
                        )
                    }
                };
            }

            try {
                this.connection = mongoose.createConnection(
                    url, { ...sslOptions, ...options }
                );
            } catch (error) {
                this.error = new SuperError("E000101");
                CircuitBreaker.reportState(this.name, "open");
                bluebird.delay(
                    this.options.reconnectionTime || 5000
                ).then(
                    () => this.connect(url, options)
                ).then(resolve);
                return;
            }

            this.error = undefined;
            CircuitBreaker.reportState(this.name, "close");

            this.connection.on("error", (error: any) => {
                if (this.connection) {
                    this.connection.close();
                }
                this.error = new SuperError("E000101", error);
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                CircuitBreaker.reportState(this.name, "open");
                return bluebird.delay(
                    this.options.reconnectionTime || 5000
                ).then(() => this.connect(url, options));
            });

            this.connection.on("connecting", () => {
                if (
                    this.eventHandler && this.eventHandler.onConnect
                ) {
                    this.eventHandler.onConnect();
                }
            });

            this.connection.on("connected", () => {
                CircuitBreaker.reportState(this.name, "close");
                if (
                    this.eventHandler && this.eventHandler.onConnected
                ) {
                    this.eventHandler.onConnected();
                }
            });

            this.connection.on("disconnecting", () => {
                CircuitBreaker.reportState(this.name, "open");
                if (
                    this.eventHandler && this.eventHandler.onDisconnect
                ) {
                    this.eventHandler.onDisconnect();
                }
            });

            this.connection.on("disconnected", () => {
                CircuitBreaker.reportState(this.name, "open");
                if (
                    this.eventHandler && this.eventHandler.onDisconnected
                ) {
                    this.eventHandler.onDisconnected();
                }
            });

            this.createModels();

            return resolve(this);
        });
    }

    disconnect() {
        return new Promise<void>((resolve, reject) => {
            this.connection ? this.connection.close() : Promise.resolve()
                .then(() => {
                    this.error = new SuperError("E000101");
                    CircuitBreaker.reportState(this.name, "open");
                    return resolve();
                })
                .catch((error) => {
                    let superError = new SuperError(
                        "E000100", error, this.error
                    );
                    if (this.eventHandler && this.eventHandler.onError) {
                        this.eventHandler.onError(superError);
                    }
                    return reject(superError);
                });
        });
    }

    getStringLocalization() {
        return new Promise<StringLocalizationSchema>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.contentConfigurationModel.find().sort({
                update_timestamp: 1,
                create_timestamp: 1
            }).then(
                (localizations) => {
                    let map: StringLocalizationSchema = {};
                    localizations.forEach((localization) => {
                        map[localization.key] = localization.message;
                    });
                    return resolve(map);
                }
            ).catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    getErrorMap() {
        return new Promise<ErrorConfigurationMapSchema>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.errorConfigurationModel.find().sort({
                update_timestamp: 1,
                create_timestamp: 1
            }).then((errorConfigurations) => {
                let map: ErrorConfigurationMapSchema = {};
                errorConfigurations.forEach((errorConfiguration) => {
                    map[errorConfiguration.code] = {
                        code: errorConfiguration.override_code,
                        status: errorConfiguration.status,
                        message: errorConfiguration.message
                    };
                });
                return resolve(map);
            }).catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    getConfigurations() {
        return new Promise<object>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.applicationConfigurationModel.findOne().sort({
                update_timestamp: -1,
                create_timestamp: -1
            }).then((applicationConfiguration) => {
                if (!applicationConfiguration) {
                    return resolve({});
                }
                return resolve(applicationConfiguration.configuration);
            }).catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    createTransactionSession(transactionSession: TransactionSession) {
        return new Promise<TransactionSession>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            let transactionSessionRecord = new this.transactionSessionModel();
            transactionSessionRecord.key = transactionSession.key;
            if (transactionSession.value) {
                transactionSessionRecord.value = transactionSession.value;
            }
            if (transactionSession.create_timestamp) {
                transactionSessionRecord.create_timestamp = (
                    transactionSession.create_timestamp
                );
            }
            if (transactionSession.update_timestamp) {
                transactionSessionRecord.update_timestamp = (
                    transactionSession.update_timestamp
                );
            }
            if (transactionSession.expire_timestamp) {
                transactionSessionRecord.expire_timestamp = (
                    transactionSession.expire_timestamp
                );
            }
            transactionSessionRecord.save()
            .then(resolve)
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    getTransactionSession(key: string) {
        return new Promise<TransactionSession | undefined>(
            (resolve, reject) => {
                if (this.error) {
                    if (this.eventHandler && this.eventHandler.onError) {
                        this.eventHandler.onError(this.error);
                    }
                    return reject(this.error);
                }
                this.transactionSessionModel.findOne({
                    key: key,
                    expire_timestamp: { $gt: moment.now() }
                })
                .then((transactionSessionRecord) => {
                    if (!transactionSessionRecord) {
                        return resolve(undefined);
                    }
                    return resolve(transactionSessionRecord);
                })
                .catch((error) => {
                    let superError = new SuperError(
                        "E000100", error, this.error
                    );
                    if (this.eventHandler && this.eventHandler.onError) {
                        this.eventHandler.onError(superError);
                    }
                    return reject(superError);
                });
            });
    }

    updateTransactionSession(
        transactionSession: TransactionSession
    ) {
        return new Promise<TransactionSession>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            let updateValue = {
                key: transactionSession.key,
                value: transactionSession.value,
                expire_timestamp: transactionSession.expire_timestamp,
                update_timestamp: moment.now()
            };

            this.transactionSessionModel.findOneAndUpdate(
                {
                    key: transactionSession.key
                },
                { $set: updateValue },
                { new: true }
            )
            .then((result) => resolve(result ? result : undefined))
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    createTransactionFruad(transactionFruad: TransactionFruad) {
        return new Promise<TransactionFruad>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            let transactionFruadRecord = new this.transactionFruadModel();
            if (transactionFruad.transaction_id) {
                transactionFruadRecord.transaction_id = (
                    transactionFruad.transaction_id
                );
            }
            transactionFruadRecord.transaction_type = (
                transactionFruad.transaction_type
            );
            if (transactionFruad.transaction_reference_id) {
                transactionFruadRecord.transaction_reference_id = (
                    transactionFruad.transaction_reference_id
                );
            }
            transactionFruadRecord.fruad_type = transactionFruad.fruad_type;
            transactionFruadRecord.fruad_description = (
                transactionFruad.fruad_description
            );
            if (transactionFruad.expected_value) {
                transactionFruadRecord.expected_value = (
                    transactionFruad.expected_value
                );
            }
            if (transactionFruad.received_value) {
                transactionFruadRecord.received_value = (
                    transactionFruad.received_value
                );
            }
            transactionFruadRecord.branch_id = transactionFruad.branch_id;
            transactionFruadRecord.user_id = transactionFruad.user_id;
            transactionFruadRecord.device_id = transactionFruad.device_id;
            if (transactionFruad.create_timestamp) {
                transactionFruadRecord.create_timestamp = (
                    transactionFruad.create_timestamp
                );
            }
            if (transactionFruad.update_timestamp) {
                transactionFruadRecord.update_timestamp = (
                    transactionFruad.update_timestamp
                );
            }
            transactionFruadRecord.save()
            .then(resolve)
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    createAuthenticationAttempt(
        authenticationAttempt: AuthenticationAttempt
    ) {
        return new Promise<AuthenticationAttempt>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            let authenticationAttemptRecord = (
                new this.authenticationAttemptModel()
            );
            authenticationAttemptRecord.device_id = (
                authenticationAttempt.device_id
            );
            if (authenticationAttempt.branch_code) {
                authenticationAttemptRecord.branch_code = (
                    authenticationAttempt.branch_code
                );
            }
            authenticationAttemptRecord.user_id = (
                authenticationAttempt.user_id
            );
            authenticationAttemptRecord.status = (
                authenticationAttempt.status
            );
            authenticationAttemptRecord.type = (
                authenticationAttempt.type
            );
            authenticationAttemptRecord.sub_type = (
                authenticationAttempt.sub_type
            );
            if (authenticationAttempt.create_timestamp) {
                authenticationAttemptRecord.create_timestamp = (
                    authenticationAttempt.create_timestamp
                );
            }
            if (authenticationAttempt.update_timestamp) {
                authenticationAttemptRecord.update_timestamp = (
                    authenticationAttempt.update_timestamp
                );
            }

            authenticationAttemptRecord.save()
                .then(resolve)
                .catch((error) => {
                    let superError = new SuperError(
                        "E020013", error, this.error
                    );
                    if (this.eventHandler && this.eventHandler.onError) {
                        this.eventHandler.onError(superError);
                    }
                    return reject(superError);
                });
        });
    }

    createAuthenticationBlacklist(
        authenticationBlacklist: AuthenticationBlacklist
    ) {
        return new Promise<AuthenticationBlacklist>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            let authenticationBlacklistRecord = (
                new this.authenticationBlacklistModel()
            );
            authenticationBlacklistRecord.device_id = (
                authenticationBlacklist.device_id
            );
            if (authenticationBlacklist.branch_code) {
                authenticationBlacklistRecord.branch_code = (
                    authenticationBlacklist.branch_code
                );
            }
            authenticationBlacklistRecord.user_id = (
                authenticationBlacklist.user_id
            );
            authenticationBlacklistRecord.block_duration = (
                authenticationBlacklist.block_duration
            );
            authenticationBlacklistRecord.type = (
                authenticationBlacklist.type
            );
            authenticationBlacklistRecord.sub_type = (
                authenticationBlacklist.sub_type
            );
            authenticationBlacklistRecord.expire_timestamp = (
                authenticationBlacklist.expire_timestamp
            );
            if (authenticationBlacklist.create_timestamp) {
                authenticationBlacklistRecord.create_timestamp = (
                    authenticationBlacklist.create_timestamp
                );
            }
            if (authenticationBlacklist.update_timestamp) {
                authenticationBlacklistRecord.update_timestamp = (
                    authenticationBlacklist.update_timestamp
                );
            }

            authenticationBlacklistRecord.save()
                .then(resolve)
                .catch((error) => {
                    let superError = new SuperError(
                        "E020013", error, this.error
                    );
                    if (this.eventHandler && this.eventHandler.onError) {
                        this.eventHandler.onError(superError);
                    }
                    return reject(superError);
                });
        });
    }

    getAuthenticationAttempts(query: {
        userID: string;
        type: AuthenticationType;
        fromTimestamp: moment.Moment;
    }) {
        return new Promise<AuthenticationAttempt[]>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.authenticationAttemptModel.find({
                user_id: query.userID,
                type: query.type,
                status: "fail",
                create_timestamp: {
                    $gt: query.fromTimestamp.toDate()
                }
            }).then(resolve).catch((error) => {
                let superError = new SuperError(
                    "E020013", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    getAuthenticationBlacklist(query: {
        userID: string;
        type: AuthenticationType
    }) {
        return new Promise<
            AuthenticationBlacklist | undefined
        >((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.authenticationBlacklistModel.findOne({
                user_id: query.userID,
                type: query.type,
                expire_timestamp: {
                    $gt: moment.now()
                }
            }).then(
                (result) => result ? resolve(result) : resolve(undefined)
            ).catch((error) => {
                let superError = new SuperError(
                    "E020013", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    updateAuthenticationAttemptStatus(query: {
        userID: string;
        type: AuthenticationType;
        fromTimestamp: moment.Moment;
        status: AuthenticationStatus;
    }) {
        return new Promise<void>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.authenticationAttemptModel.update({
                user_id: query.userID,
                status: "fail",
                type: query.type,
                create_timestamp: {
                    $gt: query.fromTimestamp.toDate()
                }
            }, {
                $set: {
                    status: query.status,
                    update_timestamp: moment.now()
                }
            }, {
                multi: true
            }).then((result) => resolve()).catch((error) => {
                let superError = new SuperError(
                    "E020013", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }
}
