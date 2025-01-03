import WS_Server from "../protocols/ws/server"
import { WebSocketClientConfig, WebSocketServerConfig, WebSocketConfig } from "../protocols/ws/types"
import WS_Client from "../protocols/ws/client"

interface ProtocolImpl {
    start: () => Promise<void>
    stop: () => Promise<void>
    transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
    validateData?: (validatorObject: Record<string, unknown>) => Promise<void>
    sendData?: (data: Record<string, unknown>) => Promise<void>
    receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
}

type Protocol = WS_Client | WS_Server

enum ProximaProtocol {
    'WS_CLIENT' = 'ws_client',
    'WS_SERVER' = 'ws_server'
}
type ProtocolConfig = "wsServerConfig" | "wsClientConfig";

type ProximaConfig = {
    configChangeInterval?: number
    wsClientConfig: WebSocketClientConfig,
    wsServerConfig: WebSocketServerConfig
}

export { ProtocolImpl, Protocol, ProximaConfig, ProximaProtocol, WebSocketConfig, ProtocolConfig }