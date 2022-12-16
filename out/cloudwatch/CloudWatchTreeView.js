"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudWatchTreeView = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const CloudWatchTreeItem_1 = require("./CloudWatchTreeItem");
const CloudWatchTreeDataProvider_1 = require("./CloudWatchTreeDataProvider");
const ui = require("../common/UI");
const api = require("../common/API");
const CloudWatchLogView_1 = require("./CloudWatchLogView");
class CloudWatchTreeView {
    constructor(context) {
        this.FilterString = "";
        this.isShowOnlyFavorite = false;
        this.AwsProfile = "default";
        this.LastUsedRegion = "us-east-1";
        ui.logToOutput('TreeView.constructor Started');
        this.context = context;
        this.treeDataProvider = new CloudWatchTreeDataProvider_1.CloudWatchTreeDataProvider();
        this.LoadState();
        this.view = vscode.window.createTreeView('CloudWatchTreeView', { treeDataProvider: this.treeDataProvider, showCollapseAll: true });
        this.Refresh();
        context.subscriptions.push(this.view);
        CloudWatchTreeView.Current = this;
        this.SetFilterMessage();
    }
    Refresh() {
        ui.logToOutput('CloudWatchTreeView.refresh Started');
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Aws Cloudwatch: Loading...",
        }, (progress, token) => {
            progress.report({ increment: 0 });
            this.LoadTreeItems();
            return new Promise(resolve => { resolve(); });
        });
    }
    LoadTreeItems() {
        ui.logToOutput('CloudWatchTreeView.loadTreeItems Started');
        this.treeDataProvider.LoadRegionNodeList();
        this.treeDataProvider.LoadLogGroupNodeList();
        this.treeDataProvider.LoadLogStreamNodeList();
        this.treeDataProvider.Refresh();
        this.SetViewTitle();
    }
    ResetView() {
        ui.logToOutput('CloudWatchTreeView.resetView Started');
        this.FilterString = '';
        this.treeDataProvider.Refresh();
        this.SetViewTitle();
        this.SaveState();
        this.Refresh();
    }
    async AddToFav(node) {
        ui.logToOutput('CloudWatchTreeView.AddToFav Started');
        node.IsFav = true;
        node.refreshUI();
    }
    async DeleteFromFav(node) {
        ui.logToOutput('CloudWatchTreeView.DeleteFromFav Started');
        node.IsFav = false;
        node.refreshUI();
    }
    async Filter() {
        ui.logToOutput('CloudWatchTreeView.Filter Started');
        let filterStringTemp = await vscode.window.showInputBox({ value: this.FilterString, placeHolder: 'Enter Your Filter Text' });
        if (filterStringTemp === undefined) {
            return;
        }
        this.FilterString = filterStringTemp;
        this.treeDataProvider.Refresh();
        this.SetFilterMessage();
        this.SaveState();
    }
    async ChangeView() {
        ui.logToOutput('CloudWatchTreeView.ChangeView Started');
        this.treeDataProvider.ChangeView();
        this.SaveState();
        ui.logToOutput('CloudWatchTreeView.ChangeView New View=' + this.treeDataProvider.ViewType);
    }
    async ShowOnlyFavorite() {
        ui.logToOutput('CloudWatchTreeView.ShowOnlyFavorite Started');
        this.isShowOnlyFavorite = !this.isShowOnlyFavorite;
        this.treeDataProvider.Refresh();
        this.SetFilterMessage();
        this.SaveState();
    }
    async SetViewTitle() {
        this.view.title = "Aws Cloud Watch";
    }
    SaveState() {
        ui.logToOutput('CloudWatchTreeView.saveState Started');
        try {
            this.context.globalState.update('AwsProfile', this.AwsProfile);
            this.context.globalState.update('FilterString', this.FilterString);
            this.context.globalState.update('ShowOnlyFavorite', this.ShowOnlyFavorite);
            this.context.globalState.update('LogGroupList', this.treeDataProvider.LogGroupList);
            this.context.globalState.update('LogStreamList', this.treeDataProvider.LogStreamList);
            this.context.globalState.update('ViewType', this.treeDataProvider.ViewType);
            ui.logToOutput("CloudWatchTreeView.saveState Successfull");
        }
        catch (error) {
            ui.logToOutput("CloudWatchTreeView.saveState Error !!!");
        }
    }
    LoadState() {
        ui.logToOutput('CloudWatchTreeView.loadState Started');
        try {
            let AwsProfileTemp = this.context.globalState.get('AwsProfile');
            if (AwsProfileTemp) {
                this.AwsProfile = AwsProfileTemp;
            }
            let filterStringTemp = this.context.globalState.get('FilterString');
            if (filterStringTemp) {
                this.FilterString = filterStringTemp;
            }
            let ShowOnlyFavoriteTemp = this.context.globalState.get('ShowOnlyFavorite');
            if (ShowOnlyFavoriteTemp) {
                this.isShowOnlyFavorite = ShowOnlyFavoriteTemp;
            }
            let LogGroupListTemp = this.context.globalState.get('LogGroupList');
            if (LogGroupListTemp) {
                this.treeDataProvider.LogGroupList = LogGroupListTemp;
            }
            let LogStreamListTemp = this.context.globalState.get('LogStreamList');
            if (LogStreamListTemp) {
                this.treeDataProvider.LogStreamList = LogStreamListTemp;
            }
            let ViewTypeTemp = this.context.globalState.get('ViewType');
            if (ViewTypeTemp) {
                this.treeDataProvider.ViewType = ViewTypeTemp;
            }
            ui.logToOutput("CloudWatchTreeView.loadState Successfull");
        }
        catch (error) {
            ui.logToOutput("CloudWatchTreeView.loadState Error !!!");
        }
    }
    SetFilterMessage() {
        this.view.message = "Profile:" + this.AwsProfile + " " + this.GetBoolenSign(this.isShowOnlyFavorite) + "Fav, " + this.FilterString;
    }
    GetBoolenSign(variable) {
        return variable ? "✓" : "𐄂";
    }
    async AddLogGroup() {
        ui.logToOutput('CloudWatchTreeView.AddLogGroup Started');
        let selectedRegion = await vscode.window.showInputBox({ value: this.LastUsedRegion, placeHolder: 'Type Region Name' });
        if (!selectedRegion) {
            return;
        }
        var resultLogGroup = await api.GetLogGroupList(this.AwsProfile, selectedRegion);
        if (!resultLogGroup.isSuccessful) {
            return;
        }
        let selectedLogGroupList = await vscode.window.showQuickPick(resultLogGroup.result, { canPickMany: true, placeHolder: 'Select Log Group' });
        if (!selectedLogGroupList || selectedLogGroupList.length === 0) {
            return;
        }
        for (var selectedLogGroup of selectedLogGroupList) {
            this.treeDataProvider.AddLogGroup(selectedRegion, selectedLogGroup);
        }
        this.SaveState();
    }
    async AddLogGroupByName() {
        ui.logToOutput('CloudWatchTreeView.AddLogGroupByName Started');
        let selectedRegion = await vscode.window.showInputBox({ value: this.LastUsedRegion, placeHolder: 'Type Region Name' });
        if (!selectedRegion) {
            return;
        }
        let selectedLogGroupName = await vscode.window.showInputBox({ placeHolder: 'Enter Log Group Search Text' });
        if (!selectedLogGroupName) {
            return;
        }
        var resultLogGroup = await api.GetLogGroupList(this.AwsProfile, selectedRegion, selectedLogGroupName);
        if (!resultLogGroup.isSuccessful) {
            return;
        }
        let selectedLogGroupList = await vscode.window.showQuickPick(resultLogGroup.result, { canPickMany: true, placeHolder: 'Select Log Group' });
        if (!selectedLogGroupList || selectedLogGroupList.length === 0) {
            return;
        }
        for (var selectedLogGroup of selectedLogGroupList) {
            this.treeDataProvider.AddLogGroup(selectedRegion, selectedLogGroup);
        }
        this.SaveState();
    }
    async RemoveLogGroup(node) {
        ui.logToOutput('CloudWatchTreeView.RemoveLogGroup Started');
        if (node.TreeItemType !== CloudWatchTreeItem_1.TreeItemType.LogGroup) {
            return;
        }
        if (!node.Region || !node.LogGroup) {
            return;
        }
        this.treeDataProvider.RemoveLogGroup(node.Region, node.LogGroup);
        this.SaveState();
    }
    async AddLogStream(node) {
        ui.logToOutput('CloudWatchTreeView.AddLogStream Started');
        if (!node.Region || !node.LogGroup) {
            return;
        }
        var resultLogStream = await api.GetLogStreamList(this.AwsProfile, node.Region, node.LogGroup);
        if (!resultLogStream.isSuccessful) {
            return;
        }
        let selectedLogStreamList = await vscode.window.showQuickPick(resultLogStream.result, { canPickMany: true, placeHolder: 'Select Log Stream' });
        if (!selectedLogStreamList || selectedLogStreamList.length === 0) {
            return;
        }
        for (var selectedLogStream of selectedLogStreamList) {
            this.treeDataProvider.AddLogStream(node.Region, node.LogGroup, selectedLogStream);
        }
        this.SaveState();
    }
    async AddAllLogStreams(node) {
        ui.logToOutput('CloudWatchTreeView.AddLogStream Started');
        if (!node.Region || !node.LogGroup) {
            return;
        }
        var resultLogStream = await api.GetLogStreamList(this.AwsProfile, node.Region, node.LogGroup);
        if (!resultLogStream.isSuccessful) {
            return;
        }
        for (var logStream of resultLogStream.result) {
            this.treeDataProvider.AddLogStream(node.Region, node.LogGroup, logStream);
        }
        this.SaveState();
    }
    async RemoveLogStream(node) {
        ui.logToOutput('CloudWatchTreeView.RemoveLogStream Started');
        if (node.TreeItemType !== CloudWatchTreeItem_1.TreeItemType.LogStream) {
            return;
        }
        if (!node.Region || !node.LogGroup || !node.LogStream) {
            return;
        }
        this.treeDataProvider.RemoveLogStream(node.Region, node.LogGroup, node.LogStream);
        this.SaveState();
    }
    async RemoveAllLogStreams(node) {
        ui.logToOutput('CloudWatchTreeView.RemoveAllLogStreams Started');
        if (node.TreeItemType !== CloudWatchTreeItem_1.TreeItemType.LogGroup) {
            return;
        }
        if (!node.Region || !node.LogGroup) {
            return;
        }
        this.treeDataProvider.RemoveAllLogStreams(node.Region, node.LogGroup);
        this.SaveState();
    }
    async ShowCloudWatchLogView(node) {
        ui.logToOutput('CloudWatchTreeView.ShowCloudWatchLogView Started');
        if (node.TreeItemType !== CloudWatchTreeItem_1.TreeItemType.LogStream) {
            return;
        }
        if (!node.Region || !node.LogGroup || !node.LogStream) {
            return;
        }
        CloudWatchLogView_1.CloudWatchLogView.Render(this.context.extensionUri, node.Region, node.LogGroup, node.LogStream);
    }
    async SelectAwsProfile(node) {
        ui.logToOutput('CloudWatchTreeView.SelectAwsProfile Started');
        var result = await api.GetAwsProfileList();
        if (!result.isSuccessful) {
            return;
        }
        let selectedAwsProfile = await vscode.window.showQuickPick(result.result, { canPickMany: false, placeHolder: 'Select Aws Profile' });
        if (!selectedAwsProfile) {
            return;
        }
        this.AwsProfile = selectedAwsProfile;
        this.SaveState();
        this.SetFilterMessage();
    }
}
exports.CloudWatchTreeView = CloudWatchTreeView;
//# sourceMappingURL=CloudWatchTreeView.js.map