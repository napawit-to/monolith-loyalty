import * as moment from "moment";

export default class MomentBuilder {
    static buildDateRange(
        numberOfDays: number = -7,
        reference?: moment.Moment
    ) {
        let today = (reference || moment().startOf("day")).clone();
        let dates = [];
        let history = numberOfDays < 0;
        let totalDays = Math.abs(numberOfDays);

        for (let i = 0; i < totalDays; i++) {
            dates.push(today.clone());
            today.add(history ? -1 : 1, "day");
        }
        return dates;
    }
}
