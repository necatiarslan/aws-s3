"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewType = exports.CloudWatchTreeDataProvider = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const CloudWatchTreeItem_1 = require("./CloudWatchTreeItem");
const CloudWatchTreeView_1 = require("./CloudWatchTreeView");
class CloudWatchTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.RegionNodeList = [];
        this.LogGroupNodeList = [];
        this.LogStreamNodeList = [];
        this.LogGroupList = [["???", "???"]];
        this.LogStreamList = [["???", "???", "???"]];
        this.ViewType = ViewType.Region_LogGroup_LogStream;
        this.LogGroupList.splice(0, 1);
        this.LogStreamList.splice(0, 1);
    }
    Refresh() {
        this._onDidChangeTreeData.fire();
    }
    AddLogGroup(Region, LogGroup) {
        for (var lg of this.LogGroupList) {
            if (lg[0] === Region && lg[1] === LogGroup) {
                return;
            }
        }
        this.LogGroupList.push([Region, LogGroup]);
        this.LoadLogGroupNodeList();
        this.LoadRegionNodeList();
        this.Refresh();
    }
    RemoveLogGroup(Region, LogGroup) {
        for (let i = 0; i < this.LogStreamList.length; i++) {
            if (this.LogStreamList[i][0] === Region && this.LogStreamList[i][1] === LogGroup) {
                this.LogStreamList.splice(i, 1);
                i--;
            }
        }
        this.LoadLogStreamNodeList();
        for (let i = 0; i < this.LogGroupList.length; i++) {
            if (this.LogGroupList[i][0] === Region && this.LogGroupList[i][1] === LogGroup) {
                this.LogGroupList.splice(i, 1);
                i--;
            }
        }
        this.LoadLogGroupNodeList();
        this.LoadRegionNodeList();
        this.Refresh();
    }
    RemoveAllLogStreams(Region, LogGroup) {
        for (let i = 0; i < this.LogStreamList.length; i++) {
            if (this.LogStreamList[i][0] === Region && this.LogStreamList[i][1] === LogGroup) {
                this.LogStreamList.splice(i, 1);
                i--;
            }
        }
        this.LoadLogStreamNodeList();
        this.Refresh();
    }
    AddLogStream(Region, LogGroup, LogStream) {
        for (var ls of this.LogStreamList) {
            if (ls[0] === Region && ls[1] === LogGroup && ls[2] === LogStream) {
                return;
            }
        }
        this.LogStreamList.push([Region, LogGroup, LogStream]);
        this.LoadLogStreamNodeList();
        this.Refresh();
    }
    RemoveLogStream(Region, LogGroup, LogStream) {
        for (let i = 0; i < this.LogStreamList.length; i++) {
            if (this.LogStreamList[i][0] === Region && this.LogStreamList[i][1] === LogGroup && this.LogStreamList[i][2] === LogStream) {
                this.LogStreamList.splice(i, 1);
                i--;
            }
        }
        this.LoadLogStreamNodeList();
        this.Refresh();
    }
    LoadLogGroupNodeList() {
        this.LogGroupNodeList = [];
        for (var lg of this.LogGroupList) {
            if (lg[0] === "???") {
                continue;
            }
            let treeItem = new CloudWatchTreeItem_1.CloudWatchTreeItem(lg[1], CloudWatchTreeItem_1.TreeItemType.LogGroup);
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            treeItem.Region = lg[0];
            treeItem.LogGroup = lg[1];
            this.LogGroupNodeList.push(treeItem);
        }
    }
    LoadRegionNodeList() {
        this.LogGroupNodeList = [];
        for (var lg of this.LogGroupList) {
            if (lg[0] === "???") {
                continue;
            }
            if (this.GetRegionNode(lg[0]) === undefined) {
                let treeItem = new CloudWatchTreeItem_1.CloudWatchTreeItem(lg[0], CloudWatchTreeItem_1.TreeItemType.Region);
                treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                treeItem.Region = lg[0];
                this.RegionNodeList.push(treeItem);
            }
        }
    }
    GetRegionNode(Region) {
        for (var node of this.RegionNodeList) {
            if (node.Region === Region) {
                return node;
            }
        }
        return undefined;
    }
    LoadLogStreamNodeList() {
        this.LogStreamNodeList = [];
        for (var lg of this.LogStreamList) {
            if (lg[0] === "???") {
                continue;
            }
            let treeItem = new CloudWatchTreeItem_1.CloudWatchTreeItem(lg[2], CloudWatchTreeItem_1.TreeItemType.LogStream);
            treeItem.Region = lg[0];
            treeItem.LogGroup = lg[1];
            treeItem.LogStream = lg[2];
            this.LogStreamNodeList.push(treeItem);
        }
    }
    getChildren(node) {
        let result = [];
        if (this.ViewType === ViewType.Region_LogGroup_LogStream) {
            result = this.GetNodesRegionLogGroupLogStream(node);
        }
        else if (this.ViewType === ViewType.LogGroup_LogStream) {
            result = this.GetNodesLogGroupLogStream(node);
        }
        else if (this.ViewType === ViewType.LogStream) {
            result = this.GetNodesLogStream(node);
        }
        return Promise.resolve(result);
    }
    GetNodesRegionLogGroupLogStream(node) {
        let result = [];
        if (!node) {
            result = this.GetRegionNodes();
        }
        else if (node.TreeItemType === CloudWatchTreeItem_1.TreeItemType.Region) {
            result = this.GetLogGroupNodesParentRegion(node);
        }
        else if (node.TreeItemType === CloudWatchTreeItem_1.TreeItemType.LogGroup) {
            result = this.GetLogStreamNodesParentLogGroup(node);
        }
        return result;
    }
    GetRegionNodes() {
        var result = [];
        for (var node of this.RegionNodeList) {
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString && !node.IsFilterStringMatch(CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString)) {
                continue;
            }
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) {
                continue;
            }
            result.push(node);
        }
        return result;
    }
    GetNodesLogStream(node) {
        let result = [];
        result = this.GetLogStreamNodes();
        return result;
    }
    GetNodesLogGroupLogStream(node) {
        let result = [];
        if (!node) {
            result = this.GetLogGroupNodes();
        }
        else if (node.TreeItemType === CloudWatchTreeItem_1.TreeItemType.LogGroup) {
            result = this.GetLogStreamNodesParentLogGroup(node);
        }
        return result;
    }
    GetLogGroupNodes() {
        var result = [];
        for (var node of this.LogGroupNodeList) {
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString && !node.IsFilterStringMatch(CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString)) {
                continue;
            }
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) {
                continue;
            }
            result.push(node);
        }
        return result;
    }
    GetLogGroupNodesParentRegion(RegionNode) {
        var result = [];
        for (var node of this.LogGroupNodeList) {
            if (node.Region !== RegionNode.Region) {
                continue;
            }
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString && !node.IsFilterStringMatch(CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString)) {
                continue;
            }
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) {
                continue;
            }
            node.Parent = RegionNode;
            if (RegionNode.Children.indexOf(node) === -1) {
                RegionNode.Children.push(node);
            }
            result.push(node);
        }
        return result;
    }
    GetLogStreamNodesParentLogGroup(LogGroupNode) {
        var result = [];
        for (var node of this.LogStreamNodeList) {
            if (!(node.Region === LogGroupNode.Region && node.LogGroup === LogGroupNode.LogGroup)) {
                continue;
            }
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString && !node.IsFilterStringMatch(CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString)) {
                continue;
            }
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) {
                continue;
            }
            node.Parent = LogGroupNode;
            if (LogGroupNode.Children.indexOf(node) === -1) {
                LogGroupNode.Children.push(node);
            }
            result.push(node);
        }
        return result;
    }
    GetLogStreamNodes() {
        var result = [];
        for (var node of this.LogStreamNodeList) {
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString && !node.IsFilterStringMatch(CloudWatchTreeView_1.CloudWatchTreeView.Current.FilterString)) {
                continue;
            }
            if (CloudWatchTreeView_1.CloudWatchTreeView.Current && CloudWatchTreeView_1.CloudWatchTreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) {
                continue;
            }
            result.push(node);
        }
        return result;
    }
    getTreeItem(element) {
        return element;
    }
    async ChangeView() {
        if (this.ViewType === ViewType.Region_LogGroup_LogStream) {
            this.ViewType = ViewType.LogGroup_LogStream;
        }
        else if (this.ViewType === ViewType.LogGroup_LogStream) {
            this.ViewType = ViewType.LogStream;
        }
        else if (this.ViewType === ViewType.LogStream) {
            this.ViewType = ViewType.Region_LogGroup_LogStream;
        }
        this.Refresh();
    }
}
exports.CloudWatchTreeDataProvider = CloudWatchTreeDataProvider;
var ViewType;
(function (ViewType) {
    ViewType[ViewType["Region_LogGroup_LogStream"] = 1] = "Region_LogGroup_LogStream";
    ViewType[ViewType["LogGroup_LogStream"] = 2] = "LogGroup_LogStream";
    ViewType[ViewType["LogStream"] = 3] = "LogStream";
})(ViewType = exports.ViewType || (exports.ViewType = {}));
//# sourceMappingURL=CloudWatchTreeDataProvider.js.map