export default interface OTPSentMessage {
    otp_id?: string;
    request_id: string;
    branch_id: number;
    user_id: number;
    mobile_number?: string;
    status?: "generated" | "void" | "used" | "ban";
    device_id: string;
    order: "first" | "resend";
    error_code?: string;
    timestamp: string;
}
