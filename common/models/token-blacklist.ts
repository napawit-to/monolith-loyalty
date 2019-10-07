export interface TokenBlacklist {
    user_id: string;
    terminal_id: string;
    branch_id: string;
    token: string;
    token_type: string;
    expire_timestamp: Date;
    create_timestamp?: Date;
    update_timestamp?: Date;
}

export default TokenBlacklist;
