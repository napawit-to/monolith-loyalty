import { LanguageObject } from "../language-extractor";

export interface ContentConfiguration {
    key: string;
    message: LanguageObject<string>;
    create_timestamp?: Date;
    update_timestamp?: Date;
}

export default ContentConfiguration;
