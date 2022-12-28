"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFilepath = exports.getCredentialsFilepath = exports.getHomeDir = exports.ENV_CREDENTIALS_PATH = exports.getIniProfileData = exports.GetAwsProfileList = exports.GetRegionList = exports.TestAwsConnection = exports.GetBucketList = exports.DownloadS3File = exports.UploadFile = exports.UploadFileToFolder = exports.DeleteObject = exports.CreateS3Folder = exports.GetS3ObjectList = void 0;
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
async function GetS3ObjectList(Profile, Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    try {
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const s3 = new AWS.S3({ credentials: credentials });
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
async function CreateS3Folder(Profile, Bucket, Key, FolderName) {
    let result = new MethodResult_1.MethodResult();
    let TargetKey = (0, path_2.join)(Key, FolderName + "/");
    try {
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const s3 = new AWS.S3({ credentials: credentials });
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
async function DeleteObject(Profile, Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    try {
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const s3 = new AWS.S3({ credentials: credentials });
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
async function DeleteS3Folder(Profile, Bucket, Key) {
    // List all the objects in the folder
    const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
    const s3 = new AWS.S3({ credentials: credentials });
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
async function UploadFileToFolder(Profile, Bucket, FolderKey, SourcePath) {
    let result = new MethodResult_1.MethodResult();
    if (!s3_helper.IsFolder(FolderKey)) {
        result.isSuccessful = false;
        return result;
    }
    let TargetKey = (0, path_2.join)(FolderKey, s3_helper.GetFileNameWithExtension(SourcePath));
    return UploadFile(Profile, Bucket, TargetKey, SourcePath);
}
exports.UploadFileToFolder = UploadFileToFolder;
async function UploadFile(Profile, Bucket, TargetKey, SourcePath) {
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
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const s3 = new AWS.S3({ credentials: credentials });
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
async function DownloadS3File(Profile, Bucket, Key, TargetPath) {
    let result = new MethodResult_1.MethodResult();
    let TargetFilePath = (0, path_2.join)(TargetPath, s3_helper.GetFileNameWithExtension(Key));
    try {
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const s3 = new AWS.S3({ credentials: credentials });
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
async function GetBucketList(Profile, BucketName) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const s3 = new AWS.S3({ credentials: credentials });
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
async function TestAwsConnection(Profile) {
    let result = new MethodResult_1.MethodResult();
    try {
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const iam = new AWS.IAM({ credentials: credentials });
        let response = await iam.getUser().promise();
        result.isSuccessful = true;
        result.result = true;
        return result;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.TestAwsConnection Error !!!', error);
        ui.logToOutput("api.TestAwsConnection Error !!!", error);
        return result;
    }
}
exports.TestAwsConnection = TestAwsConnection;
async function GetRegionList(Profile) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const ec2 = new AWS.EC2({ region: 'us-east-1', credentials: credentials });
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