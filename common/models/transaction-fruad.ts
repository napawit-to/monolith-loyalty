export interface TransactionFruad {
    transaction_id?: string;
    transaction_type: string;
    transaction_reference_id?: string;
    fruad_type: string;
    fruad_description: string;
    expected_value?: Object;
    received_value?: Object;
    branch_id: string;
    user_id: string;
    device_id?: string;
    create_timestamp?: Date;
    update_timestamp?: Date;
}

export default TransactionFruad;
