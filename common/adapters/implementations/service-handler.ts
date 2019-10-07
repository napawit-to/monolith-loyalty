import * as _ from "lodash";
import { RequestError } from "../../super-error";
import { RequestHandler, Request, ResponseWithError } from "../../request";

class ServiceHandler implements RequestHandler {

    onRespond(request: Request, response: ResponseWithError) {
        if (
            !response.statusCode && !response.body
        ) {
            return {
                error: new Error("E000001")
            };
        }

        if (
            response.statusCode &&
            response.statusCode >= 400 &&
            response.statusCode <= 499
        ) {

            return {
                error: new RequestError(
                    `Service-${response.body.error.code}`,
                    {
                        code: `${response.body.error.code}`,
                        message: response.body.error.message

                    }
                )
            };
        }

        if (
            response.statusCode === undefined ||
            response.statusCode < 200 ||
            response.statusCode >= 300
        ) {
            return {
                error: new Error("E000000")
            };
        }

        return {
            statusCode: response.statusCode,
            headers: response.headers,
            body: response.body
        };
    }
}

export default () => new ServiceHandler();
