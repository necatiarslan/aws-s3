"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3ExplorerItem = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const path = require("path");
class S3ExplorerItem {
    constructor(Bucket, Key) {
        this.Bucket = Bucket;
        this.Key = Key;
    }
    IsRoot() {
        return this.Key === "";
    }
    IsFile() {
        return this.Key.includes(".");
    }
    IsFolder() {
        return this.IsRoot() || this.Key.endsWith("/");
    }
    GetParentFolder() {
        if (this.IsRoot()) {
            return "";
        }
        var parentDir = path.join(this.Key, "..");
        if (parentDir = ".") {
            parentDir = "";
        }
        return parentDir;
    }
    GetFullPath() {
        return this.Bucket + "/" + this.Key;
    }
    GetS3Uri() {
        return "s3://" + this.GetFullPath();
    }
    GetArn() {
        return "arn:aws:s3:::" + this.GetFullPath();
    }
}
exports.S3ExplorerItem = S3ExplorerItem;
//# sourceMappingURL=S3ExplorerItem.js.map