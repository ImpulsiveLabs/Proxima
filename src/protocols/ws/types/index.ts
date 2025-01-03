import WebSocket from 'ws';

type WebSocketClientConfig = {
    secure?: boolean,
    certificatePath?: string
    url: string,
    pingPongInterval?: number,
    reconnectInterval?: number,
} & WebSocket.ClientOptions

type WebSocketServerConfig = {
    secure?: boolean;
    certificatePath?: string;
    privateKeyPath?: string;
    passphrase?: string;
    pingPongInterval?: number;
} & WebSocket.ServerOptions;

type Client = {
    websocket: WebSocket;
    isAlive: boolean;
}

type WebSocketConfig = WebSocketClientConfig | WebSocketServerConfig

export { WebSocketClientConfig, WebSocketServerConfig, Client, WebSocketConfig }