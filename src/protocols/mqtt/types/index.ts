import { IClientOptions } from "mqtt";

export type MqttClientConfig = {
    clientId: string;
    brokerUrl: string;
    topics: string[];
    reconnectInterval?: number;
} & IClientOptions
