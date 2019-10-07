import {
    ControllerPlugin, ControllerBasicRequest, RequestFile
} from "../middlewares/controller";
import * as express from "express";
import * as multer from "multer";

export class MemoryRequestFile extends RequestFile {
    data: Buffer;

    constructor(name: string, mimetype: string, size: number, data: Buffer) {
        super(name, mimetype, size);

        this.data = data;
    }
}

export class StorageRequestFile extends RequestFile {
    path: string;

    constructor(name: string, mimetype: string, size: number, path: string) {
        super(name, mimetype, size);

        this.path = path;
    }
}

export class FileUploadPlugin implements ControllerPlugin {
    name = "File Upload Plugin";

    protected fieldName = "file";
    protected options: multer.Options = {};

    destination(target: string) {
        this.options.dest = target;
        return this;
    }

    field(field: string) {
        this.fieldName = field;
        return this;
    }

    maxFileSize(sizeInBytes: number) {
        if (this.options.limits) {
            this.options.limits.fileSize = sizeInBytes;
        } else {
            this.options.limits = {
                fileSize: sizeInBytes
            };
        }
        return this;
    }

    export() {
        return multer(this.options).single(this.fieldName);
    }

    transform(request: {
        controller: ControllerBasicRequest<any>,
        raw: Readonly<express.Request>
    }) {
        if (!request.raw.file) {
            return request.controller;
        }
        if (request.raw.file.buffer) {
            request.controller.files.push(new MemoryRequestFile(
                request.raw.file.originalname,
                request.raw.file.mimetype,
                request.raw.file.size,
                request.raw.file.buffer
            ));
        } else if (request.raw.file.path) {
            request.controller.files.push(new StorageRequestFile(
                request.raw.file.originalname,
                request.raw.file.mimetype,
                request.raw.file.size,
                request.raw.file.path
            ));
        }

        return request.controller;
    }

    onError(error: any) {
        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            // including unexpected field uploaded
            return new Error("E000600");
        }else if (error.code === "LIMIT_FILE_SIZE") {
            // Maximum file limit exceeded
            return new Error("E000601");
        }
        return error;
    }
}

export default () => new FileUploadPlugin();
