import * as fs from "fs";
import * as url from "url";
import * as express from "express";
import * as moment from "moment";
import * as uuidv1 from "uuid/v1";
import * as semver from "semver";
import * as _ from "lodash";
import * as CircuitBreaker from "./circuit-breaker";
import * as JSON from "./json";
import { internal as Config } from "../config";
import * as Expectation from "../expectation";
import { Application, BasicApplication } from "../app";
import { TokenBlacklist } from "../models/token-blacklist";
import {
    default as MongoDBJWTSessionTracker
} from "../adapters/implementations/mongodb-jwt-session-tracker";
import { i18n, I18NManager, StringLocalizationSchema } from "../i18n";
import { JWT, JWTPayload } from "../jwt";
import {
    SupportedLanguage, LanguageObject, extractLanguages, pickLanguage
} from "../language-extractor";
import Request from "../request";
import ErrorFormatter from "../formatters/error-formatter";
import NumberFormatter from "../formatters/number-formatter";
import { SuperError, RequestError, DynamicError } from "../super-error";
import EventHandler from "../event-handler";
import Logger from "../logger";
import Adapter from "../adapters/adapter";
import WebService from "../adapters/implementations/web-service";
import {
    ServiceOperation, ServiceRequest, ServiceType
} from "../adapters/web-service";
import MessageBroker from "../adapters/messaging";
import OperationLogMessage from "../messaging/operation-log-message";
import ErrorMessage from "../messaging/error-message";
let serviceStartTime:moment.Moment;
const patterns = {
    device: (
        "(\\w[^\\(]+)\\((\\w[^\\)]+)\\)\\s*(\\w[^\\(]+)\\((\\w[^\\)]+)\\)"
    ),
    application: "(\\w[^\\(]+)\\((\\w[^\\)]+)\\)",
    service: "(\\w[^\\(]+)\\((\\w[^\\)]+)\\)",
    queryString: "\\?.*$",
    mobileNetwork: (
        "([^\\/]+)\\/([^\\(a-z]+)\\(\\s*(-?\\d+(\\.[\\d]+)?)\\s*dBm\\s*\\/" +
        "\\s*(-?\\d+(\\.[\\d]+)?)\\s*dBm\\s*\\)"
    ),
    location: "(-?\\d+(\\.[\\d]+)?)\\s*,\\s*(-?\\d+(\\.[\\d]+)?)"
};

interface RequestInformation {
    hasAccessToken: boolean;
    hasAuthenticate: boolean;
    requestID: string;
    clientIP: string;
    serviceName: string;
    serviceVersion: string;
    acceptLanguage: string;
    languages: SupportedLanguage[];
    device?: string;
    application?: string;
    userAgent?: string;
    accessToken?: string;
}

export interface MobileNetwork {
    provider: string;
    type: string;
    strength: number;
    noise: number;
}

export interface Geolocation {
    latitude: number;
    longitude: number;
}

interface RequestHeader {
    acceptLanguage: string;
    acceptLanguages: SupportedLanguage[];
    requestID: string;
    clientIP?: string;
    selfGenerateID: boolean;
    sourceService?: {
        name: string;
        version: string;
    };
    application?: {
        name: string;
        version: string;
    };
    device?: {
        brandName: string;
        brandModel: string;
        osName: string;
        osVersion: string;
    };
    userAgent?: string;
    mobileNetwork?: MobileNetwork;
    geolocation?: Geolocation;
}

export class RequestFile {
    name: string;
    mimetype: string;
    size: number;

    constructor(name: string, mimetype: string, size: number) {
        this.name = name;
        this.mimetype = mimetype;
        this.size = size;
    }
}

export interface ControllerBasicRequest<T> {
    id: string;
    languages: SupportedLanguage[];
    body: T;
    rawBody: Buffer | undefined;
    files: RequestFile[];
}

export interface ControllerRequest<T> extends ControllerBasicRequest<T> {
    token: {
        accessToken: string;
        payload: JWTPayload;
    };
    headers: {
        geolocation?: Geolocation;
        mobileNetwork?: MobileNetwork;
        application?: {
            name: string;
            version: string;
        };
    };
    info: {
        hasAccessToken: boolean;
        hasAuthenticate: boolean;
    };
    contentByLanguages<S = T>(target: LanguageObject<S>): S | undefined;
    call<S = T>(serviceOperation: ServiceOperation<S>): Promise<S>;
}

export interface ControllerError {
    code: string;
    message: string;
    target?: string;
    details?: ControllerError[];
}

export interface ControllerErrorResponse {
    status?: number;
    error: ControllerError;
}

export interface ControllerResponse<T> {
    status: number;
    body?: T;
    error?: ControllerError;
    information?: Partial<JWTPayload>;
}

export interface ControllerResponder<T> {
    send(response: ControllerResponse<T>): void;
    error: (error: Error) => void;
    errorWithAction: (
        action: (error: Error) => void
    ) => ((error: Error) => void);
    errorWithErrorMessage: (
        action: (errorMessage: ErrorMessage) => void
    ) => ((error: Error) => void);
}

export interface ControllerDelegate<T, S> {
    security?: {
        authentication?: boolean;
        authorization?: (
            request: Readonly<ControllerRequest<T>>
        ) => Promise<void>[];
    };
    requirements?: () => Adapter[];
    plugins?: ControllerPlugin[];
    information?: (
        request: Readonly<ControllerBasicRequest<T>>
    ) => Partial<JWTPayload>;
    expectations?: {
        header?: Expectation.Expectation;
        query?: Expectation.Expectation;
        parameter?: Expectation.Expectation;
        body?: Expectation.Expectation;
    };
    handlePerform?: {
        [key: string]: (
            request: Readonly<ControllerRequest<T>>,
            i18n: i18n
        ) => Promise<ControllerResponse<S>>;
    };
    perform: (
        request: Readonly<ControllerRequest<T>>,
        i18n: i18n
    ) => Promise<ControllerResponse<S>>;
}

export interface ErrorMapper {
    getResponseForError(
        error: Error,
        languages?: SupportedLanguage[]
    ): ControllerErrorResponse | undefined;
}

export interface OperationInformation {
    operationName: string;
    messageBroker?: () => MessageBroker;
}

