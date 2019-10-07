import Adapter from "./adapter";
import { JWTSession } from "../models/jwt-session";
import { TokenBlacklist } from "../models/token-blacklist";

export interface DatabaseEventHandler {
    onConnect?: () => void;
    onConnected?: () => void;
    onDisconnect?: () => void;
    onDisconnected?: () => void;
    onError?: (error: any) => void;
}

interface JWTSessionTracker extends Adapter {
    connect(url: Readonly<string>, options?: Readonly<any>): Promise<this>;
    disconnect(): Promise<void>;
    useHandler(eventHandler: DatabaseEventHandler): this;

    getJWTSession(userID: string): Promise<JWTSession | undefined>;
    setJWTSession(jwtSession: JWTSession): Promise<JWTSession>;
    deleteJWTSession(userID: string): Promise<void>;
    getExpireJWTSessions(): Promise<JWTSession[] | undefined>;

    addTokenBlacklist(tokenBlacklist: TokenBlacklist): Promise<TokenBlacklist>;
    getTokenBlacklist(token: string): Promise<TokenBlacklist | undefined>;
    deleteTokenBlacklist(token: string): Promise<void>;
}

export default JWTSessionTracker;
