import FTP_Client from "./protocols/ftp/client";

(async () => {
    const config = {
        host: "localhost",                 // FTP server's host (localhost for local testing)
        port: 21,                          // FTP standard port
        user: "testuser",                   // The FTP username
        password: "password1234!",   // The updated complex password
        secure: false,                     // No TLS for local testing
        reconnectInterval: 5000,           // Reconnect interval in ms
        timeout: 10000,                    // Timeout in ms for FTP operations
        verbose: true,                     // Verbose logging for debugging
    };

    const ftpClient = new FTP_Client(config);

    try {
        // Start the FTP client
        await ftpClient.start();

        // // Test file upload
        // console.log("Uploading test file...");
        // await ftpClient.uploadFile("./test-upload.txt", "test-upload.txt");

        // // Test file download
        // console.log("Downloading test file...");
        // await ftpClient.downloadFile("test-upload.txt", "./test-download.txt");

        // // List files in root directory
        // console.log("Listing files...");
        // await ftpClient.listFiles("/");

        // // Remove the test file
        // console.log("Removing test file...");
        // await ftpClient.removeFile("test-upload.txt");

        console.log("All tests passed.");
    } catch (error) {
        console.error("Error during FTP Client test:", error);
    } finally {
        // Stop the FTP client
        await ftpClient.stop();
    }
})();
