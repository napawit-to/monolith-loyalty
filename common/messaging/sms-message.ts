export default interface SMSMessage {
    transaction_type: "deposit" | "bill-payment" | "loan-payment";
    transaction_id: string;
    sent_mobile_number: string;
    teller_id: number;
    branch_id: number;
    is_resend: boolean;
    esb_response: "success" | "fail";
    timestamp: string;
}
