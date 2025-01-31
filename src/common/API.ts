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
import * as S3TreeView from '../s3/S3TreeView';

export async function IsSharedIniFileCredentials(credentials:any|undefined=undefined)
{
  let result = await GetCredentialProviderName(credentials) === "SharedIniFileCredentials";
  if(S3TreeView.S3TreeView.Current)
  {
    S3TreeView.S3TreeView.Current.IsSharedIniFileCredentials = result;
  }
  return result;
}

export async function IsEnvironmentCredentials(credentials:any|undefined=undefined)
{
  return await GetCredentialProviderName(credentials) === "EnvironmentCredentials"
}

export async function GetCredentialProviderName(credentials:any|undefined=undefined){
  if(!credentials)
  {
    credentials = await GetCredentials();
  }
  if(S3TreeView.S3TreeView.Current)
  {
    S3TreeView.S3TreeView.Current.CredentialProviderName = credentials.constructor.name;
  }
  return credentials.constructor.name;
}

export async function GetCredentials()
{
  let credentials:AWS.Credentials|undefined;

  try
  {
    const provider = new AWS.CredentialProviderChain();
    credentials = await provider.resolvePromise();
    
    if(!credentials)
    {
      throw new Error("Aws credentials not found !!!")
    }
  
    if(await IsSharedIniFileCredentials(credentials))
    {
      if(S3TreeView.S3TreeView.Current && S3TreeView.S3TreeView.Current?.AwsProfile != "default")
      {
        credentials = new AWS.SharedIniFileCredentials({ profile: S3TreeView.S3TreeView.Current?.AwsProfile });
      }
    }
    ui.logToOutput("Aws credentials provider " + await GetCredentialProviderName(credentials));
    ui.logToOutput("Aws credentials AccessKeyId=" + credentials?.accessKeyId)
    return credentials    
  }
  catch (error:any) 
  {
    ui.showErrorMessage('Aws Credentials Not Found !!!', error);
    ui.logToOutput("GetCredentials Error !!!", error);
    return credentials;
  }

}

async function GetS3Client() {
  let s3 = undefined; 

  let credentials = await GetCredentials();
  s3 = new AWS.S3({ credentials: credentials, endpoint:S3TreeView.S3TreeView.Current?.AwsEndPoint, s3ForcePathStyle: true, region: S3TreeView.S3TreeView.Current?.AwsRegion });
  
  return s3;
}

async function GetIAMClient()
{
  let credentials = await GetCredentials();
  const iam = new AWS.IAM({credentials:credentials});
  return iam;
}

async function GetEC2Client()
{
  let credentials = await GetCredentials();
  const ec2 = new AWS.EC2({region: 'us-east-1', credentials:credentials});
  return ec2;
}

export async function GetFolderList(Bucket:string, Key:string): Promise<MethodResult<AWS.S3.ListObjectsV2Output | undefined>> {
  let result:MethodResult<AWS.S3.ListObjectsV2Output | undefined> = new MethodResult<AWS.S3.ListObjectsV2Output | undefined>();
  
  try 
  {
    const s3 = await GetS3Client();

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
    ui.showErrorMessage('api.GetFolderList Error !!!', error);
    ui.logToOutput("api.GetFolderList Error !!!", error); 
    return result;
  }
}

export async function GetObjectList(Bucket:string, Key:string, s3Client?:AWS.S3): Promise<MethodResult<string[] | undefined>> {
  let result:MethodResult<string[] | undefined> = new MethodResult<string[] | undefined>();
  
  try 
  {
    const s3 = s3Client ? s3Client : await GetS3Client();

    let continuationToken: any;
    let keys:string[] = [];
    do {
        const params = {
            Bucket:Bucket,
            Prefix:Key,
            ContinuationToken: continuationToken,
        };
        let response = await s3.listObjectsV2(params).promise();
        continuationToken = response.NextContinuationToken;
        if(response.Contents)
        {
          for(var file of response.Contents)
          {
            keys.push(file.Key as string);
          }
        }
    } while (continuationToken);
    
    result.isSuccessful = true;
    result.result = keys;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.GetObjectList Error !!!', error);
    ui.logToOutput("api.GetObjectList Error !!!", error); 
    return result;
  }
}

export async function SearchObject(Bucket: string, PrefixKey:string, FileName: string | undefined, FileExtension: string | undefined, FolderName: string | undefined, MaxResultCount: number = 100): Promise<MethodResult<AWS.S3.ObjectList | undefined>> {
  let result:MethodResult<AWS.S3.ObjectList | undefined> = new MethodResult<AWS.S3.ObjectList | undefined>();
  result.result = [];
  
  FileName = FileName?.toLowerCase();
  FileExtension = FileExtension?.toLowerCase();
  FolderName = FolderName?.toLowerCase();

  try 
  {
    const s3 = await GetS3Client();
  
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
    ui.showErrorMessage('api.SearchObject Error !!!', error);
    ui.logToOutput("api.SearchObject Error !!!", error); 
    return result;    
  }
}

