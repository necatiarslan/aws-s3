"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveExtesionFromFileName = exports.GetFileNameWithoutExtension = exports.GetFileNameWithExtension = exports.GetARN = exports.GetURL = exports.GetURI = exports.GetFullPath = exports.GetParentFolder = exports.IsFile = exports.IsFolder = exports.IsRoot = void 0;
const path = require("path");
function IsRoot(Key) {
    return Key === "";
}
exports.IsRoot = IsRoot;
function IsFolder(Key) {
    return IsRoot(Key) || Key.endsWith("/");
}
exports.IsFolder = IsFolder;
function IsFile(Key) {
    return !IsFolder(Key);
}
exports.IsFile = IsFile;
function GetParentFolder(Key) {
    if (IsRoot(Key)) {
        return "";
    }
    var parentDir = path.join(Key, "..");
    if (parentDir = ".") {
        parentDir = "";
    }
    return parentDir;
}
exports.GetParentFolder = GetParentFolder;
function GetFullPath(Bucket, Key) {
    return Bucket + "/" + Key;
}
exports.GetFullPath = GetFullPath;
function GetURI(Bucket, Key) {
    return "s3://" + GetFullPath(Bucket, Key);
}
exports.GetURI = GetURI;
function GetURL(Bucket, Key) {
    return "http://" + GetFullPath(Bucket, Key);
}
exports.GetURL = GetURL;
function GetARN(Bucket, Key) {
    return "arn:aws:s3:::" + GetFullPath(Bucket, Key);
}
exports.GetARN = GetARN;
function GetFileNameWithExtension(Key) {
    if (!Key) {
        return "";
    }
    if (Key.endsWith("/")) {
        return Key;
    }
    if (!Key.includes("/")) {
        return Key;
    }
    return Key.split('/').pop() || "";
}
exports.GetFileNameWithExtension = GetFileNameWithExtension;
function GetFileNameWithoutExtension(Key) {
    return RemoveExtesionFromFileName(GetFileNameWithExtension(Key));
}
exports.GetFileNameWithoutExtension = GetFileNameWithoutExtension;
function RemoveExtesionFromFileName(FileName) {
    if (!FileName) {
        return "";
    }
    if (!FileName.includes(".")) {
        return FileName;
    }
    let extension = FileName.split(".").pop();
    return FileName.replace("." + extension, "");
}
exports.RemoveExtesionFromFileName = RemoveExtesionFromFileName;
//# sourceMappingURL=S3Helper.js.map