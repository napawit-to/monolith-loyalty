import * as bluebird from "bluebird";
import * as amqp from "amqplib";
import * as fs from "fs";
import * as messaging from "../messaging";
import SuperError from "../../super-error";
import CircuitBreaker from "../../circuit-breaker";
import OperationLogMessage from "../../messaging/operation-log-message";
import LoginMessage from "../../messaging/login-message";
import TransactionMessage from "../../messaging/transaction-message";
import SMSMessage from "../../messaging/sms-message";
import ErrorMessage from "../../messaging/error-message";
import OTPEnteredMessage from "../../messaging/otp-entered-message";
import OTPSentMessage from "../../messaging/otp-sent-message";

interface RabbitMQOptions {
    reconnectionTime?: number;
    certificateFile?: string;
    primaryKeyFile?: string;
    pfxCertificateFile?: string;
    passphrase?: string;
    cas?: Readonly<string[]>;
}

class RabbitMQQueue implements messaging.MessageQueue {
    protected exchange: RabbitMQExchange;
    protected queueInfo: () => Readonly<messaging.MessageQueueOptions>;

    constructor(
        exchange: RabbitMQExchange,
        queueInfo: () => Readonly<messaging.MessageQueueOptions>
    ) {
        this.exchange = exchange;
        this.queueInfo = queueInfo;
    }

    willReceiveMessage(
        options: Readonly<messaging.MessageEventOptions>,
        prefetch: number
    ) {
        return this.exchange.createExchange().then(([channel, exchange]) => {
            let queueInfo = this.queueInfo();

            return Promise.all([
                Promise.resolve(channel),
                Promise.resolve(exchange),
                channel.assertQueue(
                    queueInfo.name,
                    queueInfo.options
                )]
            );
        }).then(([channel, exchange, queue]) => {
            let topics = (
                typeof(options.onTopic) === "string" ?
                [options.onTopic] :
                options.onTopic
            );

            return Promise.all(
                topics.map((topic) => channel.bindQueue(
                    queue.queue,
                    exchange.exchange,
                    topic
                ))
            ).then(() => Promise.all([
                Promise.resolve(channel),
                Promise.resolve(exchange),
                Promise.resolve(queue)
            ]));
        }).then(
            ([channel, exchange, queue]) => {
                if (prefetch !== 0){
                    channel.prefetch(prefetch);
                }
                channel.consume(
                    queue.queue, (message) => {
                        if (!message) {
                            return;
                        }

                        let things = {
                            content: message.content.toString(),
                            raw: message,
                            acknowledge: () => {
                                channel.ack(message);
                            }
                        };
                        options.messageHandler(things);
                    }, options.options
                ).then(() => {
                    if (options.onConsume) {
                        options.onConsume();
                    }
                    return Promise.resolve();
                });
            }
        );
    }
}

class RabbitMQExchange implements messaging.MessageExchange {
    protected broker: RabbitMQBroker;
    protected exchangeInfo: () => Readonly<messaging.MessageExchangeOptions>;

    constructor(
        broker: RabbitMQBroker,
        exchangeInfo: () => Readonly<messaging.MessageExchangeOptions>
    ) {
        this.broker = broker;
        this.exchangeInfo = exchangeInfo;
    }

    withQueueInfo(
        queueInfo: () => Readonly<messaging.MessageQueueOptions>
    ) {
        return new RabbitMQQueue(this, queueInfo);
    }

    publishMessage(
        options: Readonly<messaging.MessagePublishOptions>
    ) {
        return this.createExchange().then(([channel, exchange]) => {
            if (channel.publish(
                exchange.exchange,
                options.onTopic,
                new Buffer(options.message),
                options.options
            )) {
                if (options.onPublish) {
                    options.onPublish();
                }
            } else {
                if (options.onError) {
                    options.onError();
                }
            }
            channel.close();
            return Promise.resolve();
        });
    }

    createExchange() {
        return this.broker.createChannel().then((channel) => {
            let exchangeInfo = this.exchangeInfo();
            return Promise.all([
                Promise.resolve(channel),
                channel.assertExchange(
                    exchangeInfo.name,
                    exchangeInfo.type,
                    exchangeInfo.options
                )
            ]);
        });
    }
}

export class RabbitMQBroker implements messaging.MessageBroker {
    name: string = "broker";
    options: RabbitMQOptions = {};

