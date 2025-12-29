import * as vscode from 'vscode';
import * as ui from '../common/UI';
import { BaseTool, BaseToolInput } from '../common/BaseTool';
import { ClientManager } from '../common/ClientManager';
import { AIHandler } from '../chat/AIHandler';
import * as fs from 'fs';
import * as path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

// Command type definition
type S3FileOperationsCommand =
  | 'UploadFile'
  | 'DownloadFile'
  | 'UploadFolder'
  | 'DownloadFolder';

// Input interface
interface S3FileOperationsToolInput extends BaseToolInput {
  command: S3FileOperationsCommand;
}

// Interfaces for parameters
interface UploadFileParams {
  Bucket: string;
  LocalPaths: string[]; // Array of local file paths
  S3KeyPrefix?: string; // Optional prefix/folder in S3
  ContentType?: string; // Optional content type
}

interface DownloadFileParams {
  Bucket: string;
  S3Keys: string[]; // Array of S3 object keys
  LocalDirectory: string; // Local directory to download to
  PreserveStructure?: boolean; // Whether to preserve S3 folder structure
}

interface UploadFolderParams {
  Bucket: string;
  LocalPaths: string[]; // Array of local folder paths
  S3KeyPrefix?: string; // Optional prefix/folder in S3
  PreserveStructure?: boolean; // Whether to preserve folder structure (default: true)
}

interface DownloadFolderParams {
  Bucket: string;
  S3KeyPrefixes: string[]; // Array of S3 prefixes (folders)
  LocalDirectory: string; // Local directory to download to
  PreserveStructure?: boolean; // Whether to preserve S3 folder structure (default: true)
}

export class S3FileOperationsTool extends BaseTool<S3FileOperationsToolInput> {
  protected readonly toolName = 'S3FileOperationsTool';

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

  protected async executeCommand(command: S3FileOperationsCommand, params: Record<string, any>): Promise<any> {
    const client = await this.getS3Client();

    switch (command) {
      case 'UploadFile':
        return await this.handleUploadFile(client, params as UploadFileParams);

      case 'DownloadFile':
        return await this.handleDownloadFile(client, params as DownloadFileParams);

      case 'UploadFolder':
        return await this.handleUploadFolder(client, params as UploadFolderParams);

      case 'DownloadFolder':
        return await this.handleDownloadFolder(client, params as DownloadFolderParams);

      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  }

  private async handleUploadFile(client: S3Client, params: UploadFileParams): Promise<any> {
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
        const command = new PutObjectCommand({
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
      } catch (error: any) {
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

  private async handleDownloadFile(client: S3Client, params: DownloadFileParams): Promise<any> {
    const results = [];
    const errors = [];

    // Ensure local directory exists
    if (!fs.existsSync(params.LocalDirectory)) {
      await fs.promises.mkdir(params.LocalDirectory, { recursive: true });
    }

    for (const s3Key of params.S3Keys) {
      try {
        // Get object from S3
        const command = new GetObjectCommand({
          Bucket: params.Bucket,
          Key: s3Key
        });

        const result = await client.send(command);
        
        // Convert body stream to buffer
        const bodyBuffer = await this.streamToBuffer(result.Body as any);

        // Determine local file path
        let localPath: string;
        if (params.PreserveStructure && s3Key.includes('/')) {
          // Preserve folder structure
          localPath = path.join(params.LocalDirectory, s3Key);
          const localDir = path.dirname(localPath);
          if (!fs.existsSync(localDir)) {
            await fs.promises.mkdir(localDir, { recursive: true });
          }
        } else {
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
      } catch (error: any) {
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

  private async handleUploadFolder(client: S3Client, params: UploadFolderParams): Promise<any> {
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
            let s3Key: string;
            if (preserveStructure) {
              // Preserve relative path from folder
              const relativePath = path.relative(localFolderPath, filePath);
              const folderBaseName = path.basename(localFolderPath);
              s3Key = path.join(folderBaseName, relativePath).replace(/\\/g, '/');
            } else {
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
            const command = new PutObjectCommand({
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
          } catch (error: any) {
            ui.logToOutput(`S3FileOperationsTool: Failed to upload ${filePath}`, error);
            errors.push({
              localPath: filePath,
              error: error.message || 'Unknown error'
            });
          }
        }
      } catch (error: any) {
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

  private async handleDownloadFolder(client: S3Client, params: DownloadFolderParams): Promise<any> {
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
          if (!obj.Key) {continue;}
          
          try {
            // Skip folders (keys ending with /)
            if (obj.Key.endsWith('/')) {
              continue;
            }

            // Get object from S3
            const command = new GetObjectCommand({
              Bucket: params.Bucket,
              Key: obj.Key
            });

            const result = await client.send(command);
            
            // Convert body stream to buffer
            const bodyBuffer = await this.streamToBuffer(result.Body as any);

            // Determine local file path
            let localPath: string;
            if (preserveStructure) {
              // Preserve folder structure
              localPath = path.join(params.LocalDirectory, obj.Key);
              const localDir = path.dirname(localPath);
              if (!fs.existsSync(localDir)) {
                await fs.promises.mkdir(localDir, { recursive: true });
              }
            } else {
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
          } catch (error: any) {
            ui.logToOutput(`S3FileOperationsTool: Failed to download ${obj.Key}`, error);
            errors.push({
              s3Key: obj.Key,
              error: error.message || 'Unknown error'
            });
          }
        }
      } catch (error: any) {
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

  private async getAllFilesRecursively(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.getAllFilesRecursively(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async listAllObjects(client: S3Client, bucket: string, prefix: string): Promise<any[]> {
    const objects: any[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
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

  private async streamToBuffer(stream: any): Promise<Buffer> {
    if (!stream) {
      return Buffer.alloc(0);
    }
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', (err: Error) => {
        ui.logToOutput('S3FileOperationsTool: Stream error while reading object', err);
        reject(err);
      });
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
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
