"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3ExplorerItem = void 0;
const s3_helper = __importStar(require("./S3Helper"));
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