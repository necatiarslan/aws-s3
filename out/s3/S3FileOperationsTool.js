"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3FileOperationsTool = void 0;
const ui = require("../common/UI");
const BaseTool_1 = require("../common/BaseTool");
const ClientManager_1 = require("../common/ClientManager");
const AIHandler_1 = require("../chat/AIHandler");
const fs = require("fs");
const path = require("path");
const client_s3_1 = require("@aws-sdk/client-s3");
class S3FileOperationsTool extends BaseTool_1.BaseTool {
    constructor() {
        super(...arguments);
        this.toolName = 'S3FileOperationsTool';
    }
    async getS3Client() {
        return ClientManager_1.ClientManager.Instance.getClient('s3', async (session) => {
            const credentials = await session.GetCredentials();
            return new client_s3_1.S3Client({
                credentials,
                endpoint: session.AwsEndPoint,
                forcePathStyle: true,
                region: session.AwsRegion,
            });
        });
    }
    updateResourceContext(command, params) {
        if ("Bucket" in params && typeof params.Bucket === 'string') {
            AIHandler_1.AIHandler.Current.updateLatestResource({ type: "S3 Bucket", name: params.Bucket });
        }
    }
    async executeCommand(command, params) {
        const client = await this.getS3Client();
        switch (command) {
            case 'UploadFile':
                return await this.handleUploadFile(client, params);
            case 'DownloadFile':
                return await this.handleDownloadFile(client, params);
            case 'UploadFolder':
                return await this.handleUploadFolder(client, params);
            case 'DownloadFolder':
                return await this.handleDownloadFolder(client, params);
            default:
                throw new Error(`Unsupported command: ${command}`);
        }
    }
    async handleUploadFile(client, params) {
        const results = [];
        const errors = [];
        for (const localPath of params.LocalPaths) {
            try {
                // Check if file exists
                if (!fs.existsSync(localPath)) {
                    errors.push({
                        localPath,
                        error: 'File not found'
                    });
                    continue;
                }
                // Check if it's a file
                const stats = await fs.promises.stat(localPath);
                if (!stats.isFile()) {
                    errors.push({
                        localPath,
                        error: 'Path is not a file'
                    });
                    continue;
                }
                // Read file content
                const fileContent = await fs.promises.readFile(localPath);
                const fileName = path.basename(localPath);
                // Determine S3 key
                let s3Key = fileName;
                if (params.S3KeyPrefix) {
                    const prefix = params.S3KeyPrefix.endsWith('/') ? params.S3KeyPrefix : params.S3KeyPrefix + '/';
                    s3Key = prefix + fileName;
                }
                // Determine content type
                let contentType = params.ContentType;
                if (!contentType) {
                    contentType = this.getContentType(fileName);
                }
                // Upload to S3
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: params.Bucket,
                    Key: s3Key,
                    Body: fileContent,
                    ContentType: contentType
                });
                const result = await client.send(command);
                results.push({
                    localPath,
                    s3Key,
                    bucket: params.Bucket,
                    size: stats.size,
                    contentType,
                    etag: result.ETag,
                    success: true
                });
                ui.logToOutput(`S3FileOperationsTool: Uploaded ${localPath} to s3://${params.Bucket}/${s3Key}`);
            }
            catch (error) {
                ui.logToOutput(`S3FileOperationsTool: Failed to upload ${localPath}`, error);
                errors.push({
                    localPath,
                    error: error.message || 'Unknown error'
                });
            }
        }
        return {
            command: 'UploadFile',
            bucket: params.Bucket,
            totalFiles: params.LocalPaths.length,
            successCount: results.length,
            errorCount: errors.length,
            results,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    async handleDownloadFile(client, params) {
        const results = [];
        const errors = [];
        // Ensure local directory exists
        if (!fs.existsSync(params.LocalDirectory)) {
            await fs.promises.mkdir(params.LocalDirectory, { recursive: true });
        }
        for (const s3Key of params.S3Keys) {
            try {
                // Get object from S3
                const command = new client_s3_1.GetObjectCommand({
                    Bucket: params.Bucket,
                    Key: s3Key
                });
                const result = await client.send(command);
                // Convert body stream to buffer
                const bodyBuffer = await this.streamToBuffer(result.Body);
                // Determine local file path
                let localPath;
                if (params.PreserveStructure && s3Key.includes('/')) {
                    // Preserve folder structure
                    localPath = path.join(params.LocalDirectory, s3Key);
                    const localDir = path.dirname(localPath);
                    if (!fs.existsSync(localDir)) {
                        await fs.promises.mkdir(localDir, { recursive: true });
                    }
                }
                else {
                    // Just use filename
                    const fileName = path.basename(s3Key);
                    localPath = path.join(params.LocalDirectory, fileName);
                }
                // Write file
                await fs.promises.writeFile(localPath, bodyBuffer);
                results.push({
                    s3Key,
                    bucket: params.Bucket,
                    localPath,
                    size: bodyBuffer.length,
                    contentType: result.ContentType,
                    success: true
                });
                ui.logToOutput(`S3FileOperationsTool: Downloaded s3://${params.Bucket}/${s3Key} to ${localPath}`);
            }
            catch (error) {
                ui.logToOutput(`S3FileOperationsTool: Failed to download ${s3Key}`, error);
                errors.push({
                    s3Key,
                    error: error.message || 'Unknown error'
                });
            }
        }
        return {
            command: 'DownloadFile',
            bucket: params.Bucket,
            localDirectory: params.LocalDirectory,
            totalFiles: params.S3Keys.length,
            successCount: results.length,
            errorCount: errors.length,
            results,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    async handleUploadFolder(client, params) {
        const results = [];
        const errors = [];
        const preserveStructure = params.PreserveStructure !== false; // Default to true
        for (const localFolderPath of params.LocalPaths) {
            try {
                // Check if folder exists
                if (!fs.existsSync(localFolderPath)) {
                    errors.push({
                        localPath: localFolderPath,
                        error: 'Folder not found'
                    });
                    continue;
                }
                // Check if it's a directory
                const stats = await fs.promises.stat(localFolderPath);
                if (!stats.isDirectory()) {
                    errors.push({
                        localPath: localFolderPath,
                        error: 'Path is not a directory'
                    });
                    continue;
                }
                // Get all files in folder recursively
                const files = await this.getAllFilesRecursively(localFolderPath);
                ui.logToOutput(`S3FileOperationsTool: Found ${files.length} files in ${localFolderPath}`);
                // Upload each file
                for (const filePath of files) {
                    try {
                        const fileContent = await fs.promises.readFile(filePath);
                        const fileStats = await fs.promises.stat(filePath);
                        // Determine S3 key
                        let s3Key;
                        if (preserveStructure) {
                            // Preserve relative path from folder
                            const relativePath = path.relative(localFolderPath, filePath);
                            const folderBaseName = path.basename(localFolderPath);
                            s3Key = path.join(folderBaseName, relativePath).replace(/\\/g, '/');
                        }
                        else {
                            // Just use filename
                            s3Key = path.basename(filePath);
                        }
                        // Add prefix if specified
                        if (params.S3KeyPrefix) {
                            const prefix = params.S3KeyPrefix.endsWith('/') ? params.S3KeyPrefix : params.S3KeyPrefix + '/';
                            s3Key = prefix + s3Key;
                        }
                        // Determine content type
                        const contentType = this.getContentType(filePath);
                        // Upload to S3
                        const command = new client_s3_1.PutObjectCommand({
                            Bucket: params.Bucket,
                            Key: s3Key,
                            Body: fileContent,
                            ContentType: contentType
                        });
                        const result = await client.send(command);
                        results.push({
                            localPath: filePath,
                            s3Key,
                            bucket: params.Bucket,
                            size: fileStats.size,
                            contentType,
                            etag: result.ETag,
                            success: true
                        });
                        ui.logToOutput(`S3FileOperationsTool: Uploaded ${filePath} to s3://${params.Bucket}/${s3Key}`);
                    }
                    catch (error) {
                        ui.logToOutput(`S3FileOperationsTool: Failed to upload ${filePath}`, error);
                        errors.push({
                            localPath: filePath,
                            error: error.message || 'Unknown error'
                        });
                    }
                }
            }
            catch (error) {
                ui.logToOutput(`S3FileOperationsTool: Failed to process folder ${localFolderPath}`, error);
                errors.push({
                    localPath: localFolderPath,
                    error: error.message || 'Unknown error'
                });
            }
        }
        return {
            command: 'UploadFolder',
            bucket: params.Bucket,
            totalFolders: params.LocalPaths.length,
            totalFiles: results.length + errors.length,
            successCount: results.length,
            errorCount: errors.length,
            results,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    async handleDownloadFolder(client, params) {
        const results = [];
        const errors = [];
        const preserveStructure = params.PreserveStructure !== false; // Default to true
        // Ensure local directory exists
        if (!fs.existsSync(params.LocalDirectory)) {
            await fs.promises.mkdir(params.LocalDirectory, { recursive: true });
        }
        for (const s3Prefix of params.S3KeyPrefixes) {
            try {
                // List all objects under the prefix
                const objects = await this.listAllObjects(client, params.Bucket, s3Prefix);
                ui.logToOutput(`S3FileOperationsTool: Found ${objects.length} objects under s3://${params.Bucket}/${s3Prefix}`);
                // Download each object
                for (const obj of objects) {
                    if (!obj.Key) {
                        continue;
                    }
                    try {
                        // Skip folders (keys ending with /)
                        if (obj.Key.endsWith('/')) {
                            continue;
                        }
                        // Get object from S3
                        const command = new client_s3_1.GetObjectCommand({
                            Bucket: params.Bucket,
                            Key: obj.Key
                        });
                        const result = await client.send(command);
                        // Convert body stream to buffer
                        const bodyBuffer = await this.streamToBuffer(result.Body);
                        // Determine local file path
                        let localPath;
                        if (preserveStructure) {
                            // Preserve folder structure
                            localPath = path.join(params.LocalDirectory, obj.Key);
                            const localDir = path.dirname(localPath);
                            if (!fs.existsSync(localDir)) {
                                await fs.promises.mkdir(localDir, { recursive: true });
                            }
                        }
                        else {
                            // Just use filename
                            const fileName = path.basename(obj.Key);
                            localPath = path.join(params.LocalDirectory, fileName);
                        }
                        // Write file
                        await fs.promises.writeFile(localPath, bodyBuffer);
                        results.push({
                            s3Key: obj.Key,
                            bucket: params.Bucket,
                            localPath,
                            size: bodyBuffer.length,
                            contentType: result.ContentType,
                            success: true
                        });
                        ui.logToOutput(`S3FileOperationsTool: Downloaded s3://${params.Bucket}/${obj.Key} to ${localPath}`);
                    }
                    catch (error) {
                        ui.logToOutput(`S3FileOperationsTool: Failed to download ${obj.Key}`, error);
                        errors.push({
                            s3Key: obj.Key,
                            error: error.message || 'Unknown error'
                        });
                    }
                }
            }
            catch (error) {
                ui.logToOutput(`S3FileOperationsTool: Failed to list objects under ${s3Prefix}`, error);
                errors.push({
                    s3Prefix,
                    error: error.message || 'Unknown error'
                });
            }
        }
        return {
            command: 'DownloadFolder',
            bucket: params.Bucket,
            localDirectory: params.LocalDirectory,
            totalPrefixes: params.S3KeyPrefixes.length,
            totalFiles: results.length + errors.length,
            successCount: results.length,
            errorCount: errors.length,
            results,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    // Helper methods
    async getAllFilesRecursively(dirPath) {
        const files = [];
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                const subFiles = await this.getAllFilesRecursively(fullPath);
                files.push(...subFiles);
            }
            else if (entry.isFile()) {
                files.push(fullPath);
            }
        }
        return files;
    }
    async listAllObjects(client, bucket, prefix) {
        const objects = [];
        let continuationToken;
        do {
            const command = new client_s3_1.ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken
            });
            const result = await client.send(command);
            if (result.Contents) {
                objects.push(...result.Contents);
            }
            continuationToken = result.NextContinuationToken;
        } while (continuationToken);
        return objects;
    }
    async streamToBuffer(stream) {
        if (!stream) {
            return Buffer.alloc(0);
        }
        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', (err) => {
                ui.logToOutput('S3FileOperationsTool: Stream error while reading object', err);
                reject(err);
            });
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }
    getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.html': 'text/html',
            '.htm': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.zip': 'application/zip',
            '.tar': 'application/x-tar',
            '.gz': 'application/gzip',
            '.mp3': 'audio/mpeg',
            '.mp4': 'video/mp4',
            '.wav': 'audio/wav',
            '.avi': 'video/x-msvideo',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        return contentTypes[ext] || 'application/octet-stream';
    }
}
exports.S3FileOperationsTool = S3FileOperationsTool;
//# sourceMappingURL=S3FileOperationsTool.js.map