import * as mongoose from "mongoose";
import * as moment from "moment";
import Users from "../users";
// Expose "User" interface to the database implementation
export { Users as Users };

export interface MongoUsers extends Users, mongoose.Document {}

/* tslint:disable-next-line:variable-name */
export const UsersSchema = new mongoose.Schema({
    customer_id : {
        type: String,
        required: true
    },
    points : {
        type: Number,
        required: true
    }
});
