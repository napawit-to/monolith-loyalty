import * as supertest from "supertest";
import Router from "../../router";
import { ErrorMap } from "../../error-map";
import { Application } from "../../app";
import FileUploadPlugin from "../../controller-plugins/file-upload-plugin";

let app: Application = new Application({
    service: {
        name: "test-service",
        domain: "99",
        code: "99",
        version: "0.1.0"
    }
}).setupErrorMap((app) => Promise.resolve(new ErrorMap({
    E000600: {
        status: 400,
        message: {
            en: "Unexpected field limit"
        }
    },
    E000601: {
        status: 400,
        message: {
            en: "Maximum file limit exceeded"
        }
    }
}))).routes(Router(() => app).route("/").put({
    plugins: [
        FileUploadPlugin().maxFileSize(15)
    ],
    perform: async(request) => {
        return {
            status: 200
        };
    }
}).route("/upload").put({
    plugins: [
        FileUploadPlugin().field("upload-file")
    ],
    perform: async(request) => {
        return {
            status: 200
        };
    }
}));

describe("File Upload controller's plugin", () => {
    beforeEach(() => {
        return app.test.start();
    });

    it("should work with any type of file", () => {
        return supertest(app.app)
            .put("/")
            .attach("file", new Buffer("hello world"), {
                filename: "test.txt",
                contentType: "application/text"
            })
            .expect(200);
    });

    it("should work with a custom field name", () => {
        return supertest(app.app)
            .put("/upload")
            .attach("upload-file", new Buffer("hello world"), {
                filename: "test.txt",
                contentType: "application/text"
            })
            .expect(200);
    });

    it("should throw an error when upload to invalid field name", () => {
        return supertest(app.app)
            .put("/")
            .attach("files", new Buffer("hello world"), {
                filename: "test.txt",
                contentType: "application/text"
            })
            .expect(400)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99000600",
                        message: "Unexpected field limit"
                    }
                });
            });
    });

    it("should throw an error when upload a too large file", () => {
        return supertest(app.app)
            .put("/")
            .attach("file", new Buffer("hello a bigger world"), {
                filename: "test.txt",
                contentType: "application/text"
            })
            .expect(400)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    error: {
                        code: "E99000601",
                        message: "Maximum file limit exceeded"
                    }
                });
            });
    });

    afterEach(() => {
        app.stop();
    });
});
