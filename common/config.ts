import * as config from "config";

interface Overrider {
    serviceName?: string;
    getConfig<T>(key: string, defaultValue: T): Readonly<T>;
    has?(key: string): boolean;
}

function has(path: string): boolean {
    return config.has(path);
}

function env(name: string, defaultValue?: string): string | undefined {
    if (name in process.env) {
        return process.env[name];
    }
    return defaultValue;
}

function getGlobal<T>(
    path: string,
    defaultValue: T
): Readonly<T> {
    return (
        config.has(path) ?
        config.get<T>(path) :
        defaultValue
    );
}

function getLocal<T>(
    serviceName: string,
    path: string,
    defaultValue: T
): Readonly<T> {
    return getGlobal(
        `${ serviceName }.${ path }`,
        defaultValue
    );
}

function get<T>(
    serviceName: string,
    path: string,
    defaultValue: T
): Readonly<T> {
    return getLocal(
        serviceName,
        path,
        getGlobal(
            path, defaultValue
        )
    );
}

export let internal = {
    has, env, get,
    getGlobal, getLocal
};

export default class Config {
    overrider?: Overrider;

    constructor(overrider?: Overrider) {
        this.overrider = overrider;
    }

    getGlobal<T>(
        path: string,
        defaultValue: T
    ): Readonly<T> {
        let value = getGlobal<T>(path, defaultValue);

        return (
            this.overrider ?
            this.overrider.getConfig(path, value) :
            value
        );
    }

    getLocal<T>(
        path: string,
        defaultValue: T
    ): Readonly<T> {
        let value = defaultValue;
        if (this.overrider && this.overrider.serviceName) {
            value = getLocal(this.overrider.serviceName, path, value);
        }

        return (
            this.overrider ?
            this.overrider.getConfig(path, value) :
            value
        );
    }

    get<T>(
        path: string,
        defaultValue: T
    ): Readonly<T> {
        let value = getGlobal(path, defaultValue);
        if (this.overrider && this.overrider.serviceName) {
            value = getGlobal<T>(
                `${ this.overrider.serviceName }.${ path }`,
                value
            );
        }

        return (
            this.overrider ?
            this.overrider.getConfig(path, value) :
            value
        );
    }

    env(name: string, defaultValue?: string): string | undefined {
        return env(name, defaultValue);
    }

    has(path: string): boolean {
        let hasPath = has(path);
        if (this.overrider && this.overrider.has) {
            hasPath = this.overrider.has(path) || hasPath;
        }
        return hasPath;
    }
}
