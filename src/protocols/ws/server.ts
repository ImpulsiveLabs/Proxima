import WebSocket from "ws";
import * as fs from "fs";
import * as https from "https";
import { v4 as uuidv4 } from "uuid";
import { Client, WebSocketServerConfig } from "./types";
import { ProtocolImpl } from "../../types";

class WS_Server implements ProtocolImpl {
    private wss: WebSocket.WebSocketServer | null = null;
    clients: Record<string, Client> = {};
    receivedParsedMessage: Record<string, unknown> = {}
    constructor(
        public config: WebSocketServerConfig,
        public transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public validateData?: (validatorObject: Record<string, unknown>) => Promise<void>,
        public receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public sendData?: (data: Record<string, unknown>) => Promise<void>) { }

    public wsServerSendData = async (ws: WebSocket, data: Record<string, unknown>): Promise<void> => {
        try {
            const stringifiedData = JSON.stringify(data);
            ws.send(stringifiedData);
            console.log("Sent data to client:", stringifiedData);
        } catch (error) {
            console.error("Error sending data to client:", error);
        }
    };

    private async getWebSocketCertificates(): Promise<void> {
        if (this.config.secure) {
            if (!this.config.certificatePath || !this.config.privateKeyPath) {
                throw new Error("Secure WebSocket server requires certificatePath and privateKeyPath.");
            }

            const cert = await fs.promises.readFile(this.config.certificatePath);
            const key = await fs.promises.readFile(this.config.privateKeyPath);

            const httpsServer = https.createServer({ cert, key, passphrase: this.config.passphrase });
            httpsServer.listen(this.config.port);
            this.config.server = httpsServer;
        }
    }

    private registerClient(ws: WebSocket): string {
        const clientId = uuidv4();
        this.clients[clientId] = { websocket: ws, isAlive: true };
        console.log(`Client ${clientId} registered.`);
        return clientId;
    }

    private handleConnection(ws: WebSocket): void {
        const clientId = this.registerClient(ws);
        ws.on("message", (message: string) => this.handleMessage(ws, message));
        ws.on("pong", () => this.handlePong(clientId));
        ws.on("close", () => this.removeClient(clientId));
        ws.on("error", (error) => this.handleError(clientId, error));
    }

    private async handleMessage(ws: WebSocket, message: string): Promise<void> {
        try {
            let parsedData: Record<string, unknown> = JSON.parse(message);

            if (this.validateData) {
                await this.validateData(parsedData);
            }

            if (this.transformData) {
                parsedData = await this.transformData(parsedData);
            }
            this.receivedParsedMessage = parsedData;
            console.log("Received and processed data:", parsedData);

            if (this.sendData) {
                await this.wsServerSendData(ws, parsedData);
                await this.sendData(parsedData);
            }
        } catch (error) {
            console.error("Error handling incoming message:", error);
        }
    }

    private handlePong(clientId: string): void {
        const client = this.clients[clientId];
        if (client) {
            console.log(`Pong received from client ${clientId}`);
            client.isAlive = true;
        }
    }

    private handleError(clientId: string, error: Error): void {
        console.error(`WebSocket error for client ${clientId}: ${error.message}`);
        this.removeClient(clientId);
    }

    private startPingInterval(): void {
        const interval = setInterval(() => {
            Object.keys(this.clients).forEach((clientId) => {
                const client = this.clients[clientId];
                if (!client.isAlive) {
                    console.warn(`Client ${clientId} did not respond to ping. Terminating connection.`);
                    client.websocket.terminate();
                    this.removeClient(clientId);
                } else {
                    client.isAlive = false;
                    console.log(`Sending ping to client ${clientId}`);
                    client.websocket.ping();
                }
            });
        }, this.config.pingPongInterval || 5000);

        this.wss?.on("close", () => clearInterval(interval));
    }

    private removeClient(clientId: string): void {
        if (this.clients[clientId]) {
            console.log(`Client ${clientId} disconnected.`);
            delete this.clients[clientId];
        }
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            this.wss?.close(() => {
                Object.keys(this.clients).forEach((clientId) => {
                    this.clients[clientId].websocket.terminate();
                });
                console.log("WebSocket server stopped.");
                resolve()
            });
        })
    }

    public async start(): Promise<void> {
        await this.getWebSocketCertificates();
        if (this.config.server && this.config.port) {
            delete this.config.port;
        }
        this.wss = new WebSocket.WebSocketServer(this.config);

        this.wss.on("connection", (ws) => this.handleConnection(ws));
        this.startPingInterval();
        console.log(`WebSocket server started on ${this.config.port}`);
    }
}

export default WS_Server;
