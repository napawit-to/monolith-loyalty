import * as supertest from "supertest";
import CircuitBreaker from "../../circuit-breaker";
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
    requirements: () => [{
        name: "test-dependency"
    }],
    perform: async(request) => {
        return {
            status: 200
        };
    }
}));

describe("Circuit Breaker middleware", () => {
    beforeEach(() => {
        CircuitBreaker.resetCircuitBreaker();
        return app.test.start();
    });

    it("should work properly in \"close\" state", () => {
        CircuitBreaker.reportState("test-dependency", "close");
        return supertest(app.app)
            .post("/")
            .send()
            .expect(200);
    });

    it("should work properly in \"half-open\" state", () => {
        CircuitBreaker.reportState("test-dependency", "halfOpen");
        return supertest(app.app)
            .post("/")
            .send()
            .expect(200);
    });

    it("should return error when in \"open\" state", () => {
        CircuitBreaker.reportState("test-dependency", "open");
        return supertest(app.app)
            .post("/")
            .send()
            .expect(503)
            .then((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99000002",
                        message: "Service temporary unavailable"
                    }
                });
            });
    });

    afterEach(() => {
        app.stop();
    });
});
