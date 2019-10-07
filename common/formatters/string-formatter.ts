export default class StringFormatter {
    value: Readonly<string>;

    constructor(value: string) {
        this.value = value;
    }

    padLeft(length: number, character: string = " ") {
        if (this.value.length >= length) {
            return this.value;
        }
        return (
            character.substr(0, 1).repeat(length - this.value.length) +
            this.value
        );
    }

    padRight(length: number, character: string = " ") {
        if (this.value.length >= length) {
            return this.value;
        }
        return (
            this.value +
            character.substr(0, 1).repeat(length - this.value.length)
        );
    }

    toMobileNumber(padToLength: number = 10) {
        let value = this.padLeft(padToLength, "0");
        if (value.length <= 3) {
            return value;
        }
        let firstPart = value.substr(0, 3);
        let secondPart = value.substr(3);
        if (secondPart.length <= 3) {
            return `${ firstPart }-${ secondPart }`;
        }
        let thirdPart = secondPart.substr(3);
        secondPart = secondPart.substr(0, 3);
        if (thirdPart.length <= 4) {
            return `${ firstPart }-${ secondPart }-${ thirdPart }`;
        }
        return value;
    }

    toAccount(padToLength: number = 12, minimumLength: number = 9) {
        if (
            this.value.length >= minimumLength ||
            padToLength < this.value.length
        ) {
            return this.value;
        }
        return new StringFormatter(this.value).padLeft(padToLength, "0");
    }

    toMaskString(
        maskOffset: number,
        maskCharacter: string,
        maskSize: number
    ) {
        maskSize = Math.abs(maskSize);

        let mask = maskCharacter.substr(0, 1).repeat(maskSize);
        let clipPosition = 0;
        if (maskOffset < 0) {
            clipPosition = Math.max(
                0, this.value.length + maskOffset - maskSize + 1
            );
        } else {
            clipPosition = Math.min(
                this.value.length - maskSize, maskOffset
            );
        }
        return `${
            this.value.substring(0, clipPosition)
        }${
            mask
        }${
            this.value.substring(clipPosition + maskSize)
        }`;
    }

    toMaskMobileNumber(
        padToLength: number = 10,
        maskCharacter: string = "x",
        revealSize: number = 4
    ) {
        revealSize = Math.abs(revealSize);

        let value = this.toMobileNumber(padToLength).replace(/\-/g, "");

        let maskEnd = (
            value.length < revealSize ? 0 : value.length - revealSize
        );

        let mask = maskCharacter.substr(0, 1).repeat(maskEnd);

        return new StringFormatter(
            `${ mask }${ value.substr(maskEnd) }`
        ).toMobileNumber(padToLength);
    }

    toMaskAccount(
        maskOffset: number = -5,
        maskCharacter: string = "x",
        maskSize: number = 4,
        padToLength: number = 12,
        minimumLength: number = 9
    ) {
        return new StringFormatter(
            this.toAccount(padToLength, minimumLength)
        ).toMaskString(maskOffset, maskCharacter, maskSize);
    }
}
