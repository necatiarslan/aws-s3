"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3ExplorerItem = void 0;
const s3_helper = require("./S3Helper");
class S3ExplorerItem {
    constructor(Bucket, Key) {
        this.Bucket = Bucket;
        this.Key = Key;
    }
    IsRoot() {
        return s3_helper.IsRoot(this.Key);
    }
    IsFile() {
        return s3_helper.IsFile(this.Key);
    }
    IsFolder() {
        return s3_helper.IsFolder(this.Key);
    }
    GetParentFolderKey() {
        return s3_helper.GetParentFolderKey(this.Key);
    }
    GetFullPath() {
        return s3_helper.GetFullPath(this.Bucket, this.Key);
    }
    GetS3URI() {
        return s3_helper.GetURI(this.Bucket, this.Key);
    }
    GetARN() {
        return s3_helper.GetARN(this.Bucket, this.Key);
    }
}
exports.S3ExplorerItem = S3ExplorerItem;
//# sourceMappingURL=S3ExplorerItem.js.map