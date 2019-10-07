import * as crypto from "crypto";
import * as moment from "moment";
import * as jwt from "jsonwebtoken";
import * as _ from "lodash";
import { internal as Config } from "./config";

interface PlainTokens {
    accessToken: string;
    refreshToken: string;
}

interface Tokens extends PlainTokens {
    tokenInformation: {
        access: {
            expire: number;
            notBefore: number;
            issue: number;
        },
        refresh: {
            expire: number;
            notBefore: number;
            issue: number;
        }
    };
}

interface JWTOptions {
    encrypt?: boolean;
    extraLength?: number;
}

interface JWTValidationOptions extends JWTOptions {
    bypass?: boolean;
    includeRaw?: boolean;
}

export interface JWTPayload {
    usr: string;
    brn: string;
    dev: string;
    app: string;
    uac: string;
}

interface EncryptedJWTPayload {
    pay: string;
}

type RawJWTPayload = Partial<JWTPayload> & Partial<EncryptedJWTPayload> & {
    iat: number;
    nbf: number;
    exp: number;
    jti: string;
    sub: string;
};

interface JWTValidationResult {
    payload: JWTPayload;
    rawPayload?: RawJWTPayload;
}

export class JWT {
    protected static encryptPayload(payload: JWTPayload): EncryptedJWTPayload {
        let encryptAlgorithm = Config.getGlobal(
            "jwt.encrypt-algorithm", "aes-256-xts"
        );
        let encryptKey = Config.getGlobal("jwt.encrypt-key", "secret");
        let cipher = crypto.createCipher(encryptAlgorithm, encryptKey);

        let base64payload = new Buffer(
            JSON.stringify(payload), "utf8"
        ).toString("base64");

        let encryptedPayload = cipher.update(base64payload, "utf8", "hex");
        encryptedPayload += cipher.final("hex");

        return {
            pay: encryptedPayload
        };
    }

    protected static decryptPayload(
        encryptedPayload: EncryptedJWTPayload
    ): JWTPayload | undefined {
        let encryptAlgorithm = Config.getGlobal(
            "jwt.encrypt-algorithm", "aes-256-xts"
        );
        let encryptKey = Config.getGlobal("jwt.encrypt-key", "secret");
        let decipher = crypto.createDecipher(encryptAlgorithm, encryptKey);

        let base64payload = decipher.update(
            encryptedPayload.pay, "hex", "utf8"
        );
        base64payload += decipher.final("utf8");

        try {
            return JSON.parse(
                new Buffer(base64payload, "base64").toString("utf8")
            ) as JWTPayload;
        } catch (error) {
            return undefined;
        }
    }

    private static generateTokensWithTimeSettings(
        payload: JWTPayload,
        timeSettings: {
            accessLength: number;
            refreshLength: number;
            transitionLength: number;
            overlapLength: number;
        },
        options?: JWTOptions
    ): Tokens {
        let unixTime = moment().unix();
        let unixTimeString = unixTime.toString();
        let reverseUnixTimeString = _.reverse(
            unixTimeString.split("")
        ).join("");

        let accessTokenAlgorithm = Config.getGlobal(
            "jwt.access-token-algorithm",
            Config.getGlobal(
                "jwt.token-algorithm",
                "HS512"
            )
        );
        let refreshTokenAlgorithm = Config.getGlobal(
            "jwt.refresh-token-algorithm",
            Config.getGlobal(
                "jwt.token-algorithm",
                "HS512"
            )
        );
        let accessTimeLength = timeSettings.accessLength;
        let refreshTimeLength = timeSettings.refreshLength;
        let transitionTimeLength = timeSettings.transitionLength;
        let overlapTimeLength = timeSettings.overlapLength;

        if (options && options.extraLength) {
            accessTimeLength += options.extraLength;
            refreshTimeLength += options.extraLength;
        }

        let embedPayload: JWTPayload | EncryptedJWTPayload = payload;
        if (!options || options.encrypt === undefined || options.encrypt) {
            embedPayload = this.encryptPayload(payload);
        }

        let accessInformation = {
            issue: unixTime,
            notBefore: unixTime - overlapTimeLength,
            expire: unixTime + accessTimeLength
        };

        let accessPayload = Object.assign(embedPayload, {
            iat: accessInformation.issue,
            nbf: accessInformation.notBefore,
            exp: accessInformation.expire,
            jti: unixTimeString,
            sub: "act"
        });

        let accessToken = jwt.sign(
            accessPayload,
            Config.getGlobal(
                "jwt.access-token-key",
                Config.getGlobal("jwt.token-key", "secret")
            ) + unixTimeString,
            {
                algorithm: accessTokenAlgorithm
            }
        );

        let refreshInformation = {
            issue: unixTime,
            notBefore: (
                unixTime + accessTimeLength - transitionTimeLength -
                overlapTimeLength
            ),
            expire: (
                unixTime + accessTimeLength -
                transitionTimeLength + refreshTimeLength
            )
        };

        let refreshPayload = {
            iat: refreshInformation.issue,
            nbf: refreshInformation.notBefore,
            exp: refreshInformation.expire,
            jti: reverseUnixTimeString,
            sub: "rft"
        };
        let refreshToken = jwt.sign(
            refreshPayload,
            Config.getGlobal(
                "jwt.refresh-token-key",
                Config.getGlobal("jwt.token-key", "secret")
            ) + reverseUnixTimeString,
            {
                algorithm: refreshTokenAlgorithm
            }
        );

        return {
            accessToken: accessToken,
            refreshToken: refreshToken,
            tokenInformation: {
                access: accessInformation,
                refresh: refreshInformation
            }
        };
    }

