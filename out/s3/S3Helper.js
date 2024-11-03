"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsRoot = IsRoot;
exports.IsFolder = IsFolder;
exports.IsFile = IsFile;
exports.GetParentFolderKey = GetParentFolderKey;
exports.GetFullPath = GetFullPath;
exports.GetURI = GetURI;
exports.GetURL = GetURL;
exports.GetARN = GetARN;
exports.GetFileNameWithExtension = GetFileNameWithExtension;
exports.GetFileNameWithoutExtension = GetFileNameWithoutExtension;
exports.RemoveExtesionFromFileName = RemoveExtesionFromFileName;
exports.GetFileExtension = GetFileExtension;
exports.GetFolderName = GetFolderName;
const path = require("path");
function IsRoot(Key) {
    return Key === "";
}
function IsFolder(Key) {
    return IsRoot(Key) || Key.endsWith("/");
}
function IsFile(Key) {
    return !IsFolder(Key);
}
function GetParentFolderKey(Key) {
    if (IsRoot(Key)) {
        return "";
    }
    var parentDir = path.join(Key, "..");
    if (parentDir === ".") {
        return "";
    }
    return parentDir + "/";
}
function GetFullPath(Bucket, Key) {
    return Bucket + "/" + Key;
}
function GetURI(Bucket, Key) {
    return "s3://" + GetFullPath(Bucket, Key);
}
function GetURL(Bucket, Key) {
    return "https://" + Bucket + ".s3.amazonaws.com/" + Key;
}
function GetARN(Bucket, Key) {
    return "arn:aws:s3:::" + GetFullPath(Bucket, Key);
}
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
function GetFileNameWithoutExtension(Key) {
    return RemoveExtesionFromFileName(GetFileNameWithExtension(Key));
}
function RemoveExtesionFromFileName(FileName) {
    if (!FileName) {
        return "";
    }
    if (!FileName.includes(".")) {
        return FileName;
    }
    let extension = GetFileExtension(FileName);
    return FileName.replace("." + extension, "");
}
function GetFileExtension(FileName) {
    if (!FileName) {
        return "";
    }
    if (!FileName.includes(".")) {
        return "";
    }
    let extension = FileName.split(".").pop();
    return extension ? extension : "";
}
function GetFolderName(Key) {
    if (!Key) {
        return "";
    }
    if (!Key.endsWith("/")) {
        return Key;
    }
    var path = Key.split('/');
    path.pop();
    return path.pop() || "";
}
//# sourceMappingURL=S3Helper.js.map