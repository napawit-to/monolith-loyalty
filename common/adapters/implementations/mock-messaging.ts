import * as messaging from "../messaging";
import LoginMessage from "../../messaging/login-message";
import TransactionMessage from "../../messaging/transaction-message";
import SMSMessage from "../../messaging/sms-message";
import ErrorMessage from "../../messaging/error-message";
import OTPEnteredMessage from "../../messaging/otp-entered-message";
import OTPSentMessage from "../../messaging/otp-sent-message";

class MockQueue implements messaging.MessageQueue {
    broker: MockBroker;

    constructor(broker: MockBroker) {
        this.broker = broker;
    }

    willReceiveMessage(
        options: Readonly<messaging.MessageEventOptions>
    ) {
        return this.broker.willReceiveMessage(options);
    }
}

class MockExchange implements messaging.MessageExchange {
    broker: MockBroker;

    constructor(broker: MockBroker) {
        this.broker = broker;
    }

    withQueueInfo(
        queueInfo: () => Readonly<messaging.MessageQueueOptions>
    ) {
        return new MockQueue(this.broker);
    }

    publishMessage(
        options: Readonly<messaging.MessagePublishOptions>
    ) {
        return new Promise<void>((resolve, reject) => resolve());
    }
}

export class MockBroker implements messaging.MessageBroker {
    name: string = "broker";
    protected connectionHandler?: (
        (broker: Readonly<this>) => void
    );
    protected messageEventHandler?: Readonly<messaging.MessageHandler>;

    useHandler(eventHandler: messaging.MessageBrokerEventHandler) {
        return this;
    }

    connect(url: Readonly<string>, options?: Readonly<any>) {
        return new Promise<this>((resolve, reject) => {
            if (this.connectionHandler) {
                this.connectionHandler(this);
            }
            return resolve(this);
        });
    }

    disconnect() {
        return new Promise<void>((resolve, reject) => resolve());
    }

    onConnect(handler: (broker: Readonly<this>) => void) {
        this.connectionHandler = handler;
    }

    withExchangeInfo(
        exchangeInfo: () => Readonly<messaging.MessageExchangeOptions>
    ) {
        return new MockExchange(this);
    }

    onRequestExchangeInfo(
        handler: ((
            type: "producer" | "consumer"
        ) => Readonly<messaging.MessageExchangeOptions>)
    ) {
        // No information needed
    }

    onRequestQueueInfo(
        handler: ((
            exchange: messaging.MessageExchangeOptions
        ) => Readonly<messaging.MessageQueueOptions>)
    ) {
        // No information needed
    }

    willReceiveMessage(handler: messaging.MessageHandler) {
        return new Promise<void>((resolve, reject) => {
            this.messageEventHandler = handler;
            return resolve();
        });
    }

    willReceiveOperationLogMessage(handler: messaging.MessageHandler) {
        return new Promise<void>((resolve, reject) => {
            this.messageEventHandler = handler;
            return resolve();
        });
    }

    willReceiveLoginMessage(handler: messaging.MessageHandler) {
        return new Promise<void>((resolve, reject) => {
            this.messageEventHandler = handler;
            return resolve();
        });
    }

    willReceiveTransactionMessage(handler: messaging.MessageHandler) {
        return new Promise<void>((resolve, reject) => {
            this.messageEventHandler = handler;
            return resolve();
        });
    }

    willReceiveSMSMessage(handler: messaging.MessageHandler) {
        return new Promise<void>((resolve, reject) => {
            this.messageEventHandler = handler;
            return resolve();
        });
    }

    willReceiveErrorMessage(handler: messaging.MessageHandler) {
        return new Promise<void>((resolve, reject) => {
            this.messageEventHandler = handler;
            return resolve();
        });
    }

    willReceiveOTPEnteredMessage(handler: messaging.MessageHandler) {
        return new Promise<void>((resolve, reject) => {
            this.messageEventHandler = handler;
            return resolve();
        });
    }

    willReceiveOTPSentMessage(handler: messaging.MessageHandler) {
        return new Promise<void>((resolve, reject) => {
            this.messageEventHandler = handler;
            return resolve();
        });
    }

    publishLoginMessage(
        loginMessage: Readonly<LoginMessage>
    ) {
        return new Promise<void>((resolve, reject) => resolve());
    }

    publishTransactionMessage(
        transactionMessage: Readonly<TransactionMessage>
    ) {
        return new Promise<void>((resolve, reject) => resolve());
    }

    publishSMSMessage(
        smsMessage: Readonly<SMSMessage>
    ) {
        return new Promise<void>((resolve, reject) => resolve());
    }

    publishErrorMessage(
        errorMessage: Readonly<ErrorMessage>
    ) {
        return new Promise<void>((resolve, reject) => resolve());
    }

    publishOTPEnteredMessage(
        otpEnteredMessage: Readonly<OTPEnteredMessage>
    ) {
        return new Promise<void>((resolve, reject) => resolve());
    }

    publishOTPSentMessage(
        otpSentMessage: Readonly<OTPSentMessage>
    ) {
        return new Promise<void>((resolve, reject) => resolve());
    }

    pushMessage(
        message: Readonly<messaging.MessageContent>
    ): Promise<messaging.MessageContent> {
        return new Promise<messaging.MessageContent>((resolve, reject) => {
            if (!this.messageEventHandler) {
                return reject();
            }
            this.messageEventHandler.messageHandler(message);
            if (this.messageEventHandler.onConsume) {
                this.messageEventHandler.onConsume();
            }
            return resolve(message);
        });
    }
}

export default MockBroker;
