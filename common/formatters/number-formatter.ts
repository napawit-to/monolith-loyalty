export default class NumberFormatter {
    value: Readonly<number>;

    constructor(value: number) {
        this.value = value;
    }

    toCurrency(decimalDigit: number = 2, groupSize: number = 3) {
        let pattern = `\\d(?=(\\d{${
            groupSize
        }})+${
            decimalDigit > 0 ? "\\." : "$"
        })`;
        return this.value.toFixed(
            Math.max(0, Math.floor(decimalDigit))
        ).replace(
            new RegExp(pattern, "g"), "$&,"
        );
    }

    toReadableSize(decimalDigit: number = 0, base: number = 1000) {
        let scales: [number, string][] = [
            [Math.pow(base, 4), "TB"],
            [Math.pow(base, 3), "GB"],
            [Math.pow(base, 2), "MB"],
            [Math.pow(base, 1), "KB"],
            [Math.pow(base, 0), "B"]
        ];

        let maxScale = scales.find(
            (scale) => this.value >= scale[0]
        ) || [1, "B"];

        return `${
            (this.value / maxScale[0]).toFixed(decimalDigit)
        } ${
            maxScale[1]
        }`;
    }
}
