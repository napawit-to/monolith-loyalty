import * as fs from "fs";
import * as url from "url";
import * as request from "request";
import * as _ from "lodash";
import * as JSON from "./middlewares/json";
import WebService from "./adapters/implementations/web-service";
import SuperError from "./super-error";
import CircuitBreaker from "./circuit-breaker";
import Logger from "./logger";
import { internal as Config } from "./config";
import * as moment from "moment";
let startTime:moment.Moment;
import {
    ServiceOperation
} from "./adapters/web-service";

export interface RequestHandler {
    onSend?(request: Request): Request;
    onRespond?(
        request: Request,
        response: ResponseWithError
    ): ResponseWithError | undefined;
    onError?(request: Request, error: Error): Response | undefined;
}

export type ResponseWithError = Response & ErrorResponse;

export interface ErrorResponse {
    error?: Error;
}

export interface Response {
    statusCode?: number;
    statusMessage?: string;
    headers?: any;
    body?: any;
}

export type MockResponseHandler = (request: Request) => Response;

export interface MockRequestHandler {
    [method: string]: Response | MockResponseHandler;
}

export interface MockRouter {
    [path: string]: MockRequestHandler;
}

export interface MockService {
    [service: string]: MockRouter;
}

export class Request {
    protected requestOptions: (request.UriOptions & request.CoreOptions);
    protected handlers: RequestHandler[] = [];
    protected requestAlias: string[];
    protected certificateAuthorities?: Buffer[];
    protected bypassCircuitBreaker = false;
    protected logging = true;
    protected operation:string = "";
    constructor(options: {
        uri: string;
        identifier: string;
        logging?: boolean;
    }) {
        this.requestOptions = {
            uri: options.uri
        };

        this.requestOptions.timeout = Config.getGlobal<number | undefined>(
            "circuit-breaker.request-timeout", undefined
        );
        this.requestAlias = [options.identifier];

        if (options.logging !== undefined) {
            this.logging = options.logging;
        }
    }

    get options() {
        return this.requestOptions;
    }

    alias(alias: string) {
        this.requestAlias.push(alias);
        return this;
    }

    use(handler: RequestHandler) {
        this.handlers.push(handler);
        return this;
    }

    protected reportStatus(status: boolean) {
        this.requestAlias.forEach((alias) => {
            CircuitBreaker.reportStatus(alias, status);
        });
    }

    protected sendRequest(
        method: string,
        body?: any,
        json?: boolean,
        headers?: {[key: string]: string}
    ) {
        let selfRequest = this.method(method);
        if (body) {
            selfRequest = selfRequest.body(body);
        }
        if (json) {
            selfRequest = selfRequest.json();
        }
        if (headers) {
            _.forIn(headers, (value, key) => {
                if (!key) {
                    return;
                }
                selfRequest = selfRequest.header(key, value);
            });
        }
        return selfRequest.send();
    }

    get(body?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("GET", body, false, headers);
    }

    getJSON(json?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("GET", json, true, headers);
    }

    post(body?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("POST", body, false, headers);
    }

    postJSON(json?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("POST", json, true, headers);
    }

    put(body?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("PUT", body, false, headers);
    }

    putJSON(json?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("PUT", json, true, headers);
    }

    delete(body?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("DELETE", body, false, headers);
    }

    deleteJSON(json?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("DELETE", json, true, headers);
    }

    head(body?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("HEAD", body, false, headers);
    }

    headJSON(json?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("HEAD", json, true, headers);
    }

    patch(body?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("PATCH", body, false, headers);
    }

    patchJSON(json?: any, headers?: {[key: string]: string}) {
        return this.sendRequest("PATCH", json, true, headers);
    }

    bypass(bypass: boolean) {
        this.bypassCircuitBreaker = bypass;
        return this;
    }

    method(method: string) {
        this.requestOptions.method = method;
        return this;
    }

    header(key: string, value: string) {
        if (!this.requestOptions.headers) {
            this.requestOptions.headers = {};
        }
        this.requestOptions.headers[key] = value;
        return this;
    }

    body(body: any) {
        this.requestOptions.body = body;
        if (this.requestOptions.json) {
            this.requestOptions.json = undefined;
        }
        return this;
    }

    certificateFile(filePath: string) {
        return this.certificate(fs.readFileSync(filePath));
    }

    certificate(certificateContent: Buffer) {
        this.requestOptions.cert = certificateContent;
        return this;
    }

    primaryKeyFile(filePath: string) {
        return this.primaryKey(fs.readFileSync(filePath));
    }

