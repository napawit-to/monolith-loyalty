import * as Config from "../../config";
import Request from "../../request";
import Adapter from "../adapter";
import { ServiceType } from "../web-service";

export class WebService implements Adapter {
    name: string;
    type: ServiceType;

    protected constructor(name: string, type: ServiceType) {
        this.name = name;
        this.type = type;
    }
}

export default WebService;
