import * as vscode from 'vscode';
import * as ui from './common/UI';
import { S3TreeView } from './s3/S3TreeView';
import { S3TreeItem } from './s3/S3TreeItem';

export function activate(context: vscode.ExtensionContext) {
	ui.logToOutput('Aws S3 Extension activation started');

	let treeView:S3TreeView = new S3TreeView(context);

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

	vscode.commands.registerCommand('S3TreeView.AddToFav', (node: S3TreeItem) => {
		treeView.AddToFav(node);
	});

	vscode.commands.registerCommand('S3TreeView.DeleteFromFav', (node: S3TreeItem) => {
		treeView.DeleteFromFav(node);
	});

	vscode.commands.registerCommand('S3TreeView.HideNode', (node: S3TreeItem) => {
		treeView.HideNode(node);
	});

	vscode.commands.registerCommand('S3TreeView.UnHideNode', (node: S3TreeItem) => {
		treeView.UnHideNode(node);
	});

	vscode.commands.registerCommand('S3TreeView.AddBucket', () => {
		treeView.AddBucket();
	});

	vscode.commands.registerCommand('S3TreeView.RemoveBucket', (node: S3TreeItem) => {
		treeView.RemoveBucket(node);
	});

	vscode.commands.registerCommand('S3TreeView.Goto', (node: S3TreeItem) => {
		treeView.Goto(node);
	});

	vscode.commands.registerCommand('S3TreeView.RemoveShortcut', (node: S3TreeItem) => {
		treeView.RemoveShortcut(node);
	});

	vscode.commands.registerCommand('S3TreeView.AddShortcut', (node: S3TreeItem) => {
		treeView.AddShortcut(node);
	});

	vscode.commands.registerCommand('S3TreeView.CopyShortcut', (node: S3TreeItem) => {
		treeView.CopyShortcut(node);
	});

	vscode.commands.registerCommand('S3TreeView.ShowS3Explorer', (node: S3TreeItem) => {
		treeView.ShowS3Explorer(node);
	});

	vscode.commands.registerCommand('S3TreeView.ShowS3Search', (node: S3TreeItem) => {
		treeView.ShowS3Search(node);
	});

	vscode.commands.registerCommand('S3TreeView.SelectAwsProfile', (node: S3TreeItem) => {
		treeView.SelectAwsProfile(node);
	});

	vscode.commands.registerCommand('S3TreeView.UpdateAwsEndPoint', () => {
		treeView.UpdateAwsEndPoint();
	});

	ui.logToOutput('Aws S3 Extension activation completed');
}

export function deactivate() {
	ui.logToOutput('Aws S3 is now de-active!');
}
