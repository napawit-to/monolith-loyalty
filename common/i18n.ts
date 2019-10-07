import {
    SupportedLanguage, LanguageObject, pickLanguage
} from "./language-extractor";
import {
    default as StringTemplate,
    Mapper,
    STANDARD_MAPPER
} from "./string-template";
import Formatter from "./formatter";

export interface StringLocalizationSchema {
    [key: string]: LanguageObject<string>;
}

export type i18n = (template: TemplateStringsArray, ...values: any[]) => I18N;

export class I18N {
    protected key: string;
    protected overrideLanguage?: string;
    protected languageObject: LanguageObject<string>;
    protected supportedLanguages: SupportedLanguage[];

    constructor(
        key: string,
        supportedLanguages: SupportedLanguage[],
        languageObject: LanguageObject<string>
    ) {
        this.key = key;
        this.supportedLanguages = supportedLanguages;
        this.languageObject = languageObject;
    }

    override(overrideLanguage: string) {
        this.overrideLanguage = overrideLanguage;
        return this;
    }

    mapValue(object?: object) {
        let rawString;
        if (this.overrideLanguage) {
            rawString = this.languageObject[this.overrideLanguage];
        } else {
            rawString = pickLanguage(
                this.languageObject, this.supportedLanguages
            );
        }
        return StringTemplate(
            rawString || this.key,
            object || {},
            Object.assign(STANDARD_MAPPER, {
                currency: (value) => Formatter(parseFloat(value)).toCurrency(),
                account: (value) => Formatter(
                    value as string
                ).toAccount(),
                maskAccount: (value) => Formatter(
                    value as string
                ).toMaskAccount()
            } as Mapper)
        );
    }
}

export class I18NManager {
    protected strings: StringLocalizationSchema;

    constructor(strings?: StringLocalizationSchema) {
        this.strings = strings || {};
    }

    get length() {
        return Object.keys(this.strings).length;
    }

    i18n(languages: SupportedLanguage[]): i18n {
        return (template: TemplateStringsArray, ...values: any[]) => {
            let key = template.join("");
            let languageObject = this.strings[key] || {};

            return new I18N(key, languages, languageObject);
        };
    }
}

export default I18NManager;