export class ProcessedError extends Error {
    error: Error;
    action: (errorMessage: ErrorMessage) => void;

    constructor(
        error: Error,
        action: (errorMessage: ErrorMessage) => void
    ) {
        super(error.message);
        this.error = error;
        this.action = action;
    }
}

export interface ControllerPlugin {
    name: string;

    export?(): express.RequestHandler;
    transform?(request: {
        controller: ControllerBasicRequest<any>,
        raw: Readonly<express.Request>
    }): ControllerBasicRequest<any>;
    onError?(error: any): Error | undefined;
}

let packageJSON: any = {};
let warnDeprecateDelegate = false;

EventHandler.registerHandler("config", () => {
    try {
        packageJSON = JSON.parse(fs.readFileSync("./package.json").toString());
    } catch (error) {
        console.error("Cannot read 'package.json' file");
        process.exit(1);
    }
})();

function getRequestRestriction(request: express.Request) {
    let blocking: {
        [key: string]: {
            headers?: {
                [key: string]: string;
            }
        };
    } = Config.getGlobal("request-blocking", {});

    for (let key in blocking) {
        if (!blocking.hasOwnProperty(key)) {
            continue;
        }
        let settings = blocking[key];
        if (settings.headers && Object.keys(settings.headers).every(
            (header) => {
                if (!settings.headers) {
                    return false;
                }
                let pattern = settings.headers[header];
                let headerValue = request.header(header);
                if (!pattern) {
                    return !headerValue;
                }
                if (!headerValue) {
                    return true;
                }
                return new RegExp(
                    pattern, "g"
                ).test(
                    headerValue
                );
            }
        )) {
            return key;
        }
    }
    return undefined;
}

function createMockController<T, S>(
    controller: ControllerDelegate<T, S>,
    requestBody: T,
    options?: {
        baseRequest?: Partial<ControllerRequest<T> & {
            i18n: StringLocalizationSchema
        }>;
        useRestriction?: string;
    }
) {
    return new Promise<ControllerResponse<S>>((resolve, reject) => {
        let requestID = uuidv1();
        let languages = (
            (options && options.baseRequest && options.baseRequest.languages) ?
            options.baseRequest.languages : [{ language: "en" }]
        );
        let request: ControllerRequest<T> = {
            id: (
                options && options.baseRequest && options.baseRequest.id
            ) ? options.baseRequest.id : requestID,
            headers: (
                options && options.baseRequest && options.baseRequest.headers
            ) ? options.baseRequest.headers : {},
            languages: languages,
            files: (
                options && options.baseRequest && options.baseRequest.files
            ) ? options.baseRequest.files : [],
            body: requestBody,
            rawBody: (
                options && options.baseRequest && options.baseRequest.rawBody ?
                options.baseRequest.rawBody : undefined
            ),
            token: {
                accessToken: (
                    (
                        options &&
                        options.baseRequest &&
                        options.baseRequest.token
                    ) ?
                    options.baseRequest.token.accessToken : ""
                ),
                payload: (
                    (
                        options &&
                        options.baseRequest &&
                        options.baseRequest.token
                    ) ?
                    options.baseRequest.token.payload :
                    {
                        usr: "unknown",
                        brn: "unknown",
                        dev: "unknown",
                        app: "unknown",
                        uac: "unknown"
                    }
                )
            },
            info: {
                hasAccessToken: (
                    (
                        options &&
                        options.baseRequest &&
                        options.baseRequest.info
                    ) ?
                    options.baseRequest.info.hasAccessToken :
                    false
                ),
                hasAuthenticate: (
                    (
                        options &&
                        options.baseRequest &&
                        options.baseRequest.info
                    ) ?
                    options.baseRequest.info.hasAccessToken :
                    false
                )
            },
            contentByLanguages: (
                <U = T>(target: LanguageObject<U>) => pickLanguage(
                    target, languages
                )
            ),
            call: <U = T>(
                serviceOperation: ServiceOperation<U>
            ) => serviceOperation((service) => ({
                to: (path) => makeRequest({
                    service: service,
                    path: path
                }),
                toExact: (path) => makeRequest({
                    service: service,
                    path: path,
                    exactPath: true
                })
            }))
        };

        let i18NManager = new I18NManager(
            options && options.baseRequest ?
            options.baseRequest.i18n : undefined
        ).i18n(languages);

        if (
            options &&
            options.useRestriction &&
            controller.handlePerform &&
            controller.handlePerform[options.useRestriction]
        ) {
            controller.handlePerform[options.useRestriction](
                request, i18NManager
            ).then(resolve).catch(reject);
        } else {
            controller.perform(
                request, i18NManager
            ).then(resolve).catch(reject);
        }
    });
}

export { createMockController as Controller };

function timeAndDiff(
    fromTime?: number
) {
    if (!fromTime) {
        return undefined;
    }
    return `${
        moment.unix(fromTime).toISOString()
    } (${
        moment.unix(fromTime).from(moment())
    })`;
}

