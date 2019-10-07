import { internal as Config } from "../../config";
import { RequestHandler, Request, ResponseWithError } from "../../request";

class CBSAuthenticationHandler implements RequestHandler {
    private errorCodes: Readonly<string[]>;

    constructor() {
        this.errorCodes = Config.getGlobal<string[]>(
            "third-party-services.cbs.authentication.error-codes", []
        );
    }

    onRespond(request: Request, response: ResponseWithError) {
        if (
            response.error === undefined ||
            this.errorCodes.indexOf(response.error.message) < 0
        ) {
            return undefined;
        }

        return {
            statusCode: 200,
            body: {
                error: response.error
            }
        };
    }
}

export default () => new CBSAuthenticationHandler();
