import NumberFormatter from "../../formatters/number-formatter";

describe("NumberFormatter", () => {
    it("should convert to currency with 2 decimal and 3 size group", () => {
        expect(new NumberFormatter(1).toCurrency()).toBe("1.00");
        expect(new NumberFormatter(11.01).toCurrency()).toBe("11.01");
        expect(new NumberFormatter(111.1).toCurrency()).toBe("111.10");
        expect(new NumberFormatter(1111.11).toCurrency()).toBe("1,111.11");
        expect(new NumberFormatter(11111.112).toCurrency()).toBe("11,111.11");
        expect(new NumberFormatter(111111.119).toCurrency()).toBe("111,111.12");
        expect(new NumberFormatter(1111111).toCurrency()).toBe("1,111,111.00");
    });

    it(
        "should convert to currency with specified decimal and size group",
        () => {
            expect(
                new NumberFormatter(1).toCurrency(3, 2)
            ).toBe("1.000");
            expect(
                new NumberFormatter(11.01).toCurrency(3, 2)
            ).toBe("11.010");
            expect(
                new NumberFormatter(111.1).toCurrency(3, 2)
            ).toBe("1,11.100");
            expect(
                new NumberFormatter(1111.11).toCurrency(3, 2)
            ).toBe("11,11.110");
            expect(
                new NumberFormatter(11111.112).toCurrency(3, 2)
            ).toBe("1,11,11.112");
            expect(
                new NumberFormatter(111111.119).toCurrency(3, 2)
            ).toBe("11,11,11.119");
            expect(
                new NumberFormatter(1111111).toCurrency(3, 2)
            ).toBe("1,11,11,11.000");
        }
    );

    it("should convert to a readable size with 2 decimal", () => {
        expect(
            new NumberFormatter(1).toReadableSize()
        ).toBe("1 B");
        expect(
            new NumberFormatter(11.01).toReadableSize()
        ).toBe("11 B");
        expect(
            new NumberFormatter(111.1).toReadableSize()
        ).toBe("111 B");
        expect(
            new NumberFormatter(1111.11).toReadableSize()
        ).toBe("1 KB");
        expect(
            new NumberFormatter(11111.112).toReadableSize()
        ).toBe("11 KB");
        expect(
            new NumberFormatter(111111.119).toReadableSize()
        ).toBe("111 KB");
        expect(
            new NumberFormatter(1000000).toReadableSize()
        ).toBe("1 MB");
        expect(
            new NumberFormatter(1111111).toReadableSize()
        ).toBe("1 MB");
        expect(
            new NumberFormatter(11111111.119).toReadableSize()
        ).toBe("11 MB");
        expect(
            new NumberFormatter(1000000000).toReadableSize()
        ).toBe("1 GB");
        expect(
            new NumberFormatter(1000000000000).toReadableSize()
        ).toBe("1 TB");
    });

    it("should convert to a readable size with specified decimal", () => {
        expect(
            new NumberFormatter(1).toReadableSize(2)
        ).toBe("1.00 B");
        expect(
            new NumberFormatter(11.01).toReadableSize(2)
        ).toBe("11.01 B");
        expect(
            new NumberFormatter(111.1).toReadableSize(2)
        ).toBe("111.10 B");
        expect(
            new NumberFormatter(1111.11).toReadableSize(2)
        ).toBe("1.11 KB");
        expect(
            new NumberFormatter(11111.112).toReadableSize(2)
        ).toBe("11.11 KB");
        expect(
            new NumberFormatter(111119.119).toReadableSize(2)
        ).toBe("111.12 KB");
        expect(
            new NumberFormatter(1000000).toReadableSize(2)
        ).toBe("1.00 MB");
        expect(
            new NumberFormatter(1111111).toReadableSize(2)
        ).toBe("1.11 MB");
        expect(
            new NumberFormatter(11119111.119).toReadableSize(2)
        ).toBe("11.12 MB");
        expect(
            new NumberFormatter(1000000000).toReadableSize(2)
        ).toBe("1.00 GB");
        expect(
            new NumberFormatter(1000000000000).toReadableSize(2)
        ).toBe("1.00 TB");
    });
});
