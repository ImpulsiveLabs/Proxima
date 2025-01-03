import WS_Client from "./protocols/ws/client";
import WS_Server from "./protocols/ws/server";
import { Protocol, ProtocolConfig, ProximaConfig, ProximaProtocol } from "./types";
import { deepEqual } from './utils/utils';
import { WebSocketConfig } from './protocols/ws/types/index';

class Proxima {
    ws_server?: WS_Server;
    ws_client?: WS_Client;
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

        // Handle WebSocket Server
        await this.manageProtocol(
            ProximaProtocol.WS_SERVER,
            protocols,
            this.proximaConfig.wsServerConfig,
            () => new WS_Server(this.proximaConfig.wsServerConfig),
        );

        // Handle WebSocket Client
        await this.manageProtocol(
            ProximaProtocol.WS_CLIENT,
            protocols,
            this.proximaConfig.wsClientConfig,
            () => new WS_Client(this.proximaConfig.wsClientConfig),
        );
    }


    private async manageProtocol(
        protocol: ProximaProtocol,
        protocols: string[],
        config: WebSocketConfig,
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
                (this.lastConfig[configKey] as WebSocketConfig) = { ...config };
            }
        } else if (instance) {
            await instance.stop();
            this[protocol] = undefined;
            console.log(`${protocol} stopped (protocol removed).`);
        }
    }

    private generateConfigKey(protocol: ProximaProtocol): ProtocolConfig {
        const parts = protocol.toLowerCase().split("_");
        return `${parts[0]}${parts[1]?.charAt(0).toUpperCase()}${parts[1]?.slice(1)}Config` as ProtocolConfig;
    }

    private async stopAll(): Promise<void> {
        const protocolKeys: ProximaProtocol[] =  Object.values(ProximaProtocol);

        for (const key of protocolKeys) {
            const instance: Protocol = (this[key]) as Protocol;

            if (instance && typeof instance.stop === 'function') {
                await instance.stop();
                this[key]= undefined;
                console.log(`${key} stopped.`);
            }
        }
    }


}

export default Proxima;
