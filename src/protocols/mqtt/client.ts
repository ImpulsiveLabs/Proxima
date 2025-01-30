import { MqttClient, connect } from "mqtt";
import { ProtocolImpl } from "../../types/index";
import { MqttClientConfig } from "./types";

class Mqtt_Client implements ProtocolImpl {
    client: MqttClient | null = null;
    isConnected: boolean = false;
    receivedParsedMessage: Record<string, unknown> = {};
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(
        public config: MqttClientConfig,
        public transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public validateData?: (validatorObject: Record<string, unknown>) => Promise<void>,
        public sendData?: (data: Record<string, unknown>) => Promise<void>,
        public receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
    ) {
    }

    public async start(): Promise<void> {
        if (this.isConnected) {
            console.log("MQTT client is already connected. Ignoring start request.");
            return;
        }
        const { brokerUrl, ...restOfOptions } = this.config;
        this.client = connect(brokerUrl, restOfOptions);
        this.client.on("connect", () => {
            this.isConnected = true;
            console.log("MQTT client connected.");
            this.subscribeToTopics();
        });

        this.client.on("error", (error) => {
            console.error("Error connecting to MQTT broker:", error);
            this.isConnected = false;
            this.reconnect();
        });

        this.client.reconnect();
    }

    private reconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            console.log("Reconnecting to MQTT broker...");
            this.client?.reconnect();
        }, this.config.reconnectInterval || 5000);
    }

    private subscribeToTopics(): void {
        const { topics } = this.config;

        if (!topics || topics.length === 0) {
            throw new Error("No topics provided for subscription.");
        }

        topics.forEach((topic) => {
            this.client?.subscribe(topic, (err) => {
                if (err) {
                    console.error(`Failed to subscribe to topic "${topic}":`, err);
                } else {
                    console.log(`Subscribed to topic: ${topic}`);
                }
            });
        });

        this.client?.on("message", async (topic: string, message: Buffer) => {
            const msg = message.toString();
            if (!msg) return;

            try {
                let parsedData = JSON.parse(msg);

                if (this.validateData) {
                    await this.validateData(parsedData);
                }

                if (this.transformData) {
                    parsedData = await this.transformData(parsedData);
                }

                this.receivedParsedMessage = parsedData;

                if (this.sendData) {
                    await this.sendData({ ...parsedData, topic });
                }

                console.log(`Processed message from topic "${topic}":`, parsedData);
            } catch (error) {
                console.error(`Error processing message from topic "${topic}":`, error);
            }
        });
    }

    public async stop(): Promise<void> {
        if (!this.isConnected) {
            console.log("MQTT client is not connected.");
            return;
        }

        try {
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }

            this.client?.end();
            this.isConnected = false;
            console.log("MQTT client disconnected.");
        } catch (error) {
            console.error("Error during MQTT client shutdown:", error);
        }
    }
}

export default Mqtt_Client;
