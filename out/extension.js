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
const ClientManager_1 = require("./common/ClientManager");
const AIHandler_1 = require("./chat/AIHandler");
const Session_1 = require("./common/Session");
const TestAwsConnectionTool_1 = require("./sts/TestAwsConnectionTool");
const STSTool_1 = require("./sts/STSTool");
const S3Tool_1 = require("./s3/S3Tool");
const S3FileOperationsTool_1 = require("./s3/S3FileOperationsTool");
const FileOperationsTool_1 = require("./common/FileOperationsTool");
const SessionTool_1 = require("./common/SessionTool");
const CloudWatchLogTool_1 = require("./cloudwatch/CloudWatchLogTool");
const ServiceAccessView_1 = require("./common/ServiceAccessView");
const CommandHistoryView_1 = require("./common/CommandHistoryView");
const License_1 = require("./common/License");
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
    (0, License_1.initializeLicense)(context);
    const session = new Session_1.Session(context);
    session.IsProVersion = (0, License_1.isLicenseValid)();
    new AIHandler_1.AIHandler();
    const clientManager = ClientManager_1.ClientManager.Instance;
    // Register disposables
    // TODO: Uncomment when Session, ClientManager, and UI have proper dispose methods
    // context.subscriptions.push(
    // 	session,
    // 	clientManager,
    // 	{ dispose: () => ui.dispose() }
    // );
    try {
        Telemetry_1.Telemetry.Current?.send('extension.activated');
        // Initialize the tree view
        const treeView = new S3TreeView_1.S3TreeView(context);
        if (Session_1.Session.Current?.IsHostSupportLanguageTools()) {
            // Register language model tools
            context.subscriptions.push(vscode.lm.registerTool('TestAwsConnectionTool', new TestAwsConnectionTool_1.TestAwsConnectionTool()), vscode.lm.registerTool('STSTool', new STSTool_1.STSTool()), vscode.lm.registerTool('S3Tool', new S3Tool_1.S3Tool()), vscode.lm.registerTool('S3FileOperationsTool', new S3FileOperationsTool_1.S3FileOperationsTool()), vscode.lm.registerTool('FileOperationsTool', new FileOperationsTool_1.FileOperationsTool()), vscode.lm.registerTool('SessionTool', new SessionTool_1.SessionTool()), vscode.lm.registerTool('CloudWatchLogTool', new CloudWatchLogTool_1.CloudWatchLogTool()));
        }
        else {
            ui.logToOutput(`Language model tools registration skipped for ${Session_1.Session.Current?.HostAppName}`);
        }
        ui.logToOutput('Language model tools registered');
        // Register all commands and add them to subscriptions for proper disposal
        registerCommands(context, treeView);
        ui.logToOutput('AWS S3 Extension activation completed successfully');
    }
    catch (error) {
        Telemetry_1.Telemetry.Current?.sendError('extension.activationFailed', error);
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
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.AskAI', async (node) => {
        ui.logToOutput('S3TreeView.AskAI Started');
        try {
            const bucket = node?.Bucket ?? '';
            const key = node?.Shortcut ?? '';
            if (!AIHandler_1.AIHandler.Current) {
                ui.showErrorMessage('AIHandler not initialized', new Error('AI handler is not available'));
                return;
            }
            await AIHandler_1.AIHandler.Current.askAI(`How can you help with Bucket:${bucket} Key:${key} ?`);
        }
        catch (error) {
            ui.showErrorMessage('AskAI Error !!!', error);
            ui.logToOutput('AskAI Error !!!', error);
        }
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
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.ShowCommandHistory', () => {
        if (!Session_1.Session.Current) {
            ui.showErrorMessage('Session not initialized', new Error('No session'));
            return;
        }
        CommandHistoryView_1.CommandHistoryView.Render(Session_1.Session.Current.ExtensionUri);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.OpenServiceAccessView', () => {
        if (!Session_1.Session.Current) {
            ui.showErrorMessage('Session not initialized', new Error('No session'));
            return;
        }
        ServiceAccessView_1.ServiceAccessView.Render(Session_1.Session.Current.ExtensionUri);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.ActivatePro', () => {
        if (Session_1.Session.Current?.IsProVersion) {
            ui.showInfoMessage('You already have an active Pro license!');
            return;
        }
        vscode.env.openExternal(vscode.Uri.parse('https://necatiarslan.lemonsqueezy.com/checkout/buy/dcdda46a-2137-44cc-a9d9-30dfc75070cf'));
    }));
    context.subscriptions.push(vscode.commands.registerCommand('S3TreeView.EnterLicenseKey', async () => {
        if (Session_1.Session.Current?.IsProVersion) {
            ui.showInfoMessage('You already have an active Pro license!');
            return;
        }
        await (0, License_1.promptForLicense)(context);
        // Update session with new license status
        if (Session_1.Session.Current) {
            Session_1.Session.Current.IsProVersion = (0, License_1.isLicenseValid)();
        }
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