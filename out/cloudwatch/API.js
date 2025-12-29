"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFilepath = exports.getCredentialsFilepath = exports.getHomeDir = exports.ENV_CREDENTIALS_PATH = void 0;
exports.GetCloudWatchLogsClient = GetCloudWatchLogsClient;
exports.GetLogGroupList = GetLogGroupList;
exports.GetLogGroupInfo = GetLogGroupInfo;
exports.GetLogStreams = GetLogStreams;
exports.GetLogStreamList = GetLogStreamList;
exports.GetLogEvents = GetLogEvents;
exports.GetAwsProfileList = GetAwsProfileList;
exports.getIniProfileData = getIniProfileData;
/* eslint-disable @typescript-eslint/naming-convention */
const ui = require("../common/UI");
const MethodResult_1 = require("../common/MethodResult");
const os_1 = require("os");
const path_1 = require("path");
const path_2 = require("path");
const parseKnownFiles_1 = require("../aws-sdk/parseKnownFiles");
const Session_1 = require("../common/Session");
const client_cloudwatch_logs_1 = require("@aws-sdk/client-cloudwatch-logs");
async function GetCloudWatchLogsClient(Region = Session_1.Session.Current?.AwsRegion) {
    let credentials = await Session_1.Session.Current?.GetCredentials();
    return new client_cloudwatch_logs_1.CloudWatchLogsClient({
        credentials: credentials,
        endpoint: Session_1.Session.Current?.AwsEndPoint,
        region: Region
    });
}
const client_cloudwatch_logs_2 = require("@aws-sdk/client-cloudwatch-logs");
async function GetLogGroupList(Region, LogGroupNamePattern) {
    ui.logToOutput('api.GetLogGroupList Started');
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const client = await GetCloudWatchLogsClient(Region);
        let nextToken = undefined;
        do {
            const command = new client_cloudwatch_logs_2.DescribeLogGroupsCommand({
                limit: 50,
                logGroupNamePattern: LogGroupNamePattern,
                nextToken,
            });
            const response = await client.send(command);
            if (response.logGroups) {
                for (const logGroup of response.logGroups) {
                    if (logGroup.logGroupName) {
                        result.result.push(logGroup.logGroupName);
                    }
                }
            }
            nextToken = response.nextToken;
        } while (nextToken);
        result.isSuccessful = true;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetLogGroupList Error !!!', error);
        ui.logToOutput("api.GetLogGroupList Error !!!", error);
    }
    return result;
}
async function GetLogGroupInfo(Region, LogGroupName) {
    ui.logToOutput('api.GetLogGroupInfo Started');
    const result = new MethodResult_1.MethodResult();
    try {
        const client = await GetCloudWatchLogsClient(Region);
        const command = new client_cloudwatch_logs_2.DescribeLogGroupsCommand({
            logGroupNamePattern: LogGroupName,
            limit: 1,
        });
        const response = await client.send(command);
        const match = response.logGroups?.find(lg => lg.logGroupName === LogGroupName);
        result.result = match;
        result.isSuccessful = true;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetLogGroupInfo Error !!!', error);
        ui.logToOutput('api.GetLogGroupInfo Error !!!', error);
    }
    return result;
}
const client_cloudwatch_logs_3 = require("@aws-sdk/client-cloudwatch-logs");
async function GetLogStreams(Region, LogGroupName, LogStreamFilter, Limit = 50) {
    ui.logToOutput('api.GetLogStreams Started');
    const result = new MethodResult_1.MethodResult();
    const allLogStreams = [];
    try {
        const client = await GetCloudWatchLogsClient(Region);
        let nextToken = undefined;
        do {
            const command = new client_cloudwatch_logs_3.DescribeLogStreamsCommand({
                logGroupName: LogGroupName,
                orderBy: "LastEventTime",
                descending: true,
                limit: Limit,
                nextToken,
            });
            const response = await client.send(command);
            if (response.logStreams) {
                allLogStreams.push(...response.logStreams);
            }
            nextToken = response.nextToken;
        } while (nextToken);
        result.isSuccessful = true;
        if (LogStreamFilter) {
            result.result = allLogStreams.filter((logStream) => logStream.logStreamName?.includes(LogStreamFilter));
        }
        else {
            result.result = allLogStreams;
        }
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetLogStreams Error !!!', error);
        ui.logToOutput("api.GetLogStreams Error !!!", error);
    }
    return result;
}
async function GetLogStreamList(Region, LogGroupName, IncludeEmptyLogStreams = true, DateFilter) {
    ui.logToOutput('api.GetLogStreamList Started');
    let result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        let logStreams = await GetLogStreams(Region, LogGroupName);
        if (logStreams.isSuccessful) {
            if (logStreams.result) {
                for (var logStream of logStreams.result) {
                    if (!IncludeEmptyLogStreams && !logStream.lastEventTimestamp) {
                        continue;
                    }
                    if (DateFilter && logStream.lastEventTimestamp) {
                        let nextDay = new Date(DateFilter.getTime() + 86400000);
                        if (logStream.lastEventTimestamp < DateFilter.getTime() || logStream.lastEventTimestamp > nextDay.getTime()) {
                            continue;
                        }
                    }
                    if (logStream.logStreamName) {
                        result.result.push(logStream.logStreamName);
                    }
                }
            }
            result.isSuccessful = true;
            return result;
        }
        else {
            result.error = logStreams.error;
            result.isSuccessful = false;
            return result;
        }
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage('api.GetLogStreamsList Error !!!', error);
        ui.logToOutput("api.GetLogStreamsList Error !!!", error);
        return result;
    }
}
const client_cloudwatch_logs_4 = require("@aws-sdk/client-cloudwatch-logs");
async function GetLogEvents(Region, LogGroupName, LogStreamName, StartTime = 0) {
    ui.logToOutput(`api.GetLogEvents Started - Region:${Region}, LogGroupName:${LogGroupName}, LogStreamName:${LogStreamName}, StartTime:${StartTime}`);
    const result = new MethodResult_1.MethodResult();
    result.result = [];
    try {
        const client = await GetCloudWatchLogsClient(Region);
        let nextToken;
        while (true) {
            const command = new client_cloudwatch_logs_4.GetLogEventsCommand({
                logGroupName: LogGroupName,
                logStreamName: LogStreamName,
                startTime: StartTime,
                nextToken
            });
            const response = await client.send(command);
            if (response.events) {
                result.result.push(...response.events);
            }
            const newToken = response.nextBackwardToken;
            if (newToken === nextToken) {
                break;
            }
            nextToken = newToken;
        }
        result.isSuccessful = true;
    }
    catch (error) {
        result.isSuccessful = false;
        result.error = error;
        ui.showErrorMessage(`api.GetLogEvents Error !!! \n${LogGroupName} - ${LogStreamName}`, error);
        ui.logToOutput(`api.GetLogEvents Error !!! \n${LogGroupName} - ${LogStreamName}`, error);
    }
    return result;
}
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
async function getIniProfileData(init = {}) {
    ui.logToOutput('api.getIniProfileData Started');
    const profiles = await (0, parseKnownFiles_1.parseKnownFiles)(init);
    return profiles;
}
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