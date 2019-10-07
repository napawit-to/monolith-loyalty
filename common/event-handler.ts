export default class EventHandler {
    private static handlers: {
        [key: string]: (() => void)[];
    } = {};

    static registerHandler(event: string, handler: () => void) {
        let handlers = (this.handlers[event] || []);
        handlers.push(handler);
        this.handlers[event] = handlers;
        return handler;
    }

    static trigger(event: string) {
        for (let handler of (this.handlers[event] || [])) {
            handler();
        }
    }
}
