import Adapter from "./adapter";
import OperationLogMessage from "../messaging/operation-log-message";
import LoginMessage from "../messaging/login-message";
import TransactionMessage from "../messaging/transaction-message";
import SMSMessage from "../messaging/sms-message";
import ErrorMessage from "../messaging/error-message";
import OTPEnteredMessage from "../messaging/otp-entered-message";
import OTPSentMessage from "../messaging/otp-sent-message";

export interface MessageContent {
    content: Readonly<string>;
    raw: Readonly<any>;
    acknowledge(): void;
}

export interface MessageHandler {
    messageHandler: (message: Readonly<MessageContent>) => void;
    onConsume?: () => void;
    onError?: (error?: Readonly<any>) => void;
    options?: Readonly<any>;
}

export interface MessageEventOptions extends MessageHandler {
    onTopic: Readonly<string> | Readonly<string[]>;
}

export interface MessagePublishOptions {
    onTopic: Readonly<string>;
    message: Readonly<string>;
    onPublish?: () => void;
    onError?: (error?: Readonly<any>) => void;
    options?: Readonly<any>;
}

export interface MessageQueueOptions {
    name: Readonly<string>;
    options?: Readonly<any>;
}

export interface MessageExchangeOptions {
    name: Readonly<string>;
    type: Readonly<string>;
    options?: Readonly<any>;
}

export interface MessageBrokerEventHandler {
    onConnect?: () => void;
    onConnected?: () => void;
    onDisconnect?: () => void;
    onDisconnected?: () => void;
    onError?: (error: any) => void;
}

export interface MessageQueue {
    willReceiveMessage(
        options: Readonly<MessageEventOptions>,
        prefetch: number
    ): Promise<void>;
}

export interface MessageExchange {
    withQueueInfo(
        queueInfo: () => Readonly<MessageQueueOptions>
    ): MessageQueue;

    publishMessage(
        options: Readonly<MessagePublishOptions>
    ): Promise<void>;
}

export interface MessageBroker extends Adapter {
    connect(url: Readonly<string>, options?: Readonly<any>): Promise<this>;
    disconnect(): Promise<void>;
    useHandler(handler: MessageBrokerEventHandler): this;

    withExchangeInfo(
        exchangeInfo: () => Readonly<MessageExchangeOptions>
    ): MessageExchange;

    onConnect(handler: (broker: Readonly<this>) => void): void;

    publishLoginMessage(
        loginMessage: Readonly<LoginMessage>
    ): Promise<void>;
    publishTransactionMessage(
        transactionMessage: Readonly<TransactionMessage>
    ): Promise<void>;
    publishSMSMessage(
        smsMessage: Readonly<SMSMessage>
    ): Promise<void>;
    publishErrorMessage(
        errorMessage: Readonly<ErrorMessage>
    ): Promise<void>;
    publishOTPEnteredMessage(
        otpEnteredMessage: Readonly<OTPEnteredMessage>
    ): Promise<void>;
    publishOTPSentMessage(
        otpSentMessage: Readonly<OTPSentMessage>
    ): Promise<void>;
    willReceiveOperationLogMessage(handler: MessageHandler,
                                   prefetch: number): Promise<void>;
    willReceiveLoginMessage(handler: MessageHandler): Promise<void>;
    willReceiveTransactionMessage(handler: MessageHandler): Promise<void>;
    willReceiveSMSMessage(handler: MessageHandler): Promise<void>;
    willReceiveErrorMessage(handler: MessageHandler): Promise<void>;
    willReceiveOTPEnteredMessage(handler: MessageHandler): Promise<void>;
    willReceiveOTPSentMessage(handler: MessageHandler): Promise<void>;
}

export default MessageBroker;
