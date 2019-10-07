import {
    parseRegExp
} from "./data-pattern";

export let getPattern = (name: string) => parseRegExp(`<${ name }>`);

export type PrimitiveType = "any" | "number" | "string" | "boolean" | RegExp;

export type ExpectationType = PrimitiveType | Expectation | ArrayExpectation;

export interface ArrayExpectation extends Array<ExpectationType> {}

export interface Expectation {
    [key: string]: ExpectationSchema;
}

interface ExpectationProperties {
    required?: boolean;
    // number: minimum / maximum value
    // string: minimum / maximum length
    // array : minimum / maximum element length
    // object: minimum / maximum key length
    size?: number | number[] | string | string[];
}

interface SingleExpectation extends ExpectationProperties {
    type: ExpectationType;
}

interface MultipleExpectation extends ExpectationProperties {
    types: ExpectationType[];
}

export type ExpectationSchema = SingleExpectation | MultipleExpectation;

export enum ExpectationStatus {
    OK,
    TypeError, TypesError,
    FormatError,
    Required,
    LengthError, RangeError,
    SchemaError
}

export interface ExpectationResult {
    status: ExpectationStatus;
    expect?: {
        [key: string]: any;
    };
    actual?: {
        [key: string]: any;
    };
    parent?: ExpectationResult;
}

export default Expectation;

function expectLength(
    object: any,
    size?: number | number[] | string | string[],
    required?: boolean
) : {
    status: ExpectationStatus.OK;
} | {
    status: ExpectationStatus;
    length: number;
} {
    size = size === undefined ? [] : size;
    let sizes: (number | string)[] | undefined = (
        Array.isArray(size) ? size : [size]
    );

    if (sizes.length === 0) {
        sizes = undefined;
    }

    // NOTE(sirisak.lu): Uncomment for more strict on empty value
    // if (
    //     !required &&
    //     sizes === undefined &&
    //     (typeof(object) === "string" || Array.isArray(object)) &&
    //     object.length === 0
    // ) {
    //     return {
    //         status: ExpectationStatus.LengthError,
    //         length: 0
    //     }
    // }

    if (sizes === undefined) {
        return {
            status: ExpectationStatus.OK
        };
    }

    let typeError = ExpectationStatus.LengthError;
    let value: number | undefined;

    if (typeof(object) === "string" || Array.isArray(object)) {
        value = object.length;
    } else if (typeof(object) === "object") {
        value = Object.keys(object).length;
    } else if (typeof(object) === "number") {
        typeError = ExpectationStatus.RangeError;
        value = object;
    }

    if (value === undefined) {
        return {
            status: ExpectationStatus.OK
        };
    }

    if (!sizes.some((checkSize) => {
        if (value === undefined) {
            return false;
        }
        if (typeof(checkSize) === "number") {
            return value === checkSize;
        }
        let matches = checkSize.match(
            "^(([\\(\\[])(\\d+)?:(\\d+)?([\\]\\)])|" +
            "[\\[\\(]?(\\d+)[\\]\\)]?)$"
        );
        if (!matches) {
            return false;
        }
        if (matches[6] !== undefined) {
            return value === parseInt(matches[6]);
        }
        let leftInclusive = matches[2] === "[";
        let rightInclusive = matches[5] === "]";
        let inRange = true;
        if (
            matches[3] !== undefined
        ) {
            inRange = inRange && value > parseInt(matches[3]) - (
                leftInclusive ? 1 : 0
            );
        }
        if (
            matches[4] !== undefined
        ) {
            inRange = inRange && value < parseInt(matches[4]) + (
                rightInclusive ? 1 : 0
            );
        }

        return inRange;
    })) {
        return {
            status: typeError,
            length: value
        };
    }

    return {
        status: ExpectationStatus.OK
    };
}

function expectValue(
    object: any,
    expectation?: PrimitiveType
) : ExpectationResult {
    if (!expectation) {
        return {
            status: ExpectationStatus.OK
        };
    }

    if (expectation instanceof RegExp) {
        return (
            typeof(object) !== "string" ? {
                status: ExpectationStatus.TypeError,
                expect: {
                    type: "string"
                },
                actual: {
                    type: Array.isArray(object) ? "array" : typeof(object)
                }
            } : (
                new RegExp(
                    expectation.source, expectation.flags
                ).test(object) ? {
                    status: ExpectationStatus.OK
                } : {
                    status: ExpectationStatus.FormatError,
                    expect: {
                        format: expectation.source
                    },
                    actual: {
                        value: object
                    }
                }
            )
        );
    } else {
        if (expectation === "any") {
            return {
                status: ExpectationStatus.OK
            };
        }
        return (
            typeof(object) === expectation ? {
                status: ExpectationStatus.OK
            } : {
                status: ExpectationStatus.TypeError,
                expect: {
                    type: expectation
                },
                actual: {
                    type: Array.isArray(object) ? "array" : typeof(object)
                }
            }
        );
    }
}

