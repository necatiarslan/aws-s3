/**
 * AWS S3 VSCode Extension - Main Entry Point
 * 
 * This file handles extension activation, command registration, and lifecycle management.
 * 
 * @module extension
 */

import * as vscode from 'vscode';
import * as ui from './common/UI';
import {S3TreeView} from './s3/S3TreeView';
import {S3TreeItem} from './s3/S3TreeItem';
import { Telemetry } from './common/Telemetry';
import { ClientManager } from './common/ClientManager';
import { AIHandler } from './chat/AIHandler';
import { Session } from './common/Session';
import { TestAwsConnectionTool } from './sts/TestAwsConnectionTool';
import { STSTool } from './sts/STSTool';
import { S3Tool } from './s3/S3Tool';
import { S3FileOperationsTool } from './s3/S3FileOperationsTool';
import { FileOperationsTool } from './common/FileOperationsTool';
import { SessionTool } from './common/SessionTool';
import { CloudWatchLogTool } from './cloudwatch/CloudWatchLogTool';
import { ServiceAccessView } from './common/ServiceAccessView';
import { CommandHistoryView } from './common/CommandHistoryView';
import { initializeLicense, isLicenseValid } from "./common/License";

/**
 * Extension activation function
 * Called when the extension is activated
 * 
 * @param context - Extension context provided by VSCode
 */
export function activate(context: vscode.ExtensionContext): void {
	ui.logToOutput('AWS S3 Extension activation started');
	
	// Initialize telemetry
	new Telemetry(context);
	initializeLicense(context);

	const session = new Session(context);
	session.IsProVersion = isLicenseValid();
	new AIHandler();
	const clientManager = ClientManager.Instance;

	// Register disposables
	// TODO: Uncomment when Session, ClientManager, and UI have proper dispose methods
	// context.subscriptions.push(
	// 	session,
	// 	clientManager,
	// 	{ dispose: () => ui.dispose() }
	// );

	try {
		Telemetry.Current?.send('extension.activated');
		// Initialize the tree view
		const treeView = new S3TreeView(context);


		if (Session.Current?.IsHostSupportLanguageTools()) {
			// Register language model tools
			context.subscriptions.push(
				vscode.lm.registerTool('TestAwsConnectionTool', new TestAwsConnectionTool()),
				vscode.lm.registerTool('STSTool', new STSTool()),
				vscode.lm.registerTool('S3Tool', new S3Tool()),
				vscode.lm.registerTool('S3FileOperationsTool', new S3FileOperationsTool()),
				vscode.lm.registerTool('FileOperationsTool', new FileOperationsTool()),
				vscode.lm.registerTool('SessionTool', new SessionTool()),
				vscode.lm.registerTool('CloudWatchLogTool', new CloudWatchLogTool()),
			);
		}
		else {
			ui.logToOutput(`Language model tools registration skipped for ${Session.Current?.HostAppName}`);
		}

		ui.logToOutput('Language model tools registered');

		// Register all commands and add them to subscriptions for proper disposal
		registerCommands(context, treeView);

		ui.logToOutput('AWS S3 Extension activation completed successfully');
	} catch (error) {
		Telemetry.Current?.sendError('extension.activationFailed', error as Error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		ui.logToOutput(`AWS S3 Extension activation failed: ${errorMessage}`, error as Error);
		ui.showErrorMessage('Failed to activate AWS S3 Extension', error as Error);
	}
}

/**
 * Register all extension commands
 * 
 * @param context - Extension context
 * @param treeView - S3 Tree View instance
 */
function registerCommands(context: vscode.ExtensionContext, treeView: S3TreeView): void {
	// View management commands
	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.Refresh', () => {
			treeView.Refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.Filter', () => {
			treeView.Filter();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.ShowOnlyFavorite', () => {
			treeView.ShowOnlyFavorite();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.ShowHiddenNodes', () => {
			treeView.ShowHiddenNodes();
		})
	);

	// Favorite management commands
	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.AddToFav', (node: S3TreeItem) => {
			treeView.AddToFav(node);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.DeleteFromFav', (node: S3TreeItem) => {
			treeView.DeleteFromFav(node);
		})
	);

	// Node visibility commands
	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.HideNode', (node: S3TreeItem) => {
			treeView.HideNode(node);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.UnHideNode', (node: S3TreeItem) => {
			treeView.UnHideNode(node);
		})
	);

	// Profile management commands
	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.ShowOnlyInThisProfile', (node: S3TreeItem) => {
			treeView.ShowOnlyInThisProfile(node);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.ShowInAnyProfile', (node: S3TreeItem) => {
			treeView.ShowInAnyProfile(node);
		})
	);

	// Bucket management commands
	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.AddBucket', () => {
			treeView.AddBucket();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.RemoveBucket', (node: S3TreeItem) => {
			treeView.RemoveBucket(node);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.Goto', (node: S3TreeItem) => {
			treeView.Goto(node);
		})
	);

	// Shortcut management commands
	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.RemoveShortcut', (node: S3TreeItem) => {
			treeView.RemoveShortcut(node);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.AddShortcut', (node: S3TreeItem) => {
			treeView.AddShortcut(node);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.CopyShortcut', (node: S3TreeItem) => {
			treeView.CopyShortcut(node);
		})
	);

	// Explorer and search commands
	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.ShowS3Explorer', (node: S3TreeItem) => {
			treeView.ShowS3Explorer(node);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.ShowS3Search', (node: S3TreeItem) => {
			treeView.ShowS3Search(node);
		})
	);

	// AWS configuration commands
	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.SelectAwsProfile', (node: S3TreeItem) => {
			treeView.SelectAwsProfile(node);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.UpdateAwsEndPoint', () => {
			treeView.UpdateAwsEndPoint();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.SetAwsRegion', () => {
			treeView.SetAwsRegion();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.TestAwsConnection', () => {
			treeView.TestAwsConnection();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('S3TreeView.ShowCommandHistory', () => {
		if (!Session.Current) {
			ui.showErrorMessage('Session not initialized', new Error('No session'));
			return;
		}
		CommandHistoryView.Render(Session.Current.ExtensionUri);
	}));

	context.subscriptions.push(	
	vscode.commands.registerCommand('S3TreeView.OpenServiceAccessView', () => {
		if (!Session.Current) {
			ui.showErrorMessage('Session not initialized', new Error('No session'));
			return;
		}
		ServiceAccessView.Render(Session.Current.ExtensionUri);
	}));

	ui.logToOutput('All commands registered successfully');
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 * 
 * Cleanup is handled automatically by VSCode disposing all items in context.subscriptions
 */
export function deactivate(): void {
	ui.logToOutput('AWS S3 Extension is now deactivated');
}
