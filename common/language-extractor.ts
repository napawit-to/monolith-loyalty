import * as _ from "lodash";

const patterns = {
    acceptLanguage: (
        "([\\w-, ]+|\\*)(\\s*;\\s*q\\s*=\\s*([\\d\\.]+))?(\\s*,\\s*)?"
    )
};

export interface SupportedLanguage {
    weight?: number;
    language: string;
}

export interface LanguageObject<T> {
    [language: string]: T;
    en: T;
}

export function pickLanguage<T>(
    target: LanguageObject<T>,
    languages?: SupportedLanguage[],
    defaultLanguage: string = "en"
): T | undefined {
    languages = languages || [{ language: defaultLanguage }];

    return target[
        (languages.sort((a, b) => {
            let weightA = a.weight ? a.weight : 1;
            let weightB = b.weight ? b.weight : 1;
            if (weightA < weightB) {
                return 1;
            } else if (weightA > weightB) {
                return -1;
            } else {
                return 0;
            }
        }).find(
            (language) => language.language in target
        ) || { language: defaultLanguage }).language
    ];
}

export function extractLanguages(acceptLanguage?: string): SupportedLanguage[] {
    let supportedLanguages: SupportedLanguage[] = [];

    let pattern = new RegExp(patterns.acceptLanguage, "g");

    while (acceptLanguage && pattern.test(acceptLanguage)) {
        acceptLanguage = acceptLanguage.replace(
            pattern,
            (match, languages?: string, temp?: any, weight?: string) => {
                if (!languages) {
                    return "";
                }
                supportedLanguages = supportedLanguages.concat(
                    languages.split(",").map(
                        (language) => ({
                            language: _.trim(language).toLowerCase(),
                            weight: (
                                weight !== undefined ?
                                parseFloat(weight) : undefined
                            )
                        })
                    )
                );
                return "";
            }
        );
    }

    supportedLanguages = supportedLanguages.sort((a, b) => {
        let aSegmentCount = a.language.split("-").length;
        let bSegmentCount = b.language.split("-").length;

        if (aSegmentCount < bSegmentCount) {
            return 1;
        }
        if (aSegmentCount > bSegmentCount) {
            return -1;
        }

        if (a.weight !== undefined && b.weight !== undefined) {
            if (a.weight < b.weight) {
                return 1;
            }
            if (a.weight > b.weight) {
                return -1;
            }
            return 0;
        }
        if (a.weight !== undefined) {
            return 1;
        }
        if (b.weight !== undefined) {
            return -1;
        }
        return 0;
    });

    if (!supportedLanguages.find((language) => language.language === "en")) {
        supportedLanguages.push({
            language: "en"
        });
    }

    return supportedLanguages;
}
