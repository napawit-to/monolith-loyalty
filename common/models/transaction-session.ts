export interface TransactionSession {
    key: string;
    value?: Object;
    create_timestamp?: Date;
    update_timestamp?: Date;
    expire_timestamp?: Date;
}

export default TransactionSession;
