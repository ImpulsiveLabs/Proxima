import Proxima from '../src/index';
import FTP_Client from '../src/protocols/ftp/client';
import Kafka_Client from '../src/protocols/kafka/client';
import WS_Client from '../src/protocols/ws/client';
import WS_Server from '../src/protocols/ws/server';
import Mqtt_Client from '../src/protocols/mqtt/client';
import { ProximaProtocol, ProximaConfig } from '../src/types';
import GraphQL_Client from '../src/protocols/graph-ql/client';
import Http_Client from '../src/protocols/http/client';
import Udp_Client from '../src/protocols/udp/client';

jest.mock('../src/protocols/ws/client');
jest.mock('../src/protocols/ws/server');
jest.mock('../src/protocols/ftp/client');
jest.mock('../src/protocols/kafka/client');
jest.mock('../src/protocols/mqtt/client');
jest.mock('../src/protocols/graph-ql/client');
jest.mock('../src/protocols/http/client');
jest.mock('../src/protocols/udp/client');

const mockStart = jest.fn();
const mockStop = jest.fn();

(WS_Client as jest.Mock).mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
}));

(WS_Server as jest.Mock).mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
}));

(FTP_Client as jest.Mock).mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
}));

(Kafka_Client as jest.Mock).mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
}));

(Mqtt_Client as jest.Mock).mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
}));

(GraphQL_Client as jest.Mock).mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
}));

(Http_Client as jest.Mock).mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
}));
(Udp_Client as jest.Mock).mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
}));
describe('Proxima Class Tests', () => {
    let proxima: Proxima;

    const initialConfig: ProximaConfig = {
        configChangeInterval: 200,
        wsClientConfig: { url: 'ws://localhost:8080' },
        wsServerConfig: { port: 8081 },
        ftpClientConfig: {},
        kafkaClientConfig: { topics: [''], groupId: '', brokers: [] },
        mqttClientConfig: { clientId: '', brokerUrl: '', topics: [] },
        graphQlClientConfig: { endpoint: '' },
        httpClientConfig: {},
        udpClientConfig: { host: 'localhost', port: 0, type: 'udp4', remoteHost: 'localhost', remotePort: 0 }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        proxima = new Proxima(initialConfig);
    });
    afterEach(async () => {
        await proxima.stopMonitoring()

    })
    test('should start with no configuration and do nothing', async () => {
        await proxima.startMonitoring();
        expect(mockStart).not.toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();
    });

    test('should configure and start the WebSocket server', async () => {
        proxima.setState(`${ProximaProtocol.WS_SERVER}`);
        await proxima.checkEnvironment();

        expect(WS_Server).toHaveBeenCalledWith(initialConfig.wsServerConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();
    });

    test('should configure and start the Ftp client', async () => {
        proxima.setState(`${ProximaProtocol.FTP_CLIENT}`);
        await proxima.checkEnvironment();

        expect(FTP_Client).toHaveBeenCalledWith(initialConfig.ftpClientConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();
    });
    test('should configure and start the Http client', async () => {
        proxima.setState(`${ProximaProtocol.HTTP_CLIENT}`);
        await proxima.checkEnvironment();

        expect(Http_Client).toHaveBeenCalledWith(initialConfig.httpClientConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();
    });
    test('should configure and start the Kafka client', async () => {
        proxima.setState(`${ProximaProtocol.KAFKA_CLIENT}`);
        await proxima.checkEnvironment();
        expect(Kafka_Client).toHaveBeenCalledWith(initialConfig.kafkaClientConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();
    });
    test('should configure and start the MQTT client', async () => {
        proxima.setState(`${ProximaProtocol.MQTT_CLIENT}`);
        await proxima.checkEnvironment();
        expect(Mqtt_Client).toHaveBeenCalledWith(initialConfig.mqttClientConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();
    });
    test('should configure and start the GraphQl client', async () => {
        proxima.setState(`${ProximaProtocol.GRAPHQL_CLIENT}`);
        await proxima.checkEnvironment();
        expect(GraphQL_Client).toHaveBeenCalledWith(initialConfig.graphQlClientConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();
    });
    test('should configure and start the UDP client', async () => {
        proxima.setState(`${ProximaProtocol.UDP_CLIENT}`);
        await proxima.checkEnvironment();
        expect(Udp_Client).toHaveBeenCalledWith(initialConfig.udpClientConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();
    });
    test('should configure and start the WebSocket client', async () => {
        proxima.setState(`${ProximaProtocol.WS_CLIENT}`);
        await proxima.checkEnvironment();

        expect(WS_Client).toHaveBeenCalledWith(initialConfig.wsClientConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();
    });

    test('should configure both WebSocket server and client', async () => {
        proxima.setState(`${ProximaProtocol.WS_SERVER},${ProximaProtocol.WS_CLIENT}`);
        await proxima.checkEnvironment();

        expect(WS_Server).toHaveBeenCalledWith(initialConfig.wsServerConfig);
        expect(WS_Client).toHaveBeenCalledWith(initialConfig.wsClientConfig);
        expect(mockStart).toHaveBeenCalledTimes(2);
        expect(mockStop).not.toHaveBeenCalled();
    });

    test('should update WebSocket server configuration', async () => {
        proxima.setState(`${ProximaProtocol.WS_SERVER}`);
        await proxima.checkEnvironment();

        expect(WS_Server).toHaveBeenCalledWith(initialConfig.wsServerConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();

        const updatedConfig = { port: 9090 };
        proxima.proximaConfig.wsServerConfig = updatedConfig;
        await proxima.checkEnvironment();

        expect(mockStop).toHaveBeenCalled();
        expect(WS_Server).toHaveBeenCalledWith(updatedConfig);
        expect(mockStart).toHaveBeenCalledTimes(2);
    });

    test('should stop WebSocket server when protocol is removed', async () => {
        proxima.setState(`${ProximaProtocol.WS_SERVER}`);
        await proxima.checkEnvironment();

        expect(WS_Server).toHaveBeenCalledWith(initialConfig.wsServerConfig);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).not.toHaveBeenCalled();

        proxima.setState('');
        await proxima.checkEnvironment();

        expect(mockStop).toHaveBeenCalled();
        expect(proxima.ws_server).toBeUndefined();
    });

    test('should restart server after configChangeInterval and stop everything on stopMonitoring', async () => {
        await proxima.startMonitoring();
        proxima.setState('ws_server')
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(mockStart).toHaveBeenCalledTimes(1);
        expect(WS_Server).toHaveBeenCalledWith(initialConfig.wsServerConfig);
        proxima.setState('ws_server,ws_client')
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(mockStart).toHaveBeenCalledTimes(2);
        expect(WS_Client).toHaveBeenCalledWith(initialConfig.wsClientConfig);
        proxima.setState('ws_server')
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(mockStop).toHaveBeenCalledTimes(1);
        proxima.setConfig({
            configChangeInterval: 1000,
            wsClientConfig: { url: 'ws://localhost:8081' },
            wsServerConfig: { port: 8082 },
        })
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(mockStart).toHaveBeenCalledTimes(3);
        expect(mockStop).toHaveBeenCalledTimes(2);
        expect(WS_Server).toHaveBeenCalledWith({ port: 8082 });
        await proxima.stopMonitoring();
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(proxima.ws_server).toBeUndefined();
        expect(proxima.ws_client).toBeUndefined();
        expect(mockStop).toHaveBeenCalledTimes(3);
    });
});
