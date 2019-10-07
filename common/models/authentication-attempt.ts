export type AuthenticationStatus = "fail" | "success" | "void";
export type AuthenticationType = "login" | "override" | "admin-login";
export type AuthenticationSubType = (
    "login" | "verify-credential" | "deposit" | "bill-payment" | "loan-payment"
);

export interface AuthenticationAttempt {
    device_id: string;
    branch_code?: string;
    user_id: string;
    status: AuthenticationStatus;
    type: AuthenticationType;
    sub_type: AuthenticationSubType;
    create_timestamp?: Date;
    update_timestamp?: Date;
}

export default AuthenticationAttempt;
