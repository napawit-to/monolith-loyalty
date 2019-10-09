import * as mongoose from "mongoose";
import * as moment from "moment";
import Catalogues from "../catalogues";
// Expose "User" interface to the database implementation
export { Catalogues as Catalogues };

export interface MongoCatalogues extends Catalogues, mongoose.Document { }

/* tslint:disable-next-line:variable-name */
export const CataloguesSchema = new mongoose.Schema({
    CategoryId: {
        type: Number,
        required: true
    },
    RewardId: {
        type: Number,
        required: true
    },
    RewardRef: {
        type: String,
        required: true
    },
    Image: {
        type: Object,
        required: true
    }
    ,
    Type: {
        type: Number,
        required: true
    },
    TypeDesc: {
        type: String,
        required: true
    }
    ,
    RewardTh: {
        type: String,
        required: true
    }
    ,
    RewardEn: {
        type: String,
        required: true
    },
    Point: {
        type: Number,
        required: true
    },
    PointLabel: {
        type: String,
        required: true
    }
    ,
    ValidFrom: {
        type: String,
        required: true
    }
    ,
    ValidThrough: {
        type: String,
        required: true
    }
    ,
    items: {
        type: Number,
        required: true
    }
});