    primaryKey(primaryKeyContent: Buffer) {
        this.requestOptions.key = primaryKeyContent;
        return this;
    }

    passphrase(passphrase: string) {
        this.requestOptions.passphrase = passphrase;
        return this;
    }

    strictSSL(strictSSL: boolean) {
        this.requestOptions.strictSSL = strictSSL;
        return this;
    }

    resetCertificateAuthority() {
        this.certificateAuthorities = [];
        return this;
    }

    certificateAuthorityFile(filePath: string) {
        return this.certificateAuthority(fs.readFileSync(filePath));
    }

    certificateAuthority(certificateAuthorityContent: Buffer) {
        if (this.certificateAuthorities === undefined) {
            this.certificateAuthorities = [];
        }
        this.certificateAuthorities.push(certificateAuthorityContent);
        return this;
    }

    jsonBody(json: any) {
        return this.body(json).json();
    }

    json() {
        this.requestOptions.json = true;
        return this;
    }

    auth(auth: request.AuthOptions) {
        this.requestOptions.auth = auth;
        return this;
    }

    form(form: any) {
        this.requestOptions.form = form;
        return this;
    }

    formData(formData: any) {
        this.requestOptions.formData = formData;
        return this;
    }

    encoding(encoding: string) {
        this.requestOptions.encoding = encoding;
        return this;
    }

    timeout(timeout: number) {
        this.requestOptions.timeout = timeout;
        return this;
    }

    operations(operation:string){
        this.operation = operation;
        return this;
    }

    send() {
        let truncateAt = Config.getGlobal<number>(
            "logging.request.truncate-at",
            4000
        );
        let includeHeaders = Config.getGlobal<boolean>(
            "logging.request.include-headers",
            false
        );
        let prettyLog = Config.getGlobal<boolean>(
            "logging.request.pretty",
            false
        );
        return new Promise<Response>((resolve, reject) => {
            if (!this.bypassCircuitBreaker) {
                this.requestAlias.forEach((alias) => {
                    CircuitBreaker.openWhen({
                        key: alias,
                        limit: Config.getGlobal<number>(
                            "circuit-breaker.fail-limit", 5
                        )
                    }).halfOpenWhen({
                        key: alias,
                        resetTime: Config.getGlobal<number>(
                            "circuit-breaker.reset-time", 30000
                        )
                    }).closeWhen({
                        key: alias,
                        limit: Config.getGlobal<number>(
                            "circuit-breaker.success-limit", 5
                        )
                    });
                });

                let circuitOpen = this.requestAlias.some(
                    (alias) => !CircuitBreaker.getStatus(alias)
                );

                if (circuitOpen) {
                    return reject("E000002");
                }
            }

            this.requestOptions.ca = this.certificateAuthorities;

            if (this.logging) {
                Logger.info(`Request[Outbound] [${
                    (this.requestOptions.method || "-").toUpperCase()
                } ${
                    this.requestOptions.uri
                }] ${
                    (
                        JSON.stringify({
                            operation:this.operation,
                            headers: (
                                includeHeaders ?
                                this.requestOptions.headers :
                                undefined
                            ),
                            body: this.requestOptions.body
                        }, JSON.SecureJSON, prettyLog ? 2 : undefined) || ""
                    ).substring(0, truncateAt)
                }`);
            }

            let handleSend = false;
            for (let handler of this.handlers) {
                /* tslint:disable-next-line:no-unbound-method */
                if (!handler.onSend) {
                    continue;
                }
                handleSend = true;
                let output = handler.onSend(this);
                this.handlers = output.handlers;
                this.requestOptions = output.requestOptions;
                this.requestAlias = output.requestAlias;
                this.bypassCircuitBreaker = output.bypassCircuitBreaker;
            }
            startTime = moment();
            request(this.requestOptions, (error, response, body) => {
                if (error) {
                    if (
                        !this.bypassCircuitBreaker && (
                            error.code === "ETIMEDOUT" ||
                            error.code === "ESOCKETTIMEDOUT" ||
                            Config.getGlobal<number[]>(
                                "circuit-breaker.unexpected-status", []
                            ).some((status) => error.code === status)
                        )
                    ) {
                        this.reportStatus(false);
                    }

                    let handlerResponse: Response | undefined;

                    Logger.info(`Response[Outboud/Error] [${
                        this.requestOptions.uri
                    }] ${
                        (
                            JSON.stringify({
                                operation:this.operation,
                                alias:this.requestAlias[0],
                                elapse:moment().diff(startTime, "ms", true),
                                errorCode:error.code,
                                errorMsg:error.message
                            }, JSON.SecureJSON, prettyLog ? 2 : undefined) || ""
                        ).substring(0, truncateAt)
                    }`);

                    for (let handler of this.handlers) {
                        /* tslint:disable-next-line:no-unbound-method */
                        if (!handler.onError) {
                            continue;
                        }
                        let output = handler.onError(this, error);
                        handlerResponse = output;
                        break;
                    }

                    if (handlerResponse) {
                        return resolve(handlerResponse);
                    } else {
                        return reject(error);
                    }
                }
                if (!this.bypassCircuitBreaker) {
                    this.reportStatus(true);
                }

                let responseBody: ResponseWithError = {
                    statusCode: response.statusCode,
                    statusMessage: response.statusMessage,
                    headers: response.headers,
                    body: body
                };


                if (this.logging) {
                    Logger.info(`Response[Outbound] [${
                        this.requestOptions.uri
                    }] ${
                        (
                            JSON.stringify({
                                operation:this.operation,
                                alias:this.requestAlias[0],
                                elapse:moment().diff(startTime, "ms", true),
                                statusCode: responseBody.statusCode,
                                statusMessage: responseBody.statusMessage,
                                headers: (
                                    includeHeaders ?
                                    responseBody.headers :
                                    undefined
                                ),
                                body: responseBody.body
                            }, JSON.SecureJSON, prettyLog ? 2 : undefined) || ""
                        ).substring(0, truncateAt)
                    }`);
                }

                let handleResponse = false;
                for (let handler of this.handlers) {
                    /* tslint:disable-next-line:no-unbound-method */
                    if (!handler.onRespond) {
                        continue;
                    }
                    let output = handler.onRespond(this, responseBody);
                    if (output === undefined) {
                        continue;
                    }
                    handleResponse = true;
                    responseBody = output;
                }

                if (responseBody.error) {
                    return reject(responseBody.error);
                }

                return resolve(responseBody);
            });
        });
    }

