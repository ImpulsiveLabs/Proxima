import { Client } from 'basic-ftp'; // Mock this
import FTP_Client from '../src/protocols/ftp/client';
import { FTPClientConfig } from '../src/types';

// Mock the basic-ftp Client class and methods
jest.mock('basic-ftp', () => {
    return {
        Client: jest.fn().mockImplementation(() => {
            return {
                access: jest.fn(),
                close: jest.fn(),
                uploadFrom: jest.fn(),
                downloadTo: jest.fn(),
                list: jest.fn(),
                remove: jest.fn(),
                ensureDir: jest.fn(),
                clearWorkingDir: jest.fn(),
                cd: jest.fn(),
                ftp: {
                    verbose: false,
                }
            };
        })
    };
});

describe('FTP_Client', () => {
    let ftpClient: FTP_Client;
    let mockConfig: FTPClientConfig;

    beforeEach(() => {
        mockConfig = {
            host: 'ftp.example.com',
            port: 21,
            user: 'testUser',
            password: 'testPassword',
            secure: false,
            timeout: 5000,
            reconnectInterval: 5000,
            verbose: false
        };
        ftpClient = new FTP_Client(mockConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize FTP client correctly', () => {
        expect(ftpClient).toBeDefined();
        expect(ftpClient.isConnected).toBe(false);
    });

    it('should connect to the FTP server', async () => {
        await ftpClient.start();

        expect(Client).toHaveBeenCalledTimes(1);
        expect(ftpClient.client.access).toHaveBeenCalledWith({
            host: mockConfig.host,
            port: mockConfig.port,
            user: mockConfig.user,
            password: mockConfig.password,
            secure: mockConfig.secure,
            secureOptions: undefined
        });
        expect(ftpClient.isConnected).toBe(true);
    });

    it('should stop the FTP client connection', async () => {
        ftpClient.isConnected = true;
        await ftpClient.stop();

        expect(ftpClient.client.close).toHaveBeenCalledTimes(1);
        expect(ftpClient.isConnected).toBe(false);
    });

    it('should not attempt to stop if not connected', async () => {
        ftpClient.isConnected = false;
        await ftpClient.stop();

        expect(ftpClient.client.close).not.toHaveBeenCalled();
        expect(ftpClient.isConnected).toBe(false);
    });

    it('should upload a file', async () => {
        ftpClient.isConnected = true;
        const localPath = 'path/to/local/file.txt';
        const remotePath = 'path/to/remote/file.txt';

        await ftpClient.uploadFile(localPath, remotePath);

        expect(ftpClient.client.uploadFrom).toHaveBeenCalledWith(localPath, remotePath);
    });

    it('should throw error if not connected during upload', async () => {
        ftpClient.isConnected = false;
        const localPath = 'path/to/local/file.txt';
        const remotePath = 'path/to/remote/file.txt';

        await expect(ftpClient.uploadFile(localPath, remotePath)).rejects.toThrow('FTP client is not connected.');
    });

    it('should download a file', async () => {
        ftpClient.isConnected = true;
        const remotePath = 'path/to/remote/file.txt';
        const localPath = 'path/to/local/file.txt';

        await ftpClient.downloadFile(remotePath, localPath);

        expect(ftpClient.client.downloadTo).toHaveBeenCalledWith(localPath, remotePath);
    });

    it('should throw error if not connected during download', async () => {
        ftpClient.isConnected = false;
        const remotePath = 'path/to/remote/file.txt';
        const localPath = 'path/to/local/file.txt';

        await expect(ftpClient.downloadFile(remotePath, localPath)).rejects.toThrow('FTP client is not connected.');
    });

    it('should list files in a directory', async () => {
        ftpClient.isConnected = true;
        const path = '/some/remote/path';

        await ftpClient.listFiles(path);

        expect(ftpClient.client.list).toHaveBeenCalledWith(path);
    });

    it('should throw error if not connected during list files', async () => {
        ftpClient.isConnected = false;
        const path = '/some/remote/path';

        await expect(ftpClient.listFiles(path)).rejects.toThrow('FTP client is not connected.');
    });

    it('should remove a file', async () => {
        ftpClient.isConnected = true;
        const path = '/some/remote/file.txt';

        await ftpClient.removeFile(path);

        expect(ftpClient.client.remove).toHaveBeenCalledWith(path);
    });

    it('should throw error if not connected during remove file', async () => {
        ftpClient.isConnected = false;
        const path = '/some/remote/file.txt';

        await expect(ftpClient.removeFile(path)).rejects.toThrow('FTP client is not connected.');
    });

    it('should ensure a directory exists', async () => {
        ftpClient.isConnected = true;
        const path = '/some/remote/directory';

        await ftpClient.ensureDir(path);

        expect(ftpClient.client.ensureDir).toHaveBeenCalledWith(path);
    });

    it('should throw error if not connected during ensure dir', async () => {
        ftpClient.isConnected = false;
        const path = '/some/remote/directory';

        await expect(ftpClient.ensureDir(path)).rejects.toThrow('FTP client is not connected.');
    });

    it('should clear a directory', async () => {
        ftpClient.isConnected = true;
        const path = '/some/remote/directory';

        await ftpClient.clearDir(path);

        expect(ftpClient.client.cd).toHaveBeenCalledWith(path);
        expect(ftpClient.client.clearWorkingDir).toHaveBeenCalled();
    });

    it('should throw error if not connected during clear dir', async () => {
        ftpClient.isConnected = false;
        const path = '/some/remote/directory';

        await expect(ftpClient.clearDir(path)).rejects.toThrow('FTP client is not connected.');
    });
});
