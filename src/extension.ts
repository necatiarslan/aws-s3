import * as vscode from 'vscode';
import * as ui from './common/UI';
import { S3TreeView } from './s3/S3TreeView';
import { S3TreeItem } from './s3/S3TreeItem';

export function activate(context: vscode.ExtensionContext) {
	ui.logToOutput('Aws S3 Extension activation started');

	let treeView:S3TreeView = new S3TreeView(context);

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

	vscode.commands.registerCommand('S3TreeView.AddToFav', (node: S3TreeItem) => {
		treeView.AddToFav(node);
	});

	vscode.commands.registerCommand('S3TreeView.DeleteFromFav', (node: S3TreeItem) => {
		treeView.DeleteFromFav(node);
	});

	vscode.commands.registerCommand('S3TreeView.AddLogGroup', () => {
		treeView.AddLogGroup();
	});

	vscode.commands.registerCommand('S3TreeView.AddLogGroupByName', () => {
		treeView.AddLogGroupByName();
	});

	vscode.commands.registerCommand('S3TreeView.RemoveLogGroup', (node: S3TreeItem) => {
		treeView.RemoveLogGroup(node);
	});

	vscode.commands.registerCommand('S3TreeView.AddLogStream', (node: S3TreeItem) => {
		treeView.AddLogStream(node);
	});

	vscode.commands.registerCommand('S3TreeView.RemoveLogStream', (node: S3TreeItem) => {
		treeView.RemoveLogStream(node);
	});

	vscode.commands.registerCommand('S3TreeView.AddAllLogStreams', (node: S3TreeItem) => {
		treeView.AddAllLogStreams(node);
	});

	vscode.commands.registerCommand('S3TreeView.RemoveAllLogStreams', (node: S3TreeItem) => {
		treeView.RemoveAllLogStreams(node);
	});

	vscode.commands.registerCommand('S3TreeView.ShowS3LogView', (node: S3TreeItem) => {
		treeView.ShowS3LogView(node);
	});

	vscode.commands.registerCommand('S3TreeView.SelectAwsProfile', (node: S3TreeItem) => {
		treeView.SelectAwsProfile(node);
	});

	ui.logToOutput('Aws S3 Extension activation completed');
}

export function deactivate() {
	ui.logToOutput('Aws S3 is now de-active!');
}
