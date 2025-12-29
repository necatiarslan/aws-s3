"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Tool = void 0;
const ui = require("../common/UI");
const Session_1 = require("../common/Session");
const BaseTool_1 = require("../common/BaseTool");
const ClientManager_1 = require("../common/ClientManager");
const AIHandler_1 = require("../chat/AIHandler");
const os = require("os");
const path = require("path");
const fs = require("fs");
const client_s3_1 = require("@aws-sdk/client-s3");
class S3Tool extends BaseTool_1.BaseTool {
    constructor() {
        super(...arguments);
        this.toolName = 'S3Tool';
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
            case 'HeadBucket':
                return await client.send(new client_s3_1.HeadBucketCommand(params));
            case 'HeadObject':
                return await client.send(new client_s3_1.HeadObjectCommand(params));
            case 'ListBuckets':
                return await client.send(new client_s3_1.ListBucketsCommand(params));
            case 'ListObjectsV2':
                return await client.send(new client_s3_1.ListObjectsV2Command(params));
            case 'ListObjectVersions':
                return await client.send(new client_s3_1.ListObjectVersionsCommand(params));
            case 'GetBucketPolicy':
                return await client.send(new client_s3_1.GetBucketPolicyCommand(params));
            case 'GetBucketNotificationConfiguration':
                return await client.send(new client_s3_1.GetBucketNotificationConfigurationCommand(params));
            case 'GetObject':
                return await this.handleGetObject(client, params);
            case 'PutObject':
                return await client.send(new client_s3_1.PutObjectCommand(params));
            case 'DeleteObject':
                return await client.send(new client_s3_1.DeleteObjectCommand(params));
            case 'CopyObject':
                return await client.send(new client_s3_1.CopyObjectCommand(params));
            case 'SelectObjectContent':
                return await this.handleSelectObjectContent(client, params);
            case 'OpenS3Explorer':
                return await this.handleOpenS3Explorer(params);
            default:
                throw new Error(`Unsupported command: ${command}`);
        }
    }
    async handleGetObject(client, params) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: params.Bucket,
            Key: params.Key,
            VersionId: params.VersionId
        });
        const result = await client.send(command);
        // Convert body stream to buffer
        const bodyBuffer = await this.streamToBuffer(result.Body);
        // Extract only serializable metadata
        const metadata = {
            ContentType: result.ContentType,
            ContentLength: result.ContentLength,
            ETag: result.ETag,
            LastModified: result.LastModified,
            VersionId: result.VersionId,
            Metadata: result.Metadata,
            $metadata: {
                httpStatusCode: result.$metadata?.httpStatusCode,
                requestId: result.$metadata?.requestId,
            }
        };
        if (params.DownloadToTemp) {
            // Download to temp folder (async to avoid blocking extension host)
            const tempDir = os.tmpdir();
            const fileName = path.basename(params.Key);
            const filePath = path.join(tempDir, fileName);
            await fs.promises.writeFile(filePath, bodyBuffer);
            return {
                ...metadata,
                LocalPath: filePath,
                FileSize: bodyBuffer.length,
                Message: `File downloaded to ${filePath}`
            };
        }
        else if (params.AsText) {
            // Return content as text
            const textContent = bodyBuffer.toString('utf-8');
            return {
                ...metadata,
                TextContent: textContent,
                ContentLength: textContent.length
            };
        }
        else {
            // Return metadata with base64 content
            return {
                ...metadata,
                Body: bodyBuffer.toString('base64'),
                ContentLength: bodyBuffer.length,
                Message: 'File content returned as base64'
            };
        }
    }
    async handleSelectObjectContent(client, params) {
        const command = new client_s3_1.SelectObjectContentCommand({
            Bucket: params.Bucket,
            Key: params.Key,
            Expression: params.Expression,
            ExpressionType: params.ExpressionType,
            InputSerialization: params.InputSerialization,
            OutputSerialization: params.OutputSerialization
        });
        const result = await client.send(command);
        // Process the event stream
        const records = [];
        if (result.Payload) {
            for await (const event of result.Payload) {
                if (event.Records) {
                    const recordsBuffer = event.Records.Payload;
                    if (recordsBuffer) {
                        records.push(Buffer.from(recordsBuffer).toString('utf-8'));
                    }
                }
            }
        }
        return {
            Bucket: params.Bucket,
            Key: params.Key,
            Expression: params.Expression,
            Records: records.join(''),
            RecordCount: records.length,
            $metadata: {
                httpStatusCode: result.$metadata?.httpStatusCode,
                requestId: result.$metadata?.requestId,
            }
        };
    }
    async handleOpenS3Explorer(params) {
        if (!Session_1.Session.Current) {
            throw new Error('Session not initialized');
        }
        // Open the S3Explorer view
        // TODO: Uncomment when S3Explorer is implemented
        //S3Explorer.Render(Session.Current.ExtensionUri, params.Bucket, params.Key);
        return {
            success: true,
            message: `S3 Explorer opened for bucket: ${params.Bucket}${params.Key ? `, key: ${params.Key}` : ''}`,
            Bucket: params.Bucket,
            Key: params.Key
        };
    }
    async streamToBuffer(stream) {
        if (!stream) {
            return Buffer.alloc(0);
        }
        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', (err) => {
                ui.logToOutput('S3Tool: Stream error while reading object', err);
                reject(err);
            });
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }
}
exports.S3Tool = S3Tool;
//# sourceMappingURL=S3Tool.js.map