    static get emptyMock() {
        return new MockRequest("*");
    }

    static mockService(mockService: MockService) {
        function makeRequest(service: WebService) {
            return (path: string) => {
                let routes: MockRouter | undefined = mockService[service.name];
                if (!routes) {
                    return new MockRequest(service.name);
                }
                let handler: MockRequestHandler | undefined;
                for (let routePattern in routes) {
                    if (!routes.hasOwnProperty(routePattern)) {
                        continue;
                    }
                    let prefix1 = routePattern.substr(0, 1);
                    let prefix2 = routePattern.substr(0, 2);
                    let pattern1 = routePattern.substr(1);
                    let pattern2 = routePattern.substr(2);

                    let match = (
                        prefix2 === "<=" && path.startsWith(pattern2) ||
                        prefix1 === "=" && path === pattern1 ||
                        new RegExp("^" + routePattern, "g").test(path)
                    );

                    if (match) {
                        handler = routes[routePattern];
                        break;
                    }
                }
                if (!handler) {
                    return new MockRequest(service.name);
                }
                return new MockRequest(service.name, path, handler);
            };
        }

        return <T>(
            serviceOperation: ServiceOperation<T>
        ) => serviceOperation((service) => ({
            to: makeRequest(service),
            toExact: makeRequest(service)
        }));
    }
}

class MockRequest extends Request {
    protected handler?: MockRequestHandler;

    constructor(identifier: string);
    constructor(identifier: string, path: string, handler: MockRequestHandler);
    constructor(
        identifier: string,
        path?: string,
        handler?: MockRequestHandler
    ) {
        super({
            uri: path || "",
            identifier: identifier
        });
        this.handler = handler;
    }

    send() {
        return new Promise<Response>((resolve, reject) => {
            if (
                !this.handler ||
                !this.requestOptions.method ||
                !this.handler[this.requestOptions.method.toLowerCase()]
            ) {
                let error = new Error();
                error.name = "NoImplementationException";
                error.message = (
                    "Mock Request is being used and require to be overrided. " +
                    `Request: ${
                        this.requestOptions.method ?
                        `${this.requestOptions.method.toLowerCase()} ` : ""
                    }${
                        this.requestOptions.uri
                    }`
                );
                return reject(error);
            }
            let response = this.handler[
                this.requestOptions.method.toLowerCase()
            ];
            if (typeof(response) === "function") {
                resolve(response(this));
            } else {
                resolve(response);
            }
        });
    }
}

export default Request;
