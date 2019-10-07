import * as mongoose from "mongoose";
import * as moment from "moment";
import TransactionFruad from "../transaction-fruad";
// Expose "TransactionFruad" interface to the database implementation
export { TransactionFruad as TransactionFruad };

export interface MongoTransactionFruad extends TransactionFruad,
    mongoose.Document {}

/* tslint:disable-next-line:variable-name */
export const TransactionFruadSchema = new mongoose.Schema({
    transaction_id: {
        type: String
    },
    transaction_type: {
        type: String,
        required: true
    },
    transaction_reference_id: {
        type: String
    },
    fruad_type: {
        type: String,
        required: true
    },
    fruad_description: {
        type: String,
        required: true
    },
    expected_value: {
        type: mongoose.Schema.Types.Mixed
    },
    received_value: {
        type: mongoose.Schema.Types.Mixed
    },
    branch_id: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    device_id: {
        type: String
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