function handleResponse(
    responseObject: Error | ControllerResponse<any>,
    information: {
        operation?: OperationInformation;
        usr?: string;
        brn?: string;
    },
    errorCallback?: (errorMessage: ErrorMessage) => void,
    languages?: SupportedLanguage[],
    application?: () => Application
) {
    let responseStatus = 200;
    let responseBody;

    function analyseError(response: {
        status: number;
        body: any;
    }) {
        if (
            !response.body ||
            !response.body.hasOwnProperty("error")
        ) {
            return response;
        }

        let error = response.body["error"];
        if (!error.hasOwnProperty("code") || !error["code"]) {
            return response;
        }

        let errorCode = `${ error["code"] }`.toUpperCase();
        let noDomainMatches = new RegExp(
            "^([WE])([0-9A-F]{2})(\\d{4})$", "g"
        ).exec(errorCode);

        if (noDomainMatches) {
            let [
                allCapture, severityCapture, serviceCodeCapture, codeCapture
            ] = noDomainMatches;
            errorCode = `${
                severityCapture
            }${
                (
                    application ?
                    application().service.domain :
                    packageJSON["domain"]
                )
            }${
                serviceCodeCapture
            }${
                codeCapture
            }`;
            response.body["error"]["code"] = errorCode;
        }

        if (
            !information.operation ||
            !information.operation.messageBroker ||
            !application
        ) {
            return response;
        }

        let app = application();
        let domainMatches = new RegExp(
            "^([WE])([0-9A-F]{2})([0-9A-F]{2})(\\d{4})$", "g"
        ).exec(errorCode);

        if (!domainMatches) {
            return response;
        }
        let [all, severity, domainCode, serviceCode, code] = domainMatches;

        let errorMessage: ErrorMessage = {
            teller_id: information.usr ? parseInt(information.usr) : undefined,
            branch_id: information.brn ? parseInt(information.brn) : undefined,
            serve_service: packageJSON["code"],
            source_service: serviceCode,
            operation_id: information.operation.operationName,
            error_code: errorCode,
            timestamp: moment().toISOString()
        };

        if (errorCallback) {
            errorCallback(errorMessage);
        }

        let broker = information.operation.messageBroker();

        broker.publishErrorMessage(errorMessage);

        return response;
    }

    if (responseObject instanceof Error) {
        responseStatus = 400;
        if (application) {
            let errorResponse = (
                application().errorMapper.getResponseForError(
                    responseObject, languages
                )
            );
            if (errorResponse) {
                if (errorResponse.status) {
                    responseStatus = errorResponse.status;
                }
                if (errorResponse.error) {
                    responseBody = {
                        error: (
                            (responseObject instanceof DynamicError) ?
                            new ErrorFormatter(errorResponse.error).mapValue(
                                responseObject.data
                            ) :
                            errorResponse.error
                        )
                    };
                }
                return analyseError({
                    status: responseStatus,
                    body: responseBody
                });
            }
        }
        if (
            responseObject instanceof RequestError && (
                responseObject.statusCode ||
                responseObject.error
            )
        ) {
            return analyseError({
                status: responseObject.statusCode || responseStatus,
                body: responseObject.error ? {
                    error: {
                        code: responseObject.error.code,
                        message: responseObject.error.message
                    }
                } : undefined
            });
        }

        try {
            let errorResponse = JSON.parse(
                responseObject.message
            );
            return analyseError({
                status: errorResponse.statusCode as number,
                body: errorResponse.body
            });
        } catch (error) {
            responseBody = {
                error: {
                    code: application ? "E000001" : "E000000",
                    message: "Unexpected error",
                    details: (
                        (process.env["NODE_ENV"] === "production") ?
                        undefined : [{
                            code: responseObject.message,
                            message: responseObject.stack
                        }].concat(
                            (
                                responseObject instanceof SuperError
                            ) ? responseObject.superErrors.map((error) => ({
                                code: error.message,
                                message: error.stack
                            })) : []
                        )
                    )
                }
            };
        }

        return analyseError({
            status: responseStatus,
            body: responseBody
        });
    }

    return analyseError({
        status: responseObject.status,
        body: (
            responseObject.body ||
            (
                responseObject.error ? {
                    error: responseObject.error
                } : (
                    (
                        responseObject.status < 200 ||
                        responseObject.status >= 300
                    ) ? {
                        error: {
                            code: application ? "E000001" : "E000000",
                            message: "Unexpected error"
                        }
                    } : undefined
                )
            )
        )
    });
}

function makeRequest(
    options: {
        service: WebService;
        path: string;
        exactPath?: boolean;
        requestInformation?: RequestInformation;
        logging?: boolean;
    }
): Request {
    let uri = "http://127.0.0.1";
    let isThirdParty = options.service.type === ServiceType.ThirdPartyService;
    let serviceKeyPath = `${
        isThirdParty ?
        "third-party-services" : "services"
    }.${ options.service.name }`;

    if (options.requestInformation) {
        uri = Config.get(
            options.requestInformation.serviceName,
            `${ serviceKeyPath }.endpoint`,
            uri
        );
    } else {
        uri = Config.getGlobal(
            `mock.${ serviceKeyPath }.endpoint`,
            Config.getGlobal(
                `${ serviceKeyPath }.endpoint`,
                uri
            )
        );
    }

    if (options.path) {
        if (options.exactPath) {
            uri += options.path;
        } else if (options.path !== "/") {
            uri += options.path;
        }
    }

    let request = new Request({
        uri: uri,
        identifier: options.service.name,
        logging: options.logging
    });

    if (options.requestInformation) {
        request = request.header(
            "x-request-id", options.requestInformation.requestID
        ).header(
            "x-real-ip", options.requestInformation.clientIP
        ).header(
            "x-request-service", `${
                options.requestInformation.serviceName
            } (${
                options.requestInformation.serviceVersion
            })`
        ).header(
            "accept-language", options.requestInformation.acceptLanguage
        );

        if (!isThirdParty && options.requestInformation.device) {
            request = request.header(
                "x-device", options.requestInformation.device
            );
        }

        if (!isThirdParty && options.requestInformation.application) {
            request = request.header(
                "x-application", options.requestInformation.application
            );
        }

        if (options.requestInformation.userAgent) {
            request = request.header(
                "user-agent", options.requestInformation.userAgent
            );
        }

        if (!isThirdParty && options.requestInformation.hasAuthenticate) {
            request = request.header(
                "authorization", `bearer ${
                    options.requestInformation.accessToken
                }`
            );
        }

        let strictSSL = Config.get<boolean | undefined>(
            options.requestInformation.serviceName,
            `${ serviceKeyPath }.strict-ssl`,
            undefined
        );
        let certificateFile = Config.get<string | undefined>(
            options.requestInformation.serviceName,
            `${ serviceKeyPath }.certificate-file`,
            undefined
        );
        let primaryKeyFile = Config.get<string | undefined>(
            options.requestInformation.serviceName,
            `${ serviceKeyPath }.primary-key-file`,
            undefined
        );
        let passphrase = Config.get<string | undefined>(
            options.requestInformation.serviceName,
            `${ serviceKeyPath }.passphrase`,
            undefined
        );
        let cas = Config.get<string[]>(
            options.requestInformation.serviceName,
            `${ serviceKeyPath }.certificate-authorities`,
            []
        );

        if (strictSSL !== undefined) {
            request = request.strictSSL(strictSSL);
        }
        if (certificateFile) {
            request = request.certificateFile(certificateFile);
        }
        if (primaryKeyFile) {
            request = request.primaryKeyFile(primaryKeyFile);
        }
        if (passphrase) {
            request = request.passphrase(passphrase);
        }
        cas.forEach((ca) => {
            request = request.certificateAuthorityFile(ca);
        });
    } else {
        request = Request.emptyMock;
    }

    return request;
}

