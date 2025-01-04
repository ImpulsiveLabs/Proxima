import Proxima from '../src/index';
import FTP_Client from '../src/protocols/ftp/client';
import WS_Client from '../src/protocols/ws/client';
import WS_Server from '../src/protocols/ws/server';
import { ProximaProtocol, ProximaConfig } from '../src/types';

jest.mock('../src/protocols/ws/client');
jest.mock('../src/protocols/ws/server');
jest.mock('../src/protocols/ftp/client');

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

describe('Proxima Class Tests', () => {
    let proxima: Proxima;

    const initialConfig: ProximaConfig = {
        configChangeInterval: 200,
        wsClientConfig: { url: 'ws://localhost:8080' },
        wsServerConfig: { port: 8081 },
        ftpClientConfig: {}
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
        proxima.setState(`${ProximaProtocol.FTP_Client}`);
        await proxima.checkEnvironment();

        expect(FTP_Client).toHaveBeenCalledWith(initialConfig.ftpClientConfig);
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
