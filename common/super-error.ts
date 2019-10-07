export class SuperError extends Error {
    superErrors: (SuperError | Error)[] = [];

    constructor(
        message: string,
        ...superErrors: (SuperError | Error | undefined)[]
    ) {
        super(message);
        this.superErrors = (
            superErrors.filter((error) => !!error) as (SuperError | Error)[]
        );
    }
}

export class RequestError extends Error {
    statusCode?: number;
    error?: {
        code: string;
        message: string;
    };

    constructor(
        code: string,
        error?: {
            code: string;
            message: string;
        },
        statusCode?: number
    ) {
        super(code);
        this.statusCode = statusCode;
        this.error = error;
    }
}

export class DynamicError extends Error {
    data?: object;

    constructor(
        code: string,
        data?: object
    ) {
        super(code);
        this.data = data;
    }
}

export default SuperError;
