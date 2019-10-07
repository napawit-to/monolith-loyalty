import { ExpectationResult, ExpectationStatus } from "../expectation";

export default class ExpectationResultFormatter {
    value: Readonly<ExpectationResult>;

    constructor(value: ExpectationResult) {
        this.value = value;
    }

    toReadableString() {
        if (this.value.status === ExpectationStatus.Required) {
            return (
                this.value.expect && this.value.expect["key"] ?
                `"${ this.value.expect.key }" is required` :
                "Some requested fields are required"
            );
        } else if (this.value.status === ExpectationStatus.SchemaError) {
            return (
                this.value.expect && this.value.expect["key"] ?
                `Expectation for "${ this.value.expect.key }" is invalid` :
                "Some expectation specification is invalid"
            );
        } else if (this.value.status === ExpectationStatus.TypeError) {
            return (
                this.value.expect && this.value.expect["key"] ?
                (
                    this.value.expect["type"] ?
                    `"${
                        this.value.expect.key
                    }" expect to be a/an "${
                        this.value.expect.type
                    }"` :
                    `"${ this.value.expect.key }" is not in a valid type`
                ) :
                "Some requested fields are not in a valid type"
            );
        } else if (this.value.status === ExpectationStatus.TypesError) {
            return (
                this.value.expect && this.value.expect["key"] ?
                `"${ this.value.expect.key }" is not in a valid format` :
                "Some requested fields are not in a valid format"
            );
        } else if (this.value.status === ExpectationStatus.FormatError) {
            return (
                this.value.expect && this.value.expect["key"] ?
                `"${ this.value.expect.key }" is not in a valid format` :
                "Some requested fields are not in a valid format"
            );
        } else if (this.value.status === ExpectationStatus.LengthError) {
            return (
                this.value.expect && this.value.expect["key"] ?
                `"${ this.value.expect.key }" is not in a valid size/length` :
                "Some requested fields are not in a valid size/length"
            );
        } else if (this.value.status === ExpectationStatus.RangeError) {
            return (
                this.value.expect && this.value.expect["key"] ?
                `"${ this.value.expect.key }" is not in a valid range` :
                "Some requested fields are not in a valid range"
            );
        }
        return "OK";
    }
}
