import * as vscode from 'vscode';
import * as ui from '../common/UI';
import * as stsAPI from './API';
import { BaseTool, BaseToolInput } from '../common/BaseTool';
import { ClientManager } from '../common/ClientManager';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { Session } from '../common/Session';

interface TestAwsConnectionInput extends BaseToolInput {
  region?: string;
}

export class TestAwsConnectionTool extends BaseTool<TestAwsConnectionInput> {
  protected readonly toolName = 'TestAwsConnectionTool';

  private async getClient(region?: string): Promise<STSClient> {
      return ClientManager.Instance.getClient('sts', async (session) => {
      const credentials = await session.GetCredentials();
      return new STSClient({
        credentials,
        endpoint: session.AwsEndPoint,
        region: region || session.AwsRegion,
      });
    });
  }

  protected updateResourceContext(command: string, params: Record<string, any>): void {
    // No specific resource to update for connection test
  }

  protected async executeCommand(_command: string, params: Record<string, any>): Promise<any> {
      // Get region from params or session defaults
      const region = params?.region || Session.Current?.AwsRegion || 'us-east-1';
      ui.logToOutput(`TestAwsConnection: Testing AWS connectivity (region=${region})`);

      try {
        const client = await this.getClient(region);
        const identityCommand = new GetCallerIdentityCommand({});
        await client.send(identityCommand);

        ui.logToOutput("TestAwsConnection: AWS connectivity test successful.");
        return {
          success: true,
          message: 'AWS connectivity test successful',
          region: region
        };
      } catch (error: any) {
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

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<TestAwsConnectionInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
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
        const result = await this.executeCommand('TestAwsConnection', params as any);
        
        // Return result
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
        ]);

      } catch (error: any) {
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
