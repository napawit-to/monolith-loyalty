import * as mongoose from "mongoose";
import * as moment from "moment";
import ApplicationConfiguration from "../application-configuration";
// Expose "ApplicationConfiguration" interface to the database implementation
export { ApplicationConfiguration as ApplicationConfiguration };

export interface MongoApplicationConfiguration
    extends ApplicationConfiguration, mongoose.Document { }

/* tslint:disable-next-line:variable-name */
export const ApplicationConfigurationSchema = new mongoose.Schema({
    configuration: {
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
