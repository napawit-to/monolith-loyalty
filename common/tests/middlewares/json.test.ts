import * as JSON from "../../middlewares/json";

describe("JSON.expect", () => {

    // MARK: Test: SecureJSON

    it("should hidden all secure keys", () => {
        expect(JSON.stringify({
            key: {
                subkey: {
                    string: "string",
                    number: 123,
                    boolean: true,
                    array: [1, 2, 3],
                    object: {
                        string: "string"
                    }
                }
            }
        }, JSON.SecureJSON)).toBe(JSON.stringify({
            key: {
                subkey: {
                    string: "string",
                    number: 123,
                    boolean: true,
                    array: [1, 2, 3],
                    object: {
                        string: "string"
                    }
                }
            }
        }));

        expect(JSON.stringify({
            key: {
                string: {
                    key1: "string"
                },
                number: {
                    key1: 123
                },
                boolean: {
                    key1: true
                },
                array: {
                    key1: [1, 2, 3]
                },
                object: {
                    key1: {
                        subkey: "value"
                    }
                },
                key1: {
                    key1: {
                        subkey: "value"
                    }
                }
            }
        }, JSON.SecureJSON)).toBe(JSON.stringify({
            key: {
                string: {
                    key1: "****"
                },
                number: {
                    key1: "****"
                },
                boolean: {
                    key1: "****"
                },
                array: {
                    key1: "****"
                },
                object: {
                    key1: "****"
                },
                key1: "****"
            }
        }));

        expect(JSON.stringify({
            string: {
                key2: "string",
                key3: "string",
                key4: "string",
                key5: "string",
                key6: "string",
                key7: "string",
                key8: "string"
            },
            number: {
                key2: 123,
                key3: 123,
                key4: 123,
                key5: 123,
                key6: 123,
                key7: 123,
                key8: 123
            },
            boolean: {
                key2: true,
                key3: true,
                key4: true,
                key5: true,
                key6: true,
                key7: true,
                key8: true
            },
            array: {
                key2: [1, 2, 3],
                key3: [1, 2, 3],
                key4: [1, 2, 3],
                key5: [1, 2, 3],
                key6: [1, 2, 3],
                key7: [1, 2, 3],
                key8: [1, 2, 3]
            },
            object: {
                key2: {
                    subkey: "value"
                },
                key3: {
                    subkey: "value"
                },
                key4: {
                    subkey: "value"
                },
                key5: {
                    subkey: "value"
                },
                key6: {
                    subkey: "value"
                },
                key7: {
                    subkey: "value"
                },
                key8: {
                    subkey: "value"
                }
            }
        }, JSON.SecureJSON)).toBe(JSON.stringify({
            string: {
                key2: "****",
                key3: "string",
                key4: "string",
                key5: "string",
                key6: "string",
                key7: "string",
                key8: "string"
            },
            number: {
                key2: 123,
                key3: "****",
                key4: 123,
                key5: 123,
                key6: 123,
                key7: "****",
                key8: 123
            },
            boolean: {
                key2: true,
                key3: true,
                key4: "****",
                key5: true,
                key6: true,
                key7: true,
                key8: true
            },
            array: {
                key2: [1, 2, 3],
                key3: [1, 2, 3],
                key4: [1, 2, 3],
                key5: "****",
                key6: [1, 2, 3],
                key7: "****",
                key8: [1, 2, 3]
            },
            object: {
                key2: {
                    subkey: "value"
                },
                key3: {
                    subkey: "value"
                },
                key4: {
                    subkey: "value"
                },
                key5: {
                    subkey: "value"
                },
                key6: "****",
                key7: "****",
                key8: {
                    subkey: "value"
                }
            }
        }));
    });

    it("should replace an object using specified replacer", () => {
        expect(JSON.replace({
            key: {
                subkey: {
                    string: "string",
                    number: 123,
                    boolean: true,
                    array: [1, 2, 3],
                    object: {
                        string: "string"
                    }
                }
            }
        }, JSON.SecureJSON)).toMatchObject({
            key: {
                subkey: {
                    string: "string",
                    number: 123,
                    boolean: true,
                    array: [1, 2, 3],
                    object: {
                        string: "string"
                    }
                }
            }
        });

        expect(JSON.replace({
            key: {
                string: {
                    key1: "string"
                },
                number: {
                    key1: 123
                },
                boolean: {
                    key1: true
                },
                array: {
                    key1: [1, 2, 3]
                },
                object: {
                    key1: {
                        subkey: "value"
                    }
                },
                key1: {
                    key1: {
                        subkey: "value"
                    }
                }
            }
        }, JSON.SecureJSON)).toMatchObject({
            key: {
                string: {
                    key1: "****"
                },
                number: {
                    key1: "****"
                },
                boolean: {
                    key1: "****"
                },
                array: {
                    key1: "****"
                },
                object: {
                    key1: "****"
                },
                key1: "****"
            }
        });

        expect(JSON.replace({
            string: {
                key2: "string",
                key3: "string",
                key4: "string",
                key5: "string",
                key6: "string",
                key7: "string",
                key8: "string"
            },
            number: {
                key2: 123,
                key3: 123,
                key4: 123,
                key5: 123,
                key6: 123,
                key7: 123,
                key8: 123
            },
            boolean: {
                key2: true,
                key3: true,
                key4: true,
                key5: true,
                key6: true,
                key7: true,
                key8: true
            },
            array: {
                key2: [1, 2, 3],
                key3: [1, 2, 3],
                key4: [1, 2, 3],
                key5: [1, 2, 3],
                key6: [1, 2, 3],
                key7: [1, 2, 3],
                key8: [1, 2, 3]
            },
            object: {
                key2: {
                    subkey: "value"
                },
                key3: {
                    subkey: "value"
                },
                key4: {
                    subkey: "value"
                },
                key5: {
                    subkey: "value"
                },
                key6: {
                    subkey: "value"
                },
                key7: {
                    subkey: "value"
                },
                key8: {
                    subkey: "value"
                }
            }
        }, JSON.SecureJSON)).toMatchObject({
            string: {
                key2: "****",
                key3: "string",
                key4: "string",
                key5: "string",
                key6: "string",
                key7: "string",
                key8: "string"
            },
            number: {
                key2: 123,
                key3: "****",
                key4: 123,
                key5: 123,
                key6: 123,
                key7: "****",
                key8: 123
            },
            boolean: {
                key2: true,
                key3: true,
                key4: "****",
                key5: true,
                key6: true,
                key7: true,
                key8: true
            },
            array: {
                key2: [1, 2, 3],
                key3: [1, 2, 3],
                key4: [1, 2, 3],
                key5: "****",
                key6: [1, 2, 3],
                key7: "****",
                key8: [1, 2, 3]
            },
            object: {
                key2: {
                    subkey: "value"
                },
                key3: {
                    subkey: "value"
                },
                key4: {
                    subkey: "value"
                },
                key5: {
                    subkey: "value"
                },
                key6: "****",
                key7: "****",
                key8: {
                    subkey: "value"
                }
            }
        });
    });

    it("should replace an object by an order of replacers", () => {
        expect(JSON.replace({
            key: {
                subkey: "value"
            },
            oldKey: {
                newKey: {
                    key: "value"
                }
            }
        }, JSON.Stack((key, value) => {
            if (key === "key") {
                return {
                    key: value
                };
            }
            return value;
        }, (key, value) => {
            if (key === "key") {
                return "value";
            } else if (key === "newKey") {
                return "value";
            }
            return value;
        }))).toMatchObject({
            key: {
                key: {
                    subkey: "value"
                }
            },
            oldKey: {
                newKey: "value"
            }
        });
    });
});
