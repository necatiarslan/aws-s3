"use strict";
/**
 * AWS S3 VSCode Extension - Main Entry Point
 *
 * This file handles extension activation, command registration, and lifecycle management.
 *
 * @module extension
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const ui = require("./common/UI");
const S3TreeView_1 = require("./s3/S3TreeView");
const Telemetry_1 = require("./common/Telemetry");
/**
 * Extension activation function
 * Called when the extension is activated
 *
 * @param context - Extension context provided by VSCode
 */
function activate(context) {
    ui.logToOutput('AWS S3 Extension activation started');
    // Initialize telemetry
    new Telemetry_1.Telemetry(context);
    try {
        Telemetry_1.Telemetry.Current?.sendTelemetryEvent('extension.activated');
        // Initialize the tree view
        const treeView = new S3TreeView_1.S3TreeView(context);
        // Register all commands and add them to subscriptions for proper disposal
        registerCommands(context, treeView);
        ui.logToOutput('AWS S3 Extension activation completed successfully');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        ui.logToOutput(`AWS S3 Extension activation failed: ${errorMessage}`, error);
        ui.showErrorMessage('Failed to activate AWS S3 Extension', error);
    }
}
/**
 * Register all extension commands
 *
 * @param context - Extension context
 * @param treeView - S3 Tree View instance
 */
function registerCommands(context, treeView) {
    // View management commands
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.Refresh', () => {
        treeView.Refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.Filter', () => {
        treeView.Filter();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.ShowOnlyFavorite', () => {
        treeView.ShowOnlyFavorite();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.ShowHiddenNodes', () => {
        treeView.ShowHiddenNodes();
    }));
    // Favorite management commands
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.AddToFav', (node) => {
        treeView.AddToFav(node);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.DeleteFromFav', (node) => {
        treeView.DeleteFromFav(node);
    }));
    // Node visibility commands
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.HideNode', (node) => {
        treeView.HideNode(node);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.UnHideNode', (node) => {
        treeView.UnHideNode(node);
    }));
    // Profile management commands
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.ShowOnlyInThisProfile', (node) => {
        treeView.ShowOnlyInThisProfile(node);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.ShowInAnyProfile', (node) => {
        treeView.ShowInAnyProfile(node);
    }));
    // Bucket management commands
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.AddBucket', () => {
        treeView.AddBucket();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.RemoveBucket', (node) => {
        treeView.RemoveBucket(node);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.Goto', (node) => {
        treeView.Goto(node);
    }));
    // Shortcut management commands
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.RemoveShortcut', (node) => {
        treeView.RemoveShortcut(node);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.AddShortcut', (node) => {
        treeView.AddShortcut(node);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.CopyShortcut', (node) => {
        treeView.CopyShortcut(node);
    }));
    // Explorer and search commands
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.ShowS3Explorer', (node) => {
        treeView.ShowS3Explorer(node);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.ShowS3Search', (node) => {
        treeView.ShowS3Search(node);
    }));
    // AWS configuration commands
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.SelectAwsProfile', (node) => {
        treeView.SelectAwsProfile(node);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.UpdateAwsEndPoint', () => {
        treeView.UpdateAwsEndPoint();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.SetAwsRegion', () => {
        treeView.SetAwsRegion();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.TestAwsConnection', () => {
        treeView.TestAwsConnection();
    }));
    ui.logToOutput('All commands registered successfully');
}
/**
 * Extension deactivation function
 * Called when the extension is deactivated
 *
 * Cleanup is handled automatically by VSCode disposing all items in context.subscriptions
 */
function deactivate() {
    ui.logToOutput('AWS S3 Extension is now deactivated');
}
//# sourceMappingURL=extension.js.map