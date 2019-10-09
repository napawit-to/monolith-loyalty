import SuperError from "../../common/super-error";
import {
    default as BaseDatabase
} from "../../common/adapters/implementations/mongodb-database";
import Database from "../database";
import {
    Catalogues,
    MongoCatalogues,
    CataloguesSchema
} from "../../models/implementations/mongodb-catalogues";
import {
    Users,
    MongoUsers,
    UsersSchema
} from "../../models/implementations/mongodb-users";
import * as mongoose from "mongoose";

export default class MongoDBDatabase extends BaseDatabase implements Database {
    protected cataloguesModel!: mongoose.Model<MongoCatalogues>;
    protected usersModel!: mongoose.Model<MongoUsers>;

    createModels(){
        super.createModels();

        this.cataloguesModel = this.connection.model<
        MongoCatalogues
        >(
            "catalogues", CataloguesSchema
        );
        this.usersModel = this.connection.model<
        MongoUsers
        >(
            "users", UsersSchema
        );
    }

    getCatalogues(){
        return new Promise<any>((resolve, reject) => {
            if (this.error) {
                return reject(this.error);
            }

            this.cataloguesModel.find({})
            .then((result) => {
                if (!result){
                    return resolve();
                }
                return resolve(result);
            }).catch((error) => {
                reject(error);
            });
        });
    }
    redeem(customerID:string){
        return new Promise<any>((resolve, reject) => {
            if (this.error) {
                return reject(this.error);
            }

            this.usersModel.
            update({ customer_id: customerID}, { $inc: { points: -1 }})
            .then((result) => {
                if (!result){
                    return resolve();
                }
                return resolve(result);
            }).catch((error) => {
                reject(error);
            });
        });
    }
    deductItem(rewardRef:string){
        return new Promise<any>((resolve, reject) => {
            if (this.error) {
                return reject(this.error);
            }
            this.cataloguesModel.updateOne({RewardRef:rewardRef.toString()},
                { $inc: { items: -1 }}).then((result) => {
                    if (!result){
                        return resolve();
                    }
                    console.log(rewardRef);
                    return resolve(result);
                }).catch((error) => {
                    reject(error);
                });
        });
    }
}
