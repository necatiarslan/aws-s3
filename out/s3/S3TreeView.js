"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3TreeView = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const S3TreeItem_1 = require("./S3TreeItem");
const S3TreeDataProvider_1 = require("./S3TreeDataProvider");
const ui = require("../common/UI");
const api = require("../common/API");
class S3TreeView {
    constructor(context) {
        this.FilterString = "";
        this.isShowOnlyFavorite = false;
        this.AwsProfile = "default";
        this.LastUsedRegion = "us-east-1";
        ui.logToOutput('TreeView.constructor Started');
        this.context = context;
        this.treeDataProvider = new S3TreeDataProvider_1.S3TreeDataProvider();
        this.LoadState();
        this.view = vscode.window.createTreeView('S3TreeView', { treeDataProvider: this.treeDataProvider, showCollapseAll: true });
        this.Refresh();
        context.subscriptions.push(this.view);
        S3TreeView.Current = this;
        this.SetFilterMessage();
    }
    Refresh() {
        ui.logToOutput('S3TreeView.refresh Started');
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Aws S3: Loading...",
        }, (progress, token) => {
            progress.report({ increment: 0 });
            this.LoadTreeItems();
            return new Promise(resolve => { resolve(); });
        });
    }
    LoadTreeItems() {
        ui.logToOutput('S3TreeView.loadTreeItems Started');
        this.treeDataProvider.LoadRegionNodeList();
        this.treeDataProvider.LoadLogGroupNodeList();
        this.treeDataProvider.LoadLogStreamNodeList();
        this.treeDataProvider.Refresh();
        this.SetViewTitle();
    }
    ResetView() {
        ui.logToOutput('S3TreeView.resetView Started');
        this.FilterString = '';
        this.treeDataProvider.Refresh();
        this.SetViewTitle();
        this.SaveState();
        this.Refresh();
    }
    async AddToFav(node) {
        ui.logToOutput('S3TreeView.AddToFav Started');
        node.IsFav = true;
        node.refreshUI();
    }
    async DeleteFromFav(node) {
        ui.logToOutput('S3TreeView.DeleteFromFav Started');
        node.IsFav = false;
        node.refreshUI();
    }
    async Filter() {
        ui.logToOutput('S3TreeView.Filter Started');
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
        ui.logToOutput('S3TreeView.ChangeView Started');
        this.treeDataProvider.ChangeView();
        this.SaveState();
        ui.logToOutput('S3TreeView.ChangeView New View=' + this.treeDataProvider.ViewType);
    }
    async ShowOnlyFavorite() {
        ui.logToOutput('S3TreeView.ShowOnlyFavorite Started');
        this.isShowOnlyFavorite = !this.isShowOnlyFavorite;
        this.treeDataProvider.Refresh();
        this.SetFilterMessage();
        this.SaveState();
    }
    async SetViewTitle() {
        this.view.title = "Aws S3";
    }
    SaveState() {
        ui.logToOutput('S3TreeView.saveState Started');
        try {
            this.context.globalState.update('AwsProfile', this.AwsProfile);
            this.context.globalState.update('FilterString', this.FilterString);
            this.context.globalState.update('ShowOnlyFavorite', this.ShowOnlyFavorite);
            this.context.globalState.update('LogGroupList', this.treeDataProvider.LogGroupList);
            this.context.globalState.update('LogStreamList', this.treeDataProvider.LogStreamList);
            this.context.globalState.update('ViewType', this.treeDataProvider.ViewType);
            ui.logToOutput("S3TreeView.saveState Successfull");
        }
        catch (error) {
            ui.logToOutput("S3TreeView.saveState Error !!!");
        }
    }
    LoadState() {
        ui.logToOutput('S3TreeView.loadState Started');
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
            ui.logToOutput("S3TreeView.loadState Successfull");
        }
        catch (error) {
            ui.logToOutput("S3TreeView.loadState Error !!!");
        }
    }
    SetFilterMessage() {
        this.view.message = "Profile:" + this.AwsProfile + " " + this.GetBoolenSign(this.isShowOnlyFavorite) + "Fav, " + this.FilterString;
    }
    GetBoolenSign(variable) {
        return variable ? "✓" : "𐄂";
    }
    async AddLogGroup() {
        ui.logToOutput('S3TreeView.AddLogGroup Started');
    }
    async AddLogGroupByName() {
        ui.logToOutput('S3TreeView.AddLogGroupByName Started');
    }
    async RemoveLogGroup(node) {
        ui.logToOutput('S3TreeView.RemoveLogGroup Started');
        if (node.TreeItemType !== S3TreeItem_1.TreeItemType.LogGroup) {
            return;
        }
        if (!node.Region || !node.LogGroup) {
            return;
        }
        this.treeDataProvider.RemoveLogGroup(node.Region, node.LogGroup);
        this.SaveState();
    }
    async AddLogStream(node) {
        ui.logToOutput('S3TreeView.AddLogStream Started');
    }
    async AddAllLogStreams(node) {
        ui.logToOutput('S3TreeView.AddLogStream Started');
    }
    async RemoveLogStream(node) {
        ui.logToOutput('S3TreeView.RemoveLogStream Started');
    }
    async RemoveAllLogStreams(node) {
        ui.logToOutput('S3TreeView.RemoveAllLogStreams Started');
    }
    async ShowS3LogView(node) {
        ui.logToOutput('S3TreeView.ShowS3LogView Started');
    }
    async SelectAwsProfile(node) {
        ui.logToOutput('S3TreeView.SelectAwsProfile Started');
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
exports.S3TreeView = S3TreeView;
//# sourceMappingURL=S3TreeView.js.map