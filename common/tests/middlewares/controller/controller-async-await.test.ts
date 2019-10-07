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
        .route("/success").post({
            perform: async(request) => {
                return {
                    status: 200,
                    body: {
                        message: "Hello World!"
                    }
                };
            }
        })
        .route("/error").post({
            perform: async(request) => {
                throw new Error("E010000");
            }
        })
);

describe("Controller middleware - Async/Await delegate", () => {
    beforeEach(() => {
        return app.test.start();
    });

    it((
        "should be able to return a proper response"
    ), () => supertest(app.app)
            .post("/success")
            .send()
            .expect(200)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    message: "Hello World!"
                });
            })
    );

    it((
        "should be able to return a proper error message"
    ), () => supertest(app.app)
            .post("/error")
            .send()
            .expect(400)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99000001",
                        message: "Unexpected error"
                    }
                });
            })
    );

    afterEach(() => {
        app.stop();
    });
});
