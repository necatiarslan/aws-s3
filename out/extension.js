"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const ui = require("./common/UI");
const S3TreeView_1 = require("./s3/S3TreeView");
function activate(context) {
    ui.logToOutput('Aws S3 Extension activation started');
    let treeView = new S3TreeView_1.S3TreeView(context);
    vscode.commands.registerCommand('S3TreeView.CheckAccessibility', () => {
        ui.showInfoMessage("CheckAccessibility DONE");
    });
    vscode.commands.registerCommand('S3TreeView.Refresh', () => {
        treeView.Refresh();
    });
    vscode.commands.registerCommand('S3TreeView.Filter', () => {
        treeView.Filter();
    });
    vscode.commands.registerCommand('S3TreeView.ChangeView', () => {
        treeView.ChangeView();
    });
    vscode.commands.registerCommand('S3TreeView.ShowOnlyFavorite', () => {
        treeView.ShowOnlyFavorite();
    });
    vscode.commands.registerCommand('S3TreeView.AddToFav', (node) => {
        treeView.AddToFav(node);
    });
    vscode.commands.registerCommand('S3TreeView.DeleteFromFav', (node) => {
        treeView.DeleteFromFav(node);
    });
    vscode.commands.registerCommand('S3TreeView.AddLogGroup', () => {
        treeView.AddLogGroup();
    });
    vscode.commands.registerCommand('S3TreeView.AddLogGroupByName', () => {
        treeView.AddLogGroupByName();
    });
    vscode.commands.registerCommand('S3TreeView.RemoveLogGroup', (node) => {
        treeView.RemoveLogGroup(node);
    });
    vscode.commands.registerCommand('S3TreeView.AddLogStream', (node) => {
        treeView.AddLogStream(node);
    });
    vscode.commands.registerCommand('S3TreeView.RemoveLogStream', (node) => {
        treeView.RemoveLogStream(node);
    });
    vscode.commands.registerCommand('S3TreeView.AddAllLogStreams', (node) => {
        treeView.AddAllLogStreams(node);
    });
    vscode.commands.registerCommand('S3TreeView.RemoveAllLogStreams', (node) => {
        treeView.RemoveAllLogStreams(node);
    });
    vscode.commands.registerCommand('S3TreeView.ShowS3LogView', (node) => {
        treeView.ShowS3LogView(node);
    });
    vscode.commands.registerCommand('S3TreeView.SelectAwsProfile', (node) => {
        treeView.SelectAwsProfile(node);
    });
    ui.logToOutput('Aws S3 Extension activation completed');
}
exports.activate = activate;
function deactivate() {
    ui.logToOutput('Aws S3 is now de-active!');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map