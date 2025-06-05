/* eslint-disable @typescript-eslint/naming-convention */
import * as ui from "./UI";
import { MethodResult } from './MethodResult';
import { homedir } from "os";
import { sep } from "path";
import { join } from "path";
import { parseKnownFiles, SourceProfileInit } from "../aws-sdk/parseKnownFiles";
import { ParsedIniData } from "@aws-sdk/types";
import * as s3_helper from '../s3/S3Helper'
import * as fs from 'fs';
import * as S3TreeView from '../s3/S3TreeView';



import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
export async function GetCredentials() {
  let credentials;
  if (CurrentCredentials !== undefined) { 
    ui.logToOutput("Aws credentials From Pool AccessKeyId=" + CurrentCredentials.accessKeyId);
    return CurrentCredentials; 
  }

  try {
    if (S3TreeView.S3TreeView.Current) {
      process.env.AWS_PROFILE = S3TreeView.S3TreeView.Current.AwsProfile ;
    }
    // Get credentials using the default provider chain.
    const provider = fromNodeProviderChain({ignoreCache: true});
    credentials = await provider();

    if (!credentials) {
      throw new Error("Aws credentials not found !!!");
    }

    ui.logToOutput("Aws credentials AccessKeyId=" + credentials.accessKeyId);
    return credentials;
  } catch (error: any) {
    ui.showErrorMessage("Aws Credentials Not Found !!!", error);
    ui.logToOutput("GetCredentials Error !!!", error);
    return credentials;
  }
}

import { S3Client } from "@aws-sdk/client-s3";
import { AwsCredentialIdentity } from "@aws-sdk/types";

let CurrentS3Client: S3Client | undefined
let CurrentCredentials: AwsCredentialIdentity | undefined

export async function StartConnection() {
  ui.logToOutput("Starting Connection");
  CurrentCredentials = await GetCredentials();
  CurrentS3Client = await GetS3Client();
  ui.logToOutput("Connection Started");
}

export async function StopConnection() {
  ui.logToOutput("Stopping Connection");
  CurrentCredentials = undefined
  CurrentS3Client = undefined;
  ui.logToOutput("Connection Stopped");
}

export async function GetS3Client() {
  let credentials = await GetCredentials();
  if (CurrentS3Client !== undefined) { return CurrentS3Client; }

  return new S3Client({
    credentials: credentials,
    endpoint: S3TreeView.S3TreeView.Current?.AwsEndPoint,
    forcePathStyle: true,
    region: S3TreeView.S3TreeView.Current?.AwsRegion,
  });
}

import { IAMClient } from "@aws-sdk/client-iam";
export async function GetIAMClient() {
  let credentials = await GetCredentials();
  return new IAMClient({ credentials: credentials });
}


