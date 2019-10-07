import * as express from "express";
import * as _ from "lodash";
import { internal as Config } from "../config";
import Formatter from "../formatter";
import {
    Expectation,
    ExpectationResult,
    ExpectationStatus,
    expect
} from "../expectation";

/* tslint:disable-next-line:no-unbound-method */
export let parse = JSON.parse;
/* tslint:disable-next-line:no-unbound-method */
export let stringify = JSON.stringify;

export function Stack(...replacers: ((key: string, value: any) => any)[]) {
    if (replacers.length === 0) {
        return undefined;
    } else if (replacers.length === 1) {
        return replacers[1];
    }

    return (key: string, value: any) => {
        let oldValue = value;
        for (let replacer of replacers) {
            value = replacer(key, value);
            if (value !== oldValue) {
                return value;
            }
        }
        return value;
    };
}

export function replace(
    object: any,
    replacer?: (key: string, value: any) => any
) {
    if (typeof(object) !== "object" || Array.isArray(object)) {
        return object;
    }
    let newObject: any = {};
    for (let key of Object.keys(object)) {
        let value = object[key];

        if (typeof(value) === "object" && !Array.isArray(value)) {
            value = replace(value, replacer);
        }
        if (replacer) {
            value = replacer(key, value);
        }
        newObject[key] = value;
    }
    return newObject;
}

export function ArrayLimiter(size: number) {
    return (key: string, value: any) => (
        Array.isArray(value) ?
        value.slice(0, size) :
        value
    );
}

const secureKeys: {
    [key: string]: string;
} = Config.getGlobal("logging.secure-keys", {});

export function SecureJSON(key: string, value: any) {
    if (
        value && key === "body" &&
        value["type"] && value["type"] === "Buffer" &&
        Array.isArray(value["data"])
    ) {
        return {
            type: "Buffer"
        };
    }
    if (secureKeys.hasOwnProperty(key)) {
        let checkTypes = secureKeys[key].split("|");
        let valueType: string = typeof(value);

        if (valueType === "object") {
            valueType = Array.isArray(value) ? "array" : "object";
        }

        if (checkTypes.some(
            (checkType) => checkType === "any" || valueType === checkType)
        ) {
            return `****`;
        }
    }
    return value;
}

export function JSONRequest(request: express.Request) {
    return {
        header: _.isEmpty(request.headers) ? undefined : request.headers,
        query: _.isEmpty(request.query) ? undefined : request.query,
        parameter: _.isEmpty(request.params) ? undefined : request.params,
        body: _.isEmpty(request.body) ? undefined : request.body
    };
}

export { expect as expect };

export function expectResponse(
    request: express.Request,
    expectation?: {
        header?: Expectation;
        query?: Expectation;
        parameter?: Expectation;
        body?: Expectation;
    }
) : ({
    status: number;
    body?: Object;
} | Error) {
    let errorResult: ExpectationResult | undefined;

    if (expectation && expectation.header) {
        let expectResult = expect(
            request.headers || {}, expectation.header
        );

        if (expectResult.status !== ExpectationStatus.OK) {
            errorResult = expectResult;
        }
    }
    if (!errorResult && expectation && expectation.query) {
        let expectResult = expect(
            request.query || {}, expectation.query
        );

        if (expectResult.status !== ExpectationStatus.OK) {
            errorResult = expectResult;
        }
    }
    if (!errorResult && expectation && expectation.parameter) {
        let expectResult = expect(
            request.params || {}, expectation.parameter
        );

        if (expectResult.status !== ExpectationStatus.OK) {
            errorResult = expectResult;
        }
    }
    if (!errorResult && expectation && expectation.body) {
        let expectResult = expect(
            request.body || {}, expectation.body
        );

        if (expectResult.status !== ExpectationStatus.OK) {
            errorResult = expectResult;
        }
    }

    if (errorResult) {
        if (process.env["NODE_ENV"] === "production") {
            return new Error("E000003");
        }

        return {
            status: (
                errorResult.status === ExpectationStatus.TypeError ?
                406 : 400
            ),
            body: {
                error: {
                    code: "E000003",
                    message: Formatter(errorResult).toReadableString()
                }
            }
        };
    }

    return {
        status: 200
    };
}