    protected connectionOptions: any;
    protected connectionURL!: string;
    protected eventHandler?: messaging.MessageBrokerEventHandler;
    protected error?: SuperError = new SuperError("E000200");
    protected connectionHandler?: (
        (broker: this) => void
    );

    protected connection?: amqp.Connection;

    constructor(options?: RabbitMQOptions) {
        if (options) {
            this.options = options;
        }
    }

    useHandler(eventHandler: messaging.MessageBrokerEventHandler) {
        this.eventHandler = eventHandler;
        return this;
    }

    connect(url: Readonly<string>, options?: Readonly<any>) {
        return new Promise<this>((resolve, reject) => {
            this.connectionURL = url;
            this.connectionOptions = options;

            if (this.eventHandler && this.eventHandler.onConnect) {
                this.eventHandler.onConnect();
            }

            let sslOptions = {
                cert: (
                    this.options.certificateFile ?
                    fs.readFileSync(this.options.certificateFile) :
                    undefined
                ),
                key: (
                    this.options.primaryKeyFile ?
                    fs.readFileSync(this.options.primaryKeyFile) :
                    undefined
                ),
                pfx: (
                    this.options.pfxCertificateFile ?
                    fs.readFileSync(this.options.pfxCertificateFile) :
                    undefined
                ),
                passphrase: this.options.passphrase,
                ca: (
                    this.options.cas ?
                    this.options.cas.map((ca) => fs.readFileSync(ca)) :
                    undefined
                )
            };

            amqp.connect(url, { ...sslOptions, ...options })
                .then((connection) => {
                    this.connection = connection;
                    this.error = undefined;
                    CircuitBreaker.reportState(this.name, "close");
                    connection.on("error", (error: any) => {
                        connection.close();
                        this.connection = undefined;
                        this.error = new SuperError("E000200", error);
                        if (this.eventHandler && this.eventHandler.onError) {
                            this.eventHandler.onError(this.error);
                        }
                        CircuitBreaker.reportState(this.name, "open");
                        return bluebird.delay(
                            this.options.reconnectionTime || 5000
                        ).then(() => this.connect(url, options));
                    });
                    if (this.connectionHandler) {
                        this.connectionHandler(this);
                    }
                    if (this.eventHandler && this.eventHandler.onConnected) {
                        this.eventHandler.onConnected();
                    }
                    return resolve(this);
                })
                .catch((error) => {
                    this.connection = undefined;
                    this.error = new SuperError("E000200", error);
                    if (this.eventHandler && this.eventHandler.onError) {
                        this.eventHandler.onError(this.error);
                    }
                    CircuitBreaker.reportState(this.name, "open");
                    return bluebird.delay(
                        this.options.reconnectionTime || 5000
                    ).then(() => this.connect(url, options)).then(resolve);
                });
        });
    }

    disconnect() {
        return new Promise<void>((resolve, reject) => {
            if (!this.connection) {
                return resolve();
            }
            if (this.eventHandler && this.eventHandler.onDisconnect) {
                this.eventHandler.onDisconnect();
            }
            this.connection.close()
                .then(() => {
                    this.connection = undefined;
                    this.error = new SuperError("E000200");
                    CircuitBreaker.reportState(this.name, "open");
                    if (this.eventHandler && this.eventHandler.onDisconnected) {
                        this.eventHandler.onDisconnected();
                    }
                    return resolve();
                })
                .catch((error) => {
                    let superError = new SuperError(
                        "E000201", error, this.error
                    );
                    if (this.eventHandler && this.eventHandler.onError) {
                        this.eventHandler.onError(superError);
                    }
                    return reject(superError);
                });
        });
    }

    onConnect(handler: (broker: this) => void) {
        this.connectionHandler = handler;
    }

    withExchangeInfo(
        exchangeInfo: () => Readonly<messaging.MessageExchangeOptions>
    ) {
        return new RabbitMQExchange(this, exchangeInfo);
    }

    createChannel(bypass: boolean = false): Promise<amqp.Channel> {
        return new Promise<amqp.Channel>((resolve, reject) => {
            if ((!bypass && this.error) || !this.connection) {
                return reject(this.error || new SuperError(
                    "E000200", this.error
                ));
            }
            this.connection.createChannel()
                .then((channel) => {
                    this.error = undefined;
                    CircuitBreaker.reportStatus("broker", true);
                    channel.on("error", (error: any) => {
                        channel.close();
                        this.error = new SuperError("E000202", error);
                        if (this.eventHandler && this.eventHandler.onError) {
                            this.eventHandler.onError(this.error);
                        }
                        CircuitBreaker.reportState(this.name, "open");
                        return bluebird.delay(
                            this.options.reconnectionTime || 5000
                        ).then(() => this.createChannel(true));
                    });

                    return resolve(channel);
                })
                .catch((error) => {
                    this.error = new SuperError("E000202", error);
                    if (this.eventHandler && this.eventHandler.onError) {
                        this.eventHandler.onError(this.error);
                    }
                    CircuitBreaker.reportState(this.name, "open");
                    return bluebird.delay(
                        this.options.reconnectionTime || 5000
                    ).then(() => this.connect(
                        this.connectionURL, this.connectionOptions
                    ));
                });
        });
    }

