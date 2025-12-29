import * as vscode from 'vscode';
import * as ui from './UI';
import * as fs from 'fs';
import { readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import * as archive from 'archiver';
import * as os from 'os';
import { AIHandler } from '../chat/AIHandler';
import { BaseTool, BaseToolInput } from './BaseTool';

// Type for file encoding
type FileEncoding = 'utf8' | 'ascii' | 'base64' | 'hex' | 'utf16le' | 'ucs2';

// Command type definition
type FileCommand = 'ReadFile' | 'ReadFileStream' | 'ReadFileAsBase64' | 'GetFileInfo' | 'ListFiles' | 'ZipTextFile';

// Input interface
interface FileOperationsToolInput extends BaseToolInput {
  command: FileCommand;
}

// Command parameter interfaces
interface ReadFileParams {
  filePath: string;
  encoding?: FileEncoding; // utf8, ascii, base64, etc.
}

interface ReadFileStreamParams {
  filePath: string;
}

interface ReadFileAsBase64Params {
  filePath: string;
}

interface GetFileInfoParams {
  filePath: string;
}

interface ListFilesParams {
  dirPath: string;
  recursive?: boolean;
}

interface ZipTextFileParams {
  filePath: string;
  outputPath?: string; // Optional custom output path
}

export class FileOperationsTool extends BaseTool<FileOperationsToolInput> {
  protected readonly toolName = 'FileOperationsTool';

  /**
   * Resolve file path - check workspace first if available
   */
  private resolveFilePath(filePath: string): string {
    // If path is absolute, use it as is
    if (require('path').isAbsolute(filePath)) {
      return filePath;
    }

    // Check if workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const workspacePath = join(workspaceRoot, filePath);
      
      // Check if file exists in workspace
      if (fs.existsSync(workspacePath)) {
        ui.logToOutput(`FileOperationsTool: Resolved to workspace path: ${workspacePath}`);
        return workspacePath;
      }
      
      ui.logToOutput(`FileOperationsTool: File not found in workspace, treating as absolute: ${filePath}`);
    }

    // No workspace or file not found in workspace - treat as absolute
    return filePath;
  }

  /**
   * Resolve directory path - check workspace first if available
   */
  private resolveDirPath(dirPath: string): string {
    // If path is absolute, use it as is
    if (require('path').isAbsolute(dirPath)) {
      return dirPath;
    }

    // Check if workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const workspacePath = join(workspaceRoot, dirPath);
      
      // Check if directory exists in workspace
      if (fs.existsSync(workspacePath) && fs.statSync(workspacePath).isDirectory()) {
        ui.logToOutput(`FileOperationsTool: Resolved to workspace directory: ${workspacePath}`);
        return workspacePath;
      }
      
      ui.logToOutput(`FileOperationsTool: Directory not found in workspace, treating as absolute: ${dirPath}`);
    }

    // No workspace or directory not found in workspace - treat as absolute
    return dirPath;
  }

  /**
   * Read file as text
   */
  private async executeReadFile(params: ReadFileParams): Promise<any> {
    const { encoding = 'utf8' as FileEncoding } = params;
    const filePath = this.resolveFilePath(params.filePath);
    
    try {
      ui.logToOutput(`FileOperationsTool: Reading file: ${filePath}`);
      
      const content = readFileSync(filePath, encoding as any);
      
      return {
        filePath,
        encoding,
        size: Buffer.byteLength(content, encoding as any),
        content,
      };
    } catch (error: any) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Read file as stream and return chunks
   */
  private async executeReadFileStream(params: ReadFileStreamParams): Promise<any> {
    const filePath = this.resolveFilePath(params.filePath);
    
    try {
      ui.logToOutput(`FileOperationsTool: Reading file stream: ${filePath}`);

      const stats = fs.statSync(filePath);
      
      return {
        filePath,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
        message: `File stream ready. Use ReadFile command to read content. File size: ${stats.size} bytes`,
      };
    } catch (error: any) {
      throw new Error(`Failed to read file stream ${filePath}: ${error.message}`);
    }
  }

  /**
   * Read file as Base64
   */
  private async executeReadFileAsBase64(params: ReadFileAsBase64Params): Promise<any> {
    const filePath = this.resolveFilePath(params.filePath);
    
    try {
      ui.logToOutput(`FileOperationsTool: Reading file as Base64: ${filePath}`);
      
      const content = readFileSync(filePath);
      const base64Content = content.toString('base64');
      
      return {
        filePath,
        encoding: 'base64',
        size: content.length,
        base64Content,
      };
    } catch (error: any) {
      throw new Error(`Failed to read file as Base64 ${filePath}: ${error.message}`);
    }
  }

  /**
   * Get file information (stats)
   */
  private async executeGetFileInfo(params: GetFileInfoParams): Promise<any> {
    const filePath = this.resolveFilePath(params.filePath);
    
    try {
      ui.logToOutput(`FileOperationsTool: Getting file info: ${filePath}`);
      
      const stats = fs.statSync(filePath);
      
      return {
        filePath,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        permissions: stats.mode,
      };
    } catch (error: any) {
      throw new Error(`Failed to get file info for ${filePath}: ${error.message}`);
    }
  }

  /**
   * List files in directory
   */
  private async executeListFiles(params: ListFilesParams): Promise<any> {
    const { recursive = false } = params;
    const dirPath = this.resolveDirPath(params.dirPath);
    
    try {
      ui.logToOutput(`FileOperationsTool: Listing files in: ${dirPath}`);
      
      const files: any[] = [];
      
      const walkDir = (dir: string, depth: number = 0): void => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          
          files.push({
            name: entry.name,
            path: fullPath,
            isFile: entry.isFile(),
            isDirectory: entry.isDirectory(),
          });
          
          if (recursive && entry.isDirectory()) {
            walkDir(fullPath, depth + 1);
          }
        }
      };
      
      walkDir(dirPath);
      
      return {
        dirPath,
        recursive,
        count: files.length,
        files,
      };
    } catch (error: any) {
      throw new Error(`Failed to list files in ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Zip a text file or directory
   */
  private async executeZipTextFile(params: ZipTextFileParams): Promise<any> {
    const { outputPath } = params;
    const filePath = this.resolveFilePath(params.filePath);
    
    try {
      ui.logToOutput(`FileOperationsTool: Zipping file: ${filePath}`);
      
      // Check if source exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Source path does not exist: ${filePath}`);
      }
      
      const stats = fs.statSync(filePath);
      
      // Determine output path
      let zipPath: string;
      if (outputPath) {
        zipPath = outputPath;
      } else {
        // Create zip file in temp directory
        const fileName = basename(filePath, '.txt') || 'archive';
        zipPath = join(os.tmpdir(), `${fileName}_${Date.now()}.zip`);
      }
      
      // Ensure output directory exists
      const outputDir = dirname(zipPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Create zip file
      return await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const zipArchive = archive('zip', {
          zlib: { level: 9 } // Maximum compression
        });
        
        output.on('close', () => {
          ui.logToOutput(`FileOperationsTool: Zip file created: ${zipPath} (${zipArchive.pointer()} bytes)`);
          resolve({
            success: true,
            result: zipPath,
            sourcePath: filePath,
            zipPath: zipPath,
            size: zipArchive.pointer(),
            message: `Successfully created zip file at ${zipPath}`
          });
        });
        
        zipArchive.on('error', (err: Error) => {
          reject(new Error(`Failed to create zip: ${err.message}`));
        });
        
        zipArchive.pipe(output);
        
        // Add file or directory to archive
        if (stats.isDirectory()) {
          zipArchive.directory(filePath, false);
        } else {
          zipArchive.file(filePath, { name: basename(filePath) });
        }
        
        zipArchive.finalize();
      });
    } catch (error: any) {
      throw new Error(`Failed to zip file ${filePath}: ${error.message}`);
    }
  }

  protected updateResourceContext(command: string, params: Record<string, any>): void {
     if("filePath" in params){
      AIHandler.Current.updateLatestResource({ type: "File", name: params.filePath });
    }
    if("dirPath" in params){
      AIHandler.Current.updateLatestResource({ type: "Directory", name: params.dirPath });
    }
  }

  /**
   * Main command dispatcher
   */
  protected async executeCommand(command: FileCommand, params: Record<string, any>): Promise<any> {
    switch (command) {
      case 'ReadFile':
        return await this.executeReadFile(params as ReadFileParams);
      
      case 'ReadFileStream':
        return await this.executeReadFileStream(params as ReadFileStreamParams);
      
      case 'ReadFileAsBase64':
        return await this.executeReadFileAsBase64(params as ReadFileAsBase64Params);
      
      case 'GetFileInfo':
        return await this.executeGetFileInfo(params as GetFileInfoParams);
      
      case 'ListFiles':
        return await this.executeListFiles(params as ListFilesParams);
      
      case 'ZipTextFile':
        return await this.executeZipTextFile(params as ZipTextFileParams);
      
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  }
}
