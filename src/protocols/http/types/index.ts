import { CreateAxiosDefaults } from 'axios';

type HttpClientConfig = {
    longPollInterval?: number;
    retries?: number;
    longPollEndpoint?: string;
} & CreateAxiosDefaults

export { HttpClientConfig }