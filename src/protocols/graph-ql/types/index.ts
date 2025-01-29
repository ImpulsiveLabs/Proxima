import { ApolloQueryResult } from '@apollo/client/core';

type GraphQLClientConfig = {
    timeout?: number;
    verbose?: boolean;
    reconnectInterval?: number;
    endpoint: string;
    headers?: Record<string, string>;
    credentials?: RequestInit['credentials'];
    fetch?: typeof fetch;
    ssl?: boolean;
    retries?: number;
    onError?: (error: Error) => void;
    onSuccess?: (data: ApolloQueryResult<any>) => void;
    query?: any;
    variables?: Record<string, unknown>;
};

export { GraphQLClientConfig };
