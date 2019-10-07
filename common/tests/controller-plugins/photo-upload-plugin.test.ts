import * as supertest from "supertest";
import Router from "../../router";
import { ErrorMap } from "../../error-map";
import { Application } from "../../app";
import PhotoUploadPlugin from "../../controller-plugins/photo-upload-plugin";

let app: Application = new Application({
    service: {
        name: "test-service",
        domain: "99",
        code: "99",
        version: "0.1.0"
    }
}).setupErrorMap((app) => Promise.resolve(new ErrorMap({
    E000700: {
        status: 400,
        message: {
            en: "Unexpected image type"
        }
    }
}))).routes(Router(() => app).route("/").put({
    plugins: [
        PhotoUploadPlugin()
    ],
    perform: async(request) => {
        return {
            status: 200
        };
    }
}));

describe("Photo Upload controller's plugin", () => {
    beforeEach(() => {
        return app.test.start();
    });

    it("should only work with image file", () => {
        return supertest(app.app)
            .put("/")
            .attach("file", new Buffer("hello world"), {
                filename: "test.jpg",
                contentType: "image/jpeg"
            })
            .expect(200);
    });

    it("should work with image file regardless of the name", () => {
        return supertest(app.app)
            .put("/")
            .attach("file", new Buffer("hello world"), {
                filename: "test.txt",
                contentType: "image/jpeg"
            })
            .expect(200);
    });

    it("should not work with other file", () => {
        return supertest(app.app)
            .put("/")
            .attach("file", new Buffer("hello world"), {
                filename: "test.txt",
                contentType: "application/text"
            })
            .expect(400)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99000700",
                        message: "Unexpected image type"
                    }
                });
            });
    });

    afterEach(() => {
        app.stop();
    });
});