function getConfigurations() {
    return {
        includeHeaders: Config.getGlobal<boolean>(
            "logging.operation.include-headers",
            false
        ),
        prettyLog: Config.getGlobal<boolean>(
            "logging.operation.pretty",
            false
        ),
        truncateAt: Config.getGlobal<number>(
            "logging.operation.truncate-at",
            4000
        ),
        maxArraySize: Config.getGlobal<number>(
            "logging.operation.max-array-size",
            20
        ),
        inclusions: Config.getGlobal<string[]>(
            "logging.operation.inclusions",
            []
        ),
        exclusions: Config.getGlobal<string[]>(
            "logging.operation.exclusions",
            []
        ),
        inclusionPatterns: Config.getGlobal<string[]>(
            "logging.operation.inclusion-url-patterns",
            []
        ),
        exclusionPatterns: Config.getGlobal<string[]>(
            "logging.operation.exclusion-url-patterns",
            []
        )
    };
}

function extractHeaders(request: express.Request): RequestHeader {
    let ipHeaders = Config.getGlobal<string[]>("logging.ip-headers", []);

    let acceptLanguage = request.header("accept-language") || "en";

    let selfGenerateID = false;
    let requestID = request.header("x-request-id");
    if (!requestID) {
        requestID = uuidv1();
        selfGenerateID = true;
    }
    let ipHeader = ipHeaders.find(
        (header) => !!request.header(header)
    ) || "x-real-ip";

    let serviceMatches = new RegExp(patterns.service, "g").exec(
        request.header("x-request-service") || ""
    ) || [];
    let applicationMatches = new RegExp(patterns.application, "g").exec(
        request.header("x-application") || ""
    ) || [];
    let deviceMatches = new RegExp(patterns.device, "g").exec(
        request.header("x-device") || ""
    ) || [];

    let mobileNetworkMatches = new RegExp(patterns.mobileNetwork, "g").exec(
        request.header("x-mobile-network") || ""
    ) || [];

    let geolocationMatches = new RegExp(patterns.location, "g").exec(
        request.header("x-geolocation") || ""
    ) || [];

    let geolocationLatitude = _.trim(geolocationMatches[1] || "");
    let geolocationLongitude = _.trim(geolocationMatches[3] || "");

    let mobileNetworkProvider = _.trim(mobileNetworkMatches[1] || "");
    let mobileNetworkType = _.trim(mobileNetworkMatches[2] || "");
    let mobileNetworkStrength = _.trim(mobileNetworkMatches[3] || "");
    let mobileNetworkNoise = _.trim(mobileNetworkMatches[5] || "");

    return {
        acceptLanguage: acceptLanguage,
        acceptLanguages: extractLanguages(acceptLanguage),
        requestID: requestID,
        clientIP: request.header(ipHeader),
        selfGenerateID: selfGenerateID,
        sourceService: serviceMatches.length > 1 ? {
            name: _.trim(serviceMatches[1]),
            version: _.trim(serviceMatches[2])
        } : undefined,
        application: applicationMatches.length > 0 ? {
            name: _.trim(applicationMatches[1]),
            version: _.trim(applicationMatches[2])
        } : undefined,
        device: deviceMatches.length > 0 ? {
            brandName: _.trim(deviceMatches[1]),
            brandModel: _.trim(deviceMatches[2]),
            osName: _.trim(deviceMatches[3]),
            osVersion: _.trim(deviceMatches[4])
        } : undefined,
        userAgent: request.header("user-agent"),
        mobileNetwork: (
            mobileNetworkProvider &&
            mobileNetworkType &&
            mobileNetworkStrength &&
            mobileNetworkNoise
        ) ? {
            provider: mobileNetworkProvider,
            type: mobileNetworkType,
            strength: parseFloat(mobileNetworkStrength),
            noise: parseFloat(mobileNetworkNoise)
        } : undefined,
        geolocation: (geolocationLatitude && geolocationLongitude) ? {
            latitude: parseFloat(geolocationLatitude),
            longitude: parseFloat(geolocationLongitude)
        } : undefined
    };
}

function isSatisfyPatterns(
    wildcardPatterns: Readonly<string[]>,
    serviceName: string,
    operationName: string
) {
    return wildcardPatterns.some((pattern) => {
        if (pattern === "*") {
            return true;
        }
        let [matchService, matchOperation] = pattern.split(".");

        let serviceMatch = false;
        let operationMatch = false;
        if (matchService) {
            serviceMatch = (
                matchService === "*" || matchService === serviceName
            );
        }
        if (matchOperation) {
            operationMatch = (
                matchOperation === "*" || matchOperation === operationName
            );
        }
        return serviceMatch && operationMatch;
    });
}

