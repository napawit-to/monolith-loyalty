import { SuperError, RequestError } from "../super-error";

describe("Super Error", () => {
    it("should filtered out undefined values", () => {
        expect(new SuperError(
            "A", new Error("B"), undefined, new Error("C")
        ).superErrors).toEqual([
            new Error("B"), new Error("C")
        ]);
    });
});

describe("Request Error", () => {
    it("should works like an error", () => {
        let error = new RequestError("A", {
            code: "Code",
            message: "Message"
        }, 400);
        expect(error.name).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.stack).toBeDefined();
        expect(error.error).toMatchObject({
            code: "Code",
            message: "Message"
        });
        expect(error.statusCode).toBe(400);
    });
});
