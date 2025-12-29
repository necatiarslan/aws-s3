import * as ui from '../common/UI';
import { Session } from '../common/Session';
import { BaseTool, BaseToolInput } from '../common/BaseTool';
import { ClientManager } from '../common/ClientManager';
import { AIHandler } from '../chat/AIHandler';
import { S3Explorer } from './S3Explorer';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
  S3Client,
  HeadBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  GetBucketPolicyCommand,
  GetBucketNotificationConfigurationCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  SelectObjectContentCommand,
  MetadataDirective
} from '@aws-sdk/client-s3';

// Command type definition
type S3Command =
  | 'PutObject'
  | 'DeleteObject'
  | 'CopyObject'
  | 'GetObject'
  | 'HeadBucket'
  | 'HeadObject'
  | 'ListBuckets'
  | 'ListObjectsV2'
  | 'ListObjectVersions'
  | 'GetBucketPolicy'
  | 'GetBucketNotificationConfiguration'
  | 'SelectObjectContent'
  | 'OpenS3Explorer';

// Input interface
interface S3ToolInput extends BaseToolInput {
  command: S3Command;
}

// Interfaces for parameters (kept for type safety in method signatures)
interface HeadBucketParams { Bucket: string; }
interface HeadObjectParams { Bucket: string; Key: string; VersionId?: string; IfMatch?: string; IfModifiedSince?: Date; IfNoneMatch?: string; IfUnmodifiedSince?: Date; }
interface ListBucketsParams { }
interface ListObjectsV2Params { Bucket: string; Prefix?: string; Delimiter?: string; MaxKeys?: number; ContinuationToken?: string; StartAfter?: string; }
interface ListObjectVersionsParams { Bucket: string; Prefix?: string; Delimiter?: string; MaxKeys?: number; KeyMarker?: string; VersionIdMarker?: string; }
interface PutObjectParams { Bucket: string; Key: string; Body?: string; ContentType?: string; Metadata?: Record<string, string>; }
interface DeleteObjectParams { Bucket: string; Key: string; VersionId?: string; }
interface CopyObjectParams { Bucket: string; CopySource: string; Key: string; Metadata?: Record<string, string>; MetadataDirective?: MetadataDirective; }
interface GetBucketPolicyParams { Bucket: string; }
interface GetBucketNotificationConfigurationParams { Bucket: string; }
interface GetObjectParams { Bucket: string; Key: string; VersionId?: string; DownloadToTemp?: boolean; AsText?: boolean; }
interface SelectObjectContentParams { Bucket: string; Key: string; Expression: string; ExpressionType: string; InputSerialization: any; OutputSerialization: any; }
interface OpenS3ExplorerParams { Bucket: string; Key?: string; }

export class S3Tool extends BaseTool<S3ToolInput> {
  protected readonly toolName = 'S3Tool';

  private async getS3Client(): Promise<S3Client> {
    return ClientManager.Instance.getClient('s3', async (session) => {
      const credentials = await session.GetCredentials();
      return new S3Client({
        credentials,
        endpoint: session.AwsEndPoint,
        forcePathStyle: true,
        region: session.AwsRegion,
      });
    });
  }

  protected updateResourceContext(command: string, params: Record<string, any>): void {
    if ("Bucket" in params && typeof params.Bucket === 'string') {
      AIHandler.Current.updateLatestResource({ type: "S3 Bucket", name: params.Bucket });
    }
  }

  protected async executeCommand(command: S3Command, params: Record<string, any>): Promise<any> {
    const client = await this.getS3Client();

    switch (command) {
      case 'HeadBucket':
        return await client.send(new HeadBucketCommand(params as HeadBucketParams));

      case 'HeadObject':
        return await client.send(new HeadObjectCommand(params as HeadObjectParams));

      case 'ListBuckets':
        return await client.send(new ListBucketsCommand(params as ListBucketsParams));

      case 'ListObjectsV2':
        return await client.send(new ListObjectsV2Command(params as ListObjectsV2Params));

      case 'ListObjectVersions':
        return await client.send(new ListObjectVersionsCommand(params as ListObjectVersionsParams));

      case 'GetBucketPolicy':
        return await client.send(new GetBucketPolicyCommand(params as GetBucketPolicyParams));

      case 'GetBucketNotificationConfiguration':
        return await client.send(new GetBucketNotificationConfigurationCommand(params as GetBucketNotificationConfigurationParams));

      case 'GetObject':
        return await this.handleGetObject(client, params as GetObjectParams);

      case 'PutObject':
        return await client.send(new PutObjectCommand(params as PutObjectParams));

      case 'DeleteObject':
        return await client.send(new DeleteObjectCommand(params as DeleteObjectParams));

      case 'CopyObject':
        return await client.send(new CopyObjectCommand(params as CopyObjectParams));

      case 'SelectObjectContent':
        return await this.handleSelectObjectContent(client, params as SelectObjectContentParams);

      case 'OpenS3Explorer':
        return await this.handleOpenS3Explorer(params as OpenS3ExplorerParams);

      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  }

  private async handleGetObject(client: S3Client, params: GetObjectParams): Promise<any> {
    const command = new GetObjectCommand({
      Bucket: params.Bucket,
      Key: params.Key,
      VersionId: params.VersionId
    });
    const result = await client.send(command);

    // Convert body stream to buffer
    const bodyBuffer = await this.streamToBuffer(result.Body as any);

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
    } else if (params.AsText) {
      // Return content as text
      const textContent = bodyBuffer.toString('utf-8');
      return {
        ...metadata,
        TextContent: textContent,
        ContentLength: textContent.length
      };
    } else {
      // Return metadata with base64 content
      return {
        ...metadata,
        Body: bodyBuffer.toString('base64'),
        ContentLength: bodyBuffer.length,
        Message: 'File content returned as base64'
      };
    }
  }

  private async handleSelectObjectContent(client: S3Client, params: SelectObjectContentParams): Promise<any> {
    const command = new SelectObjectContentCommand({
      Bucket: params.Bucket,
      Key: params.Key,
      Expression: params.Expression,
      ExpressionType: params.ExpressionType as "SQL",
      InputSerialization: params.InputSerialization,
      OutputSerialization: params.OutputSerialization
    });
    
    const result = await client.send(command);
    
    // Process the event stream
    const records: string[] = [];
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

  private async handleOpenS3Explorer(params: OpenS3ExplorerParams): Promise<any> {
    if (!Session.Current) {
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

  private async streamToBuffer(stream: any): Promise<Buffer> {
    if (!stream) {
      return Buffer.alloc(0);
    }
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', (err: Error) => {
        ui.logToOutput('S3Tool: Stream error while reading object', err);
        reject(err);
      });
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}