function sendOperationLog(options: {
    messageBroker: MessageBroker;
    sourceService?: {
        name: string;
        version: string;
    };
    service: {
        name: string;
        version: string;
    };
    operation: {
        name: string;
    };
    headers: RequestHeader;
    token: {
        payload?: JWTPayload;
    };
    delegateInformation: Partial<JWTPayload>;
    request?: any;
    files?: {
        name: string;
        mimetype: string;
        size: number;
    }[];
    rejectReason?: {
        code: string;
        message: string;
    };
    response: {
        status: number;
        body?: any;
    };
    maxArraySize: number;
    latency: number;
    shouldLogToConsole: boolean;
    callback?: () => void;
}) {
    let unknownApplication = {
        name: "unknown-application",
        version: "unknown-version"
    };

    options.messageBroker.withExchangeInfo(() => ({
        name: "log_topic",
        type: "topic",
        options: { durable: false }
    })).publishMessage({
        onTopic: `service.${ options.service.name }.${
            options.operation.name
        }.info.log`,
        message: JSON.stringify({
            requestID: options.headers.requestID,
            clientIP: options.headers.clientIP,
            applicationName: (
                options.headers.application ?
                options.headers.application.name : "unknown-application"
            ),
            applicationVersion: (
                options.headers.application ?
                options.headers.application.version : "unknown-version"
            ),
            sourceServiceName: (
                options.headers.sourceService ?
                options.headers.sourceService.name : undefined
            ),
            sourceServiceVersion: (
                options.headers.sourceService ?
                options.headers.sourceService.version : undefined
            ),
            serviceName: options.service.name,
            serviceVersion: options.service.version,
            operationName: options.operation.name,
            userAgent: options.headers.userAgent,
            device: {
                brandName: (
                    options.headers.device ?
                    options.headers.device.brandName : "unknown-brand"
                ),
                brandModel: (
                    options.headers.device ?
                    options.headers.device.brandModel : "unknown-model"
                ),
                osName: (
                    options.headers.device ?
                    options.headers.device.osName : "unknown-os"
                ),
                osVersion: (
                    options.headers.device ?
                    options.headers.device.brandName : "unknown-version"
                )
            },
            userID: (
                options.token.payload ?
                options.token.payload.usr :
                options.delegateInformation.usr || "unknown"
            ),
            deviceID: (
                options.token.payload ?
                options.token.payload.dev :
                options.delegateInformation.dev || "unknown"
            ),
            branchID: (
                options.token.payload ?
                options.token.payload.brn :
                options.delegateInformation.brn || "unknown"
            ),
            request: (
                options.request ? JSON.replace(
                    options.request,
                    JSON.Stack(
                        (key, value) => key === "header" ? undefined : value,
                        JSON.ArrayLimiter(options.maxArraySize),
                        JSON.SecureJSON
                    )
                ) : undefined
            ),
            requestFiles: options.files ? options.files.map((file) => ({
                name: file.name,
                mimetype: file.mimetype,
                size: file.size
            })) : undefined,
            statusCode: `${ options.response.status }`,
            response: (
                options.response.body ? JSON.replace(
                    options.response.body,
                    JSON.Stack(
                        JSON.ArrayLimiter(options.maxArraySize),
                        JSON.SecureJSON
                    )
                ) : undefined
            ),
            rejectReason: options.rejectReason,
            latency: options.latency,
            mobileNetwork: (
                options.headers.mobileNetwork ?
                options.headers.mobileNetwork : undefined
            ),
            geolocation: (
                options.headers.geolocation ? {
                    type: "Point",
                    coordinates: [
                        options.headers.geolocation.longitude,
                        options.headers.geolocation.latitude
                    ]
                } : undefined
            )
        } as OperationLogMessage)
    }).then(() => {
        if (options.shouldLogToConsole) {
            Logger.info("[x] Operation log sent");
        }
        if (options.callback) {
            options.callback();
        }
    }).catch((error) => {
        Logger.error(`MessageBrokerError: ${error}`);
        if (options.callback) {
            options.callback();
        }
    });
}

