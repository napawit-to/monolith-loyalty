import * as moment from "moment";
import { ErrorConfigurationMapSchema } from "../../error-map";
import { StringLocalizationSchema } from "../../i18n";
import { Database, DatabaseEventHandler } from "../database";
import { TransactionSession } from "../../models/transaction-session";
import { TransactionFruad } from "../../models/transaction-fruad";
import {
    AuthenticationAttempt, AuthenticationStatus, AuthenticationType
} from "../../models/authentication-attempt";
import AuthenticationBlacklist from "../../models/authentication-blacklist";

export default class MockDatabase implements Database {
    name: string = "db";
    transactionSessions: TransactionSession[] = [];
    transactionFruads: TransactionFruad[] = [];
    authenticationAttempts: AuthenticationAttempt[] = [];
    authenticationBlacklists: AuthenticationBlacklist[] = [];

    resetDatabase() {
        this.transactionSessions = [];
        this.transactionFruads = [];
        this.authenticationAttempts = [];
        this.authenticationBlacklists = [];
    }

    get firstSession() {
        return this.transactionSessions.length > 0
            ? this.transactionSessions[0] : undefined;
    }

    connect(url: Readonly<string>, options?: Readonly<any>) {
        return new Promise<this>((resolve, reject) => resolve(this));
    }

    disconnect() {
        return new Promise<void>((resolve, reject) => resolve());
    }

    useHandler(eventHandler: DatabaseEventHandler) {
        return this;
    }

    getStringLocalization() {
        return new Promise<StringLocalizationSchema>(
            (resolve, reject) => resolve({})
        );
    }

    getErrorMap() {
        return new Promise<ErrorConfigurationMapSchema>(
            (resolve, reject) => resolve({})
        );
    }

    getConfigurations() {
        return new Promise<object>((resolve, reject) => resolve({}));
    }

    createTransactionSession(transactionSession: TransactionSession) {
        return new Promise<TransactionSession>((resolve, reject) => {
            if (!transactionSession.update_timestamp) {
                transactionSession.update_timestamp = new Date();
            }
            if (!transactionSession.create_timestamp) {
                transactionSession.create_timestamp = new Date();
            }
            this.transactionSessions.push(transactionSession);
            return resolve(transactionSession);
        });
    }

    getTransactionSession(key: string) {
        return new Promise<TransactionSession>((resolve, reject) => {
            let transactionSession = this.transactionSessions.find(
                (log) => log.key === key
            );

            if (transactionSession) {
                return resolve(transactionSession);
            }
            return reject(new Error("E000000"));
        });
    }

    updateTransactionSession(transactionSession: TransactionSession) {
        return new Promise<TransactionSession>((resolve, reject) => {
            if (this.firstSession) {
                return resolve(this.firstSession);
            }
            return reject(new Error("E000000"));
        });
    }

    createTransactionFruad(transactionFruad: TransactionFruad) {
        return new Promise<TransactionFruad>((resolve, reject) => {
            if (!transactionFruad.update_timestamp) {
                transactionFruad.update_timestamp = new Date();
            }
            if (!transactionFruad.create_timestamp) {
                transactionFruad.create_timestamp = new Date();
            }
            this.transactionFruads.push(transactionFruad);
            return resolve(transactionFruad);
        });
    }

    createAuthenticationAttempt(
        authenticationAttempt: AuthenticationAttempt
    ) {
        return new Promise<AuthenticationAttempt>((resolve, reject) => {
            this.authenticationAttempts.push(authenticationAttempt);
            return resolve(authenticationAttempt);
        });
    }

    createAuthenticationBlacklist(
        authenticationBlacklist: AuthenticationBlacklist
    ) {
        return new Promise<AuthenticationBlacklist>((resolve, reject) => {
            this.authenticationBlacklists.push(authenticationBlacklist);
            return resolve(authenticationBlacklist);
        });
    }

    getAuthenticationAttempts(query: {
        userID: string;
        type: AuthenticationType;
        fromTimestamp: moment.Moment;
    }) {
        return new Promise<AuthenticationAttempt[]>(
            (resolve, reject) => resolve(this.authenticationAttempts.filter(
                (attempt) => (
                    attempt.status === "fail" &&
                    attempt.user_id === query.userID &&
                    attempt.type === query.type &&
                    moment(
                        attempt.create_timestamp
                    ).isAfter(query.fromTimestamp)
                )
            ))
        );
    }

    getAuthenticationBlacklist(query: {
        userID: string;
        type: AuthenticationType
    }) {
        return new Promise<
            AuthenticationBlacklist | undefined
        >((resolve, reject) => resolve(this.authenticationBlacklists.find(
            (blacklist) => (
                blacklist.user_id === query.userID &&
                blacklist.type === query.type &&
                moment(
                    blacklist.expire_timestamp
                ).isAfter(moment())
            )
        )));
    }

    updateAuthenticationAttemptStatus(query: {
        userID: string;
        type: AuthenticationType;
        fromTimestamp: moment.Moment;
        status: AuthenticationStatus;
    }) {
        return new Promise<void>((resolve, reject) => {
            // for (let i = 0; i < this.authenticationAttempts.length; i++) {
            //     let attempt = this.authenticationAttempts[i];
            //     if (
            //         attempt.user_id !== query.userID ||
            //         attempt.type !== query.type ||
            //         moment(
            //             attempt.create_timestamp
            //         ).isSameOrBefore(query.fromTimestamp)
            //     ) {
            //         continue;
            //     }

            //     this.authenticationAttempts[i].status = query.status;
            // }

            this.authenticationAttempts.filter(
                (attempt) => (
                    attempt.status === "fail" &&
                    attempt.user_id === query.userID &&
                    attempt.type === query.type &&
                    moment(
                        attempt.create_timestamp
                    ).isAfter(query.fromTimestamp)
                )
            ).forEach((attempt) => {
                attempt.status = query.status;
            });

            return resolve();
        });
    }
}
