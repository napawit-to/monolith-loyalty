import * as supertest from "supertest";
import Router from "../../../router";
import { Application } from "../../../app";

let app: Application = new Application({
    service: {
        name: "test-service",
        domain: "99",
        code: "99",
        version: "0.1.0"
    }
}).routes(Router(() => app)
        .route("/authorize").post({
            security: {
                authorization: (request) => [
                    new Promise((resolve, reject) => resolve())
                ]
            },
            perform: async(request) => {
                return {
                    status: 200,
                    body: {
                        message: "Hello World!"
                    }
                };
            }
        })
        .route("/unauthorize").post({
            security: {
                authorization: (request) => [
                    new Promise((resolve, reject) => reject())
                ]
            },
            perform: async(request) => {
                return {
                    status: 200,
                    body: {
                        message: "Hello World!"
                    }
                };
            }
        })
);

describe("Controller middleware - Authorization", () => {
    beforeEach(() => {
        return app.test.start();
    });

    it("should allow to access the service's operation if authorized",
        () => supertest(app.app)
            .post("/authorize")
            .send()
            .expect(200)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    message: "Hello World!"
                });
            })
    );

    it("should not allow to access the service's operation if not authorized",
        () => supertest(app.app)
            .post("/unauthorize")
            .send()
            .expect(401)
    );

    afterEach(() => {
        app.stop();
    });
});
