import WebSocket from "ws";
import { ProtocolImpl } from "../../types/index";
import * as fs from 'fs';
import { WebSocketClientConfig } from "./types";

class WS_Client implements ProtocolImpl {
    ws: WebSocket | null = null;
    private timeoutInterval: NodeJS.Timeout | undefined;
    private retryInterval: NodeJS.Timeout | undefined;
    isConnected: boolean = false;
    receivedParsedMessage: Record<string, unknown> = {}

    constructor(
        public config: WebSocketClientConfig,
        public transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public validateData?: (validatorObject: Record<string, unknown>) => Promise<void>,
        public sendData?: (data: Record<string, unknown>) => Promise<void>,
        public receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
    ) { }

    public async start(): Promise<void> {
        if (this.isConnected) {
            console.log("WebSocket is already connected. Ignoring start request.");
            return;
        }

        await this.getCertificates();
        this.connect();
    }

    private connect(): void {
        console.log("Attempting to connect...");
        this.ws = new WebSocket(this.config.url, this.config);
        this.ws.on("open", async () => await this.onOpen());
        this.ws.on("message", async (data: string) => await this.onMessage(data));
        this.ws.on("ping", () => this.startPongInterval());
        this.ws.on("error", async (error) => await this.onError(error));
        this.ws.on("close", async () => await this.onClose());
    }

    public async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
                this.isConnected = false;
                this.ws.removeAllListeners();
                this.ws.close();
                if (this.timeoutInterval) {
                    clearTimeout(this.timeoutInterval);
                }
                if (this.retryInterval) {
                    clearTimeout(this.retryInterval);
                }
                console.log("WebSocket connection stopped.");
                resolve();
            } else {
                console.log("No active WebSocket connection to close.");
                resolve();
            }
        });
    }

    private async onOpen(): Promise<void> {
        this.isConnected = true;
        console.log("WebSocket connection established.");
        this.startPongInterval();
    }

    private async onMessage(data: string): Promise<void> {
        try {
            let parsedData: Record<string, unknown> = JSON.parse(data);

            if (this.validateData) {
                await this.validateData(parsedData);
            }

            if (this.transformData) {
                parsedData = await this.transformData(parsedData);
            }

            this.receivedParsedMessage = parsedData

            if (this.sendData) {
                await this.sendData(parsedData);
            }
        } catch (error) {
            console.error("Error handling incoming message:", error);
        }
    }

    private async onError(error: Error): Promise<void> {
        console.error("WebSocket encountered an error:", error.message);
        this.isConnected = false;

        if (!this.retryInterval) {
            this.retryInterval = setTimeout(() => {
                console.log("Reconnecting after error...");
                this.connect();
            }, this.config.reconnectInterval || 5000);
        }
    }

    private async onClose(): Promise<void> {
        console.log("WebSocket connection closed.");
        this.isConnected = false;
        if (!this.retryInterval) {
            this.retryInterval = setTimeout(() => {
                console.log("Reconnecting after close...");
                this.connect();
            }, this.config.reconnectInterval || 5000);
        }
    }

    private async getCertificates(): Promise<void> {
        if (this.config.secure) {
            if (this.config.certificatePath) {
                try {
                    const cert = await fs.promises.readFile(this.config.certificatePath);
                    this.config.ca = cert;
                    this.config.rejectUnauthorized = true;
                    if (!this.config.url || !this.config.url.startsWith('wss')) {
                        throw new Error(`For secure websockets the url should start with wss, received: ${this.config.url}`)
                    }
                } catch (error) {
                    throw new Error(`Failed to load certificate: ${(error as Error).message}`);
                }
            } else {
                throw new Error("WebSocket client must be secure, but no certificate path was provided.");
            }
        }
    }

    private startPongInterval(): void {
        if (this.ws) {
            if (this.timeoutInterval) clearTimeout(this.timeoutInterval);
            this.timeoutInterval = setTimeout(() => {
                console.warn("Ping timeout. Terminating connection.");
                this.ws?.terminate();
            }, this.config.pingPongInterval || 5000 + 500);
        }
    }
}

export default WS_Client;
