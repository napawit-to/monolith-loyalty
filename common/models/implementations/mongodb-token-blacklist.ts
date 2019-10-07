import * as mongoose from "mongoose";
import * as moment from "moment";
import TokenBlacklist from "../token-blacklist";
// Expose "TokenBlacklist" interface to the database implementation
export { TokenBlacklist as TokenBlacklist };

export interface MongoTokenBlacklist
    extends TokenBlacklist, mongoose.Document { }

/* tslint:disable-next-line:variable-name */
export const TokenBlacklistSchema = new mongoose.Schema({
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
    token: {
        type: String,
        required: true
    },
    token_type: {
        type: String,
        required: true
    },
    expire_timestamp: {
        type: Date,
        required: true,
        default: moment.now
    },
    create_timestamp: {
        type: Date,
        default: moment.now
    },
    update_timestamp: {
        type: Date,
        default: moment.now
    }
});
