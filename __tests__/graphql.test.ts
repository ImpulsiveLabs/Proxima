import GraphQL_Client from '../src/protocols/graph-ql/client';
import { GraphQLClientConfig } from '../src/protocols/graph-ql/types';
import { gql } from '@apollo/client/core'; // Import gql for query formatting
jest.setTimeout(15000);

describe('GraphQL_Client Integration Tests with Hasura GraphQL Server', () => {
    let graphqlClient: GraphQL_Client;
    let mockConfig: GraphQLClientConfig;

    const endpoint = 'http://localhost:8080/v1/graphql'; // Hasura GraphQL endpoint
   
    beforeAll(() => {
        mockConfig = {
            endpoint,
            headers: {
                'x-hasura-admin-secret': 'myadminsecretkey', // Use the correct header for authentication
            },
            credentials: 'include',
            fetch: undefined,
            timeout: 5000, // Optional timeout
            reconnectInterval: 5000, // Optional reconnect interval
            retries: 3, // Optional number of retries
        };
    });

    beforeEach(() => {
        graphqlClient = new GraphQL_Client(
            mockConfig,
            async (data) => {
                return data; // Transform data if needed
            },
            async (data) => {
                expect(data).toHaveProperty('data');
                expect(data.data).toHaveProperty('greetings');
            },
            async (data) => {
                console.log('Sending data:', data); // Send data to another service if needed
            },
            async (data) => {
                return { hello: `received-${data.hello}` }; // Simulate receiving data
            },
        );
    });

    it('should connect to the Hasura GraphQL server', async () => {
        await graphqlClient.start(); // Connect the client
        expect(graphqlClient.isConnected).toBe(true); // Check if the client is connected
    });

    it('should handle errors gracefully', async () => {
        await graphqlClient.start(); // Ensure the client is connected

        const invalidQuery = gql`
            query {
                invalidField
            }
        `;
        graphqlClient.config.query = invalidQuery
        await expect(graphqlClient.executeQuery()).rejects.toThrow(); // Expect an error to be thrown
    });

    afterAll(async () => {
        await graphqlClient.stop(); // Cleanup if necessary
    });
});
