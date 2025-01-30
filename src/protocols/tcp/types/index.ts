type TcpClientConfig = {
    host: string;
    port: number;
    reconnectInterval?: number;
    family?: number;
    localAddress?: string;
    localPort?: number;
    timeout?: number;
    noDelay?: boolean;
    keepAlive?: boolean | number;
};
export { TcpClientConfig }