export async function Select(Bucket: string, Key:string, Sql: string, MaxResultCount: number = 100): Promise<MethodResult<AWS.S3.SelectObjectContentEventStream | undefined>> {
  let result:MethodResult<AWS.S3.SelectObjectContentEventStream | undefined> = new MethodResult<AWS.S3.SelectObjectContentEventStream | undefined>();
  result.result = [];
  

  try 
  {
    const s3 = await GetS3Client();
  
    let extension = s3_helper.GetFileExtension(Key);
    if(!["csv", "json", "parquet"].includes(extension))
    {
      result.isSuccessful = false;
      result.error = new Error('Invalid Extension !!! File=' + Key);
      return result;
    }

    let inputSerialization = {};
    switch (extension) {
      case "csv":
        inputSerialization = {
          CSV: {
            FileHeaderInfo: 'USE',
            RecordDelimiter: '\n',
            FieldDelimiter: ','
          }
        };
        break;
      case "json":
        inputSerialization = {
          JSON: {
            Type: 'DOCUMENT'
          }
        };
        break;
      case "parquet":
        inputSerialization = {
          Parquet: {}
        };
        break;
      default:
        throw new Error('Unsupported file extension');
    }

    let params = {
      Bucket: Bucket,
      Key: Key,
      Expression: Sql,
      ExpressionType: 'SQL',
      InputSerialization: inputSerialization,
      OutputSerialization: {
        JSON: {
          RecordDelimiter: ','
        }
      }
    };

    let response = await s3.selectObjectContent(params).promise();
    result.result = response.Payload;
    
    result.isSuccessful = true;
    return result;
  } 
  catch (error:any) {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.Select Error !!!', error);
    ui.logToOutput("api.Select Error !!!", error); 
    return result;    
  }
}

