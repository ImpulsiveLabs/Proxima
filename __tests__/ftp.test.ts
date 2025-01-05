import { Client } from 'basic-ftp';
import FTP_Client from '../src/protocols/ftp/client';
import { FTPClientConfig } from '../src/types';
import path from 'path';
import fs from 'fs';

describe('FTP_Client', () => {
    let ftpClient: FTP_Client;
    let mockConfig: FTPClientConfig;
    const localTestFile = path.join(__dirname, '../__tests_resources__/ftp/file.txt');
    const localTestDownload = path.join(__dirname, '/downloaded_file.txt');
    const remoteTestPath = '/home/testuser/file.txt';
    const remoteDirPath = '/home/testuser';

    beforeAll(() => {
        mockConfig = {
            host: "localhost",                 // FTP server's host (localhost for local testing)
            port: 21,                          // FTP standard port
            user: "testuser",                   // The FTP username
            password: "password1234!",   // The updated complex password
            secure: false,                     // No TLS for local testing
            reconnectInterval: 5000,           // Reconnect interval in ms
            timeout: 10000,                    // Timeout in ms for FTP operations
            verbose: true
        };
        ftpClient = new FTP_Client(mockConfig);
    });

    afterAll(async () => {
        if (ftpClient.isConnected) {
            await ftpClient.stop();
        }
        if (fs.existsSync(localTestDownload)) {
            fs.unlinkSync(localTestDownload); // Clean up downloaded file
        }
    });

    it('should initialize FTP client correctly', () => {
        expect(ftpClient).toBeDefined();
        expect(ftpClient.isConnected).toBe(false);
    });

    it('should connect to the FTP server', async () => {
        await ftpClient.start();
        expect(ftpClient.isConnected).toBe(true);
    });

    it('should stop the FTP client connection', async () => {
        ftpClient.isConnected = true;
        await ftpClient.stop();
        expect(ftpClient.isConnected).toBe(false);
    });

   it('should upload a file', async () => {
    await ftpClient.start();
    
    if (!fs.existsSync(localTestFile)) {
        throw new Error(`Local test file not found: ${localTestFile}`);
    }

    await ftpClient.ensureDir(remoteDirPath);

    await ftpClient.uploadFile(localTestFile, remoteTestPath);

    const fileList = await ftpClient.listFiles(remoteDirPath);
    const fileNames = fileList.map(file => file.name);
    expect(fileNames).toContain('file.txt');
});

    it('should download a file', async () => {
        await ftpClient.start();
        // Download the file from the FTP server
        await ftpClient.downloadFile(remoteTestPath, localTestDownload);

        // Verify file exists locally after download
        expect(fs.existsSync(localTestDownload)).toBe(true);
    });

    it('should list files in a directory', async () => {
        await ftpClient.start();

        // List files from the FTP server
        const files = await ftpClient.listFiles(remoteDirPath);

        // Check that the files array is not empty
        expect(files.length).toBeGreaterThan(0);
    });

    it('should remove a file', async () => {
        await ftpClient.start();
        // Remove the file from the FTP server
        await ftpClient.removeFile(remoteTestPath);

        // Verify the file was removed
        const fileList = await ftpClient.listFiles(remoteDirPath);
        const fileNames = fileList.map(file => file.name);
        expect(fileNames).not.toContain('file.txt');
    });

    it('should clear a directory', async () => {
        await ftpClient.start();
        // Clear the directory on the FTP server
        await ftpClient.clearDir(remoteDirPath);

        // Verify the directory was cleared
        const fileList = await ftpClient.listFiles(remoteDirPath);
        expect(fileList.length).toBe(0);
    });
});
