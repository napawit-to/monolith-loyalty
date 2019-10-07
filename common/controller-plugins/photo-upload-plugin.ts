import { FileUploadPlugin } from "./file-upload-plugin";

export class PhotoUploadPlugin extends FileUploadPlugin {
    name = "Photo Upload Plugin";

    protected supportedTypes = [
        "image/gif", "image/jpeg", "image/png", "image/svg+xml"
    ];

    constructor() {
        super();

        this.maxFileSize(1048576);

        this.options.fileFilter = (request, file, callback) => {
            if (this.supportedTypes.indexOf(file.mimetype) < 0) {
                return callback(new Error("E000700"), false);
            }

            /* tslint:disable-next-line:no-null-keyword */
            return callback(null, true);
        };
    }
}

export default () => new PhotoUploadPlugin();
