import WS_Server from "../protocols/ws/server"
import { WebSocketClientConfig, WebSocketServerConfig, WebSocketConfig } from "../protocols/ws/types"
import WS_Client from "../protocols/ws/client"
import { FTPClientConfig } from "../protocols/ftp/types"
import FTP_Client from "../protocols/ftp/client"
import { KafkaClientConfig } from "../protocols/kafka/types"
import Kafka_Client from "../protocols/kafka/client"
import Mqtt_Client from "../protocols/mqtt/client"
import { MqttClientConfig } from "../protocols/mqtt/types"
import GraphQL_Client from "../protocols/graph-ql/client"
import { GraphQLClientConfig } from "../protocols/graph-ql/types"

interface ProtocolImpl {
    start: () => Promise<void>
    stop: () => Promise<void>
    transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
    validateData?: (validatorObject: Record<string, unknown>) => Promise<void>
    sendData?: (data: Record<string, unknown>) => Promise<void>
    receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
}

type Protocol = WS_Client | WS_Server | FTP_Client | Kafka_Client | Mqtt_Client | GraphQL_Client

enum ProximaProtocol {
    'WS_CLIENT' = 'ws_client',
    'WS_SERVER' = 'ws_server',
    'FTP_CLIENT' = 'ftp_client',
    'KAFKA_CLIENT' = 'kafka_client',
    'MQTT_CLIENT' = 'mqtt_client',
    'GRAPHQL_CLIENT' = 'graphql_client'
}
type ProtocolConfigString = "wsServerConfig" | "wsClientConfig" | 'ftpClientConfig' | 'kafkaClientConfig' | 'mqttClientConfig' | 'graphQlClientConfig';

type ProtocolConfig = WebSocketClientConfig | WebSocketServerConfig | FTPClientConfig | KafkaClientConfig | GraphQLClientConfig;

type ProximaConfig = {
    configChangeInterval?: number
    wsClientConfig?: WebSocketClientConfig,
    wsServerConfig?: WebSocketServerConfig,
    ftpClientConfig?: FTPClientConfig,
    kafkaClientConfig?: KafkaClientConfig,
    mqttClientConfig?: MqttClientConfig,
    graphQlClientConfig?: GraphQLClientConfig,
}

export {
    ProtocolImpl,
    Protocol,
    ProximaConfig,
    ProximaProtocol,
    WebSocketConfig,
    WebSocketClientConfig,
    WebSocketServerConfig,
    ProtocolConfig,
    ProtocolConfigString,
    FTPClientConfig,
    KafkaClientConfig,
    MqttClientConfig,
    GraphQLClientConfig,
}