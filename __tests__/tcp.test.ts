import Tcp_Client from '../src/protocols/tcp/client';
import { TcpClientConfig } from '../src/protocols/tcp/types';
import net from 'net';

jest.setTimeout(15000);

describe('TcpClient', () => {
    let server: net.Server;
    let tcpClient: Tcp_Client;

    const createServer = (port: number) => {
        const server = net.createServer((socket) => {
            socket.on('data', (data) => {
                socket.write(data); // Echo back the received message
            });
        });
        return server;
    };

    const startClient = (port: number) => {
        const config: TcpClientConfig = {
            host: 'localhost',
            port: port, // Use the server's port for sending messages
            reconnectInterval: 5000,
        };
        tcpClient = new Tcp_Client(config);
        return tcpClient.start();
    };

    afterEach((done) => {
        if (tcpClient) {
            tcpClient.stop().then(() => {
                server.close(done);
            });
        } else {
            done();
        }
    });

    it('should successfully send a message and receive a response', async () => {
        const serverPort = 12345; // Fixed port for the server
        server = createServer(serverPort);
        server.listen(serverPort);

        await startClient(serverPort);

        const message = { key: 'value' };
        await tcpClient.sendMessage(message);
        
        // Add a delay to allow the message to be processed
        await new Promise(resolve => setTimeout(resolve, 100)); // Adjust the delay as needed

        expect(tcpClient.receivedParsedMessage).toEqual(expect.objectContaining(message));
    });

    it('should process multiple messages correctly', async () => {
        const serverPort = 12346; // Use a different port for this test
        server = createServer(serverPort);
        server.listen(serverPort);

        await startClient(serverPort);

        const messages = [
            { key: 'value1' },
            { key: 'value2' },
            { key: 'value3' },
        ];

        for (const message of messages) {
            await tcpClient.sendMessage(message);
            await new Promise(resolve => setTimeout(resolve, 100)); // Delay for processing
        }

        expect(tcpClient.receivedParsedMessage).toEqual(expect.objectContaining(messages[messages.length - 1]));
    });

});
