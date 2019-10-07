import { LanguageObject } from "../language-extractor";

export interface ErrorConfiguration {
    code: string;
    override_code?: string;
    status?: number;
    message: LanguageObject<string>;
    create_timestamp?: Date;
    update_timestamp?: Date;
}

export default ErrorConfiguration;
