/* eslint-disable @typescript-eslint/naming-convention */
import * as AWS from "aws-sdk";
import * as ui from "./UI";
import { MethodResult } from './MethodResult';
import { Credentials } from 'aws-sdk';
import { homedir } from "os";
import { sep } from "path";
import { join } from "path";
import { parseKnownFiles, SourceProfileInit } from "../aws-sdk/parseKnownFiles";
import { ParsedIniData } from "@aws-sdk/types";

export async function GetS3ObjectList(Profile:string, Bucket:string, Key:string): Promise<MethodResult<AWS.S3.ObjectList | undefined>> {
  let result:MethodResult<AWS.S3.ObjectList | undefined> = new MethodResult<AWS.S3.ObjectList | undefined>();
  result.result = [];

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({credentials:credentials});

    let param = {
      Bucket:Bucket,
      Prefix:Key
    }

    let response = await s3.listObjectsV2(param).promise();
    result.isSuccessful = true;
    result.result = response.Contents;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.GetS3ObjectList Error !!!', error);
    ui.logToOutput("api.GetS3ObjectList Error !!!", error); 
    return result;
  }
}

export async function DownloadS3Object(Profile:string, Bucket:string, Key:string): Promise<MethodResult<AWS.S3.GetObjectOutput | undefined>> {
  let result:MethodResult<AWS.S3.GetObjectOutput | undefined> = new MethodResult<AWS.S3.GetObjectOutput | undefined>();

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({credentials:credentials});

    const param = {
      Bucket: Bucket,
      Key: Key
    };

    result.isSuccessful = true;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.GetS3ObjectList Error !!!', error);
    ui.logToOutput("api.GetS3ObjectList Error !!!", error); 
    return result;
  }
}

export async function GetBucketList(Profile:string, BucketName?:string): Promise<MethodResult<string[]>> {
  let result:MethodResult<string[]> = new MethodResult<string[]>();
  result.result = [];

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({credentials:credentials});

    let response = await s3.listBuckets().promise();
    result.isSuccessful = true;
    if(response.Buckets)
    {
      for(var bucket of response.Buckets)
      {
        if(bucket.Name && (BucketName === undefined  || BucketName === "" || bucket.Name.includes(BucketName)))
        {
          result.result.push(bucket.Name);
        }
      }
    }
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.GetBucketList Error !!!', error);
    ui.logToOutput("api.GetBucketList Error !!!", error); 
    return result;
  }
}

export async function TestAwsConnection(Profile:string): Promise<MethodResult<boolean>> {
  let result:MethodResult<boolean> = new MethodResult<boolean>();

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const iam = new AWS.IAM({credentials:credentials});

    let response = await iam.getUser().promise();
    result.isSuccessful = true;
    result.result = true;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.TestAwsConnection Error !!!', error);
    ui.logToOutput("api.TestAwsConnection Error !!!", error); 
    return result;
  }
}

export async function GetRegionList(Profile:string): Promise<MethodResult<string[]>> {
  let result:MethodResult<string[]> = new MethodResult<string[]>();
  result.result = [];

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const ec2 = new AWS.EC2({region: 'us-east-1', credentials:credentials});
    let response = await ec2.describeRegions().promise();

    result.isSuccessful = true;
    if(response.Regions)
    {
      for(var r of response.Regions)
      {
        if(r.RegionName)
        {
          result.result.push(r.RegionName);
        }
      }
    }
    return result;
  } catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.GetRegionList Error !!!', error);
    ui.logToOutput("api.GetRegionList Error !!!", error); 
    return result;
  }
}

export async function GetAwsProfileList(): Promise<MethodResult<string[]>> {
  ui.logToOutput("api.GetAwsProfileList Started");

  let result:MethodResult<string[]> = new MethodResult<string[]>();

  try 
  {
    let profileData = await getIniProfileData();
    
    result.result = Object.keys(profileData);
    result.isSuccessful = true;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.GetAwsProfileList Error !!!', error);
    ui.logToOutput("api.GetAwsProfileList Error !!!", error); 
    return result;
  }
}

export async function getIniProfileData(init: SourceProfileInit = {}):Promise<ParsedIniData>
{
    const profiles = await parseKnownFiles(init);
    return profiles;
}

export const ENV_CREDENTIALS_PATH = "AWS_SHARED_CREDENTIALS_FILE";

export const getHomeDir = (): string => {
    const { HOME, USERPROFILE, HOMEPATH, HOMEDRIVE = `C:${sep}` } = process.env;
  
    if (HOME) { return HOME; }
    if (USERPROFILE) { return USERPROFILE; } 
    if (HOMEPATH) { return `${HOMEDRIVE}${HOMEPATH}`; } 
  
    return homedir();
  };

export const getCredentialsFilepath = () =>
  process.env[ENV_CREDENTIALS_PATH] || join(getHomeDir(), ".aws", "credentials");

export const getConfigFilepath = () =>
  process.env[ENV_CREDENTIALS_PATH] || join(getHomeDir(), ".aws", "config");