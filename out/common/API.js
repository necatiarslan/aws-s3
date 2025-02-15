"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFilepath = exports.getCredentialsFilepath = exports.getHomeDir = exports.ENV_CREDENTIALS_PATH = exports.getIniProfileData = exports.GetAwsProfileList = exports.GetRegionList = exports.TestAwsConnection = exports.GetBucketList = exports.DownloadFile = exports.DownloadFolder = exports.DownloadObject = exports.RenameObject = exports.RenameFolder = exports.RenameFile = exports.MoveFolder = exports.MoveFile = exports.MoveObject = exports.CopyFolder = exports.CopyFile = exports.CopyObject = exports.UploadFile = exports.UploadFileToFolder = exports.DeleteFolder = exports.DeleteFile = exports.DeleteObject = exports.CreateFolder = exports.Select = exports.SearchObject = exports.GetObjectProperties = exports.GetObjectList = exports.GetFolderList = exports.GetCredentials = exports.GetCredentialProviderName = exports.IsEnvironmentCredentials = exports.IsSharedIniFileCredentials = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const AWS = require("aws-sdk");
const ui = require("./UI");
const MethodResult_1 = require("./MethodResult");
const os_1 = require("os");
const path_1 = require("path");
const path_2 = require("path");
const parseKnownFiles_1 = require("../aws-sdk/parseKnownFiles");
const s3_helper = require("../s3/S3Helper");
const fs = require("fs");
const S3TreeView = require("../s3/S3TreeView");
async function IsSharedIniFileCredentials(credentials = undefined) {
    let result = await GetCredentialProviderName(credentials) === "SharedIniFileCredentials";
    if (S3TreeView.S3TreeView.Current) {
        S3TreeView.S3TreeView.Current.IsSharedIniFileCredentials = result;
    }
    return result;
}
exports.IsSharedIniFileCredentials = IsSharedIniFileCredentials;
async function IsEnvironmentCredentials(credentials = undefined) {
    return await GetCredentialProviderName(credentials) === "EnvironmentCredentials";
}
exports.IsEnvironmentCredentials = IsEnvironmentCredentials;
async function GetCredentialProviderName(credentials = undefined) {
    if (!credentials) {
        credentials = await GetCredentials();
    }
    if (S3TreeView.S3TreeView.Current) {
        S3TreeView.S3TreeView.Current.CredentialProviderName = credentials.constructor.name;
    }
    return credentials.constructor.name;
}
exports.GetCredentialProviderName = GetCredentialProviderName;
async function GetCredentials() {
    let credentials;
    try {
        const provider = new AWS.CredentialProviderChain();
        credentials = await provider.resolvePromise();
        if (!credentials) {
            throw new Error("Aws credentials not found !!!");
        }
        if (await IsSharedIniFileCredentials(credentials)) {
            if (S3TreeView.S3TreeView.Current && S3TreeView.S3TreeView.Current?.AwsProfile != "default") {
                credentials = new AWS.SharedIniFileCredentials({ profile: S3TreeView.S3TreeView.Current?.AwsProfile });
            }
        }
        ui.logToOutput("Aws credentials provider " + await GetCredentialProviderName(credentials));
        ui.logToOutput("Aws credentials AccessKeyId=" + credentials?.accessKeyId);
        return credentials;
    }
    catch (error) {
        ui.showErrorMessage('Aws Credentials Not Found !!!', error);
        ui.logToOutput("GetCredentials Error !!!", error);
        return credentials;
    }
}
exports.GetCredentials = GetCredentials;
async function GetS3Client() {
    let s3 = undefined;
    let credentials = await GetCredentials();
    s3 = new AWS.S3({ credentials: credentials, endpoint: S3TreeView.S3TreeView.Current?.AwsEndPoint, s3ForcePathStyle: true, region: S3TreeView.S3TreeView.Current?.AwsRegion });
    return s3;
}
async function GetIAMClient() {
    let credentials = await GetCredentials();
    const iam = new AWS.IAM({ credentials: credentials });
    return iam;
}
async function GetEC2Client() {
    let credentials = await GetCredentials();
    const ec2 = new AWS.EC2({ region: 'us-east-1', credentials: credentials });
    return ec2;
}
async function GetFolderList(Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = await GetS3Client();
        let param = {
            Bucket: Bucket,
            Prefix: Key,
            Delimiter: "/",
        };
        let response = await s3.listObjectsV2(param).promise();
        result.isSuccessful = true;
        result.result = response;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetFolderList Error !!!', error);
        ui.logToOutput("api.GetFolderList Error !!!", error);
        return result;
    }
}
exports.GetFolderList = GetFolderList;
async function GetObjectList(Bucket, Key, s3Client) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = s3Client ? s3Client : await GetS3Client();
        let continuationToken;
        let keys = [];
        do {
            const params = {
                Bucket: Bucket,
                Prefix: Key,
                ContinuationToken: continuationToken,
            };
            let response = await s3.listObjectsV2(params).promise();
            continuationToken = response.NextContinuationToken;
            if (response.Contents) {
                for (var file of response.Contents) {
                    keys.push(file.Key);
                }
            }
        } while (continuationToken);
        result.isSuccessful = true;
        result.result = keys;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetObjectList Error !!!', error);
        ui.logToOutput("api.GetObjectList Error !!!", error);
        return result;
    }
}
exports.GetObjectList = GetObjectList;
async function GetObjectProperties(Bucket, Key, s3Client) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = s3Client ? s3Client : await GetS3Client();
        const params = {
            Bucket: Bucket,
            Key: Key
        };
        let response = await s3.headObject(params).promise();
        result.result = response;
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetObjectList Error !!!', error);
        ui.logToOutput("api.GetObjectList Error !!!", error);
        return result;
    }
}
exports.GetObjectProperties = GetObjectProperties;
async function SearchObject(Bucket, PrefixKey, FileName, FileExtension, FolderName, MaxResultCount = 100) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    FileName = FileName?.toLowerCase();
    FileExtension = FileExtension?.toLowerCase();
    FolderName = FolderName?.toLowerCase();
    try {
        const s3 = await GetS3Client();
        let continuationToken;
        do {
            const params = {
                Bucket: Bucket,
                Prefix: PrefixKey,
                ContinuationToken: continuationToken,
                MaxKeys: 100
            };
            const response = await s3.listObjectsV2(params).promise();
            continuationToken = response.NextContinuationToken;
            if (response.Contents) {
                for (var file of response.Contents) {
                    let fileKey = file.Key?.toLowerCase();
                    let currentFileName = s3_helper.GetFileNameWithExtension(fileKey);
                    if ((!FolderName || FolderName.length === 0 || (FolderName && FolderName.length > 0 && fileKey && fileKey.includes(FolderName)))
                        &&
                            (!FileName || FileName.length === 0 || (FileName && FileName.length > 0 && currentFileName.includes(FileName)))
                        &&
                            (!FileExtension || FileExtension.length === 0 || (FileExtension && FileExtension.length > 0 && s3_helper.GetFileExtension(currentFileName) === FileExtension))) {
                        result.result.push(file);
                        continue;
                    }
                }
            }
            if (MaxResultCount > 0 && result.result.length >= MaxResultCount) {
                break;
            }
        } while (continuationToken);
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.SearchObject Error !!!', error);
        ui.logToOutput("api.SearchObject Error !!!", error);
        return result;
    }
}
exports.SearchObject = SearchObject;
async function Select(Bucket, Key, Sql, MaxResultCount = 100) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const s3 = await GetS3Client();
        let extension = s3_helper.GetFileExtension(Key);
        if (!["csv", "json", "parquet"].includes(extension)) {
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
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.Select Error !!!', error);
        ui.logToOutput("api.Select Error !!!", error);
        return result;
    }
}
exports.Select = Select;
async function CreateFolder(Bucket, Key, FolderName) {
    let result = new MethodResult_1.MethodResult();
    let TargetKey = (0, path_2.join)(Key, FolderName + "/");
    try {
        const s3 = await GetS3Client();
        let param = {
            Bucket: Bucket,
            Key: TargetKey
        };
        let response = await s3.putObject(param).promise();
        result.isSuccessful = true;
        result.result = TargetKey;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.CreateS3Folder Error !!!', error);
        ui.logToOutput("api.CreateS3Folder Error !!!", error);
        return result;
    }
}
exports.CreateFolder = CreateFolder;
async function DeleteObject(Bucket, Key, s3Client) {
    if (s3_helper.IsFolder(Key)) {
        return await DeleteFolder(Bucket, Key, s3Client);
    }
    else {
        return await DeleteFile(Bucket, Key, s3Client);
    }
}
exports.DeleteObject = DeleteObject;
async function DeleteFile(Bucket, Key, s3Client) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const s3 = s3Client ? s3Client : await GetS3Client();
        let param = {
            Bucket: Bucket,
            Key: Key
        };
        let response = await s3.deleteObject(param).promise();
        ui.logToOutput("Delete File " + Key);
        result.result.push(Key);
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.DeleteObject Error !!! File=' + Key, error);
        ui.logToOutput("api.DeleteObject Error !!! File=" + Key, error);
        return result;
    }
}
exports.DeleteFile = DeleteFile;
async function DeleteFolder(Bucket, Key, s3Client) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        if (!s3_helper.IsFolder(Key)) {
            throw new Error('api.DeleteFolder Error !!! File=' + Key);
        }
        const s3 = s3Client ? s3Client : await GetS3Client();
        let result_objects = await GetObjectList(Bucket, Key);
        if (result_objects.isSuccessful) {
            for (var file of result_objects.result) {
                let result_delete = await DeleteFile(Bucket, file, s3);
                if (result_delete.isSuccessful) {
                    result.result.push(file);
                }
                else {
                    throw result_delete.error;
                }
            }
        }
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.DeleteObject Error !!! File=' + Key, error);
        ui.logToOutput("api.DeleteObject Error !!! File=" + Key, error);
        return result;
    }
}
exports.DeleteFolder = DeleteFolder;
async function UploadFileToFolder(Bucket, FolderKey, SourcePath) {
    let result = new MethodResult_1.MethodResult();
    if (!s3_helper.IsFolder(FolderKey)) {
        result.isSuccessful = false;
        return result;
    }
    let TargetKey = (0, path_2.join)(FolderKey, s3_helper.GetFileNameWithExtension(SourcePath));
    return UploadFile(Bucket, TargetKey, SourcePath);
}
exports.UploadFileToFolder = UploadFileToFolder;
async function UploadFile(Bucket, TargetKey, SourcePath) {
    let result = new MethodResult_1.MethodResult();
    if (!s3_helper.IsFile(TargetKey)) {
        result.isSuccessful = false;
        return result;
    }
    if (s3_helper.GetFileExtension(TargetKey) !== s3_helper.GetFileExtension(SourcePath)) {
        result.isSuccessful = false;
        return result;
    }
    try {
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
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.UploadS3File Error !!! File=' + SourcePath, error);
        ui.logToOutput("api.UploadS3File Error !!! File=" + SourcePath, error);
        return result;
    }
}
exports.UploadFile = UploadFile;
async function CopyObject(Bucket, SourceKey, TargetKey, s3Client) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        if (s3_helper.IsFolder(SourceKey)) {
            return await CopyFolder(Bucket, SourceKey, TargetKey, s3Client);
        }
        else {
            return await CopyFile(Bucket, SourceKey, TargetKey, s3Client);
        }
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.CopyObject Error !!! SourceKey=' + SourceKey, error);
        ui.logToOutput("api.CopyObject Error !!! SourceKey=" + SourceKey, error);
        return result;
    }
}
exports.CopyObject = CopyObject;
async function CopyFile(Bucket, SourceKey, TargetKey, s3Client) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    const s3 = s3Client ? s3Client : await GetS3Client();
    if (s3_helper.IsFolder(TargetKey)) {
        TargetKey = TargetKey === "/" ? "" : TargetKey;
        TargetKey = TargetKey + s3_helper.GetFileNameWithExtension(SourceKey);
    }
    if (SourceKey === TargetKey) {
        result.isSuccessful = false;
        result.error = new Error('SourceKey and TargetKey are the same, SourceKey=' + SourceKey);
        return result;
    }
    try {
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
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.CopyFile Error !!! File=' + SourceKey, error);
        ui.logToOutput("api.CopyFile Error !!! File=" + SourceKey, error);
        return result;
    }
}
exports.CopyFile = CopyFile;
async function CopyFolder(Bucket, SourceKey, TargetKey, s3Client) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        if (s3_helper.IsFile(SourceKey)) {
            result.isSuccessful = false;
            result.error = new Error('Source Is a File, SourceKey=' + SourceKey);
            return result;
        }
        if (s3_helper.IsFile(TargetKey)) {
            result.isSuccessful = false;
            result.error = new Error('Target Is a File, TargetKey=' + SourceKey);
            return result;
        }
        const s3 = s3Client ? s3Client : await GetS3Client();
        let result_objects = await GetObjectList(Bucket, SourceKey);
        if (result_objects.isSuccessful) {
            for (var file of result_objects.result) {
                const parentFolder = s3_helper.GetParentFolderKey(SourceKey);
                const relativeFilePath = file.replace(parentFolder, "");
                const TargetFileKey = TargetKey + relativeFilePath;
                let result_copy = await CopyFile(Bucket, file, TargetFileKey, s3);
                if (result_copy.isSuccessful) {
                    result.result.push(file);
                }
                else {
                    throw result_copy.error;
                }
            }
        }
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.CopyFolder Error !!! SourceKey=' + SourceKey, error);
        ui.logToOutput("api.CopyFolder Error !!! SourceKey=" + SourceKey, error);
        return result;
    }
}
exports.CopyFolder = CopyFolder;
async function MoveObject(Bucket, SourceKey, TargetKey, s3Client) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        if (SourceKey === TargetKey) {
            result.isSuccessful == false;
            result.error = new Error('api.MoveObject Error !!! SourceKey and TargetKey are the same, SourceKey=' + SourceKey);
            return result;
        }
        if (s3_helper.IsFolder(SourceKey)) {
            return MoveFolder(Bucket, SourceKey, TargetKey, s3Client);
        }
        else {
            return MoveFile(Bucket, SourceKey, TargetKey, s3Client);
        }
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.MoveObject Error !!! SourceKey=' + SourceKey, error);
        ui.logToOutput("api.MoveObject Error !!! SourceKey=" + SourceKey, error);
        return result;
    }
}
exports.MoveObject = MoveObject;
async function MoveFile(Bucket, SourceKey, TargetKey, s3Client) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    if (SourceKey === TargetKey) {
        result.isSuccessful = false;
        result.error = new Error('SourceKey and TargetKey are the same, SourceKey=' + SourceKey);
        return result;
    }
    const s3 = s3Client ? s3Client : await GetS3Client();
    let copy_result = await CopyFile(Bucket, SourceKey, TargetKey, s3);
    if (!copy_result.isSuccessful) {
        result.error = copy_result.error;
        result.isSuccessful = false;
        return result;
    }
    let delete_result = await DeleteFile(Bucket, SourceKey, s3);
    if (!delete_result.isSuccessful) {
        result.error = delete_result.error;
        result.isSuccessful = false;
        return result;
    }
    result.result = copy_result.result;
    result.isSuccessful = true;
    return result;
}
exports.MoveFile = MoveFile;
async function MoveFolder(Bucket, SourceKey, TargetKey, s3Client) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    if (SourceKey === TargetKey) {
        result.isSuccessful = false;
        result.error = new Error('SourceKey and TargetKey are the same, SourceKey=' + SourceKey);
        return result;
    }
    if (!s3_helper.IsFolder(SourceKey)) {
        result.error = new Error('api.MoveFolder Error !!! Source Is a File, SourceKey=' + SourceKey);
        result.isSuccessful = false;
        return result;
    }
    if (!s3_helper.IsFolder(TargetKey)) {
        result.error = new Error('api.MoveFolder Error !!! Target Is a File, TargetKey=' + SourceKey);
        result.isSuccessful = false;
        return result;
    }
    const s3 = s3Client ? s3Client : await GetS3Client();
    let copy_result = await CopyFolder(Bucket, SourceKey, TargetKey, s3);
    if (!copy_result.isSuccessful) {
        result.error = copy_result.error;
        result.isSuccessful = false;
        return result;
    }
    let delete_result = await DeleteFolder(Bucket, SourceKey, s3);
    if (!delete_result.isSuccessful) {
        result.error = delete_result.error;
        result.isSuccessful = false;
        return result;
    }
    result.result = copy_result.result;
    result.isSuccessful = true;
    return result;
}
exports.MoveFolder = MoveFolder;
async function RenameFile(Bucket, SourceKey, TargetName) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    if (s3_helper.IsFolder(SourceKey)) {
        result.error = new Error('api.RenameFile Error !!! Source Is a Folder, SourceKey=' + SourceKey);
        result.isSuccessful = false;
        return result;
    }
    let TargetKey = s3_helper.GetParentFolderKey(SourceKey) + TargetName + "." + s3_helper.GetFileExtension(SourceKey);
    let move_result = await MoveObject(Bucket, SourceKey, TargetKey);
    result.result = move_result.result;
    result.isSuccessful = move_result.isSuccessful;
    result.error = move_result.error;
    return result;
}
exports.RenameFile = RenameFile;
async function RenameFolder(Bucket, SourceKey, TargetName) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    if (s3_helper.IsFile(SourceKey)) {
        result.error = new Error('api.RenameFolder Error !!! Source Is a File, SourceKey=' + SourceKey);
        result.isSuccessful = false;
        return result;
    }
    let TargetFolderKey = s3_helper.GetParentFolderKey(SourceKey) + TargetName + "/";
    let result_objects = await GetObjectList(Bucket, SourceKey);
    if (result_objects.isSuccessful) {
        for (var ObjectKey of result_objects.result) {
            let TargetKey = ObjectKey.replace(SourceKey, TargetFolderKey);
            let move_result = await MoveObject(Bucket, ObjectKey, TargetKey);
            if (move_result.isSuccessful) {
                result.result.push(TargetKey);
            }
            else {
                result.error = move_result.error;
                result.isSuccessful = false;
                return result;
            }
        }
    }
    else {
        result.error = result_objects.error;
        result.isSuccessful = false;
        return result;
    }
    result.isSuccessful = true;
    return result;
}
exports.RenameFolder = RenameFolder;
async function RenameObject(Bucket, SourceKey, TargetName) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        if (s3_helper.IsFolder(SourceKey)) {
            return RenameFolder(Bucket, SourceKey, TargetName);
        }
        else {
            return RenameFile(Bucket, SourceKey, TargetName);
        }
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.RenameObject Error !!! File=' + SourceKey, error);
        ui.logToOutput("api.RenameObject Error !!! File=" + SourceKey, error);
        return result;
    }
}
exports.RenameObject = RenameObject;
async function DownloadObject(Bucket, Key, TargetPath, s3Client) {
    if (s3_helper.IsFolder(Key)) {
        return await DownloadFolder(Bucket, Key, TargetPath, s3Client);
    }
    else {
        return await DownloadFile(Bucket, Key, TargetPath, s3Client);
    }
}
exports.DownloadObject = DownloadObject;
async function DownloadFolder(Bucket, Key, TargetPath, s3Client) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = s3Client ? s3Client : await GetS3Client();
        let result_objects = await GetObjectList(Bucket, Key);
        if (result_objects.isSuccessful) {
            for (var ObjectKey of result_objects.result) {
                if (s3_helper.IsFile(ObjectKey)) {
                    let download_result = await DownloadFile(Bucket, ObjectKey, TargetPath, s3);
                    if (!download_result.isSuccessful) {
                        throw download_result.error;
                    }
                }
            }
        }
        result.result = TargetPath;
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.DownloadFolder Error !!! File=' + Key, error);
        ui.logToOutput("api.DownloadFolder Error !!! File=" + Key, error);
        return result;
    }
}
exports.DownloadFolder = DownloadFolder;
async function DownloadFile(Bucket, Key, TargetPath, s3Client) {
    let result = new MethodResult_1.MethodResult();
    let TargetFilePath = (0, path_2.join)(TargetPath, s3_helper.GetFileNameWithExtension(Key));
    try {
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
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.DownloadS3File Error !!! File=' + Key, error);
        ui.logToOutput("api.DownloadS3File Error !!! File=" + Key, error);
        return result;
    }
}
exports.DownloadFile = DownloadFile;
async function GetBucketList(BucketName) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const s3 = await GetS3Client();
        if (BucketName) {
            try {
                let is_bucket_response = await s3.headBucket({ Bucket: BucketName }).promise();
                //bucket exists, so return it
                result.result.push(BucketName);
                result.isSuccessful = true;
                return result;
            }
            catch { }
        }
        let response = await s3.listBuckets().promise();
        result.isSuccessful = true;
        if (response.Buckets) {
            for (var bucket of response.Buckets) {
                if (bucket.Name && (BucketName === undefined || BucketName === "" || bucket.Name.includes(BucketName))) {
                    result.result.push(bucket.Name);
                }
            }
        }
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetBucketList Error !!!', error);
        ui.logToOutput("api.GetBucketList Error !!!", error);
        return result;
    }
}
exports.GetBucketList = GetBucketList;
async function TestAwsConnection() {
    let result = new MethodResult_1.MethodResult();
    try {
        const iam = await GetIAMClient();
        let response = await iam.getUser().promise();
        result.isSuccessful = true;
        result.result = true;
        return result;
    }
    catch (error) {
        if (error.name.includes("Signature")) {
            result.isSuccessful = false;
            result.error = error;
            ui.showErrorMessage('api.TestAwsConnection Error !!!', error);
            ui.logToOutput("api.TestAwsConnection Error !!!", error);
        }
        else {
            result.isSuccessful = true;
            result.result = true;
        }
        return result;
    }
}
exports.TestAwsConnection = TestAwsConnection;
async function GetRegionList() {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const ec2 = await GetEC2Client();
        let response = await ec2.describeRegions().promise();
        result.isSuccessful = true;
        if (response.Regions) {
            for (var r of response.Regions) {
                if (r.RegionName) {
                    result.result.push(r.RegionName);
                }
            }
        }
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetRegionList Error !!!', error);
        ui.logToOutput("api.GetRegionList Error !!!", error);
        return result;
    }
}
exports.GetRegionList = GetRegionList;
async function GetAwsProfileList() {
    ui.logToOutput("api.GetAwsProfileList Started");
    let result = new MethodResult_1.MethodResult();
    try {
        let profileData = await getIniProfileData();
        result.result = Object.keys(profileData);
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetAwsProfileList Error !!!', error);
        ui.logToOutput("api.GetAwsProfileList Error !!!", error);
        return result;
    }
}
exports.GetAwsProfileList = GetAwsProfileList;
async function getIniProfileData(init = {}) {
    const profiles = await (0, parseKnownFiles_1.parseKnownFiles)(init);
    return profiles;
}
exports.getIniProfileData = getIniProfileData;
exports.ENV_CREDENTIALS_PATH = "AWS_SHARED_CREDENTIALS_FILE";
const getHomeDir = () => {
    const { HOME, USERPROFILE, HOMEPATH, HOMEDRIVE = `C:${path_1.sep}` } = process.env;
    if (HOME) {
        return HOME;
    }
    if (USERPROFILE) {
        return USERPROFILE;
    }
    if (HOMEPATH) {
        return `${HOMEDRIVE}${HOMEPATH}`;
    }
    return (0, os_1.homedir)();
};
exports.getHomeDir = getHomeDir;
const getCredentialsFilepath = () => process.env[exports.ENV_CREDENTIALS_PATH] || (0, path_2.join)((0, exports.getHomeDir)(), ".aws", "credentials");
exports.getCredentialsFilepath = getCredentialsFilepath;
const getConfigFilepath = () => process.env[exports.ENV_CREDENTIALS_PATH] || (0, path_2.join)((0, exports.getHomeDir)(), ".aws", "config");
exports.getConfigFilepath = getConfigFilepath;
//# sourceMappingURL=API.js.map