import { ListObjectsV2Command, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";

export async function GetFolderList(Bucket: string, Key: string): Promise<MethodResult<ListObjectsV2CommandOutput>> {
  let result: MethodResult<ListObjectsV2CommandOutput> = new MethodResult<ListObjectsV2CommandOutput>();

  try {
    const s3 = await GetS3Client();
    
    const params = {
      Bucket: Bucket,
      Prefix: Key,
      Delimiter: "/",
    };

    const command = new ListObjectsV2Command(params);
    const response = await s3.send(command);

    result.isSuccessful = true;
    result.result = response;
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage("api.GetFolderList Error !!!", error);
    ui.logToOutput("api.GetFolderList Error !!!", error);
    return result;
  }
}


export async function GetObjectList(Bucket: string, Key: string): Promise<MethodResult<string[]>> {
  let result: MethodResult<string[]> = new MethodResult<string[]>();
  let keys: string[] = [];
  let continuationToken: string | undefined;

  try {
    const s3 = await GetS3Client();
    do {
      const params = { Bucket, Prefix: Key, ContinuationToken: continuationToken };
      const command = new ListObjectsV2Command(params);
      const response = await s3.send(command);
      continuationToken = response.NextContinuationToken;
      response.Contents?.forEach((file) => keys.push(file.Key!));
    } while (continuationToken);

    result.isSuccessful = true;
    result.result = keys;
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage("api.GetObjectList Error !!!", error);
    ui.logToOutput("api.GetObjectList Error !!!", error);
    return result;
  }
}

import { HeadObjectCommand } from "@aws-sdk/client-s3";
export async function GetObjectProperties(Bucket: string, Key: string): Promise<MethodResult<any>> {
  let result: MethodResult<any> = new MethodResult<any>();

  try {
    const s3 = await GetS3Client();
    const command = new HeadObjectCommand({ Bucket, Key });
    const response = await s3.send(command);
    result.isSuccessful = true;
    result.result = response;
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage("api.GetObjectProperties Error !!!", error);
    ui.logToOutput("api.GetObjectProperties Error !!!", error);
    return result;
  }
}

import { _Object } from "@aws-sdk/client-s3";
export async function SearchObject(
  Bucket: string,
  PrefixKey: string,
  FileName: string | undefined,
  FileExtension: string | undefined,
  FolderName: string | undefined,
  MaxResultCount: number = 100
): Promise<MethodResult<_Object[] | undefined>> {
  let result: MethodResult<_Object[] | undefined> = new MethodResult<_Object[] | undefined>();
  result.result = [];

  FileName = FileName?.toLowerCase();
  FileExtension = FileExtension?.toLowerCase();
  FolderName = FolderName?.toLowerCase();

  try {
    const s3 = await GetS3Client();
    
    let continuationToken: string | undefined;
    do {
      const params = {
        Bucket: Bucket,
        Prefix: PrefixKey,
        ContinuationToken: continuationToken,
        MaxKeys: 100,
      };

      const command = new ListObjectsV2Command(params);
      const response = await s3.send(command);
      continuationToken = response.NextContinuationToken;

      if (response.Contents) {
        for (let file of response.Contents) {
          let fileKey = file.Key?.toLowerCase();
          let currentFileName = s3_helper.GetFileNameWithExtension(fileKey);

          if (
            (!FolderName || FolderName.length === 0 || (FolderName && fileKey && fileKey.includes(FolderName))) &&
            (!FileName || FileName.length === 0 || (FileName && currentFileName.includes(FileName))) &&
            (!FileExtension || FileExtension.length === 0 || (FileExtension && s3_helper.GetFileExtension(currentFileName) === FileExtension))
          ) {
            result.result.push(file);
          }

          if (MaxResultCount > 0 && result.result.length >= MaxResultCount) {
            break;
          }
        }
      }

      if (MaxResultCount > 0 && result.result.length >= MaxResultCount) {
        break;
      }
    } while (continuationToken);

    result.isSuccessful = true;
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.SearchObject Error !!!', error);
    ui.logToOutput('api.SearchObject Error !!!', error);
    return result;
  }
}


import { PutObjectCommand } from "@aws-sdk/client-s3";
export async function CreateFolder(Bucket: string, Key: string, FolderName: string): Promise<MethodResult<string>> {
  let result = new MethodResult<string>();
  let TargetKey = `${Key}${FolderName}/`;

  try {
    const s3 = await GetS3Client();
    const param = { Bucket, Key: TargetKey };
    const command = new PutObjectCommand(param);
    await s3.send(command);
    result.isSuccessful = true;
    result.result = TargetKey;
    ui.logToOutput("api.CreateFolder Success Key=" + TargetKey);
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage("api.CreateFolder Error !!!", error);
    ui.logToOutput("api.CreateFolder Error !!!", error);
    return result;
  }
}

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
export async function DeleteObject(Bucket: string, Key: string): Promise<MethodResult<string>> {
  let result = new MethodResult<string>();

  try {
    const s3 = await GetS3Client();
    const command = new DeleteObjectCommand({ Bucket, Key });
    await s3.send(command);
    result.isSuccessful = true;
    result.result = `Deleted: ${Key}`;
    ui.logToOutput("api.DeleteObject Success Key=" + Key);
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage("api.DeleteObject Error !!!", error);
    ui.logToOutput("api.DeleteObject Error !!!", error);
    return result;
  }
}

export async function DeleteFile(Bucket: string, Key: string): Promise<MethodResult<string[]>> {
  let result = new MethodResult<string[]>();
  result.result = [];
  try {
    const s3 = await GetS3Client();
    const command = new DeleteObjectCommand({ Bucket, Key });
    await s3.send(command);
    result.result.push(Key);
    result.isSuccessful = true;
    ui.logToOutput("api.DeleteFile Success Key=" + Key);
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage("api.DeleteFile Error !!! File=" + Key, error);
    ui.logToOutput("api.DeleteFile Error !!! File=" + Key, error);
    return result;
  }
}

export async function DeleteFolder(Bucket: string, Key: string): Promise<MethodResult<string[]>> {
  let result = new MethodResult<string[]>();
  result.result = [];
  try {
    if (!s3_helper.IsFolder(Key)) {
      throw new Error("api.DeleteFolder Error !!! File=" + Key);
    }

    const s3 = await GetS3Client();
    let result_objects = await GetObjectList(Bucket, Key);

    if (result_objects.isSuccessful) {
      for (const file of result_objects.result as string[]) {
        let result_delete = await DeleteFile(Bucket, file);
        if (result_delete.isSuccessful) {
          result.result.push(file);
        } else {
          throw result_delete.error;
        }
      }
    }

    result.isSuccessful = true;
    ui.logToOutput("api.DeleteFolder Success Key=" + Key);
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage("api.DeleteFolder Error !!! File=" + Key, error);
    ui.logToOutput("api.DeleteFolder Error !!! File=" + Key, error);
    return result;
  }
}

export async function UploadFileToFolder(Bucket: string, FolderKey: string, SourcePath: string): Promise<MethodResult<string>> {
  let result = new MethodResult<string>();
  let TargetKey = `${FolderKey}${s3_helper.GetFileNameWithExtension(SourcePath)}`;
  return UploadFile(Bucket, TargetKey, SourcePath);
}

export async function UploadFile(Bucket: string, TargetKey: string, SourcePath: string): Promise<MethodResult<string>> {
  let result = new MethodResult<string>();
  try {
    const s3 = await GetS3Client();
    const stream = fs.createReadStream(SourcePath);
    
    const param = {
      Bucket,
      Key: TargetKey,
      Body: stream,
    };

    const command = new PutObjectCommand(param);
    await s3.send(command);

    result.result = TargetKey;
    result.isSuccessful = true;
    ui.logToOutput("api.UploadFile Success File=" + TargetKey);
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage("api.UploadFile Error !!! File=" + SourcePath, error);
    ui.logToOutput("api.UploadFile Error !!! File=" + SourcePath, error);
    return result;
  }
}


export async function CopyObject(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:S3Client | undefined) : Promise<MethodResult<string[] | undefined>>
{
  let result = new MethodResult<string[] | undefined>();
  result.result = [];
  try 
  {
    if (s3_helper.IsFolder(SourceKey)) {
      return await CopyFolder(Bucket, SourceKey, TargetKey, s3Client);
    } else {
      return await CopyFile(Bucket, SourceKey, TargetKey, s3Client);
    }    
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.CopyObject Error !!! SourceKey=' + SourceKey, error);
    ui.logToOutput("api.CopyObject Error !!! SourceKey=" + SourceKey, error); 
    return result;
  }

}

import { CopyObjectCommand } from '@aws-sdk/client-s3';

export async function CopyFile(
  Bucket: string,
  SourceKey: string,
  TargetKey: string,
  s3Client?: S3Client
): Promise<MethodResult<string[] | undefined>> {
  let result = new MethodResult<string[] | undefined>();
  result.result = [];

  const s3 = s3Client || await GetS3Client(); // If no s3Client provided, get a new one

  if (s3_helper.IsFolder(TargetKey)) {
    TargetKey = TargetKey === '/' ? '' : TargetKey;
    TargetKey = TargetKey + s3_helper.GetFileNameWithExtension(SourceKey);
  }

  if (SourceKey === TargetKey) {
    result.isSuccessful = false;
    result.error = new Error('SourceKey and TargetKey are the same, SourceKey=' + SourceKey);
    return result;
  }

  try {
    const params = {
      Bucket: Bucket,
      CopySource: `/${Bucket}/${SourceKey}`,
      Key: TargetKey,
    };

    const command = new CopyObjectCommand(params);
    const response = await s3.send(command);

    ui.logToOutput(`Copy File ${SourceKey} to ${TargetKey}`);
    result.result.push(TargetKey);
    result.isSuccessful = true;
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.CopyFile Error !!! File=' + SourceKey, error);
    ui.logToOutput('api.CopyFile Error !!! File=' + SourceKey, error);
    return result;
  }
}


export async function CopyFolder(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:S3Client | undefined) : Promise<MethodResult<string[] | undefined>>
{
  let result = new MethodResult<string[] | undefined>();
  result.result = [];

  try 
  {
    if(s3_helper.IsFile(SourceKey))
    {
      result.isSuccessful = false;
      result.error = new Error('Source Is a File, SourceKey=' + SourceKey);
      return result;
    }

    if(s3_helper.IsFile(TargetKey))
    {
      result.isSuccessful = false;
      result.error = new Error('Target Is a File, TargetKey=' + SourceKey);
      return result;
    }

    const s3 = s3Client ? s3Client : await GetS3Client();
    let result_objects = await GetObjectList(Bucket, SourceKey);

    if(result_objects.isSuccessful)
    {
      for(var file of result_objects.result as string[])
      {
        const parentFolder = s3_helper.GetParentFolderKey(SourceKey);
        const relativeFilePath = file.replace(parentFolder, "");
        const TargetFileKey = TargetKey + relativeFilePath;

        let result_copy = await CopyFile(Bucket, file, TargetFileKey, s3);
        if(result_copy.isSuccessful)
        {
          result.result.push(file);
        }
        else
        {
          throw result_copy.error;
        }
      }
    }

    result.isSuccessful = true;
    return result;
  }
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.CopyFolder Error !!! SourceKey=' + SourceKey, error);
    ui.logToOutput("api.CopyFolder Error !!! SourceKey=" + SourceKey, error); 
    return result;
  }
  
}

