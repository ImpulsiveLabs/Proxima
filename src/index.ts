import WS_Client from "./protocols/ws/client";
import WS_Server from "./protocols/ws/server";
import FTP_Client from "./protocols/ftp/client";
import {
    FTPClientConfig,
    GraphQLClientConfig,
    HttpClientConfig,
    KafkaClientConfig,
    MqttClientConfig,
    Protocol,
    ProtocolConfig,
    ProtocolConfigString,
    ProximaConfig,
    ProximaProtocol,
    TcpClientConfig,
    UdpClientConfig,
    WebSocketClientConfig,
    WebSocketServerConfig
} from "./types";
import { deepEqual } from './utils/utils';
import Kafka_Client from "./protocols/kafka/client";
import Mqtt_Client from "./protocols/mqtt/client";
import GraphQL_Client from "./protocols/graph-ql/client";
import Http_Client from "./protocols/http/client";
import Udp_Client from "./protocols/udp/client";
import Tcp_Client from "./protocols/tcp/client";

class Proxima {
    ws_server?: WS_Server;
    ws_client?: WS_Client;
    ftp_client?: FTP_Client;
    kafka_client?: Kafka_Client;
    mqtt_client?: Mqtt_Client
    graphql_client?: GraphQL_Client;
    http_client?: Http_Client;
    udp_client?: Udp_Client;
    tcp_client?: Tcp_Client;
    private intervalId?: NodeJS.Timeout;
    private lastState: string | undefined;
    private lastConfig: Partial<ProximaConfig> = {};

    constructor(public proximaConfig: ProximaConfig) { }

    public setState(state: string): void {
        this.lastState = state;
    }

    public setConfig(config: ProximaConfig): void {
        this.proximaConfig = config;
    }

    public async startMonitoring(): Promise<void> {
        try {
            await this.checkEnvironment();
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = undefined;
            }
            this.intervalId = setInterval(async () => {
                try {
                    await this.checkEnvironment();
                } catch (error) {
                    console.error("Error in checkEnvironment during monitoring:", error);
                }
            }, this.proximaConfig.configChangeInterval || 15000);
        } catch (error) {
            console.error("Error starting monitoring:", error);
        }
    }


    public async stopMonitoring(): Promise<void> {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        await this.stopAll();
    }

    public async checkEnvironment(): Promise<void> {
        console.log("Checking environment...");
        const protocols = this.lastState?.split(",").map((protocol) => protocol.trim()) || [];
        console.log("Protocols to manage:", protocols);

        await this.manageProtocol(
            ProximaProtocol.WS_SERVER,
            protocols,
            this.proximaConfig.wsServerConfig as WebSocketServerConfig,
            () => new WS_Server(this.proximaConfig.wsServerConfig as WebSocketServerConfig),
        );
        await this.manageProtocol(
            ProximaProtocol.WS_CLIENT,
            protocols,
            this.proximaConfig.wsClientConfig as WebSocketClientConfig,
            () => new WS_Client(this.proximaConfig.wsClientConfig as WebSocketClientConfig),
        );
        await this.manageProtocol(
            ProximaProtocol.FTP_CLIENT,
            protocols,
            this.proximaConfig.ftpClientConfig as FTPClientConfig,
            () => new FTP_Client(this.proximaConfig.ftpClientConfig as FTPClientConfig),
        );
        await this.manageProtocol(
            ProximaProtocol.KAFKA_CLIENT,
            protocols,
            this.proximaConfig.kafkaClientConfig as KafkaClientConfig,
            () => new Kafka_Client(this.proximaConfig.kafkaClientConfig as KafkaClientConfig),
        );
        await this.manageProtocol(
            ProximaProtocol.MQTT_CLIENT,
            protocols,
            this.proximaConfig.mqttClientConfig as MqttClientConfig,
            () => new Mqtt_Client(this.proximaConfig.mqttClientConfig as MqttClientConfig),
        );
        await this.manageProtocol(
            ProximaProtocol.GRAPHQL_CLIENT,
            protocols,
            this.proximaConfig.graphQlClientConfig as GraphQLClientConfig,
            () => new GraphQL_Client(this.proximaConfig.graphQlClientConfig as GraphQLClientConfig),
        );
        await this.manageProtocol(
            ProximaProtocol.HTTP_CLIENT,
            protocols,
            this.proximaConfig.httpClientConfig as HttpClientConfig,
            () => new Http_Client(this.proximaConfig.httpClientConfig as HttpClientConfig),
        );
        await this.manageProtocol(
            ProximaProtocol.UDP_CLIENT,
            protocols,
            this.proximaConfig.udpClientConfig as UdpClientConfig,
            () => new Udp_Client(this.proximaConfig.udpClientConfig as UdpClientConfig),
        );
        await this.manageProtocol(
            ProximaProtocol.TCP_CLIENT,
            protocols,
            this.proximaConfig.tcpClientConfig as TcpClientConfig,
            () => new Tcp_Client(this.proximaConfig.tcpClientConfig as TcpClientConfig),
        );
    }


    private async manageProtocol(
        protocol: ProximaProtocol,
        protocols: string[],
        config: ProtocolConfig,
        createInstance: () => Protocol,
    ): Promise<void> {
        const instance = this[protocol];
        const configKey = this.generateConfigKey(protocol);

        if (protocols.includes(protocol)) {
            if (!instance || !deepEqual(this.lastConfig[configKey], config)) {
                if (instance) {
                    await instance.stop();
                    console.log(`${protocol} stopped due to config change.`);
                }
                const newInstance = createInstance();
                await newInstance.start();
                console.log(`${protocol} started with new configuration.`);
                (this[protocol] as Protocol) = newInstance;
                (this.lastConfig[configKey] as ProtocolConfig) = { ...config };
            }
        } else if (instance) {
            await instance.stop();
            this[protocol] = undefined;
            console.log(`${protocol} stopped (protocol removed).`);
        }
    }

    private generateConfigKey(protocol: ProximaProtocol): ProtocolConfigString {
        const parts = protocol.toLowerCase().split("_");
        return `${parts[0]}${parts[1]?.charAt(0).toUpperCase()}${parts[1]?.slice(1)}Config` as ProtocolConfigString;
    }

    private async stopAll(): Promise<void> {
        const protocolKeys: ProximaProtocol[] = Object.values(ProximaProtocol);

        for (const key of protocolKeys) {
            const instance: Protocol = (this[key]) as Protocol;

            if (instance && typeof instance.stop === 'function') {
                await instance.stop();
                this[key] = undefined;
                console.log(`${key} stopped.`);
            }
        }
    }


}

export default Proxima;
