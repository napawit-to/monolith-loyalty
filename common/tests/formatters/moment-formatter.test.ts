import * as moment from "moment";
import MomentFormatter from "../../formatters/moment-formatter";
import * as momentTimezone from "moment-timezone";

describe("MomentFormatter", () => {
    it("should convert the moment to Asia/Bangkok timezone by default", () => {
        let localTime = moment();
        expect(
            new MomentFormatter(localTime).toLocalTimezone()
        ).toEqual(
            momentTimezone.tz(localTime, "Asia/Bangkok")
        );
    });

    it("should convert the moment to specified timezone", () => {
        let localTime = moment();
        expect(
            new MomentFormatter(localTime).toLocalTimezone("Asia/Tokyo")
        ).toEqual(
            momentTimezone.tz(localTime, "Asia/Tokyo")
        );
    });

    it("should convert the moment to Asia/Bangkok ISO-8601 by default", () => {
        let localTime = moment();
        expect(
            new MomentFormatter(localTime).toLocalISOString()
        ).toEqual(
            momentTimezone.tz(localTime, "Asia/Bangkok").format(
                "YYYY-MM-DDTHH:mm:ss.SSSZ"
            )
        );
    });

    it("should convert the moment to specified timezone in ISO-8601", () => {
        let localTime = moment();
        expect(
            new MomentFormatter(localTime).toLocalISOString("Asia/Tokyo")
        ).toEqual(
            momentTimezone.tz(localTime, "Asia/Tokyo").format(
                "YYYY-MM-DDTHH:mm:ss.SSSZ"
            )
        );
    });
});
