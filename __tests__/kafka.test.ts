import Kafka_Client from '../src/protocols/kafka/client';
import { KafkaClientConfig } from '../src/protocols/kafka/types';
import { Partitioners } from 'kafkajs';
jest.setTimeout(15000);

describe('Kafka_Client Integration Tests with Live Kafka Broker', () => {
    let kafkaClient: Kafka_Client;
    let mockConfig: KafkaClientConfig;

    const topic = 'test-topic';
    const testMessage = { key: 'value' };
    const transformedMessage = { key: 'transformed-value' };

    beforeAll(() => {
        mockConfig = {
            clientId: 'test-client',
            brokers: ['localhost:9092'],
            groupId: 'test-group',
            topics: [topic],
            logLevel: 2,
            reconnectInterval: 5000,
        };
    });

    beforeEach(() => {
        kafkaClient = new Kafka_Client(
            mockConfig,
            async (data) => ({ key: `transformed-${data.key}` }),
            async () => { },
            async () => { },
            async () => { return {} },
        );
    });

    it('should process messages sent to the topic', async () => {

        await kafkaClient.start();

        const producer = kafkaClient.kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner,
        });
        await producer.connect();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(testMessage) }],
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(kafkaClient.receivedParsedMessage).toEqual(transformedMessage);

        await producer.disconnect();
        await kafkaClient.stop();
        await new Promise((resolve) => setTimeout(resolve, 1000))
    });

});
