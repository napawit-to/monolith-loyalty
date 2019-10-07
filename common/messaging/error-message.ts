export default interface ErrorMessage {
    teller_id?: number;
    branch_id?: number;
    serve_service: string;
    source_service: string;
    operation_id: string;
    error_code: string;
    timestamp: string;
}
