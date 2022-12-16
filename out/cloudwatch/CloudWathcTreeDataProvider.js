"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeDataProvider = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const treeItem_1 = require("./treeItem");
const CloudWatchTreeView_1 = require("./CloudWatchTreeView");
class TreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.treeItemList = [];
        this.visibletreeItemList = [];
    }
    Refresh() {
        this._onDidChangeTreeData.fire();
    }
    LoadTreeItems() {
        this.treeItemList = [];
        let treeItem = new treeItem_1.TreeItem();
        this.treeItemList.push(treeItem);
    }
    GetChildren(element) {
        if (!element) {
            this.visibletreeItemList = this.GetVisibleTreeItemList();
            return Promise.resolve(this.visibletreeItemList);
        }
        return Promise.resolve([]);
    }
    GetVisibleTreeItemList() {
        var result = [];
        for (var node of this.treeItemList) {
            if (CloudWatchTreeView_1.TreeView.Current && CloudWatchTreeView_1.TreeView.Current.FilterString && !node.doesFilterMatch(CloudWatchTreeView_1.TreeView.Current.FilterString)) {
                continue;
            }
            if (CloudWatchTreeView_1.TreeView.Current && CloudWatchTreeView_1.TreeView.Current.isShowOnlyFavorite && !node.IsFav) {
                continue;
            }
            result.push(node);
        }
        return result;
    }
    GetTreeItem(element) {
        return element;
    }
}
exports.TreeDataProvider = TreeDataProvider;
//# sourceMappingURL=CloudWathcTreeDataProvider.js.map