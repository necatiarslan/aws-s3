"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFilepath = exports.getCredentialsFilepath = exports.getHomeDir = exports.ENV_CREDENTIALS_PATH = exports.getIniProfileData = exports.GetAwsProfileList = exports.GetRegionList = exports.TestAwsConnection = exports.GetBucketList = exports.DownloadS3File = exports.RenameFile = exports.MoveFile = exports.CopyFile = exports.UploadFile = exports.UploadFileToFolder = exports.DeleteObject = exports.CreateS3Folder = exports.SearchS3Object = exports.GetS3ObjectList = exports.IsEnvironmentCredentials = exports.IsSharedIniFileCredentials = void 0;
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
function IsSharedIniFileCredentials(credentials = undefined) {
    if (credentials) {
        return GetCredentialProvider(credentials) === "SharedIniFileCredentials";
    }
    return GetCredentialProvider(AWS.config.credentials) === "SharedIniFileCredentials";
}
exports.IsSharedIniFileCredentials = IsSharedIniFileCredentials;
function IsEnvironmentCredentials(credentials = undefined) {
    if (credentials) {
        return GetCredentialProvider(credentials) === "EnvironmentCredentials";
    }
    return GetCredentialProvider(AWS.config.credentials) === "EnvironmentCredentials";
}
exports.IsEnvironmentCredentials = IsEnvironmentCredentials;
function GetCredentialProvider(credentials) {
    if (credentials instanceof (AWS.EnvironmentCredentials)) {
        return "EnvironmentCredentials";
    }
    else if (credentials instanceof (AWS.ECSCredentials)) {
        return "ECSCredentials";
    }
    else if (credentials instanceof (AWS.SsoCredentials)) {
        return "SsoCredentials";
    }
    else if (credentials instanceof (AWS.SharedIniFileCredentials)) {
        return "SharedIniFileCredentials";
    }
    else if (credentials instanceof (AWS.ProcessCredentials)) {
        return "ProcessCredentials";
    }
    else if (credentials instanceof (AWS.TokenFileWebIdentityCredentials)) {
        return "TokenFileWebIdentityCredentials";
    }
    else if (credentials instanceof (AWS.EC2MetadataCredentials)) {
        return "EC2MetadataCredentials";
    }
    return "UnknownProvider";
}
function GetCredentials() {
    if (!AWS.config.credentials) {
        throw new Error("Aws credentials not found !!!");
    }
    let credentials = AWS.config.credentials;
    if (IsSharedIniFileCredentials()) {
        if (S3TreeView.S3TreeView.Current && S3TreeView.S3TreeView.Current?.AwsProfile != "default") {
            credentials = new AWS.SharedIniFileCredentials({ profile: S3TreeView.S3TreeView.Current?.AwsProfile });
        }
    }
    ui.logToOutput("Aws credentials provider " + GetCredentialProvider(credentials));
    ui.logToOutput("Aws credentials AccessKeyId=" + credentials?.accessKeyId);
    return credentials;
}
function GetS3Client() {
    let s3 = undefined;
    let credentials = GetCredentials();
    s3 = new AWS.S3({ credentials: credentials, endpoint: S3TreeView.S3TreeView.Current?.AwsEndPoint });
    return s3;
}
function GetIAMClient() {
    let credentials = GetCredentials();
    const iam = new AWS.IAM({ credentials: credentials });
    return iam;
}
function GetEC2Client() {
    let credentials = GetCredentials();
    const ec2 = new AWS.EC2({ region: 'us-east-1', credentials: credentials });
    return ec2;
}
async function GetS3ObjectList(Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = GetS3Client();
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
        ui.showErrorMessage('api.GetS3ObjectList Error !!!', error);
        ui.logToOutput("api.GetS3ObjectList Error !!!", error);
        return result;
    }
}
exports.GetS3ObjectList = GetS3ObjectList;
async function SearchS3Object(Bucket, PrefixKey, FileName, FileExtension, FolderName, MaxResultCount = 100) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    FileName = FileName?.toLowerCase();
    FileExtension = FileExtension?.toLowerCase();
    FolderName = FolderName?.toLowerCase();
    try {
        const s3 = GetS3Client();
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
        ui.showErrorMessage('api.GetS3ObjectList Error !!!', error);
        ui.logToOutput("api.GetS3ObjectList Error !!!", error);
        return result;
    }
}
exports.SearchS3Object = SearchS3Object;
async function CreateS3Folder(Bucket, Key, FolderName) {
    let result = new MethodResult_1.MethodResult();
    let TargetKey = (0, path_2.join)(Key, FolderName + "/");
    try {
        const s3 = GetS3Client();
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
exports.CreateS3Folder = CreateS3Folder;
async function DeleteObject(Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    try {
        const s3 = GetS3Client();
        if (s3_helper.IsFolder(Key)) {
            const objects = await s3.listObjects({
                Bucket: Bucket,
                Prefix: Key
            }).promise();
            if (objects.Contents && objects.Contents.length > 1) {
                throw new Error(Key + " folder contains " + objects.Contents.length + " files");
            }
        }
        let param = {
            Bucket: Bucket,
            Key: Key
        };
        let response = await s3.deleteObject(param).promise();
        result.isSuccessful = true;
        result.result = true;
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
exports.DeleteObject = DeleteObject;
async function DeleteS3Folder(Bucket, Key) {
    // List all the objects in the folder
    const s3 = GetS3Client();
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
        const s3 = GetS3Client();
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
async function CopyFile(Bucket, SourceKey, TargetKey) {
    let result = new MethodResult_1.MethodResult();
    if (!s3_helper.IsFile(SourceKey)) {
        result.isSuccessful = false;
        return result;
    }
    if (s3_helper.IsFolder(TargetKey)) {
        TargetKey = TargetKey + s3_helper.GetFileNameWithExtension(SourceKey);
    }
    try {
        const s3 = GetS3Client();
        const param = {
            Bucket: Bucket,
            CopySource: `/${Bucket}/${SourceKey}`,
            Key: TargetKey,
        };
        let response = await s3.copyObject(param).promise();
        result.result = TargetKey;
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
async function MoveFile(Bucket, SourceKey, TargetKey) {
    let result = new MethodResult_1.MethodResult();
    let copy_result = await CopyFile(Bucket, SourceKey, TargetKey);
    if (!copy_result.isSuccessful) {
        result.result = copy_result.result;
        result.isSuccessful = false;
        return result;
    }
    let delete_result = await DeleteObject(Bucket, SourceKey);
    if (!delete_result.isSuccessful) {
        result.result = SourceKey;
        result.isSuccessful = false;
        return result;
    }
    result.result = copy_result.result;
    result.isSuccessful = true;
    return result;
}
exports.MoveFile = MoveFile;
async function RenameFile(Bucket, SourceKey, TargetFileName) {
    let TargetKey = s3_helper.GetParentFolderKey(SourceKey) + TargetFileName + "." + s3_helper.GetFileExtension(SourceKey);
    let result = new MethodResult_1.MethodResult();
    let move_result = await MoveFile(Bucket, SourceKey, TargetKey);
    result.result = TargetKey;
    result.isSuccessful = move_result.isSuccessful;
    result.error = move_result.error;
    return result;
}
exports.RenameFile = RenameFile;
async function DownloadS3File(Bucket, Key, TargetPath) {
    let result = new MethodResult_1.MethodResult();
    let TargetFilePath = (0, path_2.join)(TargetPath, s3_helper.GetFileNameWithExtension(Key));
    try {
        const s3 = GetS3Client();
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
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.DownloadS3File Error !!! File=' + Key, error);
        ui.logToOutput("api.DownloadS3File Error !!! File=" + Key, error);
        return result;
    }
}
exports.DownloadS3File = DownloadS3File;
async function GetBucketList(BucketName) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const s3 = GetS3Client();
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
        const iam = GetIAMClient();
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
        const ec2 = GetEC2Client();
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