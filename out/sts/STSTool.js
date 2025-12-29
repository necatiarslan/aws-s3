"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STSTool = void 0;
const BaseTool_1 = require("../common/BaseTool");
const ClientManager_1 = require("../common/ClientManager");
const client_sts_1 = require("@aws-sdk/client-sts");
const AIHandler_1 = require("../chat/AIHandler");
class STSTool extends BaseTool_1.BaseTool {
    constructor() {
        super(...arguments);
        this.toolName = 'STSTool';
    }
    async getClient() {
        return ClientManager_1.ClientManager.Instance.getClient('sts', async (session) => {
            const credentials = await session.GetCredentials();
            return new client_sts_1.STSClient({
                credentials,
                endpoint: session.AwsEndPoint,
                region: session.AwsRegion,
            });
        });
    }
    updateResourceContext(command, params) {
        if ("RoleArn" in params) {
            AIHandler_1.AIHandler.Current.updateLatestResource({ type: "IAM Role", name: params.RoleArn });
        }
    }
    async executeCommand(command, params) {
        const client = await this.getClient();
        switch (command) {
            case 'GetCallerIdentity':
                return await client.send(new client_sts_1.GetCallerIdentityCommand(params));
            case 'GetAccessKeyInfo':
                return await client.send(new client_sts_1.GetAccessKeyInfoCommand(params));
            case 'GetDelegatedAccessToken':
                return await client.send(new client_sts_1.GetDelegatedAccessTokenCommand(params));
            case 'GetFederationToken':
                return await client.send(new client_sts_1.GetFederationTokenCommand(params));
            case 'GetSessionToken':
                return await client.send(new client_sts_1.GetSessionTokenCommand(params));
            case 'GetWebIdentityToken':
                return await client.send(new client_sts_1.GetWebIdentityTokenCommand(params));
            default:
                throw new Error(`Unsupported command: ${command}`);
        }
    }
}
exports.STSTool = STSTool;
//# sourceMappingURL=STSTool.js.map