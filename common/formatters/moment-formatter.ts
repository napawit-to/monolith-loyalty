import * as moment from "moment";
import * as momentTimezone from "moment-timezone";

export default class MomentFormatter {
    value: Readonly<moment.Moment>;

    constructor(value: moment.Moment) {
        this.value = value;
    }

    toLocalTimezone(timezone: string = "Asia/Bangkok") {
        return momentTimezone.tz(
            this.value, timezone
        );
    }

    toLocalISOString(timezone: string = "Asia/Bangkok") {
        return this.toLocalTimezone(timezone).format(
            "YYYY-MM-DDTHH:mm:ss.SSSZ"
        );
    }
}
