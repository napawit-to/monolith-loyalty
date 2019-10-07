export interface Mapper {
    [key: string]: (value: any, ...args: string[]) => any;
}

export const STANDARD_MAPPER: Mapper = {
    lower: (value) => value.toLowerCase(),
    upper: (value) => value.toUpperCase(),
    prefix: (value, prefix) => value ? `${ prefix }${ value }` : "",
    substring: (value, index, length) => (value || "").substr(
        index || 0, parseInt(length || (value || "").length)
    ),
    default: (value, defaultValue) => value ? value : (
        defaultValue || ""
    )
};

function parseCalls(
    value: any,
    calls: string,
    functions: Mapper
): any {
    let matches = new RegExp(
        "([^[\\(,\\s]+)(\\s*([[\\(])([^\\)\\]\\n]*)([\\)\\]])?)?,?", "g"
    ).exec(calls);
    if (!matches) {
        let error = new Error();
        error.name = "InvalidCallException";
        error.message = "call pattern is not valid";
        throw error;
    }
    let open = matches[3] || "";
    let close = matches[5] || "";
    if (open !== close && (
        (open === "(" && close !== ")") ||
        (open === "[" && close !== "]")
    )) {
        let error = new Error();
        error.name = "InvalidCallException";
        error.message = "call pattern is not valid";
        throw error;
    }
    let rest = calls.substr(matches[0].length);
    let name = (matches[1] || "").trim();
    if (!functions.hasOwnProperty(name)) {
        let error = new Error();
        error.name = "FunctionNotFoundException";
        error.message = `function "${ name }" is not found`;
        throw error;
    }
    value = functions[name](value, ...(matches[4] || "").split(",").map(
        (argument) => open === "(" ? argument.trim() : argument
    ));
    if (rest.length <= 0) {
        return value;
    }
    return parseCalls(value, rest, functions);
}

export default (
    template: string,
    values?: {
        [key: string]: any;
    },
    functions?: Mapper
) => template.replace(
    new RegExp("(\\\\?){{([^:}]+)(:([^}]+))?}}", "g"),
    (match, escaped, key, tmp, calls) => {
        if (escaped) {
            return match.substr(1);
        }

        key = (key || "").trim();

        if (!values || values[key] === undefined) {
            return `{{${ key }: not found}}`;
        }

        let value = values[key];

        calls = (calls || "").trim();
        if (!calls) {
            return value;
        }
        if (!functions) {
            return `{{${ key }: ${ calls }: no functions}}`;
        }
        try {
            return value = parseCalls(value, calls, functions);
        } catch (error) {
            if (error.name === "InvalidCallException") {
                return `{{${ key }: ${ calls }: invalid calls}}`;
            } else if (error.name === "FunctionNotFoundException") {
                return `{{${ key }: ${ calls }: ${ error.message }}}`;
            } else {
                throw error;
            }
        }
    }
);
