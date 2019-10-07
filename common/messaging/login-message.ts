import { MobileNetwork } from "../middlewares/controller";
import { Geolocation } from "../middlewares/controller";

export default interface LoginMessage {
    teller_id: number;
    device_id: string;
    branch_id?: number;
    login_status: "success" | "fail";
    application_name: string;
    error_code?: string;
    geolocation?: Geolocation;
    mobile_network?: MobileNetwork;
}
