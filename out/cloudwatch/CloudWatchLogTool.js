"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudWatchLogTool = void 0;
const BaseTool_1 = require("../common/BaseTool");
const ClientManager_1 = require("../common/ClientManager");
const Session_1 = require("../common/Session");
const client_cloudwatch_logs_1 = require("@aws-sdk/client-cloudwatch-logs");
const AIHandler_1 = require("../chat/AIHandler");
const CloudWatchLogView_1 = require("./CloudWatchLogView");
class CloudWatchLogTool extends BaseTool_1.BaseTool {
    constructor() {
        super(...arguments);
        this.toolName = 'CloudWatchLogTool';
    }
    async getClient() {
        return ClientManager_1.ClientManager.Instance.getClient('cloudwatchlogs', async (session) => {
            const credentials = await session.GetCredentials();
            return new client_cloudwatch_logs_1.CloudWatchLogsClient({
                credentials,
                region: session.AwsRegion,
                endpoint: session.AwsEndPoint,
            });
        });
    }
    async executeOpenCloudWatchLogView(params) {
        if (!Session_1.Session.Current) {
            throw new Error('Session not initialized');
        }
        // Open the CloudWatchLogView
        CloudWatchLogView_1.CloudWatchLogView.Render(Session_1.Session.Current.ExtensionUri, Session_1.Session.Current.AwsRegion, params.logGroupName, params.logStreamName || '');
        return {
            success: true,
            message: `CloudWatch Log View opened for log group: ${params.logGroupName}${params.logStreamName ? `, log stream: ${params.logStreamName}` : ''}`,
            logGroupName: params.logGroupName,
            logStreamName: params.logStreamName
        };
    }
    updateResourceContext(command, params) {
        if ("logGroupName" in params) {
            AIHandler_1.AIHandler.Current.updateLatestResource({ type: "CloudWatch Log Group", name: params.logGroupName });
        }
        if ("logStreamName" in params) {
            AIHandler_1.AIHandler.Current.updateLatestResource({ type: "CloudWatch Log Stream", name: params.logStreamName });
        }
    }
    async executeCommand(command, params) {
        const client = await this.getClient();
        switch (command) {
            case 'DescribeLogGroups':
                return await client.send(new client_cloudwatch_logs_1.DescribeLogGroupsCommand(params));
            case 'DescribeLogStreams':
                return await client.send(new client_cloudwatch_logs_1.DescribeLogStreamsCommand(params));
            case 'GetLogEvents':
                return await client.send(new client_cloudwatch_logs_1.GetLogEventsCommand(params));
            case 'OpenCloudWatchLogView':
                return await this.executeOpenCloudWatchLogView(params);
            default:
                throw new Error(`Unsupported command: ${command}`);
        }
    }
}
exports.CloudWatchLogTool = CloudWatchLogTool;
//# sourceMappingURL=CloudWatchLogTool.js.map