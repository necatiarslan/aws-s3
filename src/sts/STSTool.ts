import { BaseTool, BaseToolInput } from '../common/BaseTool';
import { ClientManager } from '../common/ClientManager';
import { 
  STSClient,
  GetCallerIdentityCommand,
  GetAccessKeyInfoCommand,
  GetDelegatedAccessTokenCommand,
  GetFederationTokenCommand,
  GetSessionTokenCommand,
  GetWebIdentityTokenCommand,
} from '@aws-sdk/client-sts';
import { AIHandler } from '../chat/AIHandler';

// Command type definition
type STSCommand = 
  | 'GetCallerIdentity'
  | 'GetAccessKeyInfo'
  | 'GetDelegatedAccessToken'
  | 'GetFederationToken'
  | 'GetSessionToken'
  | 'GetWebIdentityToken';

// Input interface - command + params object
interface STSToolInput extends BaseToolInput {
  command: STSCommand;
}

export class STSTool extends BaseTool<STSToolInput> {
  protected readonly toolName = 'STSTool';

  private async getClient(): Promise<STSClient> {
      return ClientManager.Instance.getClient('sts', async (session) => {
      const credentials = await session.GetCredentials();
      return new STSClient({
        credentials,
        endpoint: session.AwsEndPoint,
        region: session.AwsRegion,
      });
    });
  }

  protected updateResourceContext(command: string, params: Record<string, any>): void {
     if ("RoleArn" in params) {
      AIHandler.Current.updateLatestResource({ type: "IAM Role", name: params.RoleArn });
    }
  }

  protected async executeCommand(command: STSCommand, params: Record<string, any>): Promise<any> {
    const client = await this.getClient();

    switch (command) {
      case 'GetCallerIdentity':
        return await client.send(new GetCallerIdentityCommand(params as any));
      
      case 'GetAccessKeyInfo':
        return await client.send(new GetAccessKeyInfoCommand(params as any));
      
      case 'GetDelegatedAccessToken':
        return await client.send(new GetDelegatedAccessTokenCommand(params as any));
      
      case 'GetFederationToken':
        return await client.send(new GetFederationTokenCommand(params as any));
      
      case 'GetSessionToken':
        return await client.send(new GetSessionTokenCommand(params as any));
      
      case 'GetWebIdentityToken':
        return await client.send(new GetWebIdentityTokenCommand(params as any));
      
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  }
}
