import CircuitBreaker from "../circuit-breaker";

describe("Circuit Breaker", () => {
    beforeEach(() => {
        CircuitBreaker.resetCircuitBreaker();
    });

    it("should be in close state by default", () => {
        expect(CircuitBreaker.getAllStatus()).toBeUndefined();
        expect(CircuitBreaker.getStatus("test")).toBe(true);
    });

    it("should create a status for requested component", () => {
        CircuitBreaker.reportState("test", "close");
        expect(CircuitBreaker.getRawStatus("test")).toMatchObject({
            state: "close",
            halfOpen: 0,
            close: 0,
            pending: false,
            request: {}
        });
        expect(CircuitBreaker.getStatus("test")).toBe(true);
    });

    it("should update component state when reported", () => {
        CircuitBreaker.reportState("test", "close");
        expect(CircuitBreaker.getRawStatus("test")).toMatchObject({
            state: "close",
            halfOpen: 0,
            close: 0,
            pending: false,
            request: {}
        });
        CircuitBreaker.reportState("test", "open");
        expect(CircuitBreaker.getRawStatus("test")).toMatchObject({
            state: "open",
            halfOpen: 0,
            close: 0,
            pending: false,
            request: {}
        });
    });

    it("should increment state count when report as failures", () => {
        CircuitBreaker.reportStatus("test", false);
        expect(CircuitBreaker.getRawStatus("test")).toMatchObject({
            state: "close",
            halfOpen: 0,
            close: 1,
            pending: false,
            request: {}
        });
        CircuitBreaker.reportStatus("test", false);
        expect(CircuitBreaker.getRawStatus("test")).toMatchObject({
            state: "close",
            halfOpen: 0,
            close: 2,
            pending: false,
            request: {}
        });
    });

    it("should change state to \"open\" when fail more than limits", () => {

    });
});