export async function MoveObject(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:S3Client | undefined) : Promise<MethodResult<string[] | undefined>>
{
  let result = new MethodResult<string[] | undefined>();
  result.result = [];
  try 
  {
    if(SourceKey === TargetKey)
      {
        result.isSuccessful == false;
        result.error = new Error('api.MoveObject Error !!! SourceKey and TargetKey are the same, SourceKey=' + SourceKey);
        return result;
      }
    
      if(s3_helper.IsFolder(SourceKey))
      {
        return MoveFolder(Bucket, SourceKey, TargetKey, s3Client);
      }
      else
      {
        return MoveFile(Bucket, SourceKey, TargetKey, s3Client);
      }
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.MoveObject Error !!! SourceKey=' + SourceKey, error);
    ui.logToOutput("api.MoveObject Error !!! SourceKey=" + SourceKey, error); 
    return result;
  }

}

export async function MoveFile(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:S3Client | undefined) : Promise<MethodResult<string[] | undefined>>
{
  let result = new MethodResult<string[] | undefined>();
  result.result = [];

  if(SourceKey === TargetKey)
  {
    result.isSuccessful = false;
    result.error  = new Error('SourceKey and TargetKey are the same, SourceKey=' + SourceKey);
    return result;
  }

  const s3 = s3Client ? s3Client : await GetS3Client();

  let copy_result = await CopyFile(Bucket, SourceKey, TargetKey, s3);
  if(!copy_result.isSuccessful)
  {
    result.error = copy_result.error;
    result.isSuccessful = false;
    return result;
  }
  
  let delete_result = await DeleteFile(Bucket, SourceKey);
  if(!delete_result.isSuccessful)
  {
    result.error = delete_result.error;
    result.isSuccessful = false;
    return result;
  }

  result.result = copy_result.result;
  result.isSuccessful = true;
  ui.logToOutput("api.MoveFile Success SourceKey=" + SourceKey + " TargetKey=" + TargetKey);
  return result;
}

