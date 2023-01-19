/* eslint-disable @typescript-eslint/naming-convention */
import * as AWS from "aws-sdk";
import * as ui from "./UI";
import { MethodResult } from './MethodResult';
import { homedir } from "os";
import { sep } from "path";
import { join } from "path";
import { parseKnownFiles, SourceProfileInit } from "../aws-sdk/parseKnownFiles";
import { ParsedIniData } from "@aws-sdk/types";
import * as s3_helper from '../s3/S3Helper'
import * as fs from 'fs';

export async function GetS3ObjectList(Profile:string, Bucket:string, Key:string): Promise<MethodResult<AWS.S3.ListObjectsV2Output | undefined>> {
  let result:MethodResult<AWS.S3.ListObjectsV2Output | undefined> = new MethodResult<AWS.S3.ListObjectsV2Output | undefined>();
  
  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({credentials:credentials});

    let param = {
      Bucket:Bucket,
      Prefix:Key,
      Delimiter: "/",
    }

    let response = await s3.listObjectsV2(param).promise();
    result.isSuccessful = true;
    result.result = response;
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

export async function SearchS3Object(Profile:string, Bucket: string, PrefixKey:string, FileName: string | undefined, FileExtension: string | undefined, FolderName: string | undefined, MaxResultCount: number = 100): Promise<MethodResult<AWS.S3.ObjectList | undefined>> {
  let result:MethodResult<AWS.S3.ObjectList | undefined> = new MethodResult<AWS.S3.ObjectList | undefined>();
  result.result = [];
  
  FileName = FileName?.toLowerCase();
  FileExtension = FileExtension?.toLowerCase();
  FolderName = FolderName?.toLowerCase();

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({credentials:credentials});
  
    let continuationToken: any;
    do {
        const params = {
            Bucket: Bucket,
            Prefix:PrefixKey,
            ContinuationToken: continuationToken,
            MaxKeys:100
        };
        const response = await s3.listObjectsV2(params).promise();
        continuationToken = response.NextContinuationToken;
        if(response.Contents)
        {
          for(var file of response.Contents)
          {
            let fileKey = file.Key?.toLowerCase();
            let currentFileName = s3_helper.GetFileNameWithExtension(fileKey)
            if(
                (!FolderName || FolderName.length===0 || (FolderName && FolderName.length>0 && fileKey && fileKey.includes(FolderName)))
                &&
                (!FileName || FileName.length===0 || (FileName && FileName.length>0 && currentFileName.includes(FileName)))
                &&
                (!FileExtension || FileExtension.length===0 || (FileExtension && FileExtension.length>0 && s3_helper.GetFileExtension(currentFileName) === FileExtension))
              )
            {
              result.result.push(file);
              continue;
            }
          }
        }
        if(MaxResultCount > 0 && result.result.length >= MaxResultCount) { break; }
    } while (continuationToken);
    result.isSuccessful = true;
    return result;
  } 
  catch (error:any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.GetS3ObjectList Error !!!', error);
    ui.logToOutput("api.GetS3ObjectList Error !!!", error); 
    return result;    
  }
}

export async function CreateS3Folder(Profile:string, Bucket:string, Key:string, FolderName:string): Promise<MethodResult<string>> {
  let result = new MethodResult<string>();
  let TargetKey = join(Key, FolderName + "/");

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({credentials:credentials});

    let param = {
      Bucket:Bucket,
      Key:TargetKey
    }

    let response = await s3.putObject(param).promise();
    result.isSuccessful = true;
    result.result = TargetKey;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.CreateS3Folder Error !!!', error);
    ui.logToOutput("api.CreateS3Folder Error !!!", error); 
    return result;
  }
}

export async function DeleteObject(Profile:string, Bucket:string, Key:string): Promise<MethodResult<boolean>> {
  let result = new MethodResult<boolean>();

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({credentials:credentials});

    if(s3_helper.IsFolder(Key))
    {
      const objects = await s3.listObjects({
        Bucket: Bucket,
        Prefix: Key
      }).promise();
      
      if(objects.Contents && objects.Contents.length > 1)
      {
        throw new Error(Key + " folder contains " + objects.Contents.length + " files");
      }
    }

    let param = {
      Bucket:Bucket,
      Key:Key
    }

    let response = await s3.deleteObject(param).promise();
    result.isSuccessful = true;
    result.result = true;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.DeleteObject Error !!! File=' + Key, error);
    ui.logToOutput("api.DeleteObject Error !!! File=" + Key, error); 
    return result;
  }
}

async function DeleteS3Folder(Profile:string, Bucket:string, Key:string) {
  // List all the objects in the folder
  
  const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
  const s3 = new AWS.S3({credentials:credentials});

  // const objects = await s3.listObjects({
  //   Bucket: Bucket,
  //   Prefix: Key
  // }).promise();

  // if(objects.Contents)
  // {
  //   // Create an array of "Delete" objects for each object in the folder
  //   const deleteObjects = objects.Contents.map(object => ({ Key: object.Key }));
  //   if(deleteObjects)
  //   {
  //     // Delete all the objects in the folder
  //     await s3.deleteObjects({
  //       Bucket: Bucket,
  //       Delete: { Objects: deleteObjects }
  //     }).promise();
  //   }
  // }

  // Delete the folder itself
  await s3.deleteObject({
    Bucket: Bucket,
    Key: Key
  }).promise();
}

export async function UploadFileToFolder(Profile:string, Bucket:string, FolderKey:string, SourcePath:string) : Promise<MethodResult<string>>
{
  let result = new MethodResult<string>();
  if(!s3_helper.IsFolder(FolderKey))
  {
    result.isSuccessful = false;
    return result;
  }

  let TargetKey = join(FolderKey, s3_helper.GetFileNameWithExtension(SourcePath));

  return UploadFile(Profile, Bucket, TargetKey, SourcePath);
}

export async function UploadFile(Profile:string, Bucket:string, TargetKey:string, SourcePath:string) : Promise<MethodResult<string>>
{
  let result = new MethodResult<string>();
  if(!s3_helper.IsFile(TargetKey))
  {
    result.isSuccessful = false;
    return result;
  }

  if(s3_helper.GetFileExtension(TargetKey) !== s3_helper.GetFileExtension(SourcePath))
  {
    result.isSuccessful = false;
    return result;
  }

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({credentials:credentials});

    const stream = fs.createReadStream(SourcePath);
    const param = {
      Bucket: Bucket,
      Key: TargetKey,
      Body: stream
    };

    let response = await s3.upload(param).promise();

    result.result = response.Key;
    result.isSuccessful = true;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.UploadS3File Error !!! File=' + SourcePath, error);
    ui.logToOutput("api.UploadS3File Error !!! File=" + SourcePath, error); 
    return result;
  }
} 

export async function DownloadS3File(Profile:string, Bucket:string, Key:string, TargetPath:string) : Promise<MethodResult<string>>
{
  let result = new MethodResult<string>();
  let TargetFilePath = join(TargetPath, s3_helper.GetFileNameWithExtension(Key))

  try 
  {
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({credentials:credentials});

    const param = {
      Bucket: Bucket,
      Key: Key
    };

    let readStream = s3.getObject(param).createReadStream();
    let writeStream = fs.createWriteStream(TargetFilePath);
    readStream.pipe(writeStream);

    result.result = TargetFilePath;
    result.isSuccessful = true;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.DownloadS3File Error !!! File=' + Key, error);
    ui.logToOutput("api.DownloadS3File Error !!! File=" + Key, error); 
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