    static generateExpiredTokens(
        payload: JWTPayload,
        options?: JWTOptions
    ): Tokens {
        return this.generateTokensWithTimeSettings(payload, {
            accessLength: 0,
            refreshLength: 0,
            transitionLength: 0,
            overlapLength: 0
        }, options);
    }

    static generateTokens(
        payload: JWTPayload,
        options?: JWTOptions
    ): Tokens {
        let accessTimeLength = Config.getGlobal(
            "jwt.access-time-length", 60 * 5
        );
        let refreshTimeLength = Config.getGlobal("jwt.refresh-time-length", 60);
        let transitionTimeLength = Config.getGlobal(
            "jwt.transition-time-length",
            10
        );
        let overlapTimeLength = Config.getGlobal(
            "jwt.overlap-time-length",
            3
        );

        return this.generateTokensWithTimeSettings(payload, {
            accessLength: accessTimeLength,
            refreshLength: refreshTimeLength,
            transitionLength: transitionTimeLength,
            overlapLength: overlapTimeLength
        }, options);
    }

    static regenerateTokens(
        tokens: PlainTokens,
        options?: JWTOptions
    ): Tokens | undefined {
        let validateResult = this.validateTokens(
            tokens.accessToken,
            Object.assign(options || {}, {
                bypass: true
            })
        );
        if (!validateResult || !tokens.refreshToken) {
            return undefined;
        }
        try {
            let decodedPayload: {
                jti?: string;
            } = jwt.decode(tokens.refreshToken) as object || {};

            let jwtid: string | undefined = decodedPayload.jti;
            if (!jwtid) {
                return undefined;
            }

            let refreshTokenAlgorithm = Config.getGlobal(
                "jwt.refresh-token-algorithm",
                Config.getGlobal(
                    "jwt.token-algorithm",
                    "HS512"
                )
            );

            jwt.verify(
                tokens.refreshToken,
                Config.getGlobal(
                    "jwt.refresh-token-key",
                    Config.getGlobal("jwt.token-key", "secret")
                ) + jwtid,
                {
                    algorithms: [refreshTokenAlgorithm],
                    subject: "rft"
                }
            );
        } catch (error) {
            return undefined;
        }
        return this.generateTokens(validateResult.payload, options);
    }

    static decodePayload(
        accessToken: string,
        options?: JWTValidationOptions
    ): JWTPayload | undefined {
        if (!accessToken) {
            return undefined;
        }
        try {
            let payload: RawJWTPayload | undefined = (
                jwt.decode(accessToken) as RawJWTPayload
            );

            let plainPayload: JWTPayload;
            if (!options || options.encrypt === undefined || options.encrypt) {
                if (!payload.pay) {
                    return undefined;
                }

                let decryptedPayload = this.decryptPayload({
                    pay: payload.pay
                });

                if (!decryptedPayload) {
                    return undefined;
                }

                return decryptedPayload;
            } else if (_.isEmpty(payload)) {
                return undefined;
            } else {
                return payload as JWTPayload;
            }
        } catch (error) {
            return undefined;
        }
    }

    static validateTokens(
        accessToken: string,
        options?: JWTValidationOptions
    ): JWTValidationResult | undefined {
        if (!accessToken) {
            return undefined;
        }
        try {
            let decodedPayload: {
                jti?: string;
            } = jwt.decode(accessToken) as object || {};

            let jwtid: string | undefined = decodedPayload.jti;
            if (!jwtid) {
                return undefined;
            }

            let accessTokenAlgorithm = Config.getGlobal(
                "jwt.access-token-algorithm",
                Config.getGlobal(
                    "jwt.token-algorithm",
                    "HS512"
                )
            );

            let payload = jwt.verify(
                accessToken,
                Config.getGlobal(
                    "jwt.access-token-key",
                    Config.getGlobal("jwt.token-key", "secret")
                ) + jwtid,
                {
                    algorithms: [accessTokenAlgorithm],
                    subject: "act",
                    ignoreExpiration: options ? options.bypass : undefined,
                    ignoreNotBefore: options ? options.bypass : undefined
                }
            ) as RawJWTPayload;

            let plainPayload: JWTPayload;
            if (!options || options.encrypt === undefined || options.encrypt) {
                if (!payload.pay) {
                    return undefined;
                }

                let decryptedPayload = this.decryptPayload({
                    pay: payload.pay
                });

                if (!decryptedPayload) {
                    return undefined;
                }

                plainPayload = decryptedPayload;
            } else if (_.isEmpty(payload)) {
                return undefined;
            } else {
                plainPayload = payload as JWTPayload;
            }

            return {
                payload: plainPayload,
                rawPayload: (
                    (options && options.includeRaw) ? payload : undefined
                )
            };
        } catch (error) {
            return undefined;
        }
    }
}

export default JWT;
