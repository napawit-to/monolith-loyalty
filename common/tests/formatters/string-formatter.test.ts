import StringFormatter from "../../formatters/string-formatter";

describe("StringFormatter", () => {
    it("should left-padded a string", () => {
        expect(
            new StringFormatter("1234").padLeft(8)
        ).toBe("    1234");
        expect(
            new StringFormatter("123456789012").padLeft(8)
        ).toBe("123456789012");
        expect(
            new StringFormatter("12345678").padLeft(8)
        ).toBe("12345678");
        expect(
            new StringFormatter("1234").padLeft(8, "0")
        ).toBe("00001234");
        expect(
            new StringFormatter("123456789012").padLeft(8, "0")
        ).toBe("123456789012");
    });

    it("should right-padded a string", () => {
        expect(
            new StringFormatter("1234").padRight(8)
        ).toBe("1234    ");
        expect(
            new StringFormatter("123456789012").padRight(8)
        ).toBe("123456789012");
        expect(
            new StringFormatter("12345678").padRight(8)
        ).toBe("12345678");
        expect(
            new StringFormatter("1234").padRight(8, "0")
        ).toBe("12340000");
        expect(
            new StringFormatter("123456789012").padRight(8, "0")
        ).toBe("123456789012");
    });

    it("should convert to mobile number format", () => {
        expect(
            new StringFormatter("").toMobileNumber()
        ).toBe("000-000-0000");
        expect(
            new StringFormatter("12345").toMobileNumber()
        ).toBe("000-001-2345");
        expect(
            new StringFormatter("12345678").toMobileNumber()
        ).toBe("001-234-5678");
        expect(
            new StringFormatter("123456789").toMobileNumber()
        ).toBe("012-345-6789");
        expect(
            new StringFormatter("123456789012").toMobileNumber()
        ).toBe("123456789012");
    });

    it("should convert to mobile number format with specified options", () => {
        expect(
            new StringFormatter("").toMobileNumber(0)
        ).toBe("");
        expect(
            new StringFormatter("1").toMobileNumber(0)
        ).toBe("1");
        expect(
            new StringFormatter("123").toMobileNumber(0)
        ).toBe("123");
        expect(
            new StringFormatter("12345").toMobileNumber(0)
        ).toBe("123-45");
        expect(
            new StringFormatter("1234567").toMobileNumber(0)
        ).toBe("123-456-7");
        expect(
            new StringFormatter("12345").toMobileNumber(12)
        ).toBe("000000012345");
    });

    it("should convert to account format", () => {
        expect(
            new StringFormatter("").toAccount()
        ).toBe("000000000000");
        expect(
            new StringFormatter("12345").toAccount()
        ).toBe("000000012345");
        expect(
            new StringFormatter("12345678").toAccount()
        ).toBe("000012345678");
        expect(
            new StringFormatter("123456789").toAccount()
        ).toBe("123456789");
        expect(
            new StringFormatter("123456789012").toAccount()
        ).toBe("123456789012");
    });

    it("should convert to account format with specified options", () => {
        expect(
            new StringFormatter("").toAccount(10)
        ).toBe("0000000000");
        expect(
            new StringFormatter("12345").toAccount(7)
        ).toBe("0012345");
        expect(
            new StringFormatter("12345678").toAccount(undefined, 5)
        ).toBe("12345678");
        expect(
            new StringFormatter("123456789").toAccount(8, 14)
        ).toBe("123456789");
        expect(
            new StringFormatter("123456789012").toAccount(20, 3)
        ).toBe("123456789012");
        expect(
            new StringFormatter("123456789012").toAccount(20, 20)
        ).toBe("00000000123456789012");
    });

    it("should convert to masked mobile number format", () => {
        expect(
            new StringFormatter("").toMaskMobileNumber()
        ).toBe("xxx-xxx-0000");
        expect(
            new StringFormatter("12345").toMaskMobileNumber()
        ).toBe("xxx-xxx-2345");
        expect(
            new StringFormatter("12345678").toMaskMobileNumber()
        ).toBe("xxx-xxx-5678");
        expect(
            new StringFormatter("123456789").toMaskMobileNumber()
        ).toBe("xxx-xxx-6789");
        expect(
            new StringFormatter("123456789012").toMaskMobileNumber()
        ).toBe("xxxxxxxx9012");
    });

    it("should convert to masked account format", () => {
        expect(
            new StringFormatter("").toMaskAccount()
        ).toBe("0000xxxx0000");
        expect(
            new StringFormatter("12345").toMaskAccount()
        ).toBe("0000xxxx2345");
        expect(
            new StringFormatter("12345678").toMaskAccount()
        ).toBe("0000xxxx5678");
        expect(
            new StringFormatter("123456789").toMaskAccount()
        ).toBe("1xxxx6789");
        expect(
            new StringFormatter("123456789012").toMaskAccount()
        ).toBe("1234xxxx9012");
    });

    it("should convert to masked account format with specified options", () => {
        expect(
            new StringFormatter("").toMaskAccount(0)
        ).toBe("xxxx00000000");
        expect(
            new StringFormatter("12345").toMaskAccount(-1)
        ).toBe("00000001xxxx");
        expect(
            new StringFormatter("12345").toMaskAccount(-15)
        ).toBe("xxxx00012345");
        expect(
            new StringFormatter("12345678").toMaskAccount(4)
        ).toBe("0000xxxx5678");
        expect(
            new StringFormatter("12345678").toMaskAccount(15)
        ).toBe("00001234xxxx");
        expect(
            new StringFormatter("123456789").toMaskAccount(2, undefined, 2)
        ).toBe("12xx56789");
        expect(
            new StringFormatter("123456789012").toMaskAccount(-3, "ab", 3)
        ).toBe("1234567aaa12");
    });
});
