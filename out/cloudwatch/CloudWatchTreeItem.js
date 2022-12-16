"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeItemType = exports.CloudWatchTreeItem = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
class CloudWatchTreeItem extends vscode.TreeItem {
    constructor(text, treeItemType) {
        super(text);
        this.IsFav = false;
        this.Children = [];
        this.Text = text;
        this.TreeItemType = treeItemType;
        this.refreshUI();
    }
    refreshUI() {
        if (this.TreeItemType === TreeItemType.Region) {
            this.iconPath = new vscode.ThemeIcon('globe');
        }
        else if (this.TreeItemType === TreeItemType.LogGroup) {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
        else if (this.TreeItemType === TreeItemType.LogStream) {
            this.iconPath = new vscode.ThemeIcon('output');
        }
        else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
    }
    IsAnyChidrenFav() {
        return this.IsAnyChidrenFavInternal(this);
    }
    IsAnyChidrenFavInternal(node) {
        for (var n of node.Children) {
            if (n.IsFav) {
                return true;
            }
            else if (n.Children.length > 0) {
                return this.IsAnyChidrenFavInternal(n);
            }
        }
        return false;
    }
    IsFilterStringMatch(FilterString) {
        if (this.Text.includes(FilterString)) {
            return true;
        }
        if (this.IsFilterStringMatchAnyChildren(this, FilterString)) {
            return true;
        }
        return false;
    }
    IsFilterStringMatchAnyChildren(node, FilterString) {
        for (var n of node.Children) {
            if (n.Text.includes(FilterString)) {
                return true;
            }
            else if (n.Children.length > 0) {
                return this.IsFilterStringMatchAnyChildren(n, FilterString);
            }
        }
        return false;
    }
}
exports.CloudWatchTreeItem = CloudWatchTreeItem;
var TreeItemType;
(function (TreeItemType) {
    TreeItemType[TreeItemType["Region"] = 1] = "Region";
    TreeItemType[TreeItemType["LogGroup"] = 2] = "LogGroup";
    TreeItemType[TreeItemType["LogStream"] = 3] = "LogStream";
})(TreeItemType = exports.TreeItemType || (exports.TreeItemType = {}));
//# sourceMappingURL=CloudWatchTreeItem.js.map