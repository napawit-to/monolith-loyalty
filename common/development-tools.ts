import * as moment from "moment";
import * as readline from "readline";
import JWT from "./jwt";

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function print(...lines: string[]) {
    lines.forEach((value) => console.log(value));
}

function askPattern(
    question: string,
    pattern: RegExp,
    rejectMessage: string = "Invalid input"
) {
    return new Promise<string>((resolve, reject) => {
        rl.question(question, (choice) => {
            if (pattern.test(choice)) {
                return resolve(choice);
            } else {
                if (rejectMessage) {
                    console.log(rejectMessage);
                }
                return askPattern(
                    question, pattern, rejectMessage
                ).then(resolve);
            }
        });
    });
}

function menu(explain: boolean = true) {
    if (explain) {
        print(
            "What do you want to do?",
            " j> Generate JWT tokens",
            " q> Quit"
        );
    }

    askPattern("<q>: ", /^[jq]?$/gi).then((choice) => {
        choice = choice.toLowerCase();
        if (choice === "j") {
            generateTokens().then(menu as () => void);
        } else if (choice === "" || choice === "q") {
            rl.close();
        } else {
            menu(false);
        }
    });
}

function generateTokens() {
    print(
            "",
            "================",
            "",
            "Generate JWT tokens",
            ""
    );

    return askPattern("Branch ID <1>: ", /^\d*$/g).then(
        (branch) => Promise.all([
            Promise.resolve(branch),
            askPattern("User ID <1>: ", /^\d*$/g)
        ])
    ).then(
        ([branch, user]) => Promise.all([
            Promise.resolve(branch),
            Promise.resolve(user),
            askPattern("Device ID <1>: ", /^\w*$/g)
        ])
    ).then(
        ([branch, user, device]) => Promise.all([
            Promise.resolve(branch),
            Promise.resolve(user),
            Promise.resolve(device),
            askPattern("Application Name <DEVTOOLS>: ", /^\w*$/g)
        ])
    ).then(
        ([branch, user, device, app]) => Promise.all([
            Promise.resolve(branch),
            Promise.resolve(user),
            Promise.resolve(device),
            Promise.resolve(app),
            askPattern("User Access Control <none>: ", /^\w*$/g)
        ])
    ).then(
        ([branch, user, device, app, uac]) => Promise.all([
            Promise.resolve(branch),
            Promise.resolve(user),
            Promise.resolve(device),
            Promise.resolve(app),
            Promise.resolve(uac),
            askPattern("Encrypted Payload? <y>/n: ", /^[yn]?$/gi)
        ])
    ).then(
        ([branch, user, device, app, uac, encrypt]) => Promise.all([
            Promise.resolve(branch),
            Promise.resolve(user),
            Promise.resolve(device),
            Promise.resolve(app),
            Promise.resolve(uac),
            Promise.resolve(encrypt),
            askPattern("Extra Length (in minutes)? <0>: ", /^\d*$/g)
        ])
    ).then(([branch, user, device, app, uac, encrypt, extra]) => {
        branch = branch || "1";
        user = user || "1";
        device = device || "1";
        app = app || "DEVTOOLS";
        uac = uac || "none";
        let encryptPayload = encrypt ? encrypt.toLowerCase() === "y" : true;

        let tokens = JWT.generateTokens({
            brn: branch,
            usr: user,
            dev: device,
            app: app,
            uac: uac
        }, {
            encrypt: encryptPayload,
            extraLength: parseInt(extra) * 60
        });

        print(
            "",
            "================",
            "",
            `Access Token  >`,
            "",
            `    ${ tokens.accessToken }`,
            "",
            `  Issue At    : ${
                moment.unix(tokens.tokenInformation.access.issue)
            }`,
            `  Not Before  : ${
                moment.unix(tokens.tokenInformation.access.notBefore)
            }`,
            `  Expired     : ${
                moment.unix(tokens.tokenInformation.access.expire)
            }`,
            "",
            "================",
            "",
            `Refresh Token >`,
            "",
            `    ${ tokens.refreshToken }`,
            "",
            `  Issue At    : ${
                moment.unix(tokens.tokenInformation.refresh.issue)
            }`,
            `  Not Before  : ${
                moment.unix(tokens.tokenInformation.refresh.notBefore)
            }`,
            `  Expired     : ${
                moment.unix(tokens.tokenInformation.refresh.expire)
            }`,
            "",
            "================",
            ""
        );
    });
}

menu();
