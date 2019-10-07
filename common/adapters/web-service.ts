import Request from "../request";
import WebService from "./implementations/web-service";

export enum ServiceType {
    Service,
    ThirdPartyService
}

export type ServiceRequest = (service: WebService) => {
    to: (path: string) => Request;
    toExact: (path: string) => Request;
};

export type ServiceOperation<T> = (request: ServiceRequest) => Promise<T>;
