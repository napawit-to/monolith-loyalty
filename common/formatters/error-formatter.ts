import { default as StringTemplate, STANDARD_MAPPER } from "../string-template";

interface ControllerError {
    code: string;
    message: string;
    target?: string;
    details?: ControllerError[];
}

export default class ErrorFormatter {
    value: Readonly<ControllerError>;

    constructor(value: ControllerError) {
        this.value = value;
    }

    mapValue(object?: object) {
        return {
            code: this.value.code,
            message: StringTemplate(
                this.value.message, object, STANDARD_MAPPER
            ),
            target: this.value.target,
            details: this.value.details
        };
    }
}
