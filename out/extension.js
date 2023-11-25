"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const ui = require("./common/UI");
const S3TreeView_1 = require("./s3/S3TreeView");
function activate(context) {
    ui.logToOutput('Aws S3 Extension activation started');
    let treeView = new S3TreeView_1.S3TreeView(context);
    vscode.commands.registerCommand('S3TreeView.Refresh', () => {
        treeView.Refresh();
    });
    vscode.commands.registerCommand('S3TreeView.Filter', () => {
        treeView.Filter();
    });
    vscode.commands.registerCommand('S3TreeView.ShowOnlyFavorite', () => {
        treeView.ShowOnlyFavorite();
    });
    vscode.commands.registerCommand('S3TreeView.ShowHiddenNodes', () => {
        treeView.ShowHiddenNodes();
    });
    vscode.commands.registerCommand('S3TreeView.AddToFav', (node) => {
        treeView.AddToFav(node);
    });
    vscode.commands.registerCommand('S3TreeView.DeleteFromFav', (node) => {
        treeView.DeleteFromFav(node);
    });
    vscode.commands.registerCommand('S3TreeView.HideNode', (node) => {
        treeView.HideNode(node);
    });
    vscode.commands.registerCommand('S3TreeView.UnHideNode', (node) => {
        treeView.UnHideNode(node);
    });
    vscode.commands.registerCommand('S3TreeView.AddBucket', () => {
        treeView.AddBucket();
    });
    vscode.commands.registerCommand('S3TreeView.RemoveBucket', (node) => {
        treeView.RemoveBucket(node);
    });
    vscode.commands.registerCommand('S3TreeView.Goto', (node) => {
        treeView.Goto(node);
    });
    vscode.commands.registerCommand('S3TreeView.RemoveShortcut', (node) => {
        treeView.RemoveShortcut(node);
    });
    vscode.commands.registerCommand('S3TreeView.AddShortcut', (node) => {
        treeView.AddShortcut(node);
    });
    vscode.commands.registerCommand('S3TreeView.CopyShortcut', (node) => {
        treeView.CopyShortcut(node);
    });
    vscode.commands.registerCommand('S3TreeView.ShowS3Explorer', (node) => {
        treeView.ShowS3Explorer(node);
    });
    vscode.commands.registerCommand('S3TreeView.ShowS3Search', (node) => {
        treeView.ShowS3Search(node);
    });
    vscode.commands.registerCommand('S3TreeView.SelectAwsProfile', (node) => {
        treeView.SelectAwsProfile(node);
    });
    vscode.commands.registerCommand('S3TreeView.UpdateAwsEndPoint', () => {
        treeView.UpdateAwsEndPoint();
    });
    ui.logToOutput('Aws S3 Extension activation completed');
}
exports.activate = activate;
function deactivate() {
    ui.logToOutput('Aws S3 is now de-active!');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map