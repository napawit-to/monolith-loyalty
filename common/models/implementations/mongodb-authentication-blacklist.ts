import * as mongoose from "mongoose";
import * as moment from "moment";
import AuthenticationBlacklist from "../authentication-blacklist";
// Expose "AuthenticationBlacklist" interface to the database implementation
export { AuthenticationBlacklist as AuthenticationBlacklist };

export interface MongoAuthenticationBlacklist
    extends AuthenticationBlacklist, mongoose.Document {}

/* tslint:disable-next-line:variable-name */
export const AuthenticationBlacklistSchema = new mongoose.Schema({
    device_id: {
        type: String,
        required: true
    },
    branch_code: {
        type: String
    },
    user_id: {
        type: String,
        required: true
    },
    block_duration: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    sub_type: {
        type: String,
        required: true
    },
    expire_timestamp: {
        type: Date,
        required: true
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
