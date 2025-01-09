import { Kafka, Consumer, EachMessagePayload, logLevel as KafkaLogLevel } from "kafkajs";
import { ProtocolImpl } from "../../types/index";
import { KafkaClientConfig } from "./types";

class Kafka_Client implements ProtocolImpl {
    kafka: Kafka;
    consumer: Consumer | null = null;
    isConnected: boolean = false;
    receivedParsedMessage: Record<string, unknown> = {}
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(
        public config: KafkaClientConfig,
        public transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public validateData?: (validatorObject: Record<string, unknown>) => Promise<void>,
        public sendData?: (data: Record<string, unknown>) => Promise<void>,
        public receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
    ) {
        const { clientId, brokers, logLevel } = config;

        this.kafka = new Kafka({
            clientId,
            brokers,
            logLevel: logLevel || KafkaLogLevel.INFO,
        });
    }

    public async start(): Promise<void> {
        if (this.isConnected) {
            console.log("Kafka client is already connected. Ignoring start request.");
            return;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        await this.connect();
    }

    async connect(): Promise<void> {
        console.log("Connecting to Kafka broker...");
        try {
            const { groupId } = this.config;
            this.consumer = this.kafka.consumer({ groupId });
            await this.consumer.connect();
            console.log("Kafka consumer connected.");

            this.isConnected = true;
            await this.subscribeToTopics();
        } catch (error) {
            console.error("Error connecting to Kafka broker:", error);
            this.isConnected = false;

            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }

            this.reconnectTimeout = setTimeout(async () => {
                console.log("Reconnecting to Kafka broker...");
                await this.connect();
            }, this.config.reconnectInterval || 5000);
        }
    }

    async subscribeToTopics(): Promise<void> {
        if (!this.consumer) throw new Error("Consumer is not initialized.");

        const { topics } = this.config;

        if (!topics || topics.length === 0) {
            throw new Error("No topics provided for subscription.");
        }

        for (const topic of topics) {
            await this.consumer.subscribe({ topic, fromBeginning: true });
            console.log(`Subscribed to topic: ${topic}`);
        }

        this.consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                const message = payload.message.value?.toString();
                const topic = payload.topic;
                if (!message) return;

                try {
                    let parsedData = JSON.parse(message);

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
            },
        });
    }

    public async stop(): Promise<void> {
        if (!this.isConnected) {
            console.log("Kafka client is not connected.");
            return;
        }

        try {
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }

            if (this.consumer) {
                await this.consumer.disconnect();
                console.log("Kafka consumer disconnected.");
            }

            this.isConnected = false;
            console.log("Kafka client disconnected.");
        } catch (error) {
            console.error("Error during Kafka client shutdown:", error);
        }
    }
}

export default Kafka_Client;
