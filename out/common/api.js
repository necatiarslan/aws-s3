"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFilepath = exports.getCredentialsFilepath = exports.getHomeDir = exports.ENV_CREDENTIALS_PATH = exports.getIniProfileData = exports.GetAwsProfileList = exports.GetRegionList = exports.TestAwsConnection = exports.GetBucketList = exports.DownloadS3Object = exports.GetS3ObjectList = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const AWS = require("aws-sdk");
const ui = require("./UI");
const MethodResult_1 = require("./MethodResult");
const os_1 = require("os");
const path_1 = require("path");
const path_2 = require("path");
const parseKnownFiles_1 = require("../aws-sdk/parseKnownFiles");
async function GetS3ObjectList(Profile, Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const s3 = new AWS.S3({ credentials: credentials });
        let param = {
            Bucket: Bucket,
            Prefix: Key
        };
        let response = await s3.listObjectsV2(param).promise();
        result.isSuccessful = true;
        result.result = response.Contents;
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
async function DownloadS3Object(Profile, Bucket, Key) {
    let result = new MethodResult_1.MethodResult();
    try {
        const credentials = new AWS.SharedIniFileCredentials({ profile: Profile });
        const s3 = new AWS.S3({ credentials: credentials });
        const param = {
            Bucket: Bucket,
            Key: Key
        };
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
exports.DownloadS3Object = DownloadS3Object;
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