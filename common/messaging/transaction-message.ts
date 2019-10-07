import { MobileNetwork } from "../middlewares/controller";
import { Geolocation } from "../middlewares/controller";

export default interface TransactionMessage {
    transaction_id: string;
    teller_id: number;
    market_id?: string;
    stall_id?: string;
    cif?: number;
    account_number?: string;
    account_type?: number;
    transaction_status: "success" | "ec" | "pending-ec";
    transaction_type: "deposit" | "bill-payment" | "loan-payment";
    transaction_amount: number;
    transaction_fee: number;
    device_id: string;
    branch_id: number;
    timestamp: string;
    is_mymo_user?: boolean;
    is_personal?: boolean;
    occupation_code?: string;
    occupation_sub_code?: string;
    salary_code?: string;
    age?: number;
    gender?: string;
    geolocation?: Geolocation;
    mobile_network?: MobileNetwork;
    company_code?: string;
}
