import { BasicApplication, BasicApplicationOptions } from "./common/app";

import { internal as Config } from "./common/config";
import Routes from "./routes";
import Database from "./adapters/database";
import MockDatabase from "./adapters/implementations/mock-database";
import MongoDBDatabase from "./adapters/implementations/mongodb-database";
import MessageBroker from "./common/adapters/messaging";
import MockBroker from "./common/adapters/implementations/mock-messaging";

const SERVICE_NAME = "monolith-loyalty-service";

class CustomApplication extends
    BasicApplication<Database, MessageBroker> {
    constructor(
        options: BasicApplicationOptions<
            Database, MessageBroker
        > & {
        },
        override?: {
            [env: string]: Partial<BasicApplicationOptions<
                Database, MessageBroker
            >> & {
            };
        }
    ){
        super(options, override);

       
        let environment = process.env["NODE_ENV"] || "";
        if (override && override[environment]) {
            let overrideOptions = override[environment];
        }
    }
}

export default new CustomApplication({
    module: module,
    database: new MongoDBDatabase({
        reconnectionTime: Config.get<number>(
            SERVICE_NAME,
            "mongodb.reconnect-time",
            5000
        ),
        certificateFile: Config.get<string | undefined>(
            SERVICE_NAME,
            "mongodb.certificate-file",
            undefined
        ),
        primaryKeyFile: Config.get<string | undefined>(
            SERVICE_NAME,
            "mongodb.primary-key-file",
            undefined
        ),
        passphrase: Config.get<string | undefined>(
            SERVICE_NAME,
            "mongodb.passphrase",
            undefined
        ),
        cas: Config.get<string[] | undefined>(
            SERVICE_NAME,
            "mongodb.certificate-authorities",
            undefined
        ),
        keepAlive: Config.get<boolean | undefined>(
            SERVICE_NAME,
            "mongodb.keep-alive",
            true
        ),
        keepAliveInitialDelay: Config.get<number | undefined>(
            SERVICE_NAME,
            "mongodb.keep-alive-initial-delay",
            30000
        )
    }),
    broker: new MockBroker(),
   
}, {
    local: {
        database: new MockDatabase(),
        broker: new MockBroker(),
    },
    test: {
        database: new MockDatabase(),
        broker: new MockBroker(),
    }
}).routes(Routes).start();
