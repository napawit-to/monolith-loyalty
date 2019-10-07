import * as Expectation from "../expectation";

describe("Expectation", () => {
    // MARK: Test: Expectation.expect

    it("should work when reuse the pattern multiple times", () => {
        let schema: Expectation.Expectation = {
            value: {
                type: /1234/g,
                required: true
            }
        };

        expect(
            Expectation.expect({
                value: "1234"
            }, schema).status
        ).toBe(Expectation.ExpectationStatus.OK);

        expect(
            Expectation.expect({
                value: "1234"
            }, schema).status
        ).toBe(Expectation.ExpectationStatus.OK);
    });

    it("should ask for required schema", () => {
        expect(Expectation.expect({}, {
            field: {
                type: "any",
                required: true
            }
        }).status).toBe(Expectation.ExpectationStatus.Required);
    });

    it("should allow optional schema", () => {
        expect(Expectation.expect({}, {
            field: {
                type: "any"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);
    });

    it("should allow any type schema", () => {
        expect(Expectation.expect({
            field: false
        }, {
            field: {
                type: "any"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: null
        }, {
            field: {
                type: "any"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: 123
        }, {
            field: {
                type: "any"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: 123.45
        }, {
            field: {
                type: "any"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: "string"
        }, {
            field: {
                type: "any"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: "any"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: {
                subfield: "value"
            }
        }, {
            field: {
                type: "any"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);
    });

    // MARK: Test: expectValue (multiple types)

    it("should accept one of the valid types", () => {
        expect(Expectation.expect({
            field: 123
        }, {
            field: {
                types: ["number", "string"]
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: true
        }, {
            field: {
                types: ["number", "boolean"]
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: {}
        }, {
            field: {
                types: [{}, "string"]
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);
    });

    it("should reject type mismatches", () => {
        expect(Expectation.expect({
            field: true
        }, {
            field: {
                types: ["number", "string"]
            }
        }).status).toBe(Expectation.ExpectationStatus.TypesError);

        expect(Expectation.expect({
            field: ""
        }, {
            field: {
                types: ["number", "boolean"]
            }
        }).status).toBe(Expectation.ExpectationStatus.TypesError);

        expect(Expectation.expect({
            field: false
        }, {
            field: {
                types: [{}, "string"]
            }
        }).status).toBe(Expectation.ExpectationStatus.TypesError);
    });

    it("should accept one of the complex valid types", () => {
        expect(Expectation.expect({
            field: {
                username: "timmy123456",
                password: "123456",
                fingerprint: "abc123"
            }
        }, {
            field: {
                types: [{
                    username: {
                        type: /^[a-z]+$/g,
                        required: true
                    },
                    password: {
                        type: "string",
                        required: true
                    }
                }, {
                    fingerprint: {
                        type: /[0-9a-f]+/g,
                        required: true
                    },
                    key: {
                        type: "string"
                    }
                }]
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);
    });

    it("should reject complex type mismatches", () => {
        expect(Expectation.expect({
            field: {
                username: "timmy123456",
                password: "123456"
            }
        }, {
            field: {
                types: [{
                    username: {
                        type: /^[a-z]+$/g,
                        required: true
                    },
                    password: {
                        type: "string",
                        required: true
                    }
                }, {
                    fingerprint: {
                        type: /[0-9a-f]+/g,
                        required: true
                    },
                    key: {
                        type: "string"
                    }
                }]
            }
        }).status).toBe(Expectation.ExpectationStatus.TypesError);
    });

    // MARK: Test: expectValue (collection type)

    it("should accept proper collection types", () => {
        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"]
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"],
                size: 3
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"],
                size: [2, 3, 4]
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"],
                size: "[3)"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: [{}, "", true, 123]
        }, {
            field: {
                type: ["any"],
                size: "(2:5]"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: [{}, "", true, 123]
        }, {
            field: {
                type: ["any"],
                size: "(1:4]"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: [{}, "", true, 123]
        }, {
            field: {
                type: ["any"],
                size: "[4:5)"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);
    });

    it("should reject type mismatches on any element", () => {
        expect(Expectation.expect({
            field: 0
        }, {
            field: {
                type: ["number"]
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: ""
        }, {
            field: {
                type: ["string"]
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: [""]
        }, {
            field: {
                types: [["number"]]
            }
        }).status).toBe(Expectation.ExpectationStatus.TypesError);

        expect(Expectation.expect({
            field: {}
        }, {
            field: {
                type: ["any"]
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);
    });

    it("should reject size mismatches", () => {
        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"],
                size: 1
            }
        }).status).toBe(Expectation.ExpectationStatus.LengthError);

        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"],
                size: [1, 2]
            }
        }).status).toBe(Expectation.ExpectationStatus.LengthError);

        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"],
                size: "4"
            }
        }).status).toBe(Expectation.ExpectationStatus.LengthError);

        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"],
                size: "(4:)"
            }
        }).status).toBe(Expectation.ExpectationStatus.LengthError);

        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"],
                size: "(1:3)"
            }
        }).status).toBe(Expectation.ExpectationStatus.LengthError);

        expect(Expectation.expect({
            field: [1, 2, 3]
        }, {
            field: {
                type: ["number"],
                size: "(3:5)"
            }
        }).status).toBe(Expectation.ExpectationStatus.LengthError);
    });

    // MARK: Test: expectValue (object type)

    it("should accept proper object types", () => {
        expect(Expectation.expect({
            field: {
                subkey: "value"
            }
        }, {
            field: {
                type: {
                    subkey: {
                        type: "string",
                        required: true
                    }
                }
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: {}
        }, {
            field: {
                type: {
                    subkey: {
                        type: "string"
                    }
                }
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: {
                subkey: "value"
            }
        }, {
            field: {
                type: {
                    subkey: {
                        type: "string",
                        required: true
                    },
                    subkey2: {
                        type: "string"
                    }
                }
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);
    });

    it("should ask for required schema for objects", () => {
        expect(Expectation.expect({
            field: {}
        }, {
            field: {
                type: {
                    subkey: {
                        type: "string",
                        required: true
                    }
                }
            }
        }).status).toBe(Expectation.ExpectationStatus.Required);

        expect(Expectation.expect({
            field: {
                subkey: "value"
            }
        }, {
            field: {
                type: {
                    subkey: {
                        type: /\d+/g,
                        required: true
                    }
                }
            }
        }).status).toBe(Expectation.ExpectationStatus.FormatError);

        expect(Expectation.expect({
            field: {
                subkey: "value"
            }
        }, {
            field: {
                type: {
                    subkey: {
                        type: "number",
                        required: true
                    }
                }
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: {
                subkey: [1, 2, 3]
            }
        }, {
            field: {
                type: {
                    subkey: {
                        type: ["number"],
                        size: 2,
                        required: true
                    }
                }
            }
        }).status).toBe(Expectation.ExpectationStatus.LengthError);
    });

    // MARK: Test: isValidType (primitive type)

    it("should accept proper matched types", () => {
        expect(Expectation.expect({
            field: false
        }, {
            field: {
                type: "boolean"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: 0
        }, {
            field: {
                type: "number"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: 0.0
        }, {
            field: {
                type: "number"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: ""
        }, {
            field: {
                type: "string"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);
    });

    it("should reject type mismatches for boolean", () => {
        expect(Expectation.expect({
            field: null
        }, {
            field: {
                type: "boolean"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: 0
        }, {
            field: {
                type: "boolean"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: ""
        }, {
            field: {
                type: "boolean"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: []
        }, {
            field: {
                type: "boolean"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: {}
        }, {
            field: {
                type: "boolean"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);
    });

    it("should reject type mismatches for number", () => {
        expect(Expectation.expect({
            field: false
        }, {
            field: {
                type: "number"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: null
        }, {
            field: {
                type: "number"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: ""
        }, {
            field: {
                type: "number"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: []
        }, {
            field: {
                type: "number"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: {}
        }, {
            field: {
                type: "number"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);
    });

    // MARK: Test: isValidType / isValidFormat (string type)

    it("should accept proper string", () => {
        expect(Expectation.expect({
            field: ""
        }, {
            field: {
                type: "string"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: ""
        }, {
            field: {
                type: /\d*/g
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: "value"
        }, {
            field: {
                type: "string"
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: "value"
        }, {
            field: {
                type: /.+/g
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: "value"
        }, {
            field: {
                type: /^\w+$/g
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);

        expect(Expectation.expect({
            field: "unvalueable"
        }, {
            field: {
                type: /value/g
            }
        }).status).toBe(Expectation.ExpectationStatus.OK);
    });

    it("should reject type mismatches for string", () => {
        expect(Expectation.expect({
            field: false
        }, {
            field: {
                type: "string"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: null
        }, {
            field: {
                type: "string"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: 0
        }, {
            field: {
                type: "string"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: []
        }, {
            field: {
                type: "string"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);

        expect(Expectation.expect({
            field: {}
        }, {
            field: {
                type: "string"
            }
        }).status).toBe(Expectation.ExpectationStatus.TypeError);
    });

    it("should reject invalid string format", () => {
        expect(Expectation.expect({
            field: "unvalueable"
        }, {
            field: {
                type: /^value$/g
            }
        }).status).toBe(Expectation.ExpectationStatus.FormatError);

        expect(Expectation.expect({
            field: "value"
        }, {
            field: {
                type: /\d+/g
            }
        }).status).toBe(Expectation.ExpectationStatus.FormatError);

        expect(Expectation.expect({
            field: "123"
        }, {
            field: {
                type: /^\d$/g
            }
        }).status).toBe(Expectation.ExpectationStatus.FormatError);

        expect(Expectation.expect({
            field: ""
        }, {
            field: {
                type: /^\d$/g
            }
        }).status).toBe(Expectation.ExpectationStatus.FormatError);

        expect(Expectation.expect({
            field: ""
        }, {
            field: {
                type: /.+/g
            }
        }).status).toBe(Expectation.ExpectationStatus.FormatError);
    });
});
