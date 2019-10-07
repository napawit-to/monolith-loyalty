import * as supertest from "supertest";
import * as JSON from "../../middlewares/json";
import Router from "../../router";
import { Application } from "../../app";

let app: Application = new Application({
    service: {
        name: "test-service",
        domain: "99",
        code: "99",
        version: "0.1.0"
    }
}).routes(Router(() => app).route("/").post({
    expectations: {
        body: {
            number: {
                type: "number",
                required: true
            },
            string: {
                type: /^\w+$/g
            }
        }
    },
    perform: async(request) => {
        return {
            status: 200
        };
    }
}));

describe("JSON.expect middleware", () => {
    beforeEach(() => {
        return app.test.start();
    });

    it("should accept a proper request", () => {
        return supertest(app.app)
            .post("/")
            .send({
                number: 10,
                string: "hello"
            })
            .expect(200);
    });

    it("should accept a proper request without optional fields", () => {
        return supertest(app.app)
            .post("/")
            .send({
                number: 10
            })
            .expect(200);
    });

    it("should ask for required fields", () => {
        return supertest(app.app)
            .post("/")
            .send()
            .expect(400)
            .then((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99000003",
                        message: "\"number\" is required"
                    }
                });
            });
    });

    it("should reject field with invalid type", () => {
        return supertest(app.app)
            .post("/")
            .send({
                number: ""
            })
            .expect(406)
            .then((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99000003",
                        message: "\"number\" is not in a valid type"
                    }
                });
            });
    });

    it("should reject field with invalid format", () => {
        return supertest(app.app)
            .post("/")
            .send({
                number: 10,
                string: "10+20"
            })
            .expect(400)
            .then((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99000003",
                        message: "\"string\" is not in a valid format"
                    }
                });
            });
    });

    afterEach(() => {
        app.stop();
    });
});

