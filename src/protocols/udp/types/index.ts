import { SocketOptions } from 'dgram';

type UdpClientConfig = {
    host: string;
    port: number;
    remoteHost: string;
    remotePort: number;
    reconnectInterval?: number;
} & SocketOptions;

export { UdpClientConfig }