    protected publishIMSMessage(topic: string, content: string) {
        return this.withExchangeInfo(() => ({
            name: "ims_topic",
            type: "topic",
            options: { durable: false }
        })).publishMessage({
            onTopic: topic,
            message: content
        });
    }

    protected willReceiveIMSMessage(
        name: string,
        options: messaging.MessageEventOptions
    ) {
        return this.withExchangeInfo(() => ({
            name: "ims_topic",
            type: "topic",
            options: { durable: false }
        })).withQueueInfo(() => ({
            name: name
        })).willReceiveMessage(options, 30);
    }

    publishLoginMessage(
        loginMessage: Readonly<LoginMessage>
    ) {
        return this.publishIMSMessage(
            `${loginMessage.application_name}.login`,
            JSON.stringify(loginMessage)
        );
    }

    publishTransactionMessage(
        transactionMessage: Readonly<TransactionMessage>
    ) {
        return this.publishIMSMessage(
            `${ transactionMessage.transaction_type }.transaction`,
            JSON.stringify(transactionMessage)
        );
    }

    publishSMSMessage(
        smsMessage: Readonly<SMSMessage>
    ) {
        return this.publishIMSMessage(
            `${ smsMessage.transaction_type }.sms`,
            JSON.stringify(smsMessage)
        );
    }

    publishErrorMessage(
        errorMessage: Readonly<ErrorMessage>
    ) {
        return this.publishIMSMessage(
            `${ errorMessage.serve_service }.error`,
            JSON.stringify(errorMessage)
        );
    }

    publishOTPEnteredMessage(
        otpEnteredMessage: Readonly<OTPEnteredMessage>
    ) {
        return this.publishIMSMessage(
            `enter.receive.otp`,
            JSON.stringify(otpEnteredMessage)
        );
    }

    publishOTPSentMessage(
        otpSentMessage: Readonly<OTPSentMessage>
    ) {
        return this.publishIMSMessage(
            `${ otpSentMessage.status }.sent.otp`,
            JSON.stringify(otpSentMessage)
        );
    }

    willReceiveOperationLogMessage(handler: messaging.MessageHandler,
                                   prefetch: number) {
        return this.withExchangeInfo(() => ({
            name: "log_topic",
            type: "topic",
            options: { durable: false }
        })).withQueueInfo(() => ({
            name: "operation-log-message-queue"
        })).willReceiveMessage({
            ...{ onTopic: "#.log" }, ...handler
        }, prefetch);
    }

    willReceiveLoginMessage(handler: messaging.MessageHandler) {
        return this.willReceiveIMSMessage("login-message-queue", {
            ...{ onTopic: "#.login" }, ...handler
        });
    }

    willReceiveTransactionMessage(handler: messaging.MessageHandler) {
        return this.willReceiveIMSMessage("transaction-message-queue", {
            ...{ onTopic: "#.transaction" }, ...handler
        });
    }

    willReceiveSMSMessage(handler: messaging.MessageHandler) {
        return this.willReceiveIMSMessage("sms-message-queue", {
            ...{ onTopic: "#.sms" }, ...handler
        });
    }

    willReceiveErrorMessage(handler: messaging.MessageHandler) {
        return this.willReceiveIMSMessage("error-message-queue", {
            ...{ onTopic: "#.error" }, ...handler
        });
    }

    willReceiveOTPEnteredMessage(handler: messaging.MessageHandler) {
        return this.willReceiveIMSMessage("otp-receive-message-queue", {
            ...{ onTopic: "#.receive.otp" }, ...handler
        });
    }

    willReceiveOTPSentMessage(handler: messaging.MessageHandler) {
        return this.willReceiveIMSMessage("otp-sent-message-queue", {
            ...{ onTopic: "#.sent.otp" }, ...handler
        });
    }

}

export default RabbitMQBroker;
