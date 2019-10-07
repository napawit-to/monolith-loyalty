import * as moment from "moment";
import * as _ from "lodash";
import * as uuidv1 from "uuid/v1";
import { internal as Config } from "../../config";
import { RequestError } from "../../super-error";
import Formatter from "../../formatter";
import {
    RequestHandler, Request, ResponseWithError
} from "../../request";

interface CBSSMOAHandlerOptions {
    serviceID: string;
    deviceID: string;
    branchCode: string;
}

class CBSSMOAHandler implements RequestHandler {
    private options: CBSSMOAHandlerOptions;

    constructor(options: CBSSMOAHandlerOptions) {
        this.options = options;
    }

    onSend(request: Request) {
        let now = moment();

        let cbsTransactionTimestamp = Config.getGlobal<string>(
            "third-party-services.cbs-smoa.transaction-timestamp", ""
        );

        if (!cbsTransactionTimestamp) {
            cbsTransactionTimestamp = now.toISOString();
        }

        request.header("service_id", this.options.serviceID);
        request.header("datetime", cbsTransactionTimestamp);
        request.header("accept-encoding", "UTF-8");
        request.header("channel", "SUMO");
        request.header("terminal_id", this.options.deviceID);
        request.header("branch_code", this.options.branchCode);
        request.header("uuid", uuidv1());
        return request;
    }

    onRespond(request: Request, response: ResponseWithError) {
        if (response.statusCode === undefined) {
            return {
                error: new Error("E010000")
            };
        }

        if (response.statusCode >= 400 && response.statusCode < 500) {
            if (response.body["error_code"]) {
                let statusCode = `${response.body.error_code}`;
                if (!response.body["error_description"]) {
                    return {
                        error: new Error(`CBS-${statusCode}`)
                    };
                }
                return {
                    error: new RequestError(
                        `CBS-${statusCode}`,
                        {
                            code: `E01${Formatter(statusCode).padLeft(4, "0")}`,
                            message: response.body["error_description"]
                        }
                    )
                };
            }
        }

        if (
            response.statusCode < 200 ||
            response.statusCode >= 300
        ) {
            return {
                error: new Error("E010000")
            };
        }

        let httpStatusCode = response.statusCode;
        let body = response.body;

        if (
            response.body["response_result"] &&
            response.body["response_result"] === "3"
        ) {
            httpStatusCode = 199;
            body = { ...body, ...{
                warning: {
                    code: `W01${ Formatter(
                        response.body["response_result"] as string
                    ).padLeft(4, "0") }`,
                    message: response.body["error_message"]
                }
            } };
        }

        return {
            statusCode: httpStatusCode,
            headers: response.headers,
            body: body
        };
    }
}

export default (options: CBSSMOAHandlerOptions) => new CBSSMOAHandler(options);
