import * as bluebird from "bluebird";
import * as mongoose from "mongoose";
import * as moment from "moment";
import SuperError from "../../super-error";
import {
    JWTSession,
    MongoJWTSession,
    JWTSessionSchema
} from "../../models/implementations/mongodb-jwt-session";
import {
    TokenBlacklist,
    MongoTokenBlacklist,
    TokenBlacklistSchema
} from "../../models/implementations/mongodb-token-blacklist";
import CircuitBreaker from "../../circuit-breaker";
import JWTSessionTracker from "../jwt-session-tracker";
import MongoDBDatabase from "./mongodb-database";

export default class MongoDBJWTSessionTracker
    extends MongoDBDatabase
    implements JWTSessionTracker
{
    name: string = "session-tracker";
    protected jwtSessionModel!: mongoose.Model<
        MongoJWTSession
    >;
    protected tokenBlacklistModel!: mongoose.Model<
        MongoTokenBlacklist
    >;

    protected createModels() {
        this.jwtSessionModel = this.connection.model<
            MongoJWTSession
        >(
            "JWTSession", JWTSessionSchema
        );

        this.tokenBlacklistModel = this.connection.model<
            MongoTokenBlacklist
        >(
            "TokenBlacklist", TokenBlacklistSchema
        );
    }

    getJWTSession(userID: String) {
        return new Promise<JWTSession>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.jwtSessionModel.findOne({
                user_id: userID
            })
            .then((result) => resolve(result ? result : undefined))
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    setJWTSession(jwtSession: JWTSession) {
        return new Promise<JWTSession>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            let updateValue = {
                terminal_id: jwtSession.terminal_id,
                branch_id: jwtSession.branch_id,
                access_token: jwtSession.access_token,
                refresh_token: jwtSession.refresh_token,
                token_information: jwtSession.token_information,
                cbs_token: jwtSession.cbs_token,
                create_timestamp: (
                    jwtSession.create_timestamp ?
                    jwtSession.create_timestamp : moment.now()
                ),
                update_timestamp: moment.now(),
                expire_timestamp: (
                    jwtSession.expire_timestamp ?
                    jwtSession.expire_timestamp : moment.now()
                )
            };

            this.jwtSessionModel.findOneAndUpdate({
                user_id: jwtSession.user_id
            }, updateValue, {
                upsert: true, new: true
            })
            .then((result) => resolve(result ? result : jwtSession))
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    deleteJWTSession(userID: String) {
        return new Promise<void>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.jwtSessionModel.findOneAndRemove({
                user_id: userID
            })
            .then((session) => resolve())
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    getExpireJWTSessions() {
        return new Promise<JWTSession[] | undefined>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.jwtSessionModel.find({
                expire_timestamp: {$lt : moment().toDate()}
            })
            .then((result) => resolve(result ? result : undefined))
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    addTokenBlacklist(tokenBlacklist: TokenBlacklist) {
        return new Promise<TokenBlacklist>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            let tokenBlacklistRecord = new this.tokenBlacklistModel();
            tokenBlacklistRecord.user_id = tokenBlacklist.user_id;
            tokenBlacklistRecord.terminal_id = tokenBlacklist.terminal_id;
            tokenBlacklistRecord.branch_id = tokenBlacklist.branch_id;
            tokenBlacklistRecord.token = tokenBlacklist.token;
            tokenBlacklistRecord.token_type = tokenBlacklist.token_type;
            if (tokenBlacklist.expire_timestamp) {
                tokenBlacklistRecord.expire_timestamp = (
                    tokenBlacklist.expire_timestamp
                );
            }
            if (tokenBlacklist.create_timestamp) {
                tokenBlacklistRecord.create_timestamp = (
                    tokenBlacklist.create_timestamp
                );
            }
            if (tokenBlacklist.update_timestamp) {
                tokenBlacklistRecord.update_timestamp = (
                    tokenBlacklist.update_timestamp
                );
            }

            tokenBlacklistRecord.save()
            .then(resolve)
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    getTokenBlacklist(token: string) {
        return new Promise<TokenBlacklist | undefined>((resolve, reject) => {
            if (this.error) {
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(this.error);
                }
                return reject(this.error);
            }

            this.tokenBlacklistModel.findOne({
                token: token
            }).then((result) => {
                if (!result) {
                    return resolve();
                }
                return resolve(result);
            })
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }

    deleteTokenBlacklist(token: string) {
        return new Promise<void>((resolve, reject) => {
            if (this.error) {
                return reject(this.error);
            }

            this.tokenBlacklistModel.findOneAndRemove({
                token: token
            })
            .then((session) => resolve())
            .catch((error) => {
                let superError = new SuperError(
                    "E000100", error, this.error
                );
                if (this.eventHandler && this.eventHandler.onError) {
                    this.eventHandler.onError(superError);
                }
                return reject(superError);
            });
        });
    }
}
