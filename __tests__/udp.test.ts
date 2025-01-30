import Udp_Client from '../src/protocols/udp/client';
import { UdpClientConfig } from '../src/protocols/udp/types';
import dgram from 'dgram';

jest.setTimeout(15000);

describe('UdpClient', () => {
    let server: dgram.Socket;
    let udpClient: Udp_Client;

    const createServer = (port: number) => {
        const server = dgram.createSocket('udp4');
        server.on('message', (msg, rinfo) => {
            server.send(msg, rinfo.port, rinfo.address, (err) => {
                if (err) {
                    console.error('Error sending response:', err);
                }
            });
        });
        return server;
    };

    const startClient = (port: number) => {
        const config: UdpClientConfig = {
            host: 'localhost',
            port: 0, // Use a random available port for the client
            type: 'udp4',
            remoteHost: 'localhost',
            remotePort: port, // Use the server's port for sending messages
            reconnectInterval: 5000,
        };
        udpClient = new Udp_Client(config);
        return udpClient.start();
    };

    afterEach((done) => {
        if (udpClient) {
            udpClient.stop().then(() => {
                server.close(done);
            });
        } else {
            done();
        }
    });

    it('should successfully send a message and receive a response', async () => {
        const serverPort = 12345; // Fixed port for the server
        server = createServer(serverPort);
        server.bind(serverPort);

        await startClient(serverPort);

        const message = { key: 'value' };
        await udpClient.sendMessage(message);
        
        // Add a delay to allow the message to be processed
        await new Promise(resolve => setTimeout(resolve, 100)); // Adjust the delay as needed

        expect(udpClient.receivedParsedMessage).toEqual(expect.objectContaining(message));
    });

    it('should process multiple messages correctly', async () => {
        const serverPort = 12348; // Use a different port for this test
        server = createServer(serverPort);
        server.bind(serverPort);

        await startClient(serverPort);

        const messages = [
            { key: 'value1' },
            { key: 'value2' },
            { key: 'value3' },
        ];

        for (const message of messages) {
            await udpClient.sendMessage(message);
            await new Promise(resolve => setTimeout(resolve, 100)); // Delay for processing
        }

        expect(udpClient.receivedParsedMessage).toEqual(expect.objectContaining(messages[messages.length - 1]));
    });

    it('should handle malformed JSON messages gracefully', async () => {
        const serverPort = 12349; // Use a different port for this test
        server = createServer(serverPort);
        server.bind(serverPort);

        await startClient(serverPort);

        const malformedMessage = Buffer.from('{"key": "value"'); // Missing closing brace
        server.send(malformedMessage, serverPort, 'localhost');

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for processing

        expect(udpClient.receivedParsedMessage).toEqual({}); // Should not update receivedParsedMessage
    });
});