export async function MoveFolder(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:S3Client | undefined) : Promise<MethodResult<string[] | undefined>>
{
  let result = new MethodResult<string[] | undefined>();
  result.result = [];

  if(SourceKey === TargetKey)
  {
    result.isSuccessful = false;
    result.error = new Error('SourceKey and TargetKey are the same, SourceKey=' + SourceKey);
    return result;
  }

  if(!s3_helper.IsFolder(SourceKey))
  {
    result.error = new Error('api.MoveFolder Error !!! Source Is a File, SourceKey=' + SourceKey);
    result.isSuccessful = false;
    return result;
  }

  if(!s3_helper.IsFolder(TargetKey))
  {
    result.error = new Error('api.MoveFolder Error !!! Target Is a File, TargetKey=' + SourceKey);
    result.isSuccessful = false;
    return result;
  }

  const s3 = s3Client ? s3Client : await GetS3Client();

  let copy_result = await CopyFolder(Bucket, SourceKey, TargetKey, s3);
  if(!copy_result.isSuccessful)
  {
    result.error = copy_result.error;
    result.isSuccessful = false;
    return result;
  }
  
  let delete_result = await DeleteFolder(Bucket, SourceKey);
  if(!delete_result.isSuccessful)
  {
    result.error = delete_result.error;
    result.isSuccessful = false;
    return result;
  }

  result.result = copy_result.result;
  result.isSuccessful = true;
  ui.logToOutput("api.MoveFolder Success SourceKey=" + SourceKey + " TargetKey=" + TargetKey);
  return result;
}

