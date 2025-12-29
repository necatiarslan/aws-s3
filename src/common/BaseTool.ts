import * as vscode from 'vscode';
import * as ui from './UI';
import { needsConfirmation, confirmProceed } from './ActionGuard';
import { CommandHistoryManager } from './CommandHistoryManager';
import { Session } from './Session';
import * as MessageHub from './MessageHub';

export interface BaseToolInput {
    command: string;
    params: Record<string, any>;
}

export abstract class BaseTool<TInput extends BaseToolInput> implements vscode.LanguageModelTool<TInput> {
    
    /**
     * Name of the tool for logging purposes (e.g., 'S3Tool')
     */
    protected abstract readonly toolName: string;

    /**
     * Execute the specific command logic.
     */
    protected abstract executeCommand(command: string, params: Record<string, any>): Promise<any>;

    /**
     * Optional: Update latest resource for chat context.
     * Override this to provide specific resource info.
     */
    protected updateResourceContext(command: string, params: Record<string, any>): void {
        // Default implementation does nothing
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<TInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { command, params } = options.input;

            
            const startTime = Date.now();
            let success = false;
            let responseData: any = null;

            try {
                ui.logToOutput(`${this.toolName}: Executing ${command} with params: ${JSON.stringify(params)}`);

                // Check if tool or command is disabled
                if (Session.Current?.DisabledTools.has(this.toolName)) {
                    const disabledResponse = { 
                        success: false, 
                        command, 
                        message: `Tool '${this.toolName}' is disabled. Enable it in Service Access Settings (Command Palette: Awsflow: Service Access Settings)` 
                    };
                    responseData = disabledResponse;
                    ui.logToOutput(`${this.toolName}: Tool is disabled`);
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(JSON.stringify(disabledResponse, null, 2))
                    ]);
                }

                const disabledCommands = Session.Current?.DisabledCommands.get(this.toolName);
                if (disabledCommands?.has(command)) {
                    const disabledResponse = { 
                        success: false, 
                        command, 
                        message: `Command '${command}' in tool '${this.toolName}' is disabled. Enable it in Service Access Settings (Command Palette: Awsflow: Service Access Settings)` 
                    };
                    responseData = disabledResponse;
                    ui.logToOutput(`${this.toolName}: Command ${command} is disabled`);
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(JSON.stringify(disabledResponse, null, 2))
                    ]);
                }

                if (needsConfirmation(command)) {
                    const ok = await confirmProceed(command, params);
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
                const response: any = {
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
                } else if (result?.NextToken) {
                    response.pagination = {
                        hasMore: true,
                        nextToken: result.NextToken
                    };
                } else if (result?.NextMarker) {
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

            } catch (error: any) {
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
            } finally {
                const durationMs = Date.now() - startTime;
                CommandHistoryManager.Instance.add({
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
