import Mqtt_Client from '../src/protocols/mqtt/client';
import { MqttClientConfig } from '../src/protocols/mqtt/types';
jest.setTimeout(15000);

describe('Mqtt_Client Integration Tests with Live MQTT Broker', () => {
    let mqttClient: Mqtt_Client;
    const topic = 'test/topic';

    // Generate a unique client ID for each test
    const uniqueClientId = `test-client-${Math.random().toString(16).slice(2)}`;

    let mockConfig: MqttClientConfig = {
        clientId: uniqueClientId,
        brokerUrl: 'mqtt://localhost:1883', // Adjust the broker URL as needed
        clean: true,
        connectTimeout: 4000,
        topics: [topic],
        reconnectInterval: 5000,
    };

    const testMessage = { key: 'value' };
    const transformedMessage = { key: 'transformed-value' };

    beforeEach(() => {
        mqttClient = new Mqtt_Client(
            mockConfig,
            async (data) => ({ key: `transformed-${data.key}` }),
            async () => { },
            async () => { },
            async () => { return {} },
        );
    });

    afterEach(async () => {
        await mqttClient.stop(); 
    });

    it('should process messages sent to the topic', async () => {
        await mqttClient.start();

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mqtt = require('mqtt');
        const publisher = mqtt.connect(mockConfig.brokerUrl, {
            clientId: `publisher-${Math.random().toString(16).slice(2)}`,
            clean: true,
        });

        await new Promise((resolve) => {
            publisher.on('connect', resolve);
        });

        try {
            await new Promise<void>((resolve, reject) => {
                publisher.publish(topic, JSON.stringify(testMessage), (err:any) => {
                    if (err) {
                        console.error('Publish error:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(mqttClient.receivedParsedMessage).toEqual(transformedMessage);
        } finally {
            await new Promise<void>((resolve) => {
                publisher.end(() => {
                    console.log('Publisher disconnected.');
                    resolve();
                });
            });
        }
    });
});
