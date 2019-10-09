import BaseDatabase from "../../common/adapters/implementations/mock-database";
import Database from "../database";

export default class MockDatabase extends BaseDatabase implements Database {
    getCatalogues(){
        return new Promise<any>((resolve, reject) => resolve({}));
    }
    redeem(customerID:string){
        return new Promise<any>((resolve, reject) => resolve({}));
    }
    deductItem(rewardRef:string){
        return new Promise<any>((resolve, reject) => resolve({}));
    }
}
