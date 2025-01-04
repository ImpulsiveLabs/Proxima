import { ProtocolImpl } from "../../types/index";
import { Client } from "basic-ftp";
import { FTPClientConfig } from "./types";


class FTP_Client implements ProtocolImpl {
    client: Client;
    config: FTPClientConfig;
    private retryInterval: NodeJS.Timeout | undefined;
    isConnected: boolean = false;

    constructor(
        config: FTPClientConfig,
        public transformData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
        public validateData?: (validatorObject: Record<string, unknown>) => Promise<void>,
        public sendData?: (data: Record<string, unknown>) => Promise<void>,
        public receiveData?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
    ) {
        this.config = config;
        this.client = new Client(config.timeout || 5000);
        if (config.verbose) {
            this.client.ftp.verbose = true;
        }
    }

    public async start(): Promise<void> {
        if (this.isConnected) {
            console.log("FTP client is already connected. Ignoring start request.");
            return;
        }

        await this.connect();
    }

    private async connect(): Promise<void> {
        console.log("Attempting to connect to FTP server...");
        try {
            const { host, port, user, password, secure, secureOptions } = this.config;
            await this.client.access({
                host,
                port,
                user,
                password,
                secure,
                secureOptions
            });

            this.isConnected = true;
            console.log("FTP connection established.");
        } catch (error) {
            console.error("FTP connection failed:", error);
            this.isConnected = false;

            if (!this.retryInterval) {
                this.retryInterval = setTimeout(() => {
                    console.log("Reconnecting to FTP server...");
                    this.connect();
                }, this.config.reconnectInterval || 5000);
            }
        }
    }

    public async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.isConnected) {
                this.client.close();
                this.isConnected = false;
                if (this.retryInterval) {
                    clearTimeout(this.retryInterval);
                }
                console.log("FTP client connection closed.");
            } else {
                console.log("No active FTP connection to close.");
            }
            resolve();
        });
    }

    public async uploadFile(localPath: string, remotePath: string): Promise<void> {
        if (!this.isConnected) {
            throw new Error("FTP client is not connected.");
        }
        await this.client.uploadFrom(localPath, remotePath);
        console.log(`File uploaded from ${localPath} to ${remotePath}`);
    }

    public async downloadFile(remotePath: string, localPath: string): Promise<void> {
        if (!this.isConnected) {
            throw new Error("FTP client is not connected.");
        }
        await this.client.downloadTo(localPath, remotePath);
        console.log(`File downloaded from ${remotePath} to ${localPath}`);
    }

    public async listFiles(path?: string): Promise<void> {
        if (!this.isConnected) {
            throw new Error("FTP client is not connected.");
        }
        const fileList = await this.client.list(path);
        console.log("Files:", fileList);
    }

    public async removeFile(path: string): Promise<void> {
        if (!this.isConnected) {
            throw new Error("FTP client is not connected.");
        }
        await this.client.remove(path);
        console.log(`File removed: ${path}`);
    }

    public async ensureDir(path: string): Promise<void> {
        if (!this.isConnected) {
            throw new Error("FTP client is not connected.");
        }
        await this.client.ensureDir(path);
        console.log(`Directory ensured: ${path}`);
    }

    public async clearDir(path: string): Promise<void> {
        if (!this.isConnected) {
            throw new Error("FTP client is not connected.");
        }
        await this.client.cd(path);
        await this.client.clearWorkingDir();
        console.log(`Directory cleared: ${path}`);
    }
}

export default FTP_Client;
