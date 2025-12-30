"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTool = void 0;
const vscode = require("vscode");
const ui = require("./UI");
const ActionGuard_1 = require("./ActionGuard");
const CommandHistoryManager_1 = require("./CommandHistoryManager");
const Session_1 = require("./Session");
const MessageHub = require("./MessageHub");
class BaseTool {
    /**
     * Optional: Update latest resource for chat context.
     * Override this to provide specific resource info.
     */
    updateResourceContext(command, params) {
        // Default implementation does nothing
    }
    async invoke(options, token) {
        const { command, params } = options.input;
        if (Session_1.Session.Current?.IsProVersion === false) {
            const proOnlyResponse = {
                success: false,
                command,
                message: `Command '${command}' requires Pro version. Please upgrade to access this feature. Stop here, do not go on.`
            };
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(proOnlyResponse, null, 2))
            ]);
        }
        const startTime = Date.now();
        let success = false;
        let responseData = null;
        try {
            ui.logToOutput(`${this.toolName}: Executing ${command} with params: ${JSON.stringify(params)}`);
            // Check if tool or command is disabled
            if (Session_1.Session.Current?.DisabledTools.has(this.toolName)) {
                const disabledResponse = {
                    success: false,
                    command,
                    message: `Tool '${this.toolName}' is disabled. Enable it in Service Access Settings (Command Palette: Aws-S3: Service Access Settings)`
                };
                responseData = disabledResponse;
                ui.logToOutput(`${this.toolName}: Tool is disabled`);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(disabledResponse, null, 2))
                ]);
            }
            const disabledCommands = Session_1.Session.Current?.DisabledCommands.get(this.toolName);
            if (disabledCommands?.has(command)) {
                const disabledResponse = {
                    success: false,
                    command,
                    message: `Command '${command}' in tool '${this.toolName}' is disabled. Enable it in Service Access Settings (Command Palette: Aws-S3: Service Access Settings)`
                };
                responseData = disabledResponse;
                ui.logToOutput(`${this.toolName}: Command ${command} is disabled`);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(disabledResponse, null, 2))
                ]);
            }
            if ((0, ActionGuard_1.needsConfirmation)(command)) {
                const ok = await (0, ActionGuard_1.confirmProceed)(command, params);
                if (!ok) {
                    const cancelled = { success: false, command, message: 'User cancelled action command, stop here, do not go on' };
                    responseData = cancelled;
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(JSON.stringify(cancelled, null, 2))
                    ]);
                }
            }
            // Update chat context if needed
            this.updateResourceContext(command, params);
            // Execute the command
            MessageHub.StartAwsCommand();
            const result = await this.executeCommand(command, params);
            success = true; // If executeCommand doesn't throw, we assume success or at least handled failure within executeCommand returning a result. 
            // However, the original code wraps success in a response object.
            MessageHub.EndAwsCommand();
            // Build success response
            const response = {
                success: true,
                command,
                message: `${command} executed successfully`,
                data: result,
                metadata: {
                    requestId: result?.$metadata?.requestId,
                    httpStatusCode: result?.$metadata?.httpStatusCode,
                }
            };
            // Check for pagination tokens in the result
            if (result?.NextContinuationToken) {
                response.pagination = {
                    hasMore: true,
                    nextContinuationToken: result.NextContinuationToken
                };
            }
            else if (result?.NextToken) {
                response.pagination = {
                    hasMore: true,
                    nextToken: result.NextToken
                };
            }
            else if (result?.NextMarker) {
                response.pagination = {
                    hasMore: true,
                    nextMarker: result.NextMarker
                };
            }
            responseData = response;
            ui.logToOutput(`${this.toolName}: ${command} completed successfully`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        }
        catch (error) {
            // Build error response
            const errorResponse = {
                success: false,
                command,
                message: `Failed to execute ${command}`,
                error: {
                    name: error.name || 'Error',
                    message: error.message || 'Unknown error',
                    code: error.Code || error.$metadata?.httpStatusCode,
                }
            };
            responseData = errorResponse;
            success = false;
            ui.logToOutput(`${this.toolName}: ${command} failed`, error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(errorResponse, null, 2))
            ]);
        }
        finally {
            const durationMs = Date.now() - startTime;
            CommandHistoryManager_1.CommandHistoryManager.Instance.add({
                timestamp: startTime,
                toolName: this.toolName,
                command,
                params,
                response: responseData,
                success,
                durationMs
            });
        }
    }
}
exports.BaseTool = BaseTool;
//# sourceMappingURL=BaseTool.js.map