import * as moment from "moment";
import * as supertest from "supertest";
import Router from "../../router";
import { ErrorMap, ErrorConfigurationMapSchema } from "../../error-map";
import MockBroker from "../../adapters/implementations/mock-messaging";
import MockDatabase from "../../adapters/implementations/mock-database";
import {
    default as MockJWTSessionTracker
} from "../../adapters/implementations/mock-jwt-session-tracker";
import {
    default as BruteForceExtension
} from "../../controller-extensions/brute-force-extension";
import {
    AuthenticationAttempt, AuthenticationStatus
} from "../../models/authentication-attempt";
import { BasicApplication } from "../../app";

let app = new BasicApplication({
    service: {
        name: "test-service",
        domain: "99",
        code: "99",
        version: "0.1.0"
    },
    module: module,
    broker: new MockBroker(),
    database: new MockDatabase(),
    sessionTracker: new MockJWTSessionTracker()
}).setupErrorMap((app) => Promise.resolve(new ErrorMap({
    E990000: {
        status: 400,
        message: {
            en: (
                "{{numberOfAttempts}} / {{maxAttempts}} attempts" +
                " ({{remainingAttempts}} left)"
            )
        }
    },
    E990001: {
        status: 400,
        message: {
            en: "Brute force blocked"
        }
    }
}))).routes(Router(() => app)
        .route("/brute-force").post({
            perform: async(request) => {
                let value = await BruteForceExtension(
                    app,
                    request.body,
                    {
                        service : () => new Promise<boolean |
                         Error>((resolve, reject) => {
                             if (request.body.error) {
                                 return resolve(new Error());
                             } else {
                                 return resolve(false);
                             }
                         })
                    },
                    {
                        attempt: new Error("E990000"),
                        blacklist: new Error("E990001")
                    }
                );

                return {
                    status: 200,
                    body: {
                        value: value
                    }
                };
            }
        })
);

let database = app.database;

