import axios, { AxiosInstance } from 'axios';
import { ProtocolImpl } from "../../types/index";
import { HttpClientConfig } from './types';

class HttpClient implements ProtocolImpl {
    private client: AxiosInstance;
    isConnected: boolean = false;
    receivedParsedMessage: Record<string, unknown> = {};
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(
        public config: HttpClientConfig,
        public transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public validateData?: (validatorObject: Record<string, unknown>) => Promise<void>,
        public sendData?: (data: Record<string, unknown>) => Promise<void>,
        public receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
    ) {
        this.client = axios.create({
            baseURL: config.baseURL,
            headers: config.headers,
            timeout: config.timeout,
        });
    }

    public async start(): Promise<void> {
        if (this.isConnected) {
            console.log('HTTP client is already connected. Ignoring connect request.');
            return;
        }

        this.isConnected = true;
        console.log('HTTP client connected successfully.');

        if (this.config.longPollEndpoint) {
            this.longPoll();
        }
    }

    private async longPoll(): Promise<void> {
        while (this.isConnected) {
            try {
                let data = null
                if (this.config.longPollEndpoint) {
                    const response = await this.client.get(this.config.longPollEndpoint);
                    data = response.data;
                }
                if (data) {
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

                    console.log('Processed long poll response:', this.receivedParsedMessage);
                }
            } catch (error) {
                console.error('Error during long polling:', error);
            }

            await new Promise(resolve => setTimeout(resolve, this.config.longPollInterval || 5000));
        }
    }

    public async executeRequest(method: 'GET' | 'POST', endpoint: string, data?: Record<string, unknown>): Promise<any> {
        if (!this.isConnected) {
            console.error('HTTP client is not connected. Cannot execute request.');
            return;
        }

        let attempts = 0;
        const maxRetries = this.config.retries || 3;

        while (attempts < maxRetries) {
            try {
                const response = await this.client.request({
                    method,
                    url: endpoint,
                    data,
                });

                const responseData = response.data;

                if (this.validateData) {
                    await this.validateData(responseData);
                }

                if (this.transformData) {
                    this.receivedParsedMessage = await this.transformData(responseData);
                } else {
                    this.receivedParsedMessage = responseData;
                }

                if (this.sendData) {
                    await this.sendData(this.receivedParsedMessage);
                }

                console.log('Processed request response:', this.receivedParsedMessage);
                return this.receivedParsedMessage;
            } catch (error) {
                attempts++;
                console.error(`Error executing HTTP request (attempt ${attempts}):`, error);
                if (attempts >= maxRetries) {
                    throw new Error('Max retries reached. Unable to execute request.');
                }
                await new Promise(resolve => setTimeout(resolve, this.config.timeout || 1000));
            }
        }
    }

    public async stop(): Promise<void> {
        if (!this.isConnected) {
            console.log('HTTP client is not connected. No action taken.');
            return;
        }

        try {
            this.isConnected = false;
            this.receivedParsedMessage = {}; // Clear any received messages

            console.log('HTTP client disconnected successfully.');
        } catch (error) {
            console.error('Error during HTTP client shutdown:', error);
        }
    }
}

export default HttpClient;
