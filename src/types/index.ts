import WS_Server from "../protocols/ws/server"
import { WebSocketClientConfig, WebSocketServerConfig, WebSocketConfig } from "../protocols/ws/types"
import WS_Client from "../protocols/ws/client"
import { FTPClientConfig } from "../protocols/ftp/types"
import FTP_Client from "../protocols/ftp/client"

interface ProtocolImpl {
    start: () => Promise<void>
    stop: () => Promise<void>
    transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
    validateData?: (validatorObject: Record<string, unknown>) => Promise<void>
    sendData?: (data: Record<string, unknown>) => Promise<void>
    receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
}

type Protocol = WS_Client | WS_Server | FTP_Client

enum ProximaProtocol {
    'WS_CLIENT' = 'ws_client',
    'WS_SERVER' = 'ws_server',
    'FTP_Client' = 'ftp_client'
}
type ProtocolConfigString = "wsServerConfig" | "wsClientConfig" | 'ftpClientConfig';

type ProtocolConfig = WebSocketClientConfig | WebSocketServerConfig | FTPClientConfig;

type ProximaConfig = {
    configChangeInterval?: number
    wsClientConfig?: WebSocketClientConfig,
    wsServerConfig?: WebSocketServerConfig,
    ftpClientConfig?: FTPClientConfig
}

export { ProtocolImpl, Protocol, ProximaConfig, ProximaProtocol, WebSocketConfig, WebSocketClientConfig, WebSocketServerConfig, ProtocolConfig, ProtocolConfigString, FTPClientConfig }