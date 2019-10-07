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
        .route("/normal").post({
            perform: async(request) => {
                return {
                    status: 200,
                    body: {
                        message: "Hello World!"
                    }
                };
            }
        })
        .route("/restricted").post({
            handlePerform: {
                "test-mode": async(request) => {
                    return {
                        status: 200,
                        body: {
                            message: "Hello World for You!"
                        }
                    };
                }
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

describe("Controller middleware - Request Blocking", () => {
    beforeEach(() => {
        return app.test.start();
    });

    it("should handle a normal request with a normal operation handler",
        () => supertest(app.app)
            .post("/restricted")
            .set("user-agent", "my-testing-agent")
            .send()
            .expect(200)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    message: "Hello World!"
                });
            })
    );

    it("should handle a restricted request with an operation flow handler",
        () => supertest(app.app)
            .post("/restricted")
            .set("user-agent", "testing-agent")
            .send()
            .expect(200)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    message: "Hello World for You!"
                });
            })
    );

    it((
        "should handle a restricted request without an operation flow handler" +
        " using a normal operation handler"
    ), () => supertest(app.app)
            .post("/normal")
            .set("user-agent", "testing-agent")
            .send()
            .expect(200)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    message: "Hello World!"
                });
            })
    );

    afterEach(() => {
        app.stop();
    });
});
