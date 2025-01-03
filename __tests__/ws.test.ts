import WS_Client from "../src/protocols/ws/client";
import WS_Server from "../src/protocols/ws/server";
import WebSocket from "ws";
import path from 'path';

describe('Websockets', () => {
    const unsecureWss = new WS_Server({ port: 8080, pingPongInterval: 100 });
    const unsecureWs1 = new WS_Client({ url: `ws://localhost:8080`, pingPongInterval: 100, reconnectInterval: 100 });
    const unsecureWs2 = new WS_Client({ url: `ws://localhost:8080`, pingPongInterval: 100, reconnectInterval: 100 });

    const waitForConnection = (wsClient: WS_Client) =>
        new Promise<void>((resolve) => {
            const checkConnection = () => {
                if (wsClient.isConnected) {
                    resolve();
                } else {
                    setTimeout(checkConnection, 10);
                }
            };
            checkConnection();
        });

    const waitForServerDisconnections = (server: WS_Server) =>
        new Promise<void>((resolve) => {
            const checkDisconnections = () => {
                if (Object.keys(server.clients).length === 0) {
                    resolve();
                } else {
                    setTimeout(checkDisconnections, 10);
                }
            };
            checkDisconnections();
        });

    it('The connection happens normally between server and clients', async () => {
        await unsecureWss.start();

        await Promise.all([unsecureWs1.start(), unsecureWs2.start()]);
        await Promise.all([waitForConnection(unsecureWs1), waitForConnection(unsecureWs2)]);

        expect(Object.keys(unsecureWss.clients).length).toBe(2);

        await unsecureWs1.stop();
        await unsecureWs2.stop();

        await waitForServerDisconnections(unsecureWss);

        await unsecureWss.stop();
    });

    it('Try to connect twice the same websocket client instance', async () => {
        await unsecureWss.start();
        await Promise.all([unsecureWs1.start()]);
        await Promise.all([waitForConnection(unsecureWs1)]);

        const logSpy = jest.spyOn(console, 'log');

        await unsecureWs1.start();

        expect(logSpy).toHaveBeenCalledWith("WebSocket is already connected. Ignoring start request.");

        logSpy.mockRestore();

        await unsecureWs1.stop();
        await waitForServerDisconnections(unsecureWss);

        await unsecureWss.stop();
    });

    it('Should send a message from client to server and back with transformations and validations', async () => {
        const messageFromClient = { hello: "world" };

        const transformDataMock = jest.fn().mockResolvedValue({ transformed: true });
        const validateDataMock = jest.fn().mockResolvedValue(undefined);
        const sendDataMock = jest.fn().mockResolvedValue(undefined);

        unsecureWss.transformData = transformDataMock;
        unsecureWss.validateData = validateDataMock;
        unsecureWss.sendData = sendDataMock;

        unsecureWs1.transformData = transformDataMock;
        unsecureWs1.validateData = validateDataMock;
        unsecureWs1.sendData = sendDataMock;

        await unsecureWss.start();
        await unsecureWs1.start();

        await waitForConnection(unsecureWs1);
        const wsSendSpy = jest.spyOn(unsecureWss, 'wsServerSendData');

        unsecureWs1.ws?.send(JSON.stringify(messageFromClient));

        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(validateDataMock).toHaveBeenCalledWith(messageFromClient);
        expect(transformDataMock).toHaveBeenCalledWith(messageFromClient);
        expect(sendDataMock).toHaveBeenCalledWith({ transformed: true });
        expect(wsSendSpy).toHaveBeenCalledWith(expect.any(WebSocket), { transformed: true });

        expect(unsecureWs1.receivedParsedMessage).toEqual({ transformed: true });

        await new Promise((resolve) => setTimeout(resolve, 500));
        await unsecureWs1.stop();
        await waitForServerDisconnections(unsecureWss);

        await unsecureWss.stop();
    });
    it('The connection happens normally between server and clients in secure mode', async () => {
        const secureWss = new WS_Server({
            port: 8080,
            secure: true,
            certificatePath: path.resolve(__dirname, '../__tests_resources__/ws/cert.pem'),
            privateKeyPath: path.resolve(__dirname, '../__tests_resources__/ws/key.pem'),
            passphrase: 'tests',
            pingPongInterval: 100,
        });
        await secureWss.start();

        const secureWs1 = new WS_Client({
        url: `wss://localhost:8080`,
        secure: true,
        certificatePath: path.resolve(__dirname, '../__tests_resources__/ws/cert.pem'),
        pingPongInterval: 100,
        reconnectInterval: 100,
    });

    const secureWs2 = new WS_Client({
        url: `wss://localhost:8080`,
        secure: true,
        certificatePath: path.resolve(__dirname, '../__tests_resources__/ws/cert.pem'),
        pingPongInterval: 100,
        reconnectInterval: 100,
    });

        await Promise.all([secureWs1.start(), secureWs2.start()]);
        await Promise.all([waitForConnection(secureWs1), waitForConnection(secureWs2)]);

        expect(Object.keys(secureWss.clients).length).toBe(2);

        await secureWs1.stop();
        await secureWs2.stop();

        await waitForServerDisconnections(secureWss);

        await secureWss.stop();
    });
});

