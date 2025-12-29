"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAwsConnectionTool = void 0;
const vscode = require("vscode");
const ui = require("../common/UI");
const BaseTool_1 = require("../common/BaseTool");
const ClientManager_1 = require("../common/ClientManager");
const client_sts_1 = require("@aws-sdk/client-sts");
const Session_1 = require("../common/Session");
class TestAwsConnectionTool extends BaseTool_1.BaseTool {
    constructor() {
        super(...arguments);
        this.toolName = 'TestAwsConnectionTool';
    }
    async getClient(region) {
        return ClientManager_1.ClientManager.Instance.getClient('sts', async (session) => {
            const credentials = await session.GetCredentials();
            return new client_sts_1.STSClient({
                credentials,
                endpoint: session.AwsEndPoint,
                region: region || session.AwsRegion,
            });
        });
    }
    updateResourceContext(command, params) {
        // No specific resource to update for connection test
    }
    async executeCommand(_command, params) {
        // Get region from params or session defaults
        const region = params?.region || Session_1.Session.Current?.AwsRegion || 'us-east-1';
        ui.logToOutput(`TestAwsConnection: Testing AWS connectivity (region=${region})`);
        try {
            const client = await this.getClient(region);
            const identityCommand = new client_sts_1.GetCallerIdentityCommand({});
            await client.send(identityCommand);
            ui.logToOutput("TestAwsConnection: AWS connectivity test successful.");
            return {
                success: true,
                message: 'AWS connectivity test successful',
                region: region
            };
        }
        catch (error) {
            ui.logToOutput("TestAwsConnection: AWS connectivity test failed.", error);
            return {
                success: false,
                message: 'AWS connectivity test failed',
                error: error.message || 'Unknown error',
                region: region,
            };
        }
    }
    // Override invoke because this tool has valid input that is not a 'command' string but direct params
    // BaseTool usually expects { command: string, params: {} }
    // But TestAwsConnectionTool input is { region?: string } which is flattened.
    // Actually, BaseTool expects BaseToolInput which keys are string.
    // The executeCommand signature is (command: string, params: Record<string, any>).
    // If I look at how BaseTool.invoke works:
    // const { command, params } = options.input;
    // It expects input to have 'command' and 'params'.
    // However, TestAwsConnectionInput structure is different.
    // Let's adapt BaseTool usage or modify this tool to fit the pattern if possible,
    // or alias the input to 'params' and use a dummy command name.
    async invoke(options, token) {
        // Shim to fit BaseTool's executeCommand expectation
        // We treat the whole input as params and use a dummy command name.
        // But BaseTool.invoke expects { command, params } in input.
        // If the input doesn't have them, it might be undefined.
        // The previous implementation was: const region = options.input?.region
        // So input IS the params.
        // I cannot easily inherit BaseTool if the input shape is drastically different without overriding invoke.
        // I will override invoke and still use BaseTool helpers if any, or just implement it similarly.
        // But wait, BaseTool.invoke accesses options.input.command.
        // If I want to reuse BaseTool, I should ensure input has command.
        // But the tool definition in package.json probably defines properties for region directly.
        // Changing the tool input shape would require updating package.json and prompts.
        // Assuming I can't change package.json easily (user didn't ask), I should stick to the current input shape.
        // So, I will override `invoke` completely to handle the specific input shape,
        // but still reuse the ClientManager.
        try {
            const params = options.input;
            const result = await this.executeCommand('TestAwsConnection', params);
            // Return result
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
            ]);
        }
        catch (error) {
            const errorResponse = {
                success: false,
                message: 'Error executing TestAwsConnection tool',
                error: error.message || 'Unknown error'
            };
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(errorResponse, null, 2))
            ]);
        }
    }
}
exports.TestAwsConnectionTool = TestAwsConnectionTool;
//# sourceMappingURL=TestAwsConnectionTool.js.map