import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core';
import { GraphQLClientConfig } from './types';
import { ProtocolImpl } from "../../types/index";

class GraphQL_Client implements ProtocolImpl {
    private client: ApolloClient<any> | null = null;
    isConnected: boolean = false;
    receivedParsedMessage: Record<string, unknown> = {};
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(
        public config: GraphQLClientConfig,
        public transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public validateData?: (validatorObject: Record<string, unknown>) => Promise<void>,
        public sendData?: (data: Record<string, unknown>) => Promise<void>,
        public receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
    ) {

    }

    public async start(): Promise<void> {
        if (this.isConnected) {
            console.log('GraphQL client is already connected. Ignoring connect request.');
            return;
        }
        this.client = new ApolloClient({
            uri: this.config.endpoint,
            cache: new InMemoryCache(),
            headers: this.config.headers,
            ...this.config
        });
        try {
            const previouslyConfigQuery = { ...this.config.query };
            this.config.query = gql`{ __typename }`;
            await this.executeQuery();
            this.config.query = previouslyConfigQuery;
            this.isConnected = true;
            console.log('GraphQL client connected successfully.');
        } catch (error) {
            console.error('Initial connection check failed:', error);
            this.reconnect();
        }
    }

    private reconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(async () => {
            console.log('Attempting to reconnect to GraphQL client...');
            await this.start();
        }, this.config.reconnectInterval || 5000);
    }

    public async executeQuery(): Promise<any> {
        if (!this.isConnected) {
            console.error('GraphQL client is not connected. Cannot execute query.');
            return;
        }

        let attempts = 0;
        const maxRetries = this.config.retries || 3; // Default to 3 retries

        while (attempts < maxRetries) {
            try {
                if (this.client) {
                    const response = await this.client?.query({
                        query: this.config.query,
                        variables: this.config.variables,
                    });

                    const data = response.data;

                    if (this.validateData) {
                        await this.validateData(data);
                    }

                    if (this.transformData) {
                        this.receivedParsedMessage = await this.transformData(data);
                    } else {
                        this.receivedParsedMessage = data;
                    }

                    if (this.sendData) {
                        await this.sendData(this.receivedParsedMessage);
                    }

                    console.log('Processed query response:', this.receivedParsedMessage);
                    return this.receivedParsedMessage; // Return the response
                }
            } catch (error) {
                attempts++;
                console.error(`Error executing GraphQL query (attempt ${attempts}):`, error);
                if (attempts >= maxRetries) {
                    throw new Error('Max retries reached. Unable to execute query.');
                }
                // Optionally wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.config.timeout || 1000));
            }
        }
    }

    public async stop(): Promise<void> {
        if (!this.isConnected) {
            console.log('GraphQL client is not connected. No action taken.');
            return;
        }

        try {
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }

            this.isConnected = false;
            this.receivedParsedMessage = {}; // Clear any received messages

            console.log('GraphQL client disconnected successfully.');
        } catch (error) {
            console.error('Error during GraphQL client shutdown:', error);
        }
    }
}

export default GraphQL_Client;