function expectArray(
    object: any,
    expectation?: ArrayExpectation
) : ExpectationResult {
    if (!expectation) {
        return {
            status: ExpectationStatus.OK
        };
    }

    if (!Array.isArray(object)) {
        return {
            status: ExpectationStatus.TypeError,
            expect: {
                type: "array"
            },
            actual: {
                type: typeof(object)
            }
        };
    }

    return object.map((value) => {
        for (let valueExpectation of expectation) {
            if (
                (
                    typeof(valueExpectation) === "string" &&
                    (
                        valueExpectation === "string" ||
                        valueExpectation === "number" ||
                        valueExpectation === "boolean" ||
                        valueExpectation === "any"
                    )
                ) || valueExpectation instanceof RegExp
            ) {
                let result = expectValue(value, valueExpectation);
                if (result.status !== ExpectationStatus.OK) {
                    return result;
                }
            } else if (
                Array.isArray(valueExpectation)
            ) {
                let result = expectArray(value, valueExpectation);
                if (result.status !== ExpectationStatus.OK) {
                    return result;
                }
            } else if (
                typeof(valueExpectation) === "object" &&
                !Array.isArray(valueExpectation)
            ) {
                let result = expect(value, valueExpectation);
                if (result.status !== ExpectationStatus.OK) {
                    return result;
                }
            }
        }
        return {
            status: ExpectationStatus.OK
        };
    }).find(
        (result) => result.status !== ExpectationStatus.OK
    ) || {
        status: ExpectationStatus.OK
    };
}

function expectSchema(
    key: string,
    value: any,
    schema: ExpectationType
) : ExpectationResult {
    let result: ExpectationResult = {
        status: ExpectationStatus.SchemaError,
        expect: {
            key: key
        }
    };

    if (
        (
            typeof(schema) === "string" &&
            (
                schema === "string" ||
                schema === "number" ||
                schema === "boolean" ||
                schema === "any"
            )
        ) || schema instanceof RegExp
    ) {
        result = expectValue(value, schema);
    } else if (
        Array.isArray(schema)
    ) {
        result = expectArray(value, schema);
    } else if (
        typeof(schema) === "object" &&
        !Array.isArray(schema)
    ) {
        result = expect(value, schema);
    }

    if (result.status !== ExpectationStatus.OK) {
        return {
            status: result.status,
            parent: result,
            expect: {
                key: key
            }
        };
    }
    return result;
}

export function expect(
    object: any,
    expectation?: Expectation
) : ExpectationResult {
    if (!expectation) {
        return {
            status: ExpectationStatus.OK
        };
    }

    if (typeof(object) !== "object" || Array.isArray(object)) {
        return {
            status: ExpectationStatus.TypeError,
            expect: {
                type: "object"
            },
            actual: {
                type: Array.isArray(object) ? "array" : typeof(object)
            }
        };
    }

    for (let key in expectation) {
        if (!expectation.hasOwnProperty(key)) {
            continue;
        }

        let valueExpectation = expectation[key];

        if (!object.hasOwnProperty(key)) {
            let required = valueExpectation.required;
            if (required) {
                return {
                    status: ExpectationStatus.Required,
                    expect: {
                        key: key
                    }
                };
            } else {
                continue;
            }
        }

        let value = object[key];
        let result: ExpectationResult | undefined;

        if (valueExpectation.hasOwnProperty("type")) {
            let schema = valueExpectation as SingleExpectation;
            result = expectSchema(key, value, schema.type);
        } else {
            let schemas = valueExpectation as MultipleExpectation;
            if (!schemas.types.some(
                (schema) => expectSchema(
                    key, value, schema
                ).status === ExpectationStatus.OK
            )) {
                return {
                    status: ExpectationStatus.TypesError,
                    expect: {
                        key: key
                    }
                };
            } else {
                result = {
                    status: ExpectationStatus.OK
                };
            }
        }

        if (result.status !== ExpectationStatus.OK) {
            return {
                status: result.status,
                parent: result,
                expect: {
                    key: key
                }
            };
        }

        let lengthResult = expectLength(
            value, valueExpectation.size, valueExpectation.required
        );
        if (lengthResult.status !== ExpectationStatus.OK) {
            return {
                status: lengthResult.status,
                expect: {
                    size: valueExpectation.size
                },
                actual: {
                    key: key,
                    length: lengthResult.length
                }
            };
        }
    }
    return {
        status: ExpectationStatus.OK
    };
}
