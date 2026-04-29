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
exports.ViewType = exports.S3TreeDataProvider = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = __importStar(require("vscode"));
const S3TreeItem_1 = require("./S3TreeItem");
const S3TreeView_1 = require("./S3TreeView");
class S3TreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.BucketNodeList = [];
        this.ShortcutNodeList = [];
        this.BucketList = [];
        this.ShortcutList = [];
        this.ViewType = ViewType.Bucket_Shortcut;
        this.BucketProfileList = [];
    }
    Refresh() {
        this._onDidChangeTreeData.fire();
    }
    GetBucketList() {
        return this.BucketList;
    }
    GetShortcutList() {
        return this.ShortcutList;
    }
    SetBucketList(BucketList) {
        this.BucketList = BucketList;
        this.LoadBucketNodeList();
    }
    SetShortcutList(ShortcutList) {
        this.ShortcutList = ShortcutList;
        this.LoadShortcutNodeList();
    }
    AddBucketProfile(Bucket, Profile) {
        if (!Bucket || !Profile) {
            return;
        }
        let profile = this.GetBucketProfile(Bucket);
        if (profile === Profile) {
            return;
        }
        if (profile && profile !== Profile) {
            this.RemoveBucketProfile(Bucket);
        }
        this.BucketProfileList.push({ Bucket: Bucket, Profile: Profile });
    }
    RemoveBucketProfile(Bucket) {
        for (let i = 0; i < this.BucketProfileList.length; i++) {
            if (this.BucketProfileList[i].Bucket === Bucket) {
                this.BucketProfileList.splice(i, 1);
                i--;
            }
        }
    }
    GetBucketProfile(Bucket) {
        for (let i = 0; i < this.BucketProfileList.length; i++) {
            if (this.BucketProfileList[i].Bucket === Bucket) {
                return this.BucketProfileList[i].Profile;
            }
        }
        return "";
    }
    AddBucket(Bucket) {
        if (this.BucketList.includes(Bucket)) {
            return;
        }
        this.BucketList.push(Bucket);
        this.LoadBucketNodeList();
        this.Refresh();
    }
    RemoveBucket(Bucket) {
        for (let i = 0; i < this.ShortcutList.length; i++) {
            if (this.ShortcutList[i]["Bucket"] === Bucket) {
                this.ShortcutList.splice(i, 1);
                i--;
            }
        }
        this.LoadShortcutNodeList();
        for (let i = 0; i < this.BucketList.length; i++) {
            if (this.BucketList[i] === Bucket) {
                this.BucketList.splice(i, 1);
                i--;
            }
        }
        this.LoadBucketNodeList();
        this.Refresh();
    }
    RemoveAllShortcuts(Bucket) {
        for (let i = 0; i < this.ShortcutList.length; i++) {
            if (this.ShortcutList[i]["Bucket"] === Bucket) {
                this.ShortcutList.splice(i, 1);
                i--;
            }
        }
        this.LoadShortcutNodeList();
        this.Refresh();
    }
    DoesShortcutExists(Bucket, Key) {
        if (!Bucket || !Key) {
            return false;
        }
        for (var ls of this.ShortcutList) {
            if (ls["Bucket"] === Bucket && ls["Shortcut"] === Key) {
                return true;
            }
        }
        return false;
    }
    AddShortcut(Bucket, Key) {
        if (!Bucket || !Key) {
            return;
        }
        if (this.DoesShortcutExists(Bucket, Key)) {
            return;
        }
        this.ShortcutList.push({ Bucket: Bucket, Shortcut: Key });
        this.LoadShortcutNodeList();
        this.Refresh();
    }
    RemoveShortcut(Bucket, Shortcut) {
        for (let i = 0; i < this.ShortcutList.length; i++) {
            if (this.ShortcutList[i]["Bucket"] === Bucket && this.ShortcutList[i]["Shortcut"] === Shortcut) {
                this.ShortcutList.splice(i, 1);
                i--;
            }
        }
        this.LoadShortcutNodeList();
        this.Refresh();
    }
    UpdateShortcut(Bucket, Shortcut, NewShortcut) {
        for (let i = 0; i < this.ShortcutList.length; i++) {
            if (this.ShortcutList[i]["Bucket"] === Bucket && this.ShortcutList[i]["Shortcut"] === Shortcut) {
                this.ShortcutList[i]["Shortcut"] = NewShortcut;
            }
        }
        this.LoadShortcutNodeList();
        this.Refresh();
    }
    LoadBucketNodeList() {
        this.BucketNodeList = [];
        for (var bucket of this.BucketList) {
            let treeItem = new S3TreeItem_1.S3TreeItem(bucket, S3TreeItem_1.TreeItemType.Bucket);
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            treeItem.Bucket = bucket;
            treeItem.ProfileToShow = this.GetBucketProfile(bucket);
            this.BucketNodeList.push(treeItem);
        }
    }
    LoadShortcutNodeList() {
        this.ShortcutNodeList = [];
        for (var lg of this.ShortcutList) {
            let treeItem = new S3TreeItem_1.S3TreeItem(lg["Shortcut"], S3TreeItem_1.TreeItemType.Shortcut);
            treeItem.Bucket = lg["Bucket"];
            treeItem.Shortcut = lg["Shortcut"];
            this.ShortcutNodeList.push(treeItem);
        }
    }
    getChildren(node) {
        let result = [];
        if (this.ViewType === ViewType.Bucket_Shortcut) {
            result = this.GetNodesBucketShortcut(node);
        }
        return Promise.resolve(result);
    }
    GetNodesShortcut(node) {
        let result = [];
        result = this.GetShortcutNodes();
        return result;
    }
    GetNodesBucketShortcut(node) {
        let result = [];
        if (!node) {
            result = this.GetBucketNodes();
        }
        else if (node.TreeItemType === S3TreeItem_1.TreeItemType.Bucket) {
            result = this.GetShortcutNodesParentBucket(node);
        }
        return result;
    }
    GetBucketNodes() {
        var result = [];
        for (var node of this.BucketNodeList) {
            if (S3TreeView_1.S3TreeView.Current && S3TreeView_1.S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView_1.S3TreeView.Current.FilterString)) {
                continue;
            }
            if (S3TreeView_1.S3TreeView.Current && S3TreeView_1.S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) {
                continue;
            }
            if (S3TreeView_1.S3TreeView.Current && !S3TreeView_1.S3TreeView.Current.isShowHiddenNodes && (node.IsHidden)) {
                continue;
            }
            if (S3TreeView_1.S3TreeView.Current && !S3TreeView_1.S3TreeView.Current.isShowHiddenNodes && (node.ProfileToShow && node.ProfileToShow !== S3TreeView_1.S3TreeView.Current.AwsProfile)) {
                continue;
            }
            result.push(node);
        }
        return result;
    }
    GetShortcutNodesParentBucket(BucketNode) {
        var result = [];
        for (var node of this.ShortcutNodeList) {
            if (!(node.Bucket === BucketNode.Bucket)) {
                continue;
            }
            if (S3TreeView_1.S3TreeView.Current && S3TreeView_1.S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView_1.S3TreeView.Current.FilterString)) {
                continue;
            }
            if (S3TreeView_1.S3TreeView.Current && S3TreeView_1.S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) {
                continue;
            }
            if (S3TreeView_1.S3TreeView.Current && !S3TreeView_1.S3TreeView.Current.isShowHiddenNodes && (node.IsHidden)) {
                continue;
            }
            if (S3TreeView_1.S3TreeView.Current && !S3TreeView_1.S3TreeView.Current.isShowHiddenNodes && (node.ProfileToShow && node.ProfileToShow !== S3TreeView_1.S3TreeView.Current.AwsProfile)) {
                continue;
            }
            node.Parent = BucketNode;
            if (BucketNode.Children.indexOf(node) === -1) {
                BucketNode.Children.push(node);
            }
            result.push(node);
        }
        return result;
    }
    GetShortcutNodes() {
        var result = [];
        for (var node of this.ShortcutNodeList) {
            if (S3TreeView_1.S3TreeView.Current && S3TreeView_1.S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView_1.S3TreeView.Current.FilterString)) {
                continue;
            }
            if (S3TreeView_1.S3TreeView.Current && S3TreeView_1.S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) {
                continue;
            }
            if (S3TreeView_1.S3TreeView.Current && !S3TreeView_1.S3TreeView.Current.isShowHiddenNodes && (node.IsHidden)) {
                continue;
            }
            result.push(node);
        }
        return result;
    }
    getTreeItem(element) {
        return element;
    }
}
exports.S3TreeDataProvider = S3TreeDataProvider;
var ViewType;
(function (ViewType) {
    ViewType[ViewType["Bucket_Shortcut"] = 1] = "Bucket_Shortcut";
})(ViewType || (exports.ViewType = ViewType = {}));
//# sourceMappingURL=S3TreeDataProvider.js.map