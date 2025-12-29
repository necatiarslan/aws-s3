import { BaseTool, BaseToolInput } from '../common/BaseTool';
import { ClientManager } from '../common/ClientManager';
import { Session } from '../common/Session';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { AIHandler } from '../chat/AIHandler';
import { CloudWatchLogView } from './CloudWatchLogView';

// Command type definition
type CloudWatchCommand =
  | 'DescribeLogGroups'
  | 'DescribeLogStreams'
  | 'GetLogEvents'
  | 'OpenCloudWatchLogView';

// Input interface - command + params object
interface CloudWatchToolInput extends BaseToolInput {
  command: CloudWatchCommand;
}

export class CloudWatchLogTool extends BaseTool<CloudWatchToolInput> {
  protected readonly toolName = 'CloudWatchLogTool';

  private async getClient(): Promise<CloudWatchLogsClient> {
      return ClientManager.Instance.getClient('cloudwatchlogs', async (session) => {
      const credentials = await session.GetCredentials();
      return new CloudWatchLogsClient({
        credentials,
        region: session.AwsRegion,
        endpoint: session.AwsEndPoint,
      });
    });
  }

  private async executeOpenCloudWatchLogView(params: any): Promise<any> {
    if (!Session.Current) {
      throw new Error('Session not initialized');
    }

    // Open the CloudWatchLogView
    CloudWatchLogView.Render(Session.Current.ExtensionUri, Session.Current.AwsRegion, params.logGroupName, params.logStreamName || '');

    return {
      success: true,
      message: `CloudWatch Log View opened for log group: ${params.logGroupName}${params.logStreamName ? `, log stream: ${params.logStreamName}` : ''}`,
      logGroupName: params.logGroupName,
      logStreamName: params.logStreamName
    };
  }

  protected updateResourceContext(command: string, params: Record<string, any>): void {
     if ("logGroupName" in params) {
      AIHandler.Current.updateLatestResource({ type: "CloudWatch Log Group", name: params.logGroupName });
    }
    if ("logStreamName" in params) {
      AIHandler.Current.updateLatestResource({ type: "CloudWatch Log Stream", name: params.logStreamName });
    }
  }

  protected async executeCommand(command: CloudWatchCommand, params: Record<string, any>): Promise<any> {
    const client = await this.getClient();

    switch (command) {
      case 'DescribeLogGroups':
        return await client.send(new DescribeLogGroupsCommand(params as any));
      case 'DescribeLogStreams':
        return await client.send(new DescribeLogStreamsCommand(params as any));
      case 'GetLogEvents':
        return await client.send(new GetLogEventsCommand(params as any));
      case 'OpenCloudWatchLogView':
        return await this.executeOpenCloudWatchLogView(params);
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  }
}
