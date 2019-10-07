import { BasicApplication } from "../app";
import Database from "../adapters/database";
import MessageBroker from "../adapters/messaging";
import JWTSessionTracker from "../adapters/jwt-session-tracker";
import {
    AuthenticationType, AuthenticationSubType
} from "../models/authentication-attempt";
import { DynamicError } from "../super-error";
import * as moment from "moment";

export default <T, A extends BasicApplication>(
    app: A,
    information: {
        user_id: string;
        device_id: string;
        branch_code?: string;
        authentication: {
            type: AuthenticationType;
            sub_type: AuthenticationSubType;
        };
    },
    promise: { service: () => Promise<T | Error> },
    error: {
        blacklist: Error;
        attempt?: Error;
    }
) => app.database.getAuthenticationBlacklist({
    userID: information.user_id,
    type: information.authentication.type
}).then((authenticationBlacklist) => {
    if (authenticationBlacklist) {
        throw error.blacklist;
    }

    let lookBehindTimestamp = moment().subtract(app.config.get(
        "brute-force-prevention.look-behind-duration", 300
    ), "second");

    return Promise.all([
        app.database.getAuthenticationAttempts({
            userID: information.user_id,
            type: information.authentication.type,
            fromTimestamp: lookBehindTimestamp
        }),
        promise.service()
    ]);
}).then(([authenticationAttempts, output]) => {
    let promises: PromiseLike<any>[] = [];
    let maxAttempts = app.config.get(
        "brute-force-prevention.max-attempt", 3
    );

    if (output instanceof Error) {
        promises.push(app.database.createAuthenticationAttempt({
            branch_code: information.branch_code,
            user_id: information.user_id,
            device_id: information.device_id,
            type: information.authentication.type,
            sub_type: information.authentication.sub_type,
            status: "fail"
        }));

        if (authenticationAttempts.length >= maxAttempts - 1) {
            let blockDuration = app.config.get(
                "brute-force-prevention.block-duration", 600
            );

            promises.push(
                app.database.createAuthenticationBlacklist({
                    branch_code: information.branch_code,
                    user_id: information.user_id,
                    device_id: information.device_id,
                    type: information.authentication.type,
                    sub_type: information.authentication.sub_type,
                    block_duration: blockDuration,
                    expire_timestamp: moment().add(
                        blockDuration, "second"
                    ).toDate()
                })
            );
            output = error.blacklist;
        }
    } else {
        promises.push(
            app.database.createAuthenticationAttempt({
                branch_code: information.branch_code,
                user_id: information.user_id,
                device_id: information.device_id,
                type: information.authentication.type,
                sub_type: information.authentication.sub_type,
                status: "success"
            })
        );
        let lookBehindTimestamp = moment().subtract(app.config.get(
            "brute-force-prevention.look-behind-duration", 300
        ), "second");
        promises.push(
            app.database.updateAuthenticationAttemptStatus({
                userID: information.user_id,
                type: information.authentication.type,
                fromTimestamp: lookBehindTimestamp,
                status: "void"
            })
        );
    }

    return Promise.all([
        Promise.resolve(output),
        Promise.resolve({
            remainingAttempts: maxAttempts - authenticationAttempts.length - 1,
            numberOfAttempts: authenticationAttempts.length + 1,
            maxAttempts: maxAttempts
        }),
        Promise.all(promises)
    ]);
}).then(([output, attemptInformation]) => {
    if (output instanceof Error) {
        if (output.message === error.blacklist.message) {
            throw output;
        }
        throw new DynamicError(
            (error.attempt || output).message,
            attemptInformation
        );
    }
    return Promise.resolve(output);
});
