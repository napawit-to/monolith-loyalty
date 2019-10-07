import * as express from "express";
import * as _ from "lodash";
import CircuitBreaker from "../circuit-breaker";

export function requireResponse(keys: string[]) : ({
    status: number;
    body?: Object;
} | Error) {
    let circuitOpen = keys.some((key) => !CircuitBreaker.getStatus(key));

    if (!circuitOpen) {
        return {
            status: 200
        };
    }

    return new Error("E000002");
}
