import { ControllerErrorResponse } from "./middlewares/controller";
import {
    SupportedLanguage, LanguageObject, pickLanguage
} from "./language-extractor";

export interface ErrorConfigurationMapSchema {
    [key: string]: {
        code?: string;
        status?: number;
        message: LanguageObject<string>;
    };
}

export class ErrorMap {
    private errorMap: ErrorConfigurationMapSchema;

    constructor(errorMap?: ErrorConfigurationMapSchema) {
        this.errorMap = errorMap || {};
    }

    get length() {
        return Object.keys(this.errorMap).length;
    }

    map(
        error: Error,
        languages?: SupportedLanguage[]
    ): ControllerErrorResponse | undefined {
        let errorCode = error.message;

        let baseErrors: ErrorConfigurationMapSchema = {
            E000000: {
                status: 500,
                message: {
                    en: "Unexpected error"
                }
            },
            E000001: {
                status: 500,
                message: {
                    en: "Unexpected error"
                }
            },
            E000002: {
                status: 503,
                message: {
                    en: "Service temporary unavailable"
                }
            },
            E000003: {
                status: 400,
                message: {
                    en: "Invalid request"
                }
            }
        };

        let mergeErrors = { ...baseErrors, ...this.errorMap };

        if (errorCode in mergeErrors) {
            let errorSchema = mergeErrors[errorCode];

            return {
                status: errorSchema.status,
                error: {
                    code: errorSchema.code || errorCode,
                    message: (
                        pickLanguage(errorSchema.message, languages) ||
                        "LanguageError: No message set for this error code"
                    )
                }
            };
        }

        return undefined;
    }
}

export default ErrorMap;
