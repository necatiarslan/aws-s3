"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFilepath = exports.getCredentialsFilepath = exports.getHomeDir = exports.ENV_CREDENTIALS_PATH = exports.getIniProfileData = exports.GetAwsProfileList = exports.TestAwsConnection = exports.TestAwsCredentials = exports.GetBucketList = exports.DownloadFile = exports.DownloadFolder = exports.DownloadObject = exports.RenameObject = exports.RenameFolder = exports.RenameFile = exports.MoveFolder = exports.MoveFile = exports.MoveObject = exports.CopyFolder = exports.CopyFile = exports.CopyObject = exports.UploadFile = exports.UploadFileToFolder = exports.DeleteFolder = exports.DeleteFile = exports.DeleteObject = exports.CreateFolder = exports.SearchObject = exports.GetObjectProperties = exports.GetObjectList = exports.GetFolderList = exports.GetIAMClient = exports.GetS3Client = exports.GetCredentials = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const ui = require("./UI");
const MethodResult_1 = require("./MethodResult");
const os_1 = require("os");
const path_1 = require("path");
const path_2 = require("path");
const parseKnownFiles_1 = require("../aws-sdk/parseKnownFiles");
const s3_helper = require("../s3/S3Helper");
const fs = require("fs");
const S3TreeView = require("../s3/S3TreeView");
const credential_providers_1 = require("@aws-sdk/credential-providers");
async function GetCredentials() {
    let credentials;
    try {
        if (S3TreeView.S3TreeView.Current) {
            process.env.AWS_PROFILE = S3TreeView.S3TreeView.Current.AwsProfile;
        }
        // Get credentials using the default provider chain.
        const provider = (0, credential_providers_1.fromNodeProviderChain)();
        credentials = await provider();
        if (!credentials) {
            throw new Error("Aws credentials not found !!!");
        }
        ui.logToOutput("Aws credentials AccessKeyId=" + credentials.accessKeyId);
        return credentials;
    }
    catch (error) {
        ui.showErrorMessage("Aws Credentials Not Found !!!", error);
        ui.logToOutput("GetCredentials Error !!!", error);
        return credentials;
    }
}
exports.GetCredentials = GetCredentials;
const client_s3_1 = require("@aws-sdk/client-s3");
async function GetS3Client() {
    let credentials = await GetCredentials();
    return new client_s3_1.S3Client({
        credentials: credentials,
        endpoint: S3TreeView.S3TreeView.Current?.AwsEndPoint,
        forcePathStyle: true,
        region: S3TreeView.S3TreeView.Current?.AwsRegion,
    });
}
exports.GetS3Client = GetS3Client;
const client_iam_1 = require("@aws-sdk/client-iam");
async function GetIAMClient() {
    let credentials = await GetCredentials();
    return new client_iam_1.IAMClient({ credentials: credentials });
}
exports.GetIAMClient = GetIAMClient;
const client_s3_2 = require("@aws-sdk/client-s3");
async function GetFolderList(Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = await GetS3Client();
        const params = {
            Bucket: Bucket,
            Prefix: Key,
            Delimiter: "/",
        };
        const command = new client_s3_2.ListObjectsV2Command(params);
        const response = await s3.send(command);
        result.isSuccessful = true;
        result.result = response;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage("api.GetFolderList Error !!!", error);
        ui.logToOutput("api.GetFolderList Error !!!", error);
        return result;
    }
}
exports.GetFolderList = GetFolderList;
async function GetObjectList(Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    let keys = [];
    let continuationToken;
    try {
        const s3 = await GetS3Client();
        do {
            const params = { Bucket, Prefix: Key, ContinuationToken: continuationToken };
            const command = new client_s3_2.ListObjectsV2Command(params);
            const response = await s3.send(command);
            continuationToken = response.NextContinuationToken;
            response.Contents?.forEach((file) => keys.push(file.Key));
        } while (continuationToken);
        result.isSuccessful = true;
        result.result = keys;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage("api.GetObjectList Error !!!", error);
        ui.logToOutput("api.GetObjectList Error !!!", error);
        return result;
    }
}
exports.GetObjectList = GetObjectList;
const client_s3_3 = require("@aws-sdk/client-s3");
async function GetObjectProperties(Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = await GetS3Client();
        const command = new client_s3_3.HeadObjectCommand({ Bucket, Key });
        const response = await s3.send(command);
        result.isSuccessful = true;
        result.result = response;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage("api.GetObjectProperties Error !!!", error);
        ui.logToOutput("api.GetObjectProperties Error !!!", error);
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
                MaxKeys: 100,
            };
            const command = new client_s3_2.ListObjectsV2Command(params);
            const response = await s3.send(command);
            continuationToken = response.NextContinuationToken;
            if (response.Contents) {
                for (let file of response.Contents) {
                    let fileKey = file.Key?.toLowerCase();
                    let currentFileName = s3_helper.GetFileNameWithExtension(fileKey);
                    if ((!FolderName || FolderName.length === 0 || (FolderName && fileKey && fileKey.includes(FolderName))) &&
                        (!FileName || FileName.length === 0 || (FileName && currentFileName.includes(FileName))) &&
                        (!FileExtension || FileExtension.length === 0 || (FileExtension && s3_helper.GetFileExtension(currentFileName) === FileExtension))) {
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
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.SearchObject Error !!!', error);
        ui.logToOutput('api.SearchObject Error !!!', error);
        return result;
    }
}
exports.SearchObject = SearchObject;
const client_s3_4 = require("@aws-sdk/client-s3");
async function CreateFolder(Bucket, Key, FolderName) {
    let result = new MethodResult_1.MethodResult();
    let TargetKey = `${Key}${FolderName}/`;
    try {
        const s3 = await GetS3Client();
        const param = { Bucket, Key: TargetKey };
        const command = new client_s3_4.PutObjectCommand(param);
        await s3.send(command);
        result.isSuccessful = true;
        result.result = TargetKey;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage("api.CreateFolder Error !!!", error);
        ui.logToOutput("api.CreateFolder Error !!!", error);
        return result;
    }
}
exports.CreateFolder = CreateFolder;
const client_s3_5 = require("@aws-sdk/client-s3");
async function DeleteObject(Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = await GetS3Client();
        const command = new client_s3_5.DeleteObjectCommand({ Bucket, Key });
        await s3.send(command);
        result.isSuccessful = true;
        result.result = `Deleted: ${Key}`;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage("api.DeleteObject Error !!!", error);
        ui.logToOutput("api.DeleteObject Error !!!", error);
        return result;
    }
}
exports.DeleteObject = DeleteObject;
async function DeleteFile(Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const s3 = await GetS3Client();
        const command = new client_s3_5.DeleteObjectCommand({ Bucket, Key });
        await s3.send(command);
        ui.logToOutput("Delete File " + Key);
        result.result.push(Key);
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage("api.DeleteFile Error !!! File=" + Key, error);
        ui.logToOutput("api.DeleteFile Error !!! File=" + Key, error);
        return result;
    }
}
exports.DeleteFile = DeleteFile;
async function DeleteFolder(Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        if (!s3_helper.IsFolder(Key)) {
            throw new Error("api.DeleteFolder Error !!! File=" + Key);
        }
        const s3 = await GetS3Client();
        let result_objects = await GetObjectList(Bucket, Key);
        if (result_objects.isSuccessful) {
            for (const file of result_objects.result) {
                let result_delete = await DeleteFile(Bucket, file);
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
        ui.showErrorMessage("api.DeleteFolder Error !!! File=" + Key, error);
        ui.logToOutput("api.DeleteFolder Error !!! File=" + Key, error);
        return result;
    }
}
exports.DeleteFolder = DeleteFolder;
async function UploadFileToFolder(Bucket, FolderKey, SourcePath) {
    let result = new MethodResult_1.MethodResult();
    let TargetKey = `${FolderKey}${s3_helper.GetFileNameWithExtension(SourcePath)}`;
    return UploadFile(Bucket, TargetKey, SourcePath);
}
exports.UploadFileToFolder = UploadFileToFolder;
async function UploadFile(Bucket, TargetKey, SourcePath) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = await GetS3Client();
        const stream = fs.createReadStream(SourcePath);
        const param = {
            Bucket,
            Key: TargetKey,
            Body: stream,
        };
        const command = new client_s3_4.PutObjectCommand(param);
        await s3.send(command);
        result.result = TargetKey;
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage("api.UploadS3File Error !!! File=" + SourcePath, error);
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
const client_s3_6 = require("@aws-sdk/client-s3");
async function CopyFile(Bucket, SourceKey, TargetKey, s3Client) {
    let result = new MethodResult_1.MethodResult();
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
        const command = new client_s3_6.CopyObjectCommand(params);
        const response = await s3.send(command);
        ui.logToOutput(`Copy File ${SourceKey} to ${TargetKey}`);
        result.result.push(TargetKey);
        result.isSuccessful = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.CopyFile Error !!! File=' + SourceKey, error);
        ui.logToOutput('api.CopyFile Error !!! File=' + SourceKey, error);
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
    let delete_result = await DeleteFile(Bucket, SourceKey);
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
    let delete_result = await DeleteFolder(Bucket, SourceKey);
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
const client_s3_7 = require("@aws-sdk/client-s3");
const fs_1 = require("fs");
async function DownloadFile(Bucket, Key, TargetPath, s3Client) {
    let result = new MethodResult_1.MethodResult();
    const TargetFilePath = (0, path_2.join)(TargetPath, s3_helper.GetFileNameWithExtension(Key));
    try {
        const s3 = s3Client || await GetS3Client(); // If no s3Client provided, get a new one
        const params = {
            Bucket: Bucket,
            Key: Key,
        };
        const command = new client_s3_7.GetObjectCommand(params);
        const data = await s3.send(command);
        // Pipe the data from the S3 object to a local file
        const readStream = data.Body;
        const writeStream = (0, fs_1.createWriteStream)(TargetFilePath);
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
            ui.showErrorMessage('api.DownloadS3File Error !!! File=' + Key, error);
            ui.logToOutput('api.DownloadS3File Error !!! File=' + Key, error);
        });
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.DownloadS3File Error !!! File=' + Key, error);
        ui.logToOutput('api.DownloadS3File Error !!! File=' + Key, error);
        return result;
    }
}
exports.DownloadFile = DownloadFile;
const client_s3_8 = require("@aws-sdk/client-s3");
async function GetBucketList(BucketName) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const s3 = await GetS3Client();
        if (BucketName) {
            try {
                const command = new client_s3_8.HeadBucketCommand({ Bucket: BucketName });
                await s3.send(command);
                // bucket exists, so return it
                result.result.push(BucketName);
                result.isSuccessful = true;
                return result;
            }
            catch {
                // Ignore error if the bucket doesn't exist
            }
        }
        const command = new client_s3_8.ListBucketsCommand({});
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
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetBucketList Error !!!', error);
        ui.logToOutput('api.GetBucketList Error !!!', error);
        return result;
    }
}
exports.GetBucketList = GetBucketList;
const client_sts_1 = require("@aws-sdk/client-sts");
async function GetSTSClient(region) {
    const credentials = await GetCredentials();
    const iamClient = new client_sts_1.STSClient({
        region,
        credentials,
        endpoint: S3TreeView.S3TreeView.Current?.AwsEndPoint,
    });
    return iamClient;
}
async function TestAwsCredentials() {
    let result = new MethodResult_1.MethodResult();
    try {
        const credentials = await GetCredentials();
        result.isSuccessful = true;
        result.result = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        return result;
    }
}
exports.TestAwsCredentials = TestAwsCredentials;
async function TestAwsConnection(Region = "us-east-1") {
    let result = new MethodResult_1.MethodResult();
    try {
        const sts = await GetSTSClient(Region);
        const command = new client_sts_1.GetCallerIdentityCommand({});
        const data = await sts.send(command);
        result.isSuccessful = true;
        result.result = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        return result;
    }
}
exports.TestAwsConnection = TestAwsConnection;
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