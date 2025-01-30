import { CreateAxiosDefaults } from 'axios';

type HttpClientConfig = {
    longPollInterval?: number;
    retries?: number;
    longPollEndpoint?: string;
    reconnectInterval?: number;
} & CreateAxiosDefaults

export { HttpClientConfig }