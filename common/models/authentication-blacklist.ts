import {
    AuthenticationType, AuthenticationSubType
} from "./authentication-attempt";

export interface AuthenticationBlacklist {
    device_id: string;
    branch_code?: string;
    user_id: string;
    block_duration: number;
    type: AuthenticationType;
    sub_type: AuthenticationSubType;
    expire_timestamp: Date;
    create_timestamp?: Date;
    update_timestamp?: Date;
}

export default AuthenticationBlacklist;
