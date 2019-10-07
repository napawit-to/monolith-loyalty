import * as supertest from "supertest";
import { DynamicError } from "../../../super-error";
import { ErrorMap, ErrorConfigurationMapSchema } from "../../../error-map";
import Router from "../../../router";
import { Application } from "../../../app";

let app: Application = new Application({
    service: {
        name: "test-service",
        domain: "99",
        code: "99",
        version: "0.1.0"
    }
}).setupErrorMap((app) => Promise.resolve(new ErrorMap({
    E010000: {
        status: 400,
        message: {
            en: "Error: {{value}}"
        }
    }
}))).routes(Router(() => app)
        .route("/static").post({
            perform: async(request) => {
                throw new Error("E010000");
            }
        })
        .route("/dynamic").post({
            perform: async(request) => {
                throw new DynamicError("E010000");
            }
        })
        .route("/dynamic/:data").post({
            perform: async(request) => {
                throw new DynamicError("E010000", {
                    value: request.body.data
                });
            }
        })
);

describe("Controller middleware - Dynamic Error", () => {
    beforeEach(() => {
        return app.test.start();
    });

    it("should return a static error",
        () => supertest(app.app)
            .post("/static")
            .send()
            .expect(400)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99010000",
                        message: "Error: {{value}}"
                    }
                });
            })
    );

    it("should return a parsed dynamic error with data object",
        () => supertest(app.app)
            .post("/dynamic/1")
            .send()
            .expect(400)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99010000",
                        message: "Error: 1"
                    }
                });
            })
    );

    it("should return a parsed dynamic error without data object",
        () => supertest(app.app)
            .post("/dynamic")
            .send()
            .expect(400)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99010000",
                        message: "Error: {{value: not found}}"
                    }
                });
            })
    );

    afterEach(() => {
        app.stop();
    });
});
