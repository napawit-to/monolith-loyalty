import * as mongoose from "mongoose";
import * as moment from "moment";
import AuthenticationAttempt from "../authentication-attempt";
// Expose "AuthenticationAttempt" interface to the database implementation
export { AuthenticationAttempt as AuthenticationAttempt };

export interface MongoAuthenticationAttempt
    extends AuthenticationAttempt, mongoose.Document {}

/* tslint:disable-next-line:variable-name */
export const AuthenticationAttemptSchema = new mongoose.Schema({
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
    status: {
        type: String,
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