describe("Controller extensions - Brute Force Extension", () => {
    beforeEach(() => {
        return app.test.start();
    });

    it("should allow to access the service's operation if valid",
        () => supertest(app.app)
            .post("/brute-force")
            .send({
                user_id: "1",
                device_id: "1",
                authentication: {
                    type: "login",
                    sub_type: "login"
                }
            })
            .expect(200)
            .expect((response) => {
                expect(response.body).toMatchObject({
                    value: false
                });
            })
    );

    it("should count access attempts when access with invalid credential (1st)",
        () => {
            database.authenticationAttempts = [{
                device_id: "1",
                user_id: "1",
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                status: "void",
                type: "login",
                sub_type: "login"
            }, {
                device_id: "1",
                user_id: "2",
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                status: "fail",
                type: "login",
                sub_type: "login"
            }, {
                device_id: "1",
                user_id: "1",
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                status: "fail",
                type: "admin-login",
                sub_type: "login"
            }];

            return supertest(app.app)
                .post("/brute-force")
                .send({
                    user_id: "1",
                    device_id: "1",
                    authentication: {
                        type: "login",
                        sub_type: "login"
                    },
                    error: true
                })
                .expect(400)
                .expect((response) => {
                    expect(response.body).toMatchObject({
                        error: {
                            code: "E99990000",
                            message: "1 / 3 attempts (2 left)"
                        }
                    });
                });
        }
    );

    it("should count access attempts when access with invalid credential (2nd)",
        () => {
            database.authenticationAttempts = [{
                device_id: "1",
                user_id: "1",
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                status: "fail",
                type: "login",
                sub_type: "login"
            }, {
                device_id: "1",
                user_id: "2",
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                status: "fail",
                type: "login",
                sub_type: "login"
            }, {
                device_id: "1",
                user_id: "1",
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                status: "fail",
                type: "admin-login",
                sub_type: "login"
            }];

            return supertest(app.app)
                .post("/brute-force")
                .send({
                    user_id: "1",
                    device_id: "1",
                    authentication: {
                        type: "login",
                        sub_type: "login"
                    },
                    error: true
                })
                .expect(400)
                .expect((response) => {
                    expect(response.body).toMatchObject({
                        error: {
                            code: "E99990000",
                            message: "2 / 3 attempts (1 left)"
                        }
                    });
                });
        }
    );

    it("should block the access when access attempts are exceeded",
        () => {
            database.authenticationAttempts = [{
                device_id: "1",
                user_id: "1",
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                status: "fail",
                type: "login",
                sub_type: "login"
            }, {
                device_id: "1",
                user_id: "1",
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                status: "fail",
                type: "login",
                sub_type: "login"
            }, {
                device_id: "1",
                user_id: "1",
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                status: "fail",
                type: "login",
                sub_type: "login"
            }];

            return supertest(app.app)
                .post("/brute-force")
                .send({
                    user_id: "1",
                    device_id: "1",
                    authentication: {
                        type: "login",
                        sub_type: "login"
                    },
                    error: true
                })
                .expect(400)
                .expect((response) => {
                    expect(response.body).toMatchObject({
                        error: {
                            code: "E99990001",
                            message: "Brute force blocked"
                        }
                    });
                });
        }
    );

    it("should reset the attempts when credential is valid",
        () => {
            let now = new Date();

            let statusAttempts: (
                status: AuthenticationStatus
            ) => AuthenticationAttempt[] = (status) => [{
                device_id: "1",
                user_id: "1",
                create_timestamp: now,
                update_timestamp: now,
                status: status,
                type: "login",
                sub_type: "login"
            }, {
                device_id: "1",
                user_id: "1",
                create_timestamp: now,
                update_timestamp: now,
                status: status,
                type: "login",
                sub_type: "login"
            }];

            database.authenticationAttempts = statusAttempts("fail");

            return supertest(app.app)
                .post("/brute-force")
                .send({
                    user_id: "1",
                    device_id: "1",
                    authentication: {
                        type: "login",
                        sub_type: "login"
                    }
                })
                .expect(200)
                .expect((response) => {
                    expect(response.body).toMatchObject({
                        value: false
                    });

                    expect(database.authenticationAttempts).toMatchObject(
                        statusAttempts("void").concat([{
                            device_id: "1",
                            user_id: "1",
                            status: "success",
                            type: "login",
                            sub_type: "login"
                        }])
                    );
                });
        }
    );

    it("should blocked the access when the blacklist is still valid",
        () => {
            database.authenticationBlacklists = [{
                block_duration: 300,
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                device_id: "1",
                user_id: "1",
                type: "login",
                sub_type: "login",
                expire_timestamp: moment().add(1, "minute").toDate()
            }];

            return supertest(app.app)
                .post("/brute-force")
                .send({
                    user_id: "1",
                    device_id: "1",
                    authentication: {
                        type: "login",
                        sub_type: "login"
                    }
                })
                .expect(400)
                .expect((response) => {
                    expect(response.body).toMatchObject({
                        error: {
                            code: "E99990001",
                            message: "Brute force blocked"
                        }
                    });
                });
        }
    );

    it("should be able to access when the blacklist is expired",
        () => {
            database.authenticationBlacklists = [{
                block_duration: 300,
                create_timestamp: new Date(),
                update_timestamp: new Date(),
                device_id: "1",
                user_id: "1",
                type: "login",
                sub_type: "login",
                expire_timestamp: moment().subtract(1, "minute").toDate()
            }];

            return supertest(app.app)
                .post("/brute-force")
                .send({
                    user_id: "1",
                    device_id: "1",
                    authentication: {
                        type: "login",
                        sub_type: "login"
                    }
                })
                .expect(200)
                .expect((response) => {
                    expect(response.body).toMatchObject({
                        value: false
                    });
                });
        }
    );

    afterEach(() => {
        database.resetDatabase();
        app.stop();
    });
});
