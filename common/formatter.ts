import * as moment from "moment";
import { ExpectationResult } from "./expectation";
import NumberFormatter from "./formatters/number-formatter";
import StringFormatter from "./formatters/string-formatter";
import MomentFormatter from "./formatters/moment-formatter";
import {
    default as ExpectationResultFormatter
} from "./formatters/expectation-result-formatter";

function format(value: number): NumberFormatter;
function format(value: string): StringFormatter;
function format(value: moment.Moment): MomentFormatter;
function format(value: ExpectationResult): ExpectationResultFormatter;
function format(value: number | string | moment.Moment | ExpectationResult) {
    if (typeof(value) === "number") {
        return new NumberFormatter(value);
    } else if (typeof(value) === "string") {
        return new StringFormatter(value);
    } else if (moment.isMoment(value)) {
        return new MomentFormatter(value);
    } else {
        return new ExpectationResultFormatter(value);
    }
}

export default format;
