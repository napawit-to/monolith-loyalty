import { Application } from "./app";
import { Router as ExpressRouter, IRoute } from "express";
import {
    default as Controller,
    ControllerDelegate, OperationInformation
} from "./middlewares/controller";

export class Router<T extends Application> {
    router = ExpressRouter({
        mergeParams: true
    });
    private application?: () => T;
    private currentRoute = this.router.route("/");

    constructor(application?: () => T) {
        this.application = application;
    }

    route(route: string | RegExp | (string | RegExp)[]): Router<T> {
        this.currentRoute = this.router.route(route);
        return this;
    }

    get(
        delegate: ControllerDelegate<any, any>,
        operationInformation?: OperationInformation
    ) {
        this.currentRoute.get(Controller(
            delegate, operationInformation, this.application
        ));
        return this;
    }

    post(
        delegate: ControllerDelegate<any, any>,
        operationInformation?: OperationInformation
    ) {
        this.currentRoute.post(Controller(
            delegate, operationInformation, this.application
        ));
        return this;
    }

    put(
        delegate: ControllerDelegate<any, any>,
        operationInformation?: OperationInformation
    ) {
        this.currentRoute.put(Controller(
            delegate, operationInformation, this.application
        ));
        return this;
    }

    patch(
        delegate: ControllerDelegate<any, any>,
        operationInformation?: OperationInformation
    ) {
        this.currentRoute.patch(Controller(
            delegate, operationInformation, this.application
        ));
        return this;
    }

    head(
        delegate: ControllerDelegate<any, any>,
        operationInformation?: OperationInformation
    ) {
        this.currentRoute.head(Controller(
            delegate, operationInformation, this.application
        ));
        return this;
    }

    delete(
        delegate: ControllerDelegate<any, any>,
        operationInformation?: OperationInformation
    ) {
        this.currentRoute.delete(Controller(
            delegate, operationInformation, this.application
        ));
        return this;
    }

    use<App extends Application>(router: Router<App>): this;
    use<App extends Application>(route: string, router: Router<App>): this;
    use<App extends Application>(
        routeOrRouter: string | Router<App>,
        router?: Router<App>
    ) {
        if (routeOrRouter instanceof Router) {
            this.router.use(routeOrRouter.router);
        } else if (router) {
            this.router.use(routeOrRouter, router.router);
        }
        return this;
    }
}

export default <T extends Application>(
    application?: () => T
) => new Router<T>(application);
