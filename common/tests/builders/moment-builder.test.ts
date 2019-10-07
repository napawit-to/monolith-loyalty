import * as moment from "moment";
import MomentBuilder from "../../builders/moment-builder";

describe("MomentBuilder", () => {
    it(
        "should create a 7-days history date range from today by default",
        () => {
            let today = moment().startOf("day");

            expect(MomentBuilder.buildDateRange()).toEqual([
                today.clone(),
                today.clone().subtract(1, "day"),
                today.clone().subtract(2, "day"),
                today.clone().subtract(3, "day"),
                today.clone().subtract(4, "day"),
                today.clone().subtract(5, "day"),
                today.clone().subtract(6, "day")
            ]);
        }
    );

    it("should create a history date range from today", () => {
        let today = moment().startOf("day");

        expect(MomentBuilder.buildDateRange(-3)).toEqual([
            today.clone(),
            today.clone().subtract(1, "day"),
            today.clone().subtract(2, "day")
        ]);
    });

    it("should create a future date range from today", () => {
        let today = moment().startOf("day");

        expect(MomentBuilder.buildDateRange(7)).toEqual([
            today.clone(),
            today.clone().add(1, "day"),
            today.clone().add(2, "day"),
            today.clone().add(3, "day"),
            today.clone().add(4, "day"),
            today.clone().add(5, "day"),
            today.clone().add(6, "day")
        ]);
    });

    it(
        "should create a today range if one is passed as a number of days",
        () => {
            expect(MomentBuilder.buildDateRange(1)).toEqual([
                moment().startOf("day")
            ]);
        }
    );

    it(
        "should create empty range if zero is passed as a number of days",
        () => {
            expect(MomentBuilder.buildDateRange(0)).toEqual([]);
        }
    );
});
