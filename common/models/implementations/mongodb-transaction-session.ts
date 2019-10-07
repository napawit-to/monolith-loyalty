import * as mongoose from "mongoose";
import * as moment from "moment";
import TransactionSession from "../transaction-session";
// Expose "TransactionSession" interface to the database implementation
export { TransactionSession as TransactionSession };

export interface MongoTransactionSession extends TransactionSession,
    mongoose.Document {}

/* tslint:disable-next-line:variable-name */
export const TransactionSessionSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true
    },
    value: {
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
    },
    expire_timestamp: {
        type: Date,
        required: true,
        default: moment.now
    }
});
