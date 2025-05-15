"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3TreeView = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const S3TreeItem_1 = require("./S3TreeItem");
const S3TreeDataProvider_1 = require("./S3TreeDataProvider");
const ui = require("../common/UI");
const api = require("../common/API");
const S3Explorer_1 = require("./S3Explorer");
const S3Search_1 = require("./S3Search");
class S3TreeView {
    constructor(context) {
        this.FilterString = "";
        this.isShowOnlyFavorite = false;
        this.isShowHiddenNodes = false;
        this.AwsProfile = "default";
        this.IsSharedIniFileCredentials = false;
        ui.logToOutput('TreeView.constructor Started');
        S3TreeView.Current = this;
        this.context = context;
        this.treeDataProvider = new S3TreeDataProvider_1.S3TreeDataProvider();
        this.LoadState();
        this.view = vscode.window.createTreeView('S3TreeView', { treeDataProvider: this.treeDataProvider, showCollapseAll: true });
        this.Refresh();
        context.subscriptions.push(this.view);
        this.SetFilterMessage();
    }
    async TestAwsConnection() {
        let response = await api.TestAwsCredentials();
        if (response.isSuccessful && response.result) {
            ui.logToOutput('Aws Credentials Found, Test Successfull');
            ui.showInfoMessage('Aws Credentials Found, Test Successfull');
        }
        else {
            ui.logToOutput('S3TreeView.TestAwsConnection Error !!!', response.error);
            ui.showErrorMessage('Aws Credentials Can Not Be Found !!!', response.error);
        }
        let selectedRegion = await vscode.window.showInputBox({ placeHolder: 'Enter Region Eg: us-east-1', value: 'us-east-1' });
        if (selectedRegion === undefined) {
            return;
        }
        response = await api.TestAwsConnection(selectedRegion);
        if (response.isSuccessful && response.result) {
            ui.logToOutput('Aws Connection Test Successfull');
            ui.showInfoMessage('Aws Connection Test Successfull');
        }
        else {
            ui.logToOutput('S3TreeView.TestAwsConnection Error !!!', response.error);
            ui.showErrorMessage('Aws Connection Test Error !!!', response.error);
        }
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
        //this.treeDataProvider.LoadRegionNodeList();
        //this.treeDataProvider.LoadLogGroupNodeList();
        //this.treeDataProvider.LoadLogStreamNodeList();
        //this.treeDataProvider.Refresh();
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
        this.treeDataProvider.Refresh();
    }
    async HideNode(node) {
        ui.logToOutput('S3TreeView.HideNode Started');
        node.IsHidden = true;
        this.treeDataProvider.Refresh();
    }
    async UnHideNode(node) {
        ui.logToOutput('S3TreeView.UnHideNode Started');
        node.IsHidden = false;
        this.treeDataProvider.Refresh();
    }
    async ShowOnlyInThisProfile(node) {
        ui.logToOutput('S3TreeView.ShowOnlyInThisProfile Started');
        if (node.TreeItemType !== S3TreeItem_1.TreeItemType.Bucket) {
            return;
        }
        if (!node.Bucket) {
            return;
        }
        if (this.AwsProfile) {
            node.ProfileToShow = this.AwsProfile;
            this.treeDataProvider.AddBucketProfile(node.Bucket, node.ProfileToShow);
            this.treeDataProvider.Refresh();
            this.SaveState();
        }
    }
    async ShowInAnyProfile(node) {
        ui.logToOutput('S3TreeView.ShowInAnyProfile Started');
        if (node.TreeItemType !== S3TreeItem_1.TreeItemType.Bucket) {
            return;
        }
        if (!node.Bucket) {
            return;
        }
        node.ProfileToShow = "";
        this.treeDataProvider.RemoveBucketProfile(node.Bucket);
        this.treeDataProvider.Refresh();
        this.SaveState();
    }
    async DeleteFromFav(node) {
        ui.logToOutput('S3TreeView.DeleteFromFav Started');
        node.IsFav = false;
        this.treeDataProvider.Refresh();
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
    async ShowOnlyFavorite() {
        ui.logToOutput('S3TreeView.ShowOnlyFavorite Started');
        this.isShowOnlyFavorite = !this.isShowOnlyFavorite;
        this.treeDataProvider.Refresh();
        this.SetFilterMessage();
        this.SaveState();
    }
    async ShowHiddenNodes() {
        ui.logToOutput('S3TreeView.ShowHiddenNodes Started');
        this.isShowHiddenNodes = !this.isShowHiddenNodes;
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
            this.context.globalState.update('ShowOnlyFavorite', this.isShowOnlyFavorite);
            this.context.globalState.update('ShowHiddenNodes', this.isShowHiddenNodes);
            this.context.globalState.update('BucketList', this.treeDataProvider.GetBucketList());
            this.context.globalState.update('ShortcutList', this.treeDataProvider.GetShortcutList());
            this.context.globalState.update('ViewType', this.treeDataProvider.ViewType);
            this.context.globalState.update('AwsEndPoint', this.AwsEndPoint);
            this.context.globalState.update('AwsRegion', this.AwsRegion);
            this.context.globalState.update('BucketProfileList', this.treeDataProvider.BucketProfileList);
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
            let ShowHiddenNodesTemp = this.context.globalState.get('ShowHiddenNodes');
            if (ShowHiddenNodesTemp) {
                this.isShowHiddenNodes = ShowHiddenNodesTemp;
            }
            let BucketProfileListTemp = this.context.globalState.get('BucketProfileList');
            if (BucketProfileListTemp) {
                this.treeDataProvider.BucketProfileList = BucketProfileListTemp;
            }
            let BucketListTemp = this.context.globalState.get('BucketList');
            if (BucketListTemp) {
                this.treeDataProvider.SetBucketList(BucketListTemp);
            }
            let ShortcutListTemp;
            //TODO: Remove this legacy code after 1 year
            try {
                let legacyShortcutListTemp;
                legacyShortcutListTemp = this.context.globalState.get('ShortcutList');
                if (legacyShortcutListTemp && Array.isArray(legacyShortcutListTemp) && legacyShortcutListTemp[0] && Array.isArray(legacyShortcutListTemp[0])) {
                    ShortcutListTemp = [];
                    for (let i = 0; i < legacyShortcutListTemp.length; i++) {
                        ShortcutListTemp.push({ Bucket: legacyShortcutListTemp[i][0], Shortcut: legacyShortcutListTemp[i][1] });
                    }
                }
            }
            catch { }
            if (!ShortcutListTemp) {
                ShortcutListTemp = this.context.globalState.get('ShortcutList');
            }
            if (ShortcutListTemp) {
                this.treeDataProvider.SetShortcutList(ShortcutListTemp);
            }
            let ViewTypeTemp = this.context.globalState.get('ViewType');
            if (ViewTypeTemp) {
                this.treeDataProvider.ViewType = ViewTypeTemp;
            }
            let AwsEndPointTemp = this.context.globalState.get('AwsEndPoint');
            this.AwsEndPoint = AwsEndPointTemp;
            let AwsRegionTemp = this.context.globalState.get('AwsRegion');
            this.AwsRegion = AwsRegionTemp;
            ui.logToOutput("S3TreeView.loadState Successfull");
        }
        catch (error) {
            ui.logToOutput("S3TreeView.loadState Error !!!");
        }
    }
    async SetFilterMessage() {
        if (this.treeDataProvider.BucketList.length > 0) {
            this.view.message =
                await this.GetFilterProfilePrompt()
                    + this.GetBoolenSign(this.isShowOnlyFavorite) + "Fav, "
                    + this.GetBoolenSign(this.isShowHiddenNodes) + "Hidden, "
                    + this.FilterString;
        }
        else {
            this.view.message = undefined;
        }
    }
    async GetFilterProfilePrompt() {
        return "Profile:" + this.AwsProfile + " ";
    }
    GetBoolenSign(variable) {
        return variable ? "✓" : "𐄂";
    }
    async AddBucket() {
        ui.logToOutput('S3TreeView.AddBucket Started');
        let selectedBucketName = await vscode.window.showInputBox({ placeHolder: 'Enter Bucket Name / Search Text' });
        if (selectedBucketName === undefined) {
            return;
        }
        var resultBucket = await api.GetBucketList(selectedBucketName);
        if (!resultBucket.isSuccessful) {
            return;
        }
        let selectedBucketList = await vscode.window.showQuickPick(resultBucket.result, { canPickMany: true, placeHolder: 'Select Bucket(s)' });
        if (!selectedBucketList || selectedBucketList.length === 0) {
            return;
        }
        for (var selectedBucket of selectedBucketList) {
            this.treeDataProvider.AddBucket(selectedBucket);
            this.SetFilterMessage();
        }
        this.SaveState();
    }
    async RemoveBucket(node) {
        ui.logToOutput('S3TreeView.RemoveBucket Started');
        if (node.TreeItemType !== S3TreeItem_1.TreeItemType.Bucket) {
            return;
        }
        if (!node.Bucket) {
            return;
        }
        this.treeDataProvider.RemoveBucket(node.Bucket);
        this.SetFilterMessage();
        this.SaveState();
    }
    async Goto(node) {
        ui.logToOutput('S3TreeView.Goto Started');
        if (node.TreeItemType !== S3TreeItem_1.TreeItemType.Bucket) {
            return;
        }
        if (!node.Bucket) {
            return;
        }
        let shortcut = await vscode.window.showInputBox({ placeHolder: 'Enter a Folder/File Key' });
        if (shortcut === undefined) {
            return;
        }
        S3Explorer_1.S3Explorer.Render(this.context.extensionUri, node, shortcut);
    }
    async AddOrRemoveShortcut(Bucket, Key) {
        ui.logToOutput('S3TreeView.AddOrRemoveShortcut Started');
        if (!Bucket || !Key) {
            return;
        }
        if (this.treeDataProvider.DoesShortcutExists(Bucket, Key)) {
            this.treeDataProvider.RemoveShortcut(Bucket, Key);
        }
        else {
            this.treeDataProvider.AddShortcut(Bucket, Key);
        }
        this.SaveState();
    }
    async RemoveShortcutByKey(Bucket, Key) {
        ui.logToOutput('S3TreeView.RemoveShortcutByKey Started');
        if (!Bucket || !Key) {
            return;
        }
        if (this.treeDataProvider.DoesShortcutExists(Bucket, Key)) {
            this.treeDataProvider.RemoveShortcut(Bucket, Key);
            this.SaveState();
        }
    }
    async UpdateShortcutByKey(Bucket, Key, NewKey) {
        ui.logToOutput('S3TreeView.RemoveShortcutByKey Started');
        if (!Bucket || !Key) {
            return;
        }
        if (this.treeDataProvider.DoesShortcutExists(Bucket, Key)) {
            this.treeDataProvider.UpdateShortcut(Bucket, Key, NewKey);
            this.SaveState();
        }
    }
    DoesShortcutExists(Bucket, Key) {
        if (!Key) {
            return false;
        }
        return this.treeDataProvider.DoesShortcutExists(Bucket, Key);
    }
    async RemoveShortcut(node) {
        ui.logToOutput('S3TreeView.RemoveShortcut Started');
        if (node.TreeItemType !== S3TreeItem_1.TreeItemType.Shortcut) {
            return;
        }
        if (!node.Bucket || !node.Shortcut) {
            return;
        }
        this.treeDataProvider.RemoveShortcut(node.Bucket, node.Shortcut);
        S3Explorer_1.S3Explorer.Current?.RenderHtml(); //to update shortcut icon
        this.SaveState();
    }
    async CopyShortcut(node) {
        ui.logToOutput('S3TreeView.CopyShortcut Started');
        if (node.TreeItemType !== S3TreeItem_1.TreeItemType.Shortcut) {
            return;
        }
        if (!node.Bucket || !node.Shortcut) {
            return;
        }
        vscode.env.clipboard.writeText(node.Shortcut);
    }
    async AddShortcut(node) {
        ui.logToOutput('S3TreeView.AddShortcut Started');
        if (!node.Bucket) {
            return;
        }
        let bucket = node.Bucket;
        let shortcut = await vscode.window.showInputBox({ placeHolder: 'Enter a Folder/File Key' });
        if (shortcut === undefined) {
            return;
        }
        this.AddOrRemoveShortcut(bucket, shortcut);
    }
    async ShowS3Explorer(node) {
        ui.logToOutput('S3TreeView.ShowS3Explorer Started');
        S3Explorer_1.S3Explorer.Render(this.context.extensionUri, node);
    }
    async ShowS3Search(node) {
        ui.logToOutput('S3TreeView.ShowS3Search Started');
        S3Search_1.S3Search.Render(this.context.extensionUri, node);
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
        this.treeDataProvider.Refresh();
    }
    async UpdateAwsEndPoint() {
        ui.logToOutput('S3TreeView.UpdateAwsEndPoint Started');
        let awsEndPointUrl = await vscode.window.showInputBox({ placeHolder: 'Enter Aws End Point URL (Leave Empty To Return To Default)', value: this.AwsEndPoint });
        if (awsEndPointUrl === undefined) {
            return;
        }
        if (awsEndPointUrl.length === 0) {
            this.AwsEndPoint = undefined;
        }
        else {
            this.AwsEndPoint = awsEndPointUrl;
        }
        this.SaveState();
        ui.showInfoMessage('Aws End Point Updated');
    }
    async SetAwsRegion() {
        ui.logToOutput('S3TreeView.UpdateAwsRegion Started');
        let awsRegion = await vscode.window.showInputBox({ placeHolder: 'Enter Aws Region (Leave Empty To Return To Default)' });
        if (awsRegion === undefined) {
            return;
        }
        if (awsRegion.length === 0) {
            this.AwsRegion = undefined;
        }
        else {
            this.AwsRegion = awsRegion;
        }
        this.SaveState();
    }
}
exports.S3TreeView = S3TreeView;
//# sourceMappingURL=S3TreeView.js.map