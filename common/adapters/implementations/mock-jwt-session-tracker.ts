import * as moment from "moment";
import { JWTSession } from "../../models/jwt-session";
import { TokenBlacklist } from "../../models/token-blacklist";
import JWTSessionTracker from "../jwt-session-tracker";
import SuperError from "../../super-error";
import MockDatabase from "./mock-database";

export default class MockJWTSessionTracker
    extends MockDatabase
    implements JWTSessionTracker
{
    name: string = "session-tracker";
    jwtSessions: JWTSession[] = [];
    tokenBlacklists: TokenBlacklist[] = [];

    resetJWTSessions() {
        this.jwtSessions = [];
        this.tokenBlacklists = [];
    }

    getJWTSession(userID: String) {
        return new Promise<JWTSession>((resolve, reject) => {
            let jwtSession = this.jwtSessions.find((session) => (
                session.user_id === userID
            ));
            if (!jwtSession) {
                return resolve(undefined);
            }
            return resolve(jwtSession);
        });
    }

    setJWTSession(jwtSession: JWTSession) {
        return new Promise<JWTSession>((resolve, reject) => {
            let updateJWTSession = this.jwtSessions.find((session) => (
                session.user_id === jwtSession.user_id
            ));
            if (updateJWTSession) {
                updateJWTSession = jwtSession;
            } else {
                this.jwtSessions.push(jwtSession);
            }
            return resolve(jwtSession);
        });
    }

    deleteJWTSession(userID: String) {
        return new Promise<void>((resolve, reject) => {
            let updateJWTSession = this.jwtSessions.find((session) => (
                session.user_id === userID
            ));
            if (updateJWTSession) {
                let index = this.jwtSessions.indexOf(updateJWTSession);
                if (index > -1) {
                    this.jwtSessions.splice(index, 1);
                }
            }
            return resolve();
        });
    }

    getExpireJWTSessions() {
        return new Promise<JWTSession[] | undefined>((resolve, reject) => {
            let jwtSession = this.jwtSessions.filter((session) => (
                session.expire_timestamp &&
                moment(session.expire_timestamp).isBefore(moment())
            ));
            if (!jwtSession) {
                return resolve(undefined);
            }
            return resolve(jwtSession);
        });
    }

    addTokenBlacklist(tokenBlacklist: TokenBlacklist) {
        return new Promise<TokenBlacklist>((resolve, reject) => {
            if (!tokenBlacklist.update_timestamp) {
                tokenBlacklist.update_timestamp = new Date();
            }
            if (!tokenBlacklist.create_timestamp) {
                tokenBlacklist.create_timestamp = new Date();
            }
            this.tokenBlacklists.push(tokenBlacklist);
            return resolve(tokenBlacklist);
        });
    }

    getTokenBlacklist(token: string) {
        return new Promise<TokenBlacklist | undefined>((resolve, reject) => {
            let tokenBlacklist = this.tokenBlacklists.find((blacklist) => (
                blacklist.token === token
            ));
            if (!tokenBlacklist) {
                return resolve();
            }
            return resolve(tokenBlacklist);
        });
    }

    deleteTokenBlacklist(token: string) {
        return new Promise<void>((resolve, reject) => {
            let updateTokenBlacklist = this.tokenBlacklists.find((blacklist) =>
            (
                blacklist.token === token
            ));
            if (updateTokenBlacklist) {
                let index = this.tokenBlacklists.indexOf(updateTokenBlacklist);
                if (index > -1) {
                    this.tokenBlacklists.splice(index, 1);
                }
            }
            return resolve();
        });
    }
}
