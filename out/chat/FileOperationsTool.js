"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileOperationsTool = void 0;
const vscode = require("vscode");
const ui = require("./UI");
const fs = require("fs");
const fs_1 = require("fs");
const path_1 = require("path");
const archiver_1 = require("archiver");
const os = require("os");
const AIHandler_1 = require("../chat/AIHandler");
const BaseTool_1 = require("./BaseTool");
class FileOperationsTool extends BaseTool_1.BaseTool {
    constructor() {
        super(...arguments);
        this.toolName = 'FileOperationsTool';
    }
    /**
     * Resolve file path - check workspace first if available
     */
    resolveFilePath(filePath) {
        // If path is absolute, use it as is
        if (require('path').isAbsolute(filePath)) {
            return filePath;
        }
        // Check if workspace is open
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const workspacePath = (0, path_1.join)(workspaceRoot, filePath);
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
    resolveDirPath(dirPath) {
        // If path is absolute, use it as is
        if (require('path').isAbsolute(dirPath)) {
            return dirPath;
        }
        // Check if workspace is open
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const workspacePath = (0, path_1.join)(workspaceRoot, dirPath);
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
    async executeReadFile(params) {
        const { encoding = 'utf8' } = params;
        const filePath = this.resolveFilePath(params.filePath);
        try {
            ui.logToOutput(`FileOperationsTool: Reading file: ${filePath}`);
            const content = (0, fs_1.readFileSync)(filePath, encoding);
            return {
                filePath,
                encoding,
                size: Buffer.byteLength(content, encoding),
                content,
            };
        }
        catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }
    /**
     * Read file as stream and return chunks
     */
    async executeReadFileStream(params) {
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
        }
        catch (error) {
            throw new Error(`Failed to read file stream ${filePath}: ${error.message}`);
        }
    }
    /**
     * Read file as Base64
     */
    async executeReadFileAsBase64(params) {
        const filePath = this.resolveFilePath(params.filePath);
        try {
            ui.logToOutput(`FileOperationsTool: Reading file as Base64: ${filePath}`);
            const content = (0, fs_1.readFileSync)(filePath);
            const base64Content = content.toString('base64');
            return {
                filePath,
                encoding: 'base64',
                size: content.length,
                base64Content,
            };
        }
        catch (error) {
            throw new Error(`Failed to read file as Base64 ${filePath}: ${error.message}`);
        }
    }
    /**
     * Get file information (stats)
     */
    async executeGetFileInfo(params) {
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
        }
        catch (error) {
            throw new Error(`Failed to get file info for ${filePath}: ${error.message}`);
        }
    }
    /**
     * List files in directory
     */
    async executeListFiles(params) {
        const { recursive = false } = params;
        const dirPath = this.resolveDirPath(params.dirPath);
        try {
            ui.logToOutput(`FileOperationsTool: Listing files in: ${dirPath}`);
            const files = [];
            const walkDir = (dir, depth = 0) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = (0, path_1.join)(dir, entry.name);
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
        }
        catch (error) {
            throw new Error(`Failed to list files in ${dirPath}: ${error.message}`);
        }
    }
    /**
     * Zip a text file or directory
     */
    async executeZipTextFile(params) {
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
            let zipPath;
            if (outputPath) {
                zipPath = outputPath;
            }
            else {
                // Create zip file in temp directory
                const fileName = (0, path_1.basename)(filePath, '.txt') || 'archive';
                zipPath = (0, path_1.join)(os.tmpdir(), `${fileName}_${Date.now()}.zip`);
            }
            // Ensure output directory exists
            const outputDir = (0, path_1.dirname)(zipPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            // Create zip file
            return await new Promise((resolve, reject) => {
                const output = fs.createWriteStream(zipPath);
                const zipArchive = (0, archiver_1.default)('zip', {
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
                zipArchive.on('error', (err) => {
                    reject(new Error(`Failed to create zip: ${err.message}`));
                });
                zipArchive.pipe(output);
                // Add file or directory to archive
                if (stats.isDirectory()) {
                    zipArchive.directory(filePath, false);
                }
                else {
                    zipArchive.file(filePath, { name: (0, path_1.basename)(filePath) });
                }
                zipArchive.finalize();
            });
        }
        catch (error) {
            throw new Error(`Failed to zip file ${filePath}: ${error.message}`);
        }
    }
    updateResourceContext(command, params) {
        if ("filePath" in params) {
            AIHandler_1.AIHandler.Current.updateLatestResource({ type: "File", name: params.filePath });
        }
        if ("dirPath" in params) {
            AIHandler_1.AIHandler.Current.updateLatestResource({ type: "Directory", name: params.dirPath });
        }
    }
    /**
     * Main command dispatcher
     */
    async executeCommand(command, params) {
        switch (command) {
            case 'ReadFile':
                return await this.executeReadFile(params);
            case 'ReadFileStream':
                return await this.executeReadFileStream(params);
            case 'ReadFileAsBase64':
                return await this.executeReadFileAsBase64(params);
            case 'GetFileInfo':
                return await this.executeGetFileInfo(params);
            case 'ListFiles':
                return await this.executeListFiles(params);
            case 'ZipTextFile':
                return await this.executeZipTextFile(params);
            default:
                throw new Error(`Unsupported command: ${command}`);
        }
    }
}
exports.FileOperationsTool = FileOperationsTool;
//# sourceMappingURL=FileOperationsTool.js.map