"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAwsConnection = TestAwsConnection;
const client_sts_1 = require("@aws-sdk/client-sts");
const ui = require("../common/UI");
const Session_1 = require("../common/Session");
const MethodResult_1 = require("../common/MethodResult");
const api = require("../common/API");
async function GetSTSClient(region) {
    const credentials = await api.GetCredentials();
    const iamClient = new client_sts_1.STSClient({
        region,
        credentials,
        endpoint: Session_1.Session.Current?.AwsEndPoint,
    });
    return iamClient;
}
async function TestAwsConnection(Region = "us-east-1") {
    ui.logToOutput("Testing AWS connectivity...");
    let result = new MethodResult_1.MethodResult();
    try {
        const sts = await GetSTSClient(Region);
        const command = new client_sts_1.GetCallerIdentityCommand({});
        const data = await sts.send(command);
        result.isSuccessful = true;
        result.result = true;
        ui.logToOutput("AWS connectivity test successful.");
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.logToOutput("AWS connectivity test failed.", error);
        return result;
    }
}
//# sourceMappingURL=API.js.map