export default (
    delegate: ControllerDelegate<any, any>,
    operationInformation?: OperationInformation,
    application?: () => Application
) => {
    let configurations = getConfigurations();
    let serviceName = packageJSON["name"];
    let serviceVersion = packageJSON["version"];
    let operationName = (
        operationInformation ?
        operationInformation.operationName :
        "unknown-operation"
    );

    let shouldLogToConsole = (
        configurations.inclusions.length <= 0 ||
        isSatisfyPatterns(configurations.inclusions, serviceName, operationName)
    );
    if (shouldLogToConsole && configurations.exclusions.length > 0) {
        shouldLogToConsole = !isSatisfyPatterns(
            configurations.exclusions, serviceName, operationName
        );
    }

    function printRequest(
        request: express.Request,
        tokenData: {
            issueTimestamp?: number;
            notBeforeTimestamp?: number;
            expireTimestamp?: number;
        },
        basicRequest?: ControllerBasicRequest<any>
    ) {
        if (!shouldLogToConsole) {
            return;
        }

        let tokenInfo = {
            issue: timeAndDiff(tokenData.issueTimestamp),
            notBefore: timeAndDiff(tokenData.notBeforeTimestamp),
            expire: timeAndDiff(tokenData.expireTimestamp)
        };

        let requestData = JSON.JSONRequest(request);
        serviceStartTime = moment();
        Logger.info(`Request[Inbound] [${operationName}]\n${
            request.protocol.toUpperCase()
        } ${
            request.method.toUpperCase()
        } ${
            request.originalUrl.replace(
                new RegExp(patterns.queryString, "g"), ""
            )
        }\n${
            (JSON.stringify(
                {
                    operation: operationName,
                    headers: (
                    configurations.includeHeaders &&
                        !_.isEmpty(request.headers)
                    ) ? request.headers : undefined,
                    token: _.isEmpty(tokenInfo) ? undefined : tokenInfo,
                    query: requestData.query,
                    body: requestData.body,
                    files: (
                        basicRequest && basicRequest.files.length > 0
                    ) ? basicRequest.files.map((file) => `${ file.name } (${
                        new NumberFormatter(file.size).toReadableSize(2)
                    })`) : undefined
                },
                JSON.SecureJSON,
                configurations.prettyLog ? 2 : undefined
            ) || "").substring(0, configurations.truncateAt)
        }`);
    }

    let handlers: (express.RequestHandler | express.ErrorRequestHandler)[] = [];

    if (delegate.plugins) {
        for (let plugin of delegate.plugins) {
            if (!plugin.export) {
                continue;
            }
            handlers.push(
                plugin.export(),
                (
                    error: any,
                    request: express.Request,
                    response: express.Response,
                    next: express.NextFunction
                ) => {
                    if (!error) {
                        return next();
                    }

                    if (plugin.onError) {
                        error = plugin.onError(error);
                    }

                    if (!error) {
                        return next();
                    }

                    let headers = extractHeaders(request);

                    let responseObject = handleResponse(
                        error, {
                            operation: operationInformation
                        }, undefined, headers.acceptLanguages, application
                    );

                    printRequest(request, {});
                    Logger.info(`Plugin [${ plugin.name }]: ${
                        responseObject.status
                    } rejection`);
                    return response
                        .status(responseObject.status)
                        .json(responseObject.body);
                }
            );
        }
    }

    handlers.push((
        request: express.Request, response: express.Response,
        next: express.NextFunction
    ) => {
        let headers = extractHeaders(request);

        let startTime = moment();
        let token: {
            accessToken?: string;
            issueTimestamp?: number;
            notBeforeTimestamp?: number;
            expireTimestamp?: number;
            payload?: JWTPayload;
        } = {};
        let rawPayload: JWTPayload | undefined;
        let authenticated = true;

        let jsonRequest = JSON.JSONRequest(request);

        let basicRequest: ControllerBasicRequest<any> = {
            id: headers.requestID,
            languages: headers.acceptLanguages,
            files: [],
            body: {
                ...(jsonRequest.query || {}),
                ...(jsonRequest.parameter || {}),
                ...(jsonRequest.body || {})
            },
            rawBody: (
                Buffer.isBuffer(request.body) ?
                request.body : undefined
            )
        };

        if (delegate.plugins) {
            for (let plugin of delegate.plugins) {
                if (!plugin.transform) {
                    continue;
                }
                basicRequest = plugin.transform({
                    controller: basicRequest,
                    raw: request
                });
            }
        }

        let delegateInformation: Partial<JWTPayload> = {};

        if (delegate.information) {
            delegateInformation = delegate.information(basicRequest);
        }

        if (delegate.requirements) {
            let responseObject = CircuitBreaker.requireResponse(
                delegate.requirements().map((adapter) => adapter.name)
            );

            responseObject = handleResponse(
                responseObject, {
                    operation: operationInformation
                }, undefined, headers.acceptLanguages, application
            );

            if (responseObject.status !== 200) {
                if (
                    operationInformation &&
                    operationInformation.messageBroker
                ) {
                    let latency = moment().diff(startTime, "ms", true);
                    sendOperationLog({
                        messageBroker: operationInformation.messageBroker(),
                        sourceService: headers.sourceService,
                        service: {
                            name: serviceName,
                            version: serviceVersion
                        },
                        operation: {
                            name: operationName
                        },
                        delegateInformation: delegateInformation,
                        headers: headers,
                        token: token,
                        request: JSON.JSONRequest(request),
                        files: basicRequest.files,
                        response: responseObject,
                        rejectReason: {
                            code: "tripped-circuit-breaker",
                            message: "Circuit breaker has tripped"
                        },
                        maxArraySize: configurations.maxArraySize,
                        latency: latency,
                        shouldLogToConsole: shouldLogToConsole
                    });
                }
                printRequest(request, token, basicRequest);
                Logger.info(`CircuitBreaker: ${
                    responseObject.status
                } rejection due to circuit tripped`);
                return response
                    .status(responseObject.status)
                    .json(responseObject.body);
            }
        }

        let supportedVersions: Readonly<string[]> = (
            application ?
            application().config.get("version.supported", []) :
            Config.getGlobal("version.supported", [])
        );

        if (supportedVersions.length > 0 && !supportedVersions.some(
            (range) => semver.satisfies((
                headers.application ?
                headers.application.version : "unknown-application"
            ), range)
        )) {
            printRequest(request, token, basicRequest);
            Logger.info(
                "Versioning: 505 rejection due to version mismatch"
            );
            Logger.info(`Got ${
                headers.application ?
                headers.application.version : "unknown-application"
            } while support ${
                supportedVersions.join(", ")
            }`);
            if (operationInformation && operationInformation.messageBroker) {
                let latency = moment().diff(startTime, "ms", true);
                sendOperationLog({
                    messageBroker: operationInformation.messageBroker(),
                    sourceService: headers.sourceService,
                    service: {
                        name: serviceName,
                        version: serviceVersion
                    },
                    operation: {
                        name: operationName
                    },
                    delegateInformation: delegateInformation,
                    headers: headers,
                    token: token,
                    request: JSON.JSONRequest(request),
                    files: basicRequest.files,
                    response: {
                        status: 505
                    },
                    rejectReason: {
                        code: "version-mismatch",
                        message: "Version mismatch"
                    },
                    maxArraySize: configurations.maxArraySize,
                    latency: latency,
                    shouldLogToConsole: shouldLogToConsole
                });
            }
            return response.status(505).send();
        }

        let blacklistPromise: Promise<TokenBlacklist | undefined> = (
            Promise.resolve(undefined)
        );

        let testEnvironment = process.env["NODE_ENV"] === "test";
        if (
            delegate.security && delegate.security.authentication !== undefined
        ) {
            let requireAuthentication = delegate.security.authentication;
            let authorization = request.header("authorization") || "";
            let [authType, jwtToken] = authorization.split(/\s+/g);
            token.accessToken = jwtToken;

            if (!authType || authType.toLowerCase() !== "bearer") {
                if (!testEnvironment) {
                    printRequest(request, token, basicRequest);
                }
                Logger.info(
                    "Authentication: " +
                    "404 rejection due to missing authentication type"
                );
                if (!testEnvironment) {
                    if (
                        operationInformation &&
                        operationInformation.messageBroker
                    ) {
                        let latency = moment().diff(startTime, "ms", true);
                        sendOperationLog({
                            messageBroker: operationInformation.messageBroker(),
                            sourceService: headers.sourceService,
                            service: {
                                name: serviceName,
                                version: serviceVersion
                            },
                            operation: {
                                name: operationName
                            },
                            delegateInformation: delegateInformation,
                            headers: headers,
                            token: token,
                            request: JSON.JSONRequest(request),
                            files: basicRequest.files,
                            response: {
                                status: 404
                            },
                            rejectReason: {
                                code: "missing-authentication-type",
                                message: "Missing authentication type"
                            },
                            maxArraySize: configurations.maxArraySize,
                            latency: latency,
                            shouldLogToConsole: shouldLogToConsole
                        });
                    }
                    return response.status(404).send();
                }
                authenticated = false;
            }
            if (!jwtToken) {
                if (!testEnvironment) {
                    printRequest(request, token, basicRequest);
                }
                Logger.info(
                    "Authentication: " +
                    "404 rejection due to missing token"
                );
                if (!testEnvironment) {
                    if (
                        operationInformation &&
                        operationInformation.messageBroker
                    ) {
                        let latency = moment().diff(startTime, "ms", true);
                        sendOperationLog({
                            messageBroker: operationInformation.messageBroker(),
                            sourceService: headers.sourceService,
                            service: {
                                name: serviceName,
                                version: serviceVersion
                            },
                            operation: {
                                name: operationName
                            },
                            delegateInformation: delegateInformation,
                            headers: headers,
                            token: token,
                            request: JSON.JSONRequest(request),
                            files: basicRequest.files,
                            response: {
                                status: 404
                            },
                            rejectReason: {
                                code: "missing-token",
                                message: "Missing token"
                            },
                            maxArraySize: configurations.maxArraySize,
                            latency: latency,
                            shouldLogToConsole: shouldLogToConsole
                        });
                    }
                    return response.status(404).send();
                }
                authenticated = false;
            }

            rawPayload = JWT.decodePayload(jwtToken);
            let validateResult = JWT.validateTokens(jwtToken, {
                includeRaw: true
            });

            if (!validateResult) {
                if (requireAuthentication && !testEnvironment) {
                    printRequest(request, token, basicRequest);
                }
                Logger.info(
                    "Authentication: " +
                    "404 rejection due to invalid token"
                );
                if (requireAuthentication && !testEnvironment) {
                    if (
                        operationInformation &&
                        operationInformation.messageBroker
                    ) {
                        let latency = moment().diff(startTime, "ms", true);
                        sendOperationLog({
                            messageBroker: operationInformation.messageBroker(),
                            sourceService: headers.sourceService,
                            service: {
                                name: serviceName,
                                version: serviceVersion
                            },
                            operation: {
                                name: operationName
                            },
                            delegateInformation: delegateInformation,
                            headers: headers,
                            token: token,
                            request: JSON.JSONRequest(request),
                            files: basicRequest.files,
                            response: {
                                status: 404
                            },
                            rejectReason: {
                                code: "invalid-token",
                                message: "Invalid token"
                            },
                            maxArraySize: configurations.maxArraySize,
                            latency: latency,
                            shouldLogToConsole: shouldLogToConsole
                        });
                    }
                    return response.status(404).send();
                } else {
                    authenticated = false;
                }
            }

            token.issueTimestamp = (
                (validateResult && validateResult.rawPayload) ?
                validateResult.rawPayload.iat :
                undefined
            );
            token.notBeforeTimestamp = (
                (validateResult && validateResult.rawPayload) ?
                validateResult.rawPayload.nbf :
                undefined
            );
            token.expireTimestamp = (
                (validateResult && validateResult.rawPayload) ?
                validateResult.rawPayload.exp :
                undefined
            );

            token.payload = (
                validateResult ?
                validateResult.payload :
                (rawPayload || token.payload)
            );
        }

        if (delegate.expectations) {
            let responseObject = JSON.expectResponse(
                request, delegate.expectations
            );

            responseObject = handleResponse(
                responseObject, {
                    operation: operationInformation,
                    usr: rawPayload ? rawPayload.usr : undefined,
                    brn: rawPayload ? rawPayload.brn : undefined
                }, undefined, headers.acceptLanguages, application
            );

            if (responseObject.status !== 200) {
                if (
                    operationInformation &&
                    operationInformation.messageBroker
                ) {
                    let latency = moment().diff(startTime, "ms", true);
                    sendOperationLog({
                        messageBroker: operationInformation.messageBroker(),
                        sourceService: headers.sourceService,
                        service: {
                            name: serviceName,
                            version: serviceVersion
                        },
                        operation: {
                            name: operationName
                        },
                        delegateInformation: delegateInformation,
                        headers: headers,
                        token: token,
                        request: JSON.JSONRequest(request),
                        files: basicRequest.files,
                        response: responseObject,
                        rejectReason: {
                            code: "expectation-rejection",
                            message: (
                                "Request body does not conform with expectation"
                            )
                        },
                        maxArraySize: configurations.maxArraySize,
                        latency: latency,
                        shouldLogToConsole: shouldLogToConsole
                    });
                }

                printRequest(request, token, basicRequest);
                Logger.info(`Expectation: ${
                    responseObject.status
                } rejection due to malformed request`);
                return response
                    .status(responseObject.status)
                    .json(responseObject.body);
            }
        }

        if (
            !shouldLogToConsole && configurations.inclusionPatterns.length > 0
        ) {
            shouldLogToConsole = configurations.inclusionPatterns.some(
                (pattern) => new RegExp(pattern, "g").test(request.originalUrl)
            );
        }
        if (shouldLogToConsole && configurations.exclusionPatterns.length > 0) {
            shouldLogToConsole = configurations.exclusionPatterns.some(
                (pattern) => new RegExp(pattern, "g").test(request.originalUrl)
            );
        }

        printRequest(request, token, basicRequest);

        let restriction = getRequestRestriction(request);

        let sendResponse = (
            responseObject: ControllerResponse<any> | Error,
            errorMessageHandler?: (errorMessage: ErrorMessage) => void
        ) => {
            let latency = moment().diff(startTime, "ms", true);
            let handledResponse = handleResponse(
                responseObject, {
                    operation: operationInformation,
                    usr: rawPayload ? rawPayload.usr : delegateInformation.usr,
                    brn: rawPayload ? rawPayload.brn : delegateInformation.brn
                }, errorMessageHandler,
                headers.acceptLanguages,
                application
            );

            if (!(responseObject instanceof Error)) {
                delegateInformation = Object.assign(
                    delegateInformation,
                    responseObject.information || {}
                );
            }

            if (headers.selfGenerateID) {
                response.setHeader("x-roundtrip", latency.toString());
            }
            if (handledResponse.status === 299) {
                response.statusMessage = "Warning";
            }
            if (typeof(handledResponse.body) === "object") {
                response.status(
                    handledResponse.status
                ).json(
                    handledResponse.body
                );
            }else{
                response.status(
                    handledResponse.status
                ).send(
                    handledResponse.body
                );
            }

            if (shouldLogToConsole) {
                let totalElapse = moment().diff(serviceStartTime, "ms", true);
                Logger.info(`Response[Inbound] [${ operationName }]${
                    restriction ? ` via "${ restriction }"` : ""
                } ${
                    (JSON.stringify(
                        {
                            operation:operationName,
                            totalElapse:totalElapse,
                            statusCode: response.statusCode,
                            statusMessage: response.statusMessage,
                            headers: (
                                configurations.includeHeaders ?
                                (response as any)._headers :
                                undefined
                            ),
                            body: handledResponse.body
                        },
                        JSON.SecureJSON,
                        configurations.prettyLog ? 2 : undefined
                    ) || "").substring(0, configurations.truncateAt)
                }`);
            }

            if (!operationInformation || !operationInformation.messageBroker) {
                return next();
            }

            return sendOperationLog({
                messageBroker: operationInformation.messageBroker(),
                sourceService: headers.sourceService,
                service: {
                    name: serviceName,
                    version: serviceVersion
                },
                operation: {
                    name: operationName
                },
                headers: headers,
                token: token,
                delegateInformation: delegateInformation,
                request: jsonRequest,
                files: basicRequest.files,
                response: handledResponse,
                maxArraySize: configurations.maxArraySize,
                latency: latency,
                shouldLogToConsole: shouldLogToConsole,
                callback: next
            });
        };

        let requestInformation: RequestInformation = {
            hasAccessToken: !!token.accessToken,
            hasAuthenticate: authenticated,
            requestID: headers.requestID,
            clientIP: headers.clientIP || "unknown-ip",
            serviceName: serviceName,
            serviceVersion: serviceVersion,
            acceptLanguage: headers.acceptLanguage,
            languages: headers.acceptLanguages,
            accessToken: token.accessToken,
            device: request.header("x-device") || "unknown-device",
            application: (
                request.header("x-application") || "unknown-application"
            ),
            userAgent: headers.userAgent
        };

        let delegateParameter: {
            request: ControllerRequest<any>;
            responder: ControllerResponder<any>;
            i18n: i18n;
        } = {
            request: {
                id: basicRequest.id,
                languages: basicRequest.languages,
                headers: headers,
                info: requestInformation,
                files: basicRequest.files,
                body: basicRequest.body,
                rawBody: basicRequest.rawBody,
                token: {
                    accessToken: token.accessToken || "",
                    payload: token.payload || {
                        brn: "unknown",
                        usr: "unknown",
                        dev: "unknown",
                        app: "unknown",
                        uac: "unknown"
                    }
                },
                contentByLanguages: (
                    <T>(target: LanguageObject<T>) => pickLanguage(
                        target, headers.acceptLanguages
                    )
                ),
                call: <T>(
                    serviceOperation: ServiceOperation<T>
                ) => serviceOperation((service) => ({
                    to: (path) => makeRequest({
                        service: service,
                        path: path,
                        requestInformation: requestInformation
                    }),
                    toExact: (path) => makeRequest({
                        service: service,
                        path: path,
                        exactPath: true,
                        requestInformation: requestInformation
                    })
                }))
            },
            responder: {
                send: sendResponse,
                error: sendResponse,
                errorWithAction: (action) => (error) => {
                    action(error);
                    return sendResponse(error);
                },
                errorWithErrorMessage: (action) => (error) => sendResponse(
                    error, action
                )
            },
            i18n: (
                application ?
                application().i18n(headers.acceptLanguages) :
                new I18NManager().i18n(headers.acceptLanguages)
            )
        };

        let authorizePromise: Promise<void[] | boolean> = Promise.resolve([]);

        if (delegate.security && delegate.security.authorization) {
            authorizePromise = Promise.all(delegate.security.authorization(
                delegateParameter.request
            ));
        }

        blacklistPromise.then((blacklist) => {
            if (blacklist) {
                Logger.info(
                    "Authentication: " +
                    "404 rejection due to blacklisted token"
                );
                if (
                    operationInformation &&
                    operationInformation.messageBroker
                ) {
                    let latency = moment().diff(startTime, "ms", true);
                    sendOperationLog({
                        messageBroker: operationInformation.messageBroker(),
                        sourceService: headers.sourceService,
                        service: {
                            name: serviceName,
                            version: serviceVersion
                        },
                        operation: {
                            name: operationName
                        },
                        delegateInformation: delegateInformation,
                        headers: headers,
                        token: token,
                        request: jsonRequest,
                        files: basicRequest.files,
                        response: {
                            status: 404
                        },
                        rejectReason: {
                            code: "blacklisted-token",
                            message: "Blacklisted token"
                        },
                        maxArraySize: configurations.maxArraySize,
                        latency: latency,
                        shouldLogToConsole: shouldLogToConsole
                    });
                }
                response.status(404).send();
                return Promise.resolve(false);
            }
            return authorizePromise;
        }).then((value) => {
            if (typeof(value) === "boolean") {
                return;
            }

            (
                (
                    restriction &&
                    delegate.handlePerform &&
                    delegate.handlePerform[restriction]
                ) ?
                delegate.handlePerform[restriction] :
                delegate.perform
            )(
                delegateParameter.request,
                delegateParameter.i18n
            ).then(
                (delegateResponse) => (
                    delegateParameter.responder.send(delegateResponse)
                )
            ).catch(
                (error) => (
                    error instanceof ProcessedError ?
                    delegateParameter.responder.errorWithErrorMessage(
                        error.action
                    )(error.error) :
                    delegateParameter.responder.error(error)
                )
            );
        }).catch((error) => {
            Logger.info(
                "Authorization: " +
                "401 rejection due to invalid authorization"
            );
            if (
                operationInformation &&
                operationInformation.messageBroker
            ) {
                let latency = moment().diff(startTime, "ms", true);
                sendOperationLog({
                    messageBroker: operationInformation.messageBroker(),
                    sourceService: headers.sourceService,
                    service: {
                        name: serviceName,
                        version: serviceVersion
                    },
                    operation: {
                        name: operationName
                    },
                    delegateInformation: delegateInformation,
                    headers: headers,
                    token: token,
                    request: jsonRequest,
                    files: basicRequest.files,
                    response: {
                        status: 401
                    },
                    rejectReason: {
                        code: "invalid-authorization",
                        message: "Invalid authorization"
                    },
                    maxArraySize: configurations.maxArraySize,
                    latency: latency,
                    shouldLogToConsole: shouldLogToConsole
                });
            }
            response.status(401).send();
        });
    });

    return handlers;
};
