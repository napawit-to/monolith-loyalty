import * as moment from "moment";
import * as jwtRaw from "jsonwebtoken";
import JWT from "../jwt";

describe("JWT", () => {
    const encryptedPayload = (
        "9a1911beca788c1bfc536e82734a3e98dee05be00316" +
        "a00984a52fcf4e402da79ecd0da5c6e912ccae93d0ef"
    );

    const encryptedAccessToken = (
        "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9." +
        "eyJwYXkiOiI5YTE5MTFiZWNhNzg4YzFiZmM1MzZlODI3MzRhM2U5OGR" +
        "lZTA1YmUwMDMxNmEwMDk4NGE1MmZjZjRlNDAyZGE3OWVjZDBkYTVjNm" +
        "U5MTJjY2FlOTNkMGVmIiwiaWF0IjoxMDAwLCJuYmYiOjk5NywiZXhwI" +
        "joxMzAwLCJqdGkiOiIxMDAwIiwic3ViIjoiYWN0In0.XutJlTakCMEM" +
        "PoIXbVNJ0Odrf7KZ6xF8mdVSpjwybyu1eAyGNEpMSlWKjcFN5ldprL8" +
        "R1KtSn8M-MHbPVmPP_g"
    );

    const invalidAlgorithmAccessToken = (
        "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9." +
        "eyJwYXkiOiI4NzhkYTI3YTI5MzVlNzIxMGFkN2U2MTQ4M2MzMzM2MjI" +
        "2MTUwNzhhYzJhZmUwMzNlNTY5YjNjMTY0NzkwMWZlYjhhNGZkYTBlNz" +
        "A0MGNhZWFlOTFiZmU2NzEyMGRlMTIiLCJpYXQiOjEwMDAsIm5iZiI6O" +
        "Tk3LCJleHAiOjEzMDAsImp0aSI6IjEwMDAiLCJzdWIiOiJhY3QifQ.X" +
        "68MssT5KSzhp7OP_ZztLpcQ2IICJzCdKWq78Dz96pYE0wyL-P4v-Flg" +
        "JkaXWuWFdnbuxIS700Apj0oRjHK35w"
    );

    const invalidSecretAccessToken = (
        "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9." +
        "eyJwYXkiOiI5YTE5MTFiZWNhNzg4YzFiZmM1MzZlODI3MzRhM2U5OGR" +
        "lZTA1YmUwMDMxNmEwMDk4NGE1MmZjZjRlNDAyZGE3OWVjZDBkYTVjNm" +
        "U5MTJjY2FlOTNkMGVmIiwiaWF0IjoxMDAwLCJuYmYiOjk5NywiZXhwI" +
        "joxMzAwLCJqdGkiOiIxMDAwIiwic3ViIjoiYWN0In0.SKZlblN5zQFp" +
        "izWDy49EKk4rsxPux-qElIB7qqRUbRtAb-UdYm0V9ukit93fKrljr02" +
        "2RaH73AWkH_9oGPaQfA"
    );

    const plainAccessToken = (
        "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9." +
        "eyJ1c3IiOiIxIiwiYnJuIjoiMiIsImRldiI6IjMiLCJpYXQiOjEwMDA" +
        "sIm5iZiI6OTk3LCJleHAiOjEzMDAsImp0aSI6IjEwMDAiLCJzdWIiOi" +
        "JhY3QifQ.9d4p5t1x-voI4F69Wd4lUqKc_7TIc_fT8Jf7D2LMOTCDQR" +
        "ycHTKr9ZgjNVA2-yLuz2HZMpdwuRNr7IqahgSzxw"
    );
    const plainRefreshToken = (
        "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9." +
        "eyJpYXQiOjEwMDAsIm5iZiI6MTI4NywiZXhwIjoxMzUwLCJqdGkiOiI" +
        "wMDAxIiwic3ViIjoicmZ0In0.kFCqvqnC88QT3Y7n4Lw8JwhvgD55yI" +
        "u32_YCKpwCg2TOauwA-L7Ze6Nm3N1qEhf7zpHQa0MGAY0SBM2F22aesg"
    );

    it("should be able to generate encrypted tokens", () => {
        Date.now = jest.fn().mockReturnValue(1000000);
        let tokens = JWT.generateTokens(
            {
                usr: "1",
                brn: "2",
                dev: "3"
            }
        );

        expect(tokens).toMatchObject({
            accessToken: encryptedAccessToken,
            refreshToken: plainRefreshToken
        });

        expect(jwtRaw.decode(encryptedAccessToken)).toMatchObject({
            pay: encryptedPayload,
            iat: 1000,
            jti: "1000",
            nbf: 997,
            exp: 1300,
            sub: "act"
        });

        expect(jwtRaw.decode(plainRefreshToken)).toMatchObject({
            iat: 1000,
            jti: "0001",
            nbf: 1287,
            exp: 1350,
            sub: "rft"
        });
    });

    it("should be able to generate plain tokens", () => {
        Date.now = jest.fn().mockReturnValue(1000000);
        let tokens = JWT.generateTokens(
            {
                usr: "1",
                brn: "2",
                dev: "3"
            }, {
                encrypt: false
            }
        );

        expect(tokens).toMatchObject({
            accessToken: plainAccessToken,
            refreshToken: plainRefreshToken
        });

        expect(jwtRaw.decode(plainAccessToken)).toMatchObject({
            usr: "1",
            brn: "2",
            dev: "3",
            iat: 1000,
            jti: "1000",
            nbf: 997,
            exp: 1300,
            sub: "act"
        });

        expect(jwtRaw.decode(plainRefreshToken)).toMatchObject({
            iat: 1000,
            jti: "0001",
            nbf: 1287,
            exp: 1350,
            sub: "rft"
        });
    });

    it("should verify valid encrypted tokens", () => {
        Date.now = jest.fn().mockReturnValue(1150000);
        let tokens = {
            accessToken: encryptedAccessToken
        };

        expect(JWT.validateTokens(tokens.accessToken, {
            includeRaw: true
        })).toMatchObject({
            payload: {
                usr: "1",
                brn: "2",
                dev: "3"
            },
            rawPayload: {
                pay: encryptedPayload,
                iat: 1000,
                jti: "1000",
                nbf: 997,
                exp: 1300,
                sub: "act"
            }
        });
    });

    it("should verify valid tokens", () => {
        Date.now = jest.fn().mockReturnValue(1150000);
        let tokens = {
            accessToken: plainAccessToken
        };

        expect(JWT.validateTokens(tokens.accessToken, {
            includeRaw: true,
            encrypt: false
        })).toMatchObject({
            payload: {
                usr: "1",
                brn: "2",
                dev: "3"
            },
            rawPayload: {
                usr: "1",
                brn: "2",
                dev: "3",
                iat: 1000,
                jti: "1000",
                nbf: 997,
                exp: 1300,
                sub: "act"
            }
        });
    });

    it("should decode a payload regardless of token validation", () => {
        expect(JWT.decodePayload(encryptedAccessToken)).toMatchObject({
            usr: "1",
            brn: "2",
            dev: "3"
        });

        expect(JWT.decodePayload(plainAccessToken, {
            encrypt: false
        })).toMatchObject({
            usr: "1",
            brn: "2",
            dev: "3"
        });

        expect(JWT.decodePayload(invalidSecretAccessToken)).toMatchObject({
            usr: "1",
            brn: "2",
            dev: "3"
        });

        // Early
        Date.now = jest.fn().mockReturnValue(900000);

        expect(JWT.decodePayload(encryptedAccessToken)).toMatchObject({
            usr: "1",
            brn: "2",
            dev: "3"
        });

        // Expired
        Date.now = jest.fn().mockReturnValue(1500000);

        expect(JWT.decodePayload(encryptedAccessToken)).toMatchObject({
            usr: "1",
            brn: "2",
            dev: "3"
        });

    });

    it("should reject an always expired tokens regardless of time", () => {
        let encryptedTokens = JWT.generateExpiredTokens({
            usr: "1",
            brn: "2",
            dev: "3"
        });

        expect(JWT.validateTokens(encryptedTokens.accessToken)).toBeUndefined();

        // Early
        Date.now = jest.fn().mockReturnValue(900000);
        expect(JWT.validateTokens(encryptedTokens.accessToken)).toBeUndefined();

        // Expired
        Date.now = jest.fn().mockReturnValue(1500000);
        expect(JWT.validateTokens(encryptedTokens.accessToken)).toBeUndefined();
    });

    it("should reject an early access token", () => {
        Date.now = jest.fn().mockReturnValue(900000);
        let encryptedTokens = {
            accessToken: encryptedAccessToken
        };

        expect(JWT.validateTokens(encryptedTokens.accessToken)).toBeUndefined();

        let plainTokens = {
            accessToken: plainAccessToken
        };

        expect(JWT.validateTokens(plainTokens.accessToken, {
            encrypt: false
        })).toBeUndefined();
    });

    it("should reject an expired access token", () => {
        Date.now = jest.fn().mockReturnValue(1500000);
        let encryptedTokens = {
            accessToken: encryptedAccessToken
        };

        expect(JWT.validateTokens(encryptedTokens.accessToken)).toBeUndefined();

        let plainTokens = {
            accessToken: plainAccessToken
        };

        expect(JWT.validateTokens(plainTokens.accessToken, {
            encrypt: false
        })).toBeUndefined();
    });

    it("should reject a wrong algorithm access token", () => {
        Date.now = jest.fn().mockReturnValue(1150000);
        let encryptedTokens = {
            accessToken: invalidAlgorithmAccessToken
        };

        expect(JWT.validateTokens(encryptedTokens.accessToken)).toBeUndefined();
    });

    it("should reject a wrong secret access token", () => {
        Date.now = jest.fn().mockReturnValue(1150000);
        let encryptedTokens = {
            accessToken: invalidSecretAccessToken
        };

        expect(JWT.validateTokens(encryptedTokens.accessToken)).toBeUndefined();
    });

    it("should reject an invalid access token", () => {
        Date.now = jest.fn().mockReturnValue(1500000);
        let tokens = {
            accessToken: (
                "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpYVCJ9." +
                "eyJ1c3IiOiIxIiwiYnJuIjoiMiIsImlidCI6MTAwMCwibmJmIjoxMD" +
                "AwLCJleHAiOjEzMDAsImp0aSI6IjEwMEAiLCJzdWIiOiJhY3QifQ." +
                "sAv16cGz-tT4HUHaMg4LjBryD-UeexpFyOgHPklC94OghR-qTHDI7A" +
                "hZ_riszozpkgJjf_Imn9SXVEYQ7TpHSX"
            )
        };

        expect(JWT.validateTokens(tokens.accessToken)).toBeUndefined();

        expect(JWT.validateTokens(tokens.accessToken, {
            encrypt: false
        })).toBeUndefined();
    });

    it("should regenerate new tokens for a valid refresh token", () => {
        Date.now = jest.fn().mockReturnValue(1320000);
        let tokens = {
            accessToken: plainAccessToken,
            refreshToken: plainRefreshToken
        };

        let newTokens = {
            accessToken: (
                "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9." +
                "eyJ1c3IiOiIxIiwiYnJuIjoiMiIsImRldiI6IjMiLCJpYXQiOjEzMj" +
                "AsIm5iZiI6MTMxNywiZXhwIjoxNjIwLCJqdGkiOiIxMzIwIiwic3Vi" +
                "IjoiYWN0In0.wuOKg0BQ4AH6tASJeuRBcnpI7vCQn7uBfVMTL01fJr" +
                "VuWM3aZEEIX169jLd20_nlp2Py1WBfx8t6LgWVnikk3A"
            ),
            refreshToken: (
                "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9." +
                "eyJpYXQiOjEzMjAsIm5iZiI6MTYwNywiZXhwIjoxNjcwLCJqdGkiOi" +
                "IwMjMxIiwic3ViIjoicmZ0In0.G-ARPkBwpYh3kvkF_bIF1v-I7Ulh" +
                "kCvjAXj8xtkPms_fFW5K29XeRk_OfHakokpa9Od76QYd6R_WBiAdMvvXPQ"
            )
        };

        expect(JWT.regenerateTokens(tokens, {
            encrypt: false
        })).toMatchObject(newTokens);

        expect(jwtRaw.decode(newTokens.accessToken)).toMatchObject({
            usr: "1",
            brn: "2",
            dev: "3",
            iat: 1320,
            jti: "1320",
            nbf: 1317,
            exp: 1620,
            sub: "act"
        });

        expect(jwtRaw.decode(newTokens.refreshToken || "")).toMatchObject({
            iat: 1320,
            jti: "0231",
            nbf: 1607,
            exp: 1670,
            sub: "rft"
        });
    });

    it("should not regenerate new tokens for an early refresh token", () => {
        Date.now = jest.fn().mockReturnValue(1150000);
        let encryptedTokens = {
            accessToken: encryptedAccessToken,
            refreshToken: plainRefreshToken
        };

        expect(JWT.regenerateTokens(encryptedTokens)).toBeUndefined();

        let plainTokens = {
            accessToken: plainAccessToken,
            refreshToken: plainRefreshToken
        };

        expect(JWT.regenerateTokens(plainTokens, {
            encrypt: false
        })).toBeUndefined();
    });

    it("should not regenerate new tokens for an expired refresh token", () => {
        Date.now = jest.fn().mockReturnValue(2200000);
        let encryptedTokens = {
            accessToken: encryptedAccessToken,
            refreshToken: plainRefreshToken
        };

        expect(JWT.regenerateTokens(encryptedTokens)).toBeUndefined();

        let plainTokens = {
            accessToken: plainAccessToken,
            refreshToken: plainRefreshToken
        };

        expect(JWT.regenerateTokens(plainTokens, {
            encrypt: false
        })).toBeUndefined();
    });

    it("should not regenerate new tokens for an invalid access token", () => {
        Date.now = jest.fn().mockReturnValue(2200000);
        let tokens = {
            accessToken: (
                "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpYVCJ9." +
                "eyJ1c3IiOiIxIiwiYnJuIjoiMiIsImlidCI6MTAwMCwibmJmIjoxMD" +
                "AwLCJleHAiOjEzMDAsImp0aSI6IjEwMEAiLCJzdWIiOiJhY3QifQ." +
                "sAv16cGz-tT4HUHaMg4LjBryD-UeexpFyOgHPklC94OghR-qTHDI7A" +
                "hZ_riszozpkgJjf_Imn9SXVEYQ7TpHSX"
            ),
            refreshToken: plainRefreshToken
        };

        expect(JWT.regenerateTokens(tokens)).toBeUndefined();

        expect(JWT.regenerateTokens(tokens, {
            encrypt: false
        })).toBeUndefined();
    });

    it("should not regenerate new tokens for an invalid refresh token", () => {
        Date.now = jest.fn().mockReturnValue(2200000);
        let encryptedTokens = {
            accessToken: encryptedAccessToken,
            refreshToken: (
                "eyJhbGciOiJIUzUxMiIsInR5cCI6IkqXVCJ9." +
                "eyJpYXQiOjEwMDAsIm5iZiI6MTI5MCxiZXhwIjoxMzUwLCJqdGkiOiI" +
                "wMDAxIiwic3ViIjoicmZ0In0." +
                "LQruV_lFYI7q42LwJLlyCyF1s1LuVzT6ubCcW9JMAoxyMDnM1-CfWmb" +
                "gqbNbnCbWN1epkx2xpRQABH5u_orwvR"
            )
        };

        expect(JWT.regenerateTokens(encryptedTokens)).toBeUndefined();

        let plainTokens = {
            accessToken: plainAccessToken,
            refreshToken: (
                "eyJhbGciOiJIUzUxMiIsInR5cCI6IkqXVCJ9." +
                "eyJpYXQiOjEwMDAsIm5iZiI6MTI5MCxiZXhwIjoxMzUwLCJqdGkiOiI" +
                "wMDAxIiwic3ViIjoicmZ0In0." +
                "LQruV_lFYI7q42LwJLlyCyF1s1LuVzT6ubCcW9JMAoxyMDnM1-CfWmb" +
                "gqbNbnCbWN1epkx2xpRQABH5u_orwvR"
            )
        };

        expect(JWT.regenerateTokens(plainTokens, {
            encrypt: false
        })).toBeUndefined();
    });
});
