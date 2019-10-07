import ErrorFormatter from "../../formatters/error-formatter";

describe("ErrorFormatter", () => {
    it("should parse a proper error object", () => {
        expect(new ErrorFormatter({
            code: "E000001",
            message: "EN: {{value}}{{value:upper}}"
        }).mapValue({
            value: "Hello"
        })).toMatchObject({
            code: "E000001",
            message: "EN: HelloHELLO"
        });
    });
});
