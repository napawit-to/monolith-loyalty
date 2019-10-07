import * as mongoose from "mongoose";
import * as moment from "moment";
import ErrorConfiguration from "../error-configuration";
// Expose "ErrorConfiguration" interface to the database implementation
export { ErrorConfiguration as ErrorConfiguration };

export interface MongoErrorConfiguration
    extends ErrorConfiguration, mongoose.Document { }

/* tslint:disable-next-line:variable-name */
export const ErrorConfigurationSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    override_code: {
        type: String
    },
    status: {
        type: Number
    },
    message: {
        type: mongoose.Schema.Types.Mixed
    },
    create_timestamp: {
        type: Date,
        required: true,
        default: moment.now
    },
    update_timestamp: {
        type: Date,
        required: true,
        default: moment.now
    }
});
