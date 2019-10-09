import { ControllerDelegate } from "../common/middlewares/controller";
import App from "../app";
import { stringify } from "querystring";
export let catalogues: ControllerDelegate<{
}, {}> = {
    perform: async (request) => {
        let catalogues = await App.database.getCatalogues();
        if (!catalogues) {
            throw new Error("E00000001")
        }

        return {
            status: 200,
            body: {
                catalogues_list: catalogues
            }
        };
    }
};
export let redeem: ControllerDelegate<{
    customer_id: string,
    RewardRef:string
}, {
}> = {
    expectations: {
        body: {
            customer_id: {
                type: "string",
                required: true
            },
            RewardRef: {
                type: "string",
                required: true
            }
        }
    },
    perform: async (request) => {
        // deduct point
        let user = await App.database.redeem(request.body.customer_id);
        if (!user) {
            throw new Error("E00000002")
        }
        // deduct item
        let item = await App.database.deductItem(request.body.RewardRef);
        if (!item){
            throw new Error("E00000003")
        }
        return {
            status: 200,
        };
    }
};
