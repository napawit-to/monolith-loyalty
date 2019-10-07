import StringTemplate from "../string-template";

describe("String Template", () => {
    it("should replace a proper template", () => {
        expect(StringTemplate("")).toBe("");
        expect(StringTemplate("abc")).toBe("abc");
        expect(StringTemplate(`abc`)).toBe("abc");

        expect(StringTemplate("{{number}}", {
            number: 1.23,
            boolean: true,
            string: "hello"
        })).toBe("1.23");
        expect(StringTemplate("{{number}}{{boolean}}{{string}}", {
            number: 1.23,
            boolean: true,
            string: "hello"
        })).toBe("1.23truehello");
    });

    it("should not replace an escaped template", () => {
        expect(StringTemplate("\\{{number}}", {
            number: 1.23,
            boolean: true,
            string: "hello"
        })).toBe("{{number}}");
        expect(StringTemplate("\\{{number}}\\{{boolean}}\\{{string}}", {
            number: 1.23,
            boolean: true,
            string: "hello"
        })).toBe("{{number}}{{boolean}}{{string}}");
        expect(StringTemplate("\\{{number:decrement(2),decrement(3)}}", {
            number: 1
        }, {
            decrement: (value) => value - 1
        })).toBe("{{number:decrement(2),decrement(3)}}");
    });

    it("should returns a string-representation of value", () => {
        let date = new Date();
        expect(StringTemplate("{{value}}", {
            value: date
        })).toBe(date.toString());

        expect(StringTemplate("{{value}}", {
            value: {
                key: "value"
            }
        })).toBe("[object Object]");

        expect(StringTemplate("{{value}}", {
            value: [1, 2, 3]
        })).toBe("1,2,3");

        expect(StringTemplate("{{value}}", {
            value: () => "value"
        })).toBe("() => \"value\"");
    });

    it("should properly handle unexists values", () => {
        expect(StringTemplate("{{number}}")).toBe("{{number: not found}}");
        expect(StringTemplate("{{number}}{{boolean}}{{string}}", {})).toBe(
            "{{number: not found}}{{boolean: not found}}{{string: not found}}"
        );
        expect(StringTemplate("{{number}}{{boolean}}{{string}}", {
            number1: 1.23,
            boolean2: true,
            string3: "hello"
        })).toBe(
            "{{number: not found}}{{boolean: not found}}{{string: not found}}"
        );

        expect(StringTemplate("{{number}}{{boolean}}{{string}}", undefined, {
            number: () => 1.23,
            boolean: () => true,
            string: () => "hello"
        })).toBe(
            "{{number: not found}}{{boolean: not found}}{{string: not found}}"
        );
    });

    it("should replace a proper function calls", () => {
        expect(StringTemplate("{{number:decrement}}", {
            number: 1
        }, {
            decrement: (value) => value - 1
        })).toBe("0");
        expect(StringTemplate("{{number:decrement()}}", {
            number: 1
        }, {
            decrement: (value) => value - 1
        })).toBe("0");
        expect(StringTemplate("{{number:decrement(2)}}", {
            number: 1
        }, {
            decrement: (value, amount) => value - parseInt(amount || "1")
        })).toBe("-1");
        expect(StringTemplate("{{number:decrement,decrement}}", {
            number: 1
        }, {
            decrement: (value, amount) => value - parseInt(amount || "1")
        })).toBe("-1");
        expect(StringTemplate("{{number:decrement(),decrement}}", {
            number: 1
        }, {
            decrement: (value, amount) => value - parseInt(amount || "1")
        })).toBe("-1");
        expect(StringTemplate("{{number:decrement,decrement()}}", {
            number: 1
        }, {
            decrement: (value, amount) => value - parseInt(amount || "1")
        })).toBe("-1");
        expect(StringTemplate("{{number:decrement(),decrement()}}", {
            number: 1
        }, {
            decrement: (value, amount) => value - parseInt(amount || "1")
        })).toBe("-1");
        expect(StringTemplate("{{number:decrement(2),decrement(3)}}", {
            number: 1
        }, {
            decrement: (value, amount) => value - parseInt(amount || "1")
        })).toBe("-4");
    });

    it("should properly handle unexists function calls", () => {
        expect(StringTemplate("{{number:unexists}}", {
            number: 1
        })).toBe("{{number: unexists: no functions}}");
        expect(StringTemplate("{{number:unexists}}", { number: 1 }, {})).toBe(
            "{{number: unexists: function \"unexists\" is not found}}"
        );
        expect(StringTemplate("{{number:unexists()}}", {
            number: 1
        })).toBe("{{number: unexists(): no functions}}");
        expect(StringTemplate("{{number:unexists(1,a)}}", {
            number: 1
        }, {})).toBe(
            "{{number: unexists(1,a): function \"unexists\" is not found}}"
        );
    });

    it("should properly handle invalid function calls", () => {
        expect(StringTemplate("{{number:call[)}}", {
            number: 1
        }, {
            call: () => ""
        })).toBe("{{number: call[): invalid calls}}");
        expect(StringTemplate("{{number:call(]}}", {
            number: 1
        }, {
            call: () => ""
        })).toBe("{{number: call(]: invalid calls}}");
        expect(StringTemplate("{{number:call[1, 2)}}", {
            number: 1
        }, {
            call: () => ""
        })).toBe("{{number: call[1, 2): invalid calls}}");
        expect(StringTemplate("{{number:call(1, 2]}}", {
            number: 1
        }, {
            call: () => ""
        })).toBe("{{number: call(1, 2]: invalid calls}}");
    });

    it("should evaluate from left-to-right on function calls", () => {
        expect(StringTemplate("{{text:suffix(a)}}", {
            text: "Hello"
        }, {
            suffix: (value, suffix) => value ? `${ value }${ suffix }` : ""
        })).toBe("Helloa");
        expect(StringTemplate("{{text:suffix(a),suffix(b)}}", {
            text: "Hello"
        }, {
            suffix: (value, suffix) => value ? `${ value }${ suffix }` : ""
        })).toBe("Helloab");
        expect(StringTemplate("{{text:suffix(a),suffix(b),suffix(c)}}", {
            text: "Hello"
        }, {
            suffix: (value, suffix) => value ? `${ value }${ suffix }` : ""
        })).toBe("Helloabc");
        expect(StringTemplate("{{text:d,suffix(a),suffix(b),suffix(c),d}}", {
            text: "Hello"
        }, {
            suffix: (value, suffix) => value ? `${ value }${ suffix }` : "",
            d: (value) => `${value}d`
        })).toBe("Hellodabcd");
    });

    it("should be space-sensitive on function calls with proper syntax", () => {
        expect(StringTemplate("{{text:prefix}}", {
            text: "Hello"
        }, {
            prefix: (value, prefix) => value ? `${ prefix }${ value }` : "",
        })).toBe("Hello");
        expect(StringTemplate("{{text:prefix( b)}}", {
            text: "Hello"
        }, {
            prefix: (value, prefix) => value ? `${ prefix }${ value }` : ""
        })).toBe("bHello");
        expect(StringTemplate("{{text:suffix( world)}}", {
            text: "Hello"
        }, {
            suffix: (value, suffix) => value ? `${ value }${ suffix }` : ""
        })).toBe("Helloworld");
        expect(StringTemplate("{{text:prefix[ b]}}", {
            text: "Hello"
        }, {
            prefix: (value, prefix) => value ? `${ prefix }${ value }` : ""
        })).toBe(" bHello");
        expect(StringTemplate("{{text:suffix[ world]}}", {
            text: "Hello"
        }, {
            suffix: (value, suffix) => value ? `${ value }${ suffix }` : ""
        })).toBe("Hello world");
    });
});