export async function RenameFile(Bucket:string, SourceKey:string, TargetName:string) : Promise<MethodResult<string[] | undefined>>
{
  let result = new MethodResult<string[] | undefined>();
  result.result = [];

  if(s3_helper.IsFolder(SourceKey))
  {
    result.error = new Error('api.RenameFile Error !!! Source Is a Folder, SourceKey=' + SourceKey);
    result.isSuccessful = false;
    return result;
  }

  let TargetKey = s3_helper.GetParentFolderKey(SourceKey) + TargetName + "." +s3_helper.GetFileExtension(SourceKey)
  let move_result = await MoveObject(Bucket, SourceKey, TargetKey);

  result.result = move_result.result;
  result.isSuccessful = move_result.isSuccessful;
  result.error = move_result.error;
  ui.logToOutput("api.RenameFile Success SourceKey=" + SourceKey + " TargetKey=" + TargetKey);
  return result;
}

export async function RenameFolder(Bucket:string, SourceKey:string, TargetName:string) : Promise<MethodResult<string[] | undefined>>
{
  let result = new MethodResult<string[] | undefined>();
  result.result = [];

  if(s3_helper.IsFile(SourceKey))
  {
    result.error = new Error('api.RenameFolder Error !!! Source Is a File, SourceKey=' + SourceKey);
    result.isSuccessful = false;
    return result;
  }
  let TargetFolderKey = s3_helper.GetParentFolderKey(SourceKey) + TargetName + "/";
  let result_objects = await GetObjectList(Bucket, SourceKey);
  if(result_objects.isSuccessful)
  {
    for(var ObjectKey of result_objects.result as string[])
    {
      let TargetKey = ObjectKey.replace(SourceKey, TargetFolderKey);
      let move_result = await MoveObject(Bucket, ObjectKey, TargetKey);
      if(move_result.isSuccessful)
      {
        result.result.push(TargetKey);
      }
      else
      {
        result.error = move_result.error;
        result.isSuccessful = false;
        return result;
      }
    }
  }
  else
  {
    result.error = result_objects.error;
    result.isSuccessful = false;
    return result;
  }

  result.isSuccessful = true;
  ui.logToOutput("api.RenameFolder Success SourceKey=" + SourceKey + " TargetKey=" + TargetFolderKey);
  return result;
}

export async function RenameObject(Bucket:string, SourceKey:string, TargetName:string) : Promise<MethodResult<string[] | undefined>>
{
  let result = new MethodResult<string[] | undefined>();
  result.result = [];
  try 
  {
    if(s3_helper.IsFolder(SourceKey))
    {
      return RenameFolder(Bucket, SourceKey, TargetName);
    }
    else
    {
      return RenameFile(Bucket, SourceKey, TargetName);
    }    
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.RenameObject Error !!! File=' + SourceKey, error);
    ui.logToOutput("api.RenameObject Error !!! File=" + SourceKey, error); 
    return result;
  }

}

export async function DownloadObject(Bucket:string, Key:string, TargetPath:string, s3Client?:S3Client | undefined) : Promise<MethodResult<string>>
{
  if(s3_helper.IsFolder(Key))
  {
    return await DownloadFolder(Bucket, Key, TargetPath, s3Client);
  }
  else
  {
    return await DownloadFile(Bucket, Key, TargetPath, s3Client);
  }
  
}

