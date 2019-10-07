import * as mongoose from "mongoose";
import * as moment from "moment";
import {
    ContentConfiguration
} from "../content-configuration";
// Expose "ContentConfiguration" interface
//   to the database implementation
export { ContentConfiguration as ContentConfiguration };

export interface MongoContentConfiguration
    extends ContentConfiguration, mongoose.Document { }

/* tslint:disable-next-line:variable-name */
export const ContentConfigurationSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true
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
