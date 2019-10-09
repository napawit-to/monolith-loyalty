import BaseDatabase from "../common/adapters/database";
import User from "../models/catalogues";

interface Database extends BaseDatabase {
    getCatalogues(): Promise<any>;
    redeem(customerID:string): Promise<any>;
    deductItem(rewardRef:string): Promise<any>;
}

export default Database;