export async function CreateFolder(Bucket:string, Key:string, FolderName:string): Promise<MethodResult<string>> {
  let result = new MethodResult<string>();
  let TargetKey = join(Key, FolderName + "/");

  try 
  {
    const s3 = await GetS3Client();

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

export async function DeleteObject(Bucket:string, Key:string, s3Client?:AWS.S3 | undefined): Promise<MethodResult<string[]>> {
  if (s3_helper.IsFolder(Key)) {
    return await DeleteFolder(Bucket, Key, s3Client);
  } else {
    return await DeleteFile(Bucket, Key, s3Client);
  }
}

export async function DeleteFile(Bucket:string, Key:string, s3Client?:AWS.S3 | undefined): Promise<MethodResult<string[]>> {
  let result = new MethodResult<string[]>();
  result.result = [];
  try 
  {
    const s3 = s3Client ? s3Client : await GetS3Client();

    let param = {
      Bucket:Bucket,
      Key:Key
    }

    let response = await s3.deleteObject(param).promise();
    ui.logToOutput("Delete File " + Key);
    result.result.push(Key);
    result.isSuccessful = true;
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

export async function DeleteFolder(Bucket:string, Key:string, s3Client?:AWS.S3 | undefined): Promise<MethodResult<string[]>> {
  let result = new MethodResult<string[]>();
  result.result = [];
  try 
  {
    if(!s3_helper.IsFolder(Key))
    {
      throw new Error('api.DeleteFolder Error !!! File=' + Key);
    }

    const s3 = s3Client ? s3Client : await GetS3Client();
    let result_objects = await GetObjectList(Bucket, Key);

    if(result_objects.isSuccessful)
    {
      for(var file of result_objects.result as string[])
      {
        let result_delete = await DeleteFile(Bucket, file, s3);
        if(result_delete.isSuccessful)
        {
          result.result.push(file);
        }
        else
        {
          throw result_delete.error;
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
    ui.showErrorMessage('api.DeleteObject Error !!! File=' + Key, error);
    ui.logToOutput("api.DeleteObject Error !!! File=" + Key, error); 
    return result;
  }
}

export async function UploadFileToFolder(Bucket:string, FolderKey:string, SourcePath:string) : Promise<MethodResult<string>>
{
  let result = new MethodResult<string>();
  if(!s3_helper.IsFolder(FolderKey))
  {
    result.isSuccessful = false;
    return result;
  }

  let TargetKey = join(FolderKey, s3_helper.GetFileNameWithExtension(SourcePath));

  return UploadFile(Bucket, TargetKey, SourcePath);
}

export async function UploadFile(Bucket:string, TargetKey:string, SourcePath:string) : Promise<MethodResult<string>>
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
    const s3 = await GetS3Client();

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

export async function CopyObject(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:AWS.S3 | undefined) : Promise<MethodResult<string[] | undefined>>
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

export async function CopyFile(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:AWS.S3 | undefined) : Promise<MethodResult<string[] | undefined>>
{
  let result = new MethodResult<string[] | undefined>();
  result.result = [];
  const s3 = s3Client ? s3Client : await GetS3Client();

  if(s3_helper.IsFolder(TargetKey))
  {
    TargetKey = TargetKey === "/" ? "" : TargetKey;
    TargetKey = TargetKey + s3_helper.GetFileNameWithExtension(SourceKey);
  }

  if(SourceKey === TargetKey)
  {
    result.isSuccessful = false;
    result.error = new Error('SourceKey and TargetKey are the same, SourceKey=' + SourceKey);
    return result;
  }
    
  try 
  {
    const param = {
      Bucket: Bucket,
      CopySource: `/${Bucket}/${SourceKey}`,
      Key: TargetKey,
    };

    let response = await s3.copyObject(param).promise();
    ui.logToOutput("Copy File " + SourceKey + " to " + TargetKey);
    result.result.push(TargetKey);
    result.isSuccessful = true;
    return result;
  } 
  catch (error:any) 
  {
    result.isSuccessful = false;
    result.error = error;
    ui.showErrorMessage('api.CopyFile Error !!! File=' + SourceKey, error);
    ui.logToOutput("api.CopyFile Error !!! File=" + SourceKey, error); 
    return result;
  }
}

export async function CopyFolder(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:AWS.S3 | undefined) : Promise<MethodResult<string[] | undefined>>
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

export async function MoveObject(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:AWS.S3 | undefined) : Promise<MethodResult<string[] | undefined>>
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

export async function MoveFile(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:AWS.S3 | undefined) : Promise<MethodResult<string[] | undefined>>
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
  
  let delete_result = await DeleteFile(Bucket, SourceKey, s3);
  if(!delete_result.isSuccessful)
  {
    result.error = delete_result.error;
    result.isSuccessful = false;
    return result;
  }

  result.result = copy_result.result;
  result.isSuccessful = true;
  return result;
}

export async function MoveFolder(Bucket:string, SourceKey:string, TargetKey:string, s3Client?:AWS.S3 | undefined) : Promise<MethodResult<string[] | undefined>>
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
  
  let delete_result = await DeleteFolder(Bucket, SourceKey, s3);
  if(!delete_result.isSuccessful)
  {
    result.error = delete_result.error;
    result.isSuccessful = false;
    return result;
  }

  result.result = copy_result.result;
  result.isSuccessful = true;
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

export async function DownloadObject(Bucket:string, Key:string, TargetPath:string, s3Client?:AWS.S3 | undefined) : Promise<MethodResult<string>>
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

export async function DownloadFolder(Bucket:string, Key:string, TargetPath:string, s3Client?:AWS.S3 | undefined) : Promise<MethodResult<string>>
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

export async function DownloadFile(Bucket:string, Key:string, TargetPath:string, s3Client?:AWS.S3 | undefined) : Promise<MethodResult<string>>
{
  let result = new MethodResult<string>();
  let TargetFilePath = join(TargetPath, s3_helper.GetFileNameWithExtension(Key))

  try 
  {
    const s3 = s3Client ? s3Client : await GetS3Client();

    const param = {
      Bucket: Bucket,
      Key: Key
    };

    let readStream = s3.getObject(param).createReadStream();
    let writeStream = fs.createWriteStream(TargetFilePath);
    readStream.pipe(writeStream);

    ui.logToOutput("Download File=" + Key + " to " + TargetFilePath); 
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

export async function GetBucketList(BucketName?:string): Promise<MethodResult<string[]>> {
  let result:MethodResult<string[]> = new MethodResult<string[]>();
  result.result = [];

  try 
  {
    const s3 = await GetS3Client();

    if (BucketName)
    {
      try
      {
        let is_bucket_response = await s3.headBucket({ Bucket: BucketName }).promise();
        //bucket exists, so return it
        result.result.push(BucketName);
        result.isSuccessful = true;
        return result;
      }
      catch {}
    }
    
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

export async function TestAwsConnection(): Promise<MethodResult<boolean>> {
  let result:MethodResult<boolean> = new MethodResult<boolean>();

  try 
  {
    const iam = await GetIAMClient()

    let response = await iam.getUser().promise();
    result.isSuccessful = true;
    result.result = true;
    return result;
  } 
  catch (error:any) 
  {
    if (error.name.includes("Signature"))
    {
      result.isSuccessful = false;
      result.error = error;
      ui.showErrorMessage('api.TestAwsConnection Error !!!', error);
      ui.logToOutput("api.TestAwsConnection Error !!!", error); 
    }
    else
    {
      result.isSuccessful = true;
      result.result = true;
    }
    
    return result;
  }
}

export async function GetRegionList(): Promise<MethodResult<string[]>> {
  let result:MethodResult<string[]> = new MethodResult<string[]>();
  result.result = [];

  try 
  {
    const ec2 = await GetEC2Client()
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