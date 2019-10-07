import { internal as Config } from "./config";

const escapePattern = "(\\\\)?<([^>]+)>";

const patterns: {[key: string]: string} = {
    ...{
        mobile_number: "^0\\d{9}$",
        mobile_number_or_empty: "^(0\\d{9})?$",
        cbs_user_id: "^\\d{1,20}$",
        cbs_password: "^[a-fA-F0-9]{1,32}$",
        content: "^(.|\\s){0,65535}\\S$",
        jwt_token: (
            "^[A-Za-z0-9\\-_=]+\\.[A-Za-z0-9\\-_=]+\\.[A-Za-z0-9\\-_.+/=]+$"
        ),
        iso_8601: (
            "^\\d{4}-\\d\\d-\\d\\dT" +
            "\\d\\d:\\d\\d:\\d\\d(\\.\\d+)?(([+\\-]\\d\\d:\\d\\d)|Z)?$"
        ),
        iso_8601_date: "^\\d{4}-\\d{2}-\\d{2}$",
        account_number: "^\\d{10,16}$",
        object_id: "^[a-fA-F0-9\\-]+$",
        citizen_id: "^\\d{13}$",
        passport_number: "^[a-fA-F0-9]{1,15}$",
        customer_name: "^[a-zA-Z0-9\\u0E00-\\u0E7F \\-_()[\\]\\.]+$",
        description: "^.{1,256}$",
        transaction_id: "^[a-fA-F0-9\\-]{1,64}$",
        bot_barcode: "^\\|\\d{12,15}\\r\\d{0,18}\\r\\d{0,18}\\r\\d{1,10}$",
        bot_qrcode: (
            "^\\|[a-zA-Z0-9]{12,15}\\r[a-zA-Z0-9]{0,40}\\r[a-zA-Z0-9]{0,40}" +
            "\\r\\d{1,10}(\\r[a-zA-Z0-9]\\r[a-zA-Z0-9]{8}" +
            "\\r(\\d+(\\.\\d+)?){0,10}\\r\\d{0,10}\\r\\d{0,4}" +
            "\\r\\d{0,10}\\r[a-zA-Z0-9]{0,5}\\r[a-zA-Z0-9]{0,13}" +
            "\\r[a-zA-Z0-9]{0,5}\\r.{0,140}\\r[a-zA-Z0-9-]{0,20}" +
            "\\r.{0,30}\\r[a-zA-Z0-9]{0,12}\\r\\d{0,10}\\r[a-zA-Z0-9]{0,3}" +
            "\\r\\d{0,4}\\r\\d{0,10}\\r[a-zA-Z0-9]{0,1})?$"
        ),
        device_id: "^[a-zA-Z0-9]{1,32}$",
        sim_id: "^\\d{1,32}$",
        passbook_number: "^\\d{10,16}$",
        username: "^[a-z0-9_\\-]{3,16}$",
        password: "^[a-z0-9_\\-]{6,18}$",
        hex_value: "^#?([a-f0-9]{6}|[a-f0-9]{3})$",
        email: "^([a-z0-9_\\.\\-]+)@([\\da-z\\.\\-]+)\\.([a-z\\.]{2,6})$",
        url: (
            "^(https?:\\/\\/)?([\\da-z\\.\\-]+)" +
            "\\.([a-z\\.]{2,6})([\\/\\w \\.\\-]*)*\\/?$"
        ),
        ip_address: (
            "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}" +
            "(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
        )
    },
    ...Config.getGlobal(
        "data-patterns", {}
    )
};

export function get(name: string) {
    if (name in patterns) {
        return patterns[name];
    }
    return undefined;
}

export function getRegExp(name: string) {
    let pattern = get(name);
    if (pattern !== undefined) {
        return new RegExp(pattern, "g");
    }
    return undefined;
}

export function parse(format: string) {
    return format.replace(
        new RegExp(escapePattern, "g"),
        (match, slash, key) => {
            if (slash) {
                return `<${ key }>`;
            }
            let pattern = get(key);
            if (pattern !== undefined) {
                return pattern;
            }
            return match;
        }
    );
}

export function parseRegExp(format: string) {
    return new RegExp(parse(format), "g");
}
