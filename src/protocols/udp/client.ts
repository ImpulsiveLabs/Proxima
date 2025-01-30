import dgram, { Socket } from 'dgram';
import { ProtocolImpl } from "../../types/index";
import { UdpClientConfig } from './types';

class Udp_Client implements ProtocolImpl {
    private socket: Socket;
    isConnected: boolean = false;
    private messageBuffer: Buffer = Buffer.alloc(0);
    receivedParsedMessage: Record<string, unknown> = {};
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(
        public config: UdpClientConfig,
        public transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public validateData?: (validatorObject: Record<string, unknown>) => Promise<void>,
        public sendData?: (data: Record<string, unknown>) => Promise<void>,
        public receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
    ) {
        this.socket = dgram.createSocket(config.type || 'udp4');
        this.socket.on('message', this.onMessage.bind(this));
        this.socket.on('error', this.onError.bind(this));
    }

    public async start(): Promise<void> {
        if (this.isConnected) {
            return;
        }
        this.isConnected = true;
        this.socket.bind(this.config.port, this.config.host, () => {
            console.log('UDP client connected successfully.');
        });
    }

    private async onMessage(msg: Buffer, rinfo: dgram.RemoteInfo): Promise<void> {
        this.messageBuffer = Buffer.concat([this.messageBuffer, msg]);
        const messageString = this.messageBuffer.toString();
        const messages = messageString.split('\n');

        for (let i = 0; i < messages.length - 1; i++) {
            const completeMessage = messages[i];
            if (this.validateData) {
                await this.validateData(JSON.parse(completeMessage));
            }
            if (this.transformData) {
                const parsedData: Record<string, unknown> = JSON.parse(completeMessage);
                this.receivedParsedMessage = await this.transformData(parsedData);
            } else {
                this.receivedParsedMessage = JSON.parse(completeMessage);
            }
            if (this.sendData) {
                await this.sendData(this.receivedParsedMessage);
            }
            console.log('Processed UDP message:', this.receivedParsedMessage);
        }
        this.messageBuffer = Buffer.from(messages[messages.length - 1]);
    }

    private onError(error: Error): void {
        console.error('Socket error:', error);
        this.isConnected = false;
        this.handleReconnect();
    }

    private handleReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = setTimeout(async () => {
            try {
                await this.start();
                console.log('Reconnected successfully.');
            } catch (error) {
                console.error('Reconnection failed:', error);
                this.handleReconnect();
            }
        }, this.config.reconnectInterval || 5000);
    }

    public async sendMessage(message: Record<string, unknown>): Promise<void> {
        if (!this.isConnected) {
            console.error('UDP client is not connected. Cannot send message.');
            return;
        }
        const msgBuffer = Buffer.from(JSON.stringify(message) + '\n');
        this.socket.send(msgBuffer, this.config.remotePort, this.config.remoteHost, (err) => {
            if (err) {
                console.error('Error sending UDP message:', err);
                this.isConnected = false;
                this.handleReconnect();
            } else {
                console.log('UDP message sent successfully.');
            }
        });
    }

    public async stop(): Promise<void> {
        if (!this.isConnected) {
            return;
        }
        this.socket.close(() => {
            this.isConnected = false;
            this.receivedParsedMessage = {};
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }
            this.messageBuffer = Buffer.alloc(0);
            console.log('UDP client disconnected successfully.');
        });
    }
}

export default Udp_Client;
