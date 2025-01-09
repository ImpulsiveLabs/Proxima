import { KafkaConfig } from "kafkajs";

type KafkaClientConfig = {
    topics: string[],
    groupId: string,
    reconnectInterval?: number,
} & KafkaConfig

export { KafkaClientConfig }; 