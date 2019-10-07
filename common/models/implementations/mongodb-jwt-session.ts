import * as mongoose from "mongoose";
import * as moment from "moment";
import JWTSession from "../jwt-session";
// Expose "JWTSession" interface to the database implementation
export { JWTSession as JWTSession };

export interface MongoJWTSession
    extends JWTSession, mongoose.Document { }

/* tslint:disable-next-line:variable-name */
export const JWTSessionSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    terminal_id: {
        type: String,
        required: true
    },
    branch_id: {
        type: String,
        required: true
    },
    access_token: {
        type: String,
        required: true
    },
    refresh_token: {
        type: String,
        required: true
    },
    token_information: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    cbs_token: {
        type: String
    },
    create_timestamp: {
        type: Date,
        default: moment.now
    },
    update_timestamp: {
        type: Date,
        default: moment.now
    },
    expire_timestamp: {
        type: Date,
        default: moment.now
    }
});
