import * as supertest from "supertest";
import { Application } from "../app";

let app: Application = new Application({
    service: {
        name: "test-service",
        domain: "99",
        code: "99",
        version: "0.1.0"
    }
})

describe("BaseRouter", () => {
    beforeEach(() => {
        return app.test.start();
    });

    it("should working on /ping path", () => {
        return supertest(app.app)
            .get("/ping")
            .send()
            .expect(200);
    });

    it("heartbeat's format should contains timestamp", () => {
        return supertest(app.app)
            .get("/ping")
            .send()
            .expect(200)
            .then((response) => {
                expect(response.body).toHaveProperty("status");
                expect(response.body).toHaveProperty("uptime");
                expect(response.body).toHaveProperty("uptime_timestamp");
                expect(response.body).toHaveProperty("timestamp");
            });
    });

    it("should working on /reload-configurations path", () => {
        app.reloadConfigurations = jest.fn(app.reloadConfigurations);
        return supertest(app.app)
            .get("/reload-configurations")
            .send()
            .expect(200)
            .then(() => {
                expect(app.reloadConfigurations).toBeCalled();
            });
    });

    afterEach(() => {
        app.stop();
    });
});
