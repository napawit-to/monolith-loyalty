import * as moment from "moment";
import * as _ from "lodash";
import { internal as Config } from "../../config";
import { RequestError } from "../../super-error";
import Formatter from "../../formatter";
import { RequestHandler, Request, ResponseWithError } from "../../request";

interface CBSHandlerOptions {
    transactionCode: string;
}

class CBSHandler implements RequestHandler {
    private options: CBSHandlerOptions;

    constructor(options: CBSHandlerOptions) {
        this.options = options;
    }

    onSend(request: Request) {
        let now = moment();
        let cbsTransactionDate = Config.getGlobal<string>(
            "third-party-services.cbs.transaction-date", ""
        );
        let cbsTimeToFutureDate = Config.getGlobal<string>(
            "third-party-services.cbs.time-to-future-date", ""
        );

        let transactionTime = now.format("HHmmss");
        let transactionDate = now.format("YYYYMMDD");
        if (cbsTransactionDate) {
            transactionDate = cbsTransactionDate;
        }
        let postedDate = transactionDate;
        if (cbsTimeToFutureDate && transactionTime >= cbsTimeToFutureDate) {
            postedDate = now.add(1, "days").format("YYYYMMDD");
        }

        let payload = {
            transaction_code: this.options.transactionCode,
            transaction_reference_code: `H01${ now.format("YYMMDDHHmmssSSS") }`,
            transaction_date: transactionDate,
            transaction_time: transactionTime,
            posted_date: postedDate
        };

        return request.jsonBody(_.assign(payload, request.options.body));
    }

    onRespond(request: Request, response: ResponseWithError) {
        if (
            !response.statusCode && !response.body
        ) {
            return {
                error: new Error("E010001")
            };
        }

        if (
            response.statusCode === undefined ||
            response.statusCode < 200 ||
            response.statusCode >= 300
        ) {
            return {
                error: new Error("E010000")
            };
        }

        if (response.body["status_code"]) {
            let statusCode = `${ response.body.status_code }`;
            if (!response.body["error_message"]) {
                return {
                    error: new Error(`CBS-${ statusCode }`)
                };
            }
            return {
                error: new RequestError(
                    `CBS-${ statusCode }`,
                    {
                        code: `E01${ Formatter(statusCode).padLeft(4, "0") }`,
                        message: response.body["error_message"]
                    }
                )
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

export default (options: CBSHandlerOptions) => new CBSHandler(options);
