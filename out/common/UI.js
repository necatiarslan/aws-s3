"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUri = getUri;
exports.showOutputMessage = showOutputMessage;
exports.logToOutput = logToOutput;
exports.showInfoMessage = showInfoMessage;
exports.showWarningMessage = showWarningMessage;
exports.showErrorMessage = showErrorMessage;
exports.getExtensionVersion = getExtensionVersion;
exports.openFile = openFile;
exports.getMilliSeconds = getMilliSeconds;
exports.getSeconds = getSeconds;
exports.getDuration = getDuration;
exports.convertMsToTime = convertMsToTime;
exports.isJsonString = isJsonString;
exports.isValidDate = isValidDate;
exports.bytesToText = bytesToText;
exports.CopyToClipboard = CopyToClipboard;
exports.CopyListToClipboard = CopyListToClipboard;
const vscode = require("vscode");
const fs_1 = require("fs");
const path_1 = require("path");
const MethodResult_1 = require("./MethodResult");
var outputChannel;
var logsOutputChannel;
var NEW_LINE = " | ";
function getUri(webview, extensionUri, pathList) {
    return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}
function showOutputMessage(message, popupMessage = "Results are printed to OUTPUT / AwsS3-Extension", clearPrevMessages = true) {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel("AwsS3-Extension");
    }
    if (clearPrevMessages) {
        outputChannel.clear();
    }
    if (typeof message === "object") {
        outputChannel.appendLine(JSON.stringify(message, null, 4));
    }
    else {
        outputChannel.appendLine(message);
    }
    outputChannel.show();
    if (popupMessage.length > 0) {
        showInfoMessage(popupMessage);
    }
}
function logToOutput(message, error) {
    let now = new Date().toLocaleString();
    if (!logsOutputChannel) {
        logsOutputChannel = vscode.window.createOutputChannel("AwsS3-Log");
    }
    if (typeof message === "object") {
        logsOutputChannel.appendLine("[" + now + "] " + JSON.stringify(message, null, 4));
    }
    else {
        logsOutputChannel.appendLine("[" + now + "] " + message);
    }
    if (error) {
        logsOutputChannel.appendLine(error.name);
        logsOutputChannel.appendLine(error.message);
        if (error.stack) {
            logsOutputChannel.appendLine(error.stack);
        }
    }
}
function showInfoMessage(message) {
    vscode.window.showInformationMessage(message);
}
function showWarningMessage(message) {
    vscode.window.showWarningMessage(message);
}
function showErrorMessage(message, error) {
    if (error) {
        vscode.window.showErrorMessage(message + NEW_LINE + error.name + NEW_LINE + error.message);
    }
    else {
        vscode.window.showErrorMessage(message);
    }
}
function getExtensionVersion() {
    const { version: extVersion } = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '..', 'package.json'), { encoding: 'utf8' }));
    return extVersion;
}
function openFile(file) {
    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(file), vscode.ViewColumn.One);
}
function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}
function getMilliSeconds(startDate, endDate) {
    if (!startDate) {
        return 0;
    }
    if (!endDate || endDate < startDate) {
        endDate = new Date(); //now
    }
    return endDate.valueOf() - startDate.valueOf();
}
function getSeconds(startDate, endDate) {
    return Math.floor(getMilliSeconds(startDate, endDate) / 1000);
}
function getDuration(startDate, endDate) {
    if (!startDate) {
        return "";
    }
    var duration = getMilliSeconds(startDate, endDate);
    return (convertMsToTime(duration));
}
function convertMsToTime(milliseconds) {
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    seconds = seconds % 60;
    minutes = minutes % 60;
    let result;
    if (hours === 0) {
        result = `${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
    }
    else {
        result = `${padTo2Digits(hours)}:${padTo2Digits(minutes)}`;
    }
    return result;
}
function isJsonString(jsonString) {
    try {
        var json = JSON.parse(jsonString);
        return (typeof json === 'object');
    }
    catch (e) {
        return false;
    }
}
function isValidDate(dateString) {
    var regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regEx)) {
        return false; // Invalid format
    }
    var d = new Date(dateString);
    var dNum = d.getTime();
    if (!dNum && dNum !== 0) {
        return false; // NaN value, Invalid date
    }
    return d.toISOString().slice(0, 10) === dateString;
}
function bytesToText(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === undefined)
        return '';
    if (bytes === 0)
        return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
function CopyToClipboard(text) {
    let result = new MethodResult_1.MethodResult();
    try {
        vscode.env.clipboard.writeText(text);
        result.isSuccessful = true;
    }
    catch (error) {
        result.isSuccessful = false;
        showErrorMessage('CopyToClipboard Error !!!', error);
    }
    return result;
}
function CopyListToClipboard(textList) {
    let text = "";
    for (var t of textList) {
        if (t) {
            text += t + "\n";
        }
    }
    return CopyToClipboard(text);
}
//# sourceMappingURL=UI.js.map