import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import * as ui from '../common/UI';
import { Session } from '../common/Session';
import { MethodResult } from "../common/MethodResult";
import * as api from '../common/API';


async function GetSTSClient(region: string) {
  const credentials = await api.GetCredentials();
  const iamClient = new STSClient(
    {
      region,
      credentials,
      endpoint: Session.Current?.AwsEndPoint,
    }
  );
  return iamClient;
}

export async function TestAwsConnection(Region: string="us-east-1"): Promise<MethodResult<boolean>> {
    ui.logToOutput("Testing AWS connectivity...");

    let result: MethodResult<boolean> = new MethodResult<boolean>();

    try {
    const sts = await GetSTSClient(Region);

    const command = new GetCallerIdentityCommand({});
    const data = await sts.send(command);

    result.isSuccessful = true;
    result.result = true;
    ui.logToOutput("AWS connectivity test successful.");
    return result;
    } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.logToOutput("AWS connectivity test failed.", error);
    return result;
    }
}