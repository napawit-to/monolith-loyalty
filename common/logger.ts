import * as winston from "winston";
import * as moment from "moment-timezone";
import * as path from "path";
import * as os from "os";
import { internal as Config } from "./config";

let config = {
    timezone: Config.getGlobal<string>(
        "logging.timezone", "Asia/Bangkok"
    ),
    timestamp: Config.getGlobal<string>(
        "logging.timestamp", "YYYY-MM-DDTHH:mm:ss.SSS"
    ),
    format: Config.getGlobal<string>(
        "logging.format", "<timestamp> [<upper:level>] [<source>] <message>"
    ),
    prependDate: Config.getGlobal<boolean>(
        "logging.prepend-date", true
    ),
    datePattern: parseMacro(
        Config.getGlobal<string>("logging.date-pattern", "yyyy-MM-ddTHH.")
    ),
    source: Config.getGlobal(
        "logging.source", "<basename:source-file>:<source-line>"
    ),
    filename: parseMacro(
        Config.getGlobal<string>("logging.log-file", "logs/log[<hostname>]")
    ),
    consoleLevel: Config.getGlobal<string>(
        "logging.console-level",
        Config.getGlobal<string>("logging.level", "info")
    ),
    fileLevel: Config.getGlobal<string>(
        "logging.file-level",
        Config.getGlobal<string>("logging.level", "info")
    )
};

function getSourceLocation(errorStack: string, skip: number = 2) {
    let stackLines = errorStack.split("\n");

    let sourceFile;
    let sourceLine;
    let skipCount = skip;
    for (let line of stackLines) {
        let matches = line.match(/\(([^:]+):(\d+):\d+\).*$/m);
        if (!matches) {
            continue;
        }
        if (skip > 0) {
            skip -= 1;
            continue;
        }
        sourceFile = matches[1];
        sourceLine = matches[2];

        break;
    }
    return {
        file: sourceFile,
        line: sourceLine
    };
}

function parseMacro(macro: string, options?: any, errorStack?: string): string {
    return macro.replace(/<([\w-]+)(:([^>]+))?>/g, (...matches: any[]) => {
        let key = matches[1];
        let subkey = matches[3];
        let subvalue;
        if (subkey) {
            subvalue = parseMacro(`<${ subkey }>`, options, errorStack);
        }
        if (key === "timestamp" && options && options["timestamp"]) {
            return options.timestamp();
        } else if (key === "timestamp") {
            let components = subkey ? subkey.split(":") : [];
            let zone = components.length > 1 ? components[0] : (
                config.timezone
            );
            let format = components.length > 1 ? components[1] : (
                (
                    components.length > 0 ?
                    components[0] : (
                        config.timestamp
                    )
                )
            );
            return moment().tz(zone).format(format);
        } else if (key === "level" && options && options["level"]) {
            return options.level;
        } else if (key === "message" && options) {
            return options["message"] || "";
        } else if (key === "upper" && subvalue) {
            return subvalue.toUpperCase();
        } else if (key === "lower" && subvalue) {
            return subvalue.toLowerCase();
        } else if (key === "env" && subkey) {
            return process.env[subkey] || "";
        } else if (key === "basename" && subvalue) {
            return path.basename(subvalue);
        } else if (key === "hostname") {
            return os.hostname();
        } else if (key === "type") {
            return os.type();
        } else if (key === "platform") {
            return os.platform();
        } else if (key === "arch") {
            return os.arch();
        } else if (key === "release") {
            return os.release();
        } else if (key === "source-file" && errorStack) {
            let skipNumber;
            if (subkey) {
                try {
                    skipNumber = parseInt(subkey);
                } catch (error) {
                    // Omit intended
                }
            }
            let sourceLocation = getSourceLocation(
                errorStack || "", skipNumber
            );
            return sourceLocation.file || "";
        } else if (key === "source-line" && errorStack) {
            let skipNumber;
            if (subkey) {
                try {
                    skipNumber = parseInt(subkey);
                } catch (error) {
                    // Omit intended
                }
            }
            let sourceLocation = getSourceLocation(
                errorStack || "", skipNumber
            );
            return sourceLocation.line || 0;
        } else if (key === "source" && options && options.meta) {
            return options.meta["source"] || "";
        }
        return matches[0];
    });
}

let transports = [];

if (config.consoleLevel !== "none") {
    transports.push(new winston.transports.Console({
        timestamp: () => moment().tz(config.timezone).format(config.timestamp),
        formatter: (options: any) => parseMacro(config.format, options),
        level: config.consoleLevel
    }));
}

if (config.fileLevel !== "none") {
    /* tslint:disable-next-line:no-require-imports */
    transports.push(new (require("winston-daily-rotate-file"))({
        filename: parseMacro(config.filename),
        localTime: true,
        prepend: config.prependDate,
        datePattern: config.datePattern,
        timestamp: () => moment().tz(config.timezone).format(config.timestamp),
        level: config.fileLevel
    }));
}

if (process.env["NODE_ENV"] === "test") {
    transports = [];
}

let logger = new winston.Logger({
    transports: transports
});

function getSourceInfo() {
    if (config.source === "") {
        return undefined;
    }
    let errorStack = new Error().stack;
    return {
        source: parseMacro(
            config.source,
            undefined,
            errorStack
        )
    };
}

export default {
    log: (level: string, message: string) => logger.log(
        level, message, getSourceInfo()
    ),
    debug: (message: string) => logger.debug(message, getSourceInfo()),
    info: (message: string) => logger.info(message, getSourceInfo()),
    warn: (message: string) => logger.warn(message, getSourceInfo()),
    error: (message: string) => logger.error(message, getSourceInfo()),
    stream: (options?: any) => logger.stream(options)
};