export async function DownloadFolder(Bucket:string, Key:string, TargetPath:string, s3Client?:S3Client | undefined) : Promise<MethodResult<string>>
{
  let result = new MethodResult<string>();
  try 
  {

    const s3 = s3Client ? s3Client : await GetS3Client();

    let result_objects = await GetObjectList(Bucket, Key);
    if(result_objects.isSuccessful)
    {
      for(var ObjectKey of result_objects.result as string[])
      {
        if(s3_helper.IsFile(ObjectKey))
        {
          let download_result = await DownloadFile(Bucket, ObjectKey, TargetPath, s3);
          if(!download_result.isSuccessful)
          {
            throw download_result.error;
          }
        }
      }
    }

    result.result = TargetPath;
    result.isSuccessful = true;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.DownloadFolder Error !!! File=' + Key, error);
    ui.logToOutput("api.DownloadFolder Error !!! File=" + Key, error); 
    return result;
  }
} 

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';

export async function DownloadFile(
  Bucket: string,
  Key: string,
  TargetPath: string,
  s3Client?: S3Client
): Promise<MethodResult<string>> {
  let result = new MethodResult<string>();
  let fileName = s3_helper.GetFileNameWithExtension(Key);
  fileName = ui.SanitizeFileName(fileName);
  const TargetFilePath = join(TargetPath, fileName);

  try {
    const s3 = s3Client || await GetS3Client(); // If no s3Client provided, get a new one

    const params = {
      Bucket: Bucket,
      Key: Key,
    };

    const command = new GetObjectCommand(params);
    const data = await s3.send(command);

    // Pipe the data from the S3 object to a local file
    const readStream: Readable = data.Body as Readable;
    const writeStream = createWriteStream(TargetFilePath);
    readStream.pipe(writeStream);

    writeStream.on('finish', () => {
      ui.logToOutput(`Download File=${Key} to ${TargetFilePath}`);
      result.result = TargetFilePath;
      result.isSuccessful = true;
    });

    // Handle stream error
    writeStream.on('error', (error) => {
      result.isSuccessful = false;
      result.error = error;
      ui.showErrorMessage('api.DownloadFile Error !!! File=' + Key, error);
      ui.logToOutput('api.DownloadFile Error !!! File=' + Key, error);
    });

    // Wait for writeStream to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    ui.logToOutput('api.DownloadFile Success File=' + Key);
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.DownloadFile Error !!! File=' + Key, error);
    ui.logToOutput('api.DownloadFile Error !!! File=' + Key, error);
    return result;
  }
}


import { HeadBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
export async function GetBucketList(BucketName?: string): Promise<MethodResult<string[]>> {
  let result: MethodResult<string[]> = new MethodResult<string[]>();
  result.result = [];

  try {
    const s3 = await GetS3Client();

    if (BucketName) {
      try {
        const command = new HeadBucketCommand({ Bucket: BucketName });
        await s3.send(command);
        // bucket exists, so return it
        result.result.push(BucketName);
        result.isSuccessful = true;
        return result;
      } catch {
        // Ignore error if the bucket doesn't exist
      }
    }

    const command = new ListBucketsCommand({});
    const response = await s3.send(command);

    result.isSuccessful = true;
    if (response.Buckets) {
      for (const bucket of response.Buckets) {
        if (bucket.Name && (BucketName === undefined || BucketName === '' || bucket.Name.includes(BucketName))) {
          result.result.push(bucket.Name);
        }
      }
    }
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.GetBucketList Error !!!', error);
    ui.logToOutput('api.GetBucketList Error !!!', error);
    return result;
  }
}


import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
async function GetSTSClient(region: string) {
  const credentials = await GetCredentials();
  const iamClient = new STSClient(
    {
      region,
      credentials,
      endpoint: S3TreeView.S3TreeView.Current?.AwsEndPoint,
    }
  );
  return iamClient;
}

export async function TestAwsCredentials(): Promise<MethodResult<boolean>> {
  let result: MethodResult<boolean> = new MethodResult<boolean>();

  try {
    const credentials = await GetCredentials();

    result.isSuccessful = true;
    result.result = true;
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
    return result;
  }
}

export async function TestAwsConnection(Region: string="us-east-1"): Promise<MethodResult<boolean>> {
  let result: MethodResult<boolean> = new MethodResult<boolean>();

  try {
    const sts = await GetSTSClient(Region);

    const command = new GetCallerIdentityCommand({});
    const data = await sts.send(command);

    result.isSuccessful = true;
    result.result = true;
    return result;
  } catch (error: any) {
    result.isSuccessful = false;
    result.error = error;
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