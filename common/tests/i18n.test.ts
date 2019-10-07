import i18nManager from "../i18n";

describe("i18n Manager", () => {
    it("should works without any configurations", () => {
        let manager = new i18nManager();

        expect(manager.i18n([])`abc`.mapValue()).toBe("abc");

        expect(manager.i18n([])`abc${1}def`.mapValue()).toBe("abcdef");
    });

    it("should give the most relevant localized strings", () => {
        let manager = new i18nManager({
            abc: {
                en: "EN Text",
                th: "TH Text"
            }
        });
        let preferedEnglish = [{
            language: "th",
            weight: 0.4
        }, {
            language: "en",
            weight: 0.5
        }];
        let preferedThai = [{
            language: "th",
            weight: 0.6
        }, {
            language: "en",
            weight: 0.5
        }];

        expect(
            manager.i18n(preferedEnglish)`abc`.mapValue()
        ).toBe("EN Text");

        expect(
            manager.i18n(preferedThai)`abc`.mapValue()
        ).toBe("TH Text");
    });

    it("should pick the specified language over most relevant one", () => {
        let manager = new i18nManager({
            abc: {
                en: "EN Text",
                th: "TH Text"
            }
        });
        let preferedEnglish = [{
            language: "th",
            weight: 0.4
        }, {
            language: "en",
            weight: 0.5
        }];
        let preferedThai = [{
            language: "th",
            weight: 0.6
        }, {
            language: "en",
            weight: 0.5
        }];

        expect(
            manager.i18n(preferedEnglish)`abc`.override("th").mapValue()
        ).toBe("TH Text");

        expect(
            manager.i18n(preferedThai)`abc`.override("en").mapValue()
        ).toBe("EN Text");
    });

    it("should parse proper template strings", () => {
        let manager = new i18nManager({
            abc: {
                en: "EN: {{value}}",
                th: "TH: {{value}}"
            }
        });
        let preferedThai = [{
            language: "th",
            weight: 0.6
        }, {
            language: "en",
            weight: 0.5
        }];

        expect(manager.i18n(preferedThai)`abc`.override("en").mapValue({
            value: "Hello"
        })).toBe("EN: Hello");
    });
});
