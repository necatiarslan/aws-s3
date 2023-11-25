"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewType = exports.S3TreeDataProvider = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const S3TreeItem_1 = require("./S3TreeItem");
const S3TreeView_1 = require("./S3TreeView");
class S3TreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.BucketNodeList = [];
        this.ShortcutNodeList = [];
        this.BucketList = [];
        this.ShortcutList = [["???", "???"]];
        this.ViewType = ViewType.Bucket_Shortcut;
        this.ShortcutList.splice(0, 1);
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
            if (this.ShortcutList[i][0] === Bucket) {
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
            if (this.ShortcutList[i][0] === Bucket) {
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
            if (ls[0] === Bucket && ls[1] === Key) {
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
        this.ShortcutList.push([Bucket, Key]);
        this.LoadShortcutNodeList();
        this.Refresh();
    }
    RemoveShortcut(Bucket, Shortcut) {
        for (let i = 0; i < this.ShortcutList.length; i++) {
            if (this.ShortcutList[i][0] === Bucket && this.ShortcutList[i][1] === Shortcut) {
                this.ShortcutList.splice(i, 1);
                i--;
            }
        }
        this.LoadShortcutNodeList();
        this.Refresh();
    }
    UpdateShortcut(Bucket, Shortcut, NewShortcut) {
        for (let i = 0; i < this.ShortcutList.length; i++) {
            if (this.ShortcutList[i][0] === Bucket && this.ShortcutList[i][1] === Shortcut) {
                this.ShortcutList[i][1] = NewShortcut;
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
            this.BucketNodeList.push(treeItem);
        }
    }
    LoadShortcutNodeList() {
        this.ShortcutNodeList = [];
        for (var lg of this.ShortcutList) {
            let treeItem = new S3TreeItem_1.S3TreeItem(lg[1], S3TreeItem_1.TreeItemType.Shortcut);
            treeItem.Bucket = lg[0];
            treeItem.Shortcut = lg[1];
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
})(ViewType = exports.ViewType || (exports.ViewType = {}));
//# sourceMappingURL=S3TreeDataProvider.js.map