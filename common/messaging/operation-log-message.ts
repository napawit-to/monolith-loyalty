export default interface OperationLogMessage {
    requestID: Readonly<string>;
    clientIP: Readonly<string>;
    applicationName: Readonly<string>;
    applicationVersion: Readonly<string>;
    sourceServiceName?: Readonly<string>;
    sourceServiceVersion?: Readonly<string>;
    serviceName: Readonly<string>;
    serviceVersion: Readonly<string>;
    operationName: Readonly<string>;
    userAgent: Readonly<string>;
    device: {
        brandName: Readonly<string>;
        brandModel: Readonly<string>;
        osName: Readonly<string>;
        osVersion: Readonly<string>;
    };
    userID: Readonly<string>;
    deviceID?: Readonly<string>;
    branchID?: Readonly<string>;
    request?: Readonly<string>;
    requestFiles?: Readonly<{
        name: string;
        mimetype: string;
        size: number;
    }[]>;
    statusCode?: Readonly<string>;
    response?: Readonly<string>;
    rejectReason?: {
        code: Readonly<string>;
        message: Readonly<string>;
    };
    mobileNetwork?: {
        provider: string;
        type: string;
        strength: number;
        noise: number;
    };
    geolocation?: {
        // NOTE(sirisak.lu): Usually should be "Point"
        type: string;
        // NOTE(sirisak.lu): Latitude, Longitude (not the other way around)
        coordinates: number[];
    };
    latency: Readonly<number>;
    create_timestamp?: Readonly<Date>;
    update_timestamp?: Readonly<Date>;
}
