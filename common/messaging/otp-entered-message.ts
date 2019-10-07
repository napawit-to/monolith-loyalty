export default interface OTPEnteredMessage {
    otp_id?: string;
    request_id: string;
    branch_id: number;
    user_id: number;
    mobile_number: string;
    device_id: string;
    error_code?: string;
    timestamp: string;
}
