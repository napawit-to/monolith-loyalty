export interface JWTSession {
    user_id: string;
    terminal_id: string;
    branch_id: string;
    access_token: string;
    refresh_token: string;
    token_information: Object;
    cbs_token?: string;
    create_timestamp?: Date;
    update_timestamp?: Date;
    expire_timestamp?: Date;
}

export default JWTSession;
