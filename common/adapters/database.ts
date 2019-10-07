import Adapter from "./adapter";
import * as moment from "moment";
import { ErrorConfigurationMapSchema } from "../error-map";
import { StringLocalizationSchema } from "../i18n";
import TransactionSession from "../models/transaction-session";
import TransactionFruad from "../models/transaction-fruad";
import {
    AuthenticationAttempt, AuthenticationStatus, AuthenticationType
} from "../models/authentication-attempt";
import AuthenticationBlacklist from "../models/authentication-blacklist";

export interface DatabaseEventHandler {
    onConnect?: () => void;
    onConnected?: () => void;
    onDisconnect?: () => void;
    onDisconnected?: () => void;
    onError?: (error: any) => void;
}

export interface Database extends Adapter {
    connect(url: Readonly<string>, options?: Readonly<any>): Promise<this>;
    disconnect(): Promise<void>;
    useHandler(eventHandler: DatabaseEventHandler): this;

    getStringLocalization(): Promise<StringLocalizationSchema>;
    getErrorMap(): Promise<ErrorConfigurationMapSchema>;
    getConfigurations(): Promise<object>;

    createTransactionSession(
        transactionSession: TransactionSession
    ): Promise<TransactionSession>;
    getTransactionSession(
        key: string
    ): Promise<TransactionSession | undefined>;
    updateTransactionSession(
        transactionSession: TransactionSession
    ): Promise<TransactionSession | undefined>;
    createTransactionFruad(
        transactionFruad: TransactionFruad
    ): Promise<TransactionFruad>;

    createAuthenticationAttempt(
        authenticationAttempt: AuthenticationAttempt
    ): Promise<AuthenticationAttempt>;
    createAuthenticationBlacklist(
        authenticationBlacklist: AuthenticationBlacklist
    ): Promise<AuthenticationBlacklist>;
    getAuthenticationAttempts(query: {
        userID: string;
        type: AuthenticationType;
        fromTimestamp: moment.Moment;
    }): Promise<AuthenticationAttempt[]>;
    getAuthenticationBlacklist(query: {
        userID: string;
        type: AuthenticationType
    }): Promise<AuthenticationBlacklist | undefined>;
    updateAuthenticationAttemptStatus(query: {
        userID: string;
        type: AuthenticationType;
        fromTimestamp: moment.Moment;
        status: AuthenticationStatus;
    }): Promise<void>;
}

export default Database;
