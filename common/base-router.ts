import * as moment from "moment";
import Router from "./router";
import CircuitBreaker from "./circuit-breaker";
import EventHandler from "./event-handler";

const startTime = moment();
const router = Router();

router.route("/ping").get({
    perform: async(request) => {
        let heartbeat: {[key: string]: any} = {
            status: CircuitBreaker.getAllStatus() || "ok",
            uptime: moment.duration(moment().diff(startTime)).toISOString(),
            uptime_timestamp: startTime.toISOString(),
            timestamp: moment().toISOString()
        };

        return {
            status: 200,
            body: heartbeat
        };
    }
}, {
    operationName: "ping"
});

router.route("/reload-configurations").get({
    perform: async(request) => {
        EventHandler.trigger("config");
        return {
            status: 200,
            body: "OK"
        };
    }
}, {
    operationName: "reload-configurations"
});

export default router;
