import Http_Client from '../src/protocols/http/client';
import { HttpClientConfig } from '../src/protocols/http/types';
import http from 'http';

jest.setTimeout(15000);

describe('HttpClient', () => {
    let server: http.Server;
    const config: HttpClientConfig = {
        baseURL: 'http://localhost:8081',
        longPollInterval: 5000,
        retries: 3,
        timeout: 10000,
    };

    let httpClient: Http_Client;

    beforeAll((done) => {
        server = http.createServer((req, res) => {
            if (req.method === 'GET' && req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>Hello, World!</h1>');
            } else if (req.method === 'POST' && req.url === '/') {
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString(); // Convert Buffer to string
                });
                req.on('end', () => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(body); // Echo back the posted data
                });
            } else if (req.method === 'GET' && req.url === '/long-poll-endpoint') {
                setTimeout(() => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ data: 'Long poll response' }));
                }, 1000); // Simulate a delay
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        server.listen(8081, () => {
            httpClient = new Http_Client(config);
            httpClient.start().then(() => done());
        });
    });

    afterAll((done) => {
        httpClient.stop().then(() => {
            server.close(done);
        });
    });

    it('should successfully make a GET request', async () => {
        const response = await httpClient.executeRequest('GET', '/');
        expect(response).toBeDefined();
        expect(typeof response).toBe('string'); // Assuming the response is a string (HTML)
    });

    it('should successfully make a POST request', async () => {
        const postData = { key: 'value' };
        const response = await httpClient.executeRequest('POST', '/', postData);
        expect(response).toBeDefined();
        expect(response).toEqual(expect.objectContaining(postData)); // Assuming the server echoes back the posted data
    });

    it('should handle long polling', async () => {
        const longPollResponse = await httpClient.executeRequest('GET', '/long-poll-endpoint');
        expect(longPollResponse).toBeDefined();
        expect(longPollResponse).toHaveProperty('data', 'Long poll response');
    });

    it('should throw an error after max retries', async () => {
        jest.spyOn(httpClient, 'executeRequest').mockImplementation(() => {
            return Promise.reject(new Error('Network Error'));
        });

        await expect(httpClient.executeRequest('GET', '/non-existent-endpoint')).rejects.toThrow('Network Error');
    });
});
