import net, { Socket } from 'net';
import { ProtocolImpl } from "../../types/index";
import { TcpClientConfig } from './types';

class Tcp_Client implements ProtocolImpl {
    private socket: Socket| null = null;
    isConnected: boolean = false;
    private messageBuffer: Buffer = Buffer.alloc(0);
    receivedParsedMessage: Record<string, unknown> = {};
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(
        public config: TcpClientConfig,
        public transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public validateData?: (validatorObject: Record<string, unknown>) => Promise<void>,
        public sendData?: (data: Record<string, unknown>) => Promise<void>,
        public receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
    ) {

    }

    public async start(): Promise<void> {
        if (this.isConnected) {
            return;
        }
        this.isConnected = true;
        this.socket = new net.Socket();
        this.socket.on('data', this.onData.bind(this));
        this.socket.on('error', this.onError.bind(this));
        if (this.config.keepAlive) {
            this.socket.setKeepAlive(this.config.keepAlive as boolean);
        }
        if (this.config.noDelay) {
            this.socket.setNoDelay(this.config.noDelay);
        }
        if (this.config.timeout) {
            this.socket.setTimeout(this.config.timeout);
        }

        this.socket.connect(this.config.port, this.config.host, () => {
            console.log('TCP client connected successfully.');
        });
    }

    private async onData(data: Buffer): Promise<void> {
        this.messageBuffer = Buffer.concat([this.messageBuffer, data]);
        const messageString = this.messageBuffer.toString();
        const messages = messageString.split('\n');
        for (let i = 0; i < messages.length; i++) {
               const completeMessage = messages[i].trim(); // Trim whitespace

        if (completeMessage.length === 0) {
            continue; // Skip empty messages
        }
            try {

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
                console.log('Processed TCP message:', this.receivedParsedMessage);
            } catch (error) {
                console.error('Error processing message:', error);
            }
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
            console.error('TCP client is not connected. Cannot send message.');
            return;
        }
        const msgBuffer = Buffer.from(JSON.stringify(message) + '\n');
        this.socket?.write(msgBuffer, (err) => {
            if (err) {
                console.error('Error sending TCP message:', err);
                this.isConnected = false;
                this.handleReconnect();
            } else {
                console.log('TCP message sent successfully.');
            }
        });
    }

    public async stop(): Promise<void> {
        if (!this.isConnected) {
            return;
        }
        this.socket?.end(() => {
            this.isConnected = false;
            this.receivedParsedMessage = {};
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }
            console.log('TCP client disconnected successfully.');
        });
    }
}

export default Tcp_Client;
