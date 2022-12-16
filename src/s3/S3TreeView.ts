/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { S3TreeItem, TreeItemType } from './S3TreeItem';
import { S3TreeDataProvider } from './S3TreeDataProvider';
import * as ui from '../common/UI';
import * as api from '../common/API';
import { APIGateway } from 'aws-sdk';
import { S3LogView } from './S3LogView';

export class S3TreeView {

	public static Current: S3TreeView | undefined;
	public view: vscode.TreeView<S3TreeItem>;
	public treeDataProvider: S3TreeDataProvider;
	public context: vscode.ExtensionContext;
	public FilterString: string = "";
	public isShowOnlyFavorite: boolean = false;
	public AwsProfile: string = "default";
	public LastUsedRegion: string = "us-east-1";
	

	constructor(context: vscode.ExtensionContext) {
		ui.logToOutput('TreeView.constructor Started');
		this.context = context;
		this.treeDataProvider = new S3TreeDataProvider();
		this.LoadState();
		this.view = vscode.window.createTreeView('S3TreeView', { treeDataProvider: this.treeDataProvider, showCollapseAll: true });
		this.Refresh();
		context.subscriptions.push(this.view);
		S3TreeView.Current = this;
		this.SetFilterMessage();
	}

	Refresh(): void {
		ui.logToOutput('S3TreeView.refresh Started');

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: "Aws S3: Loading...",
		}, (progress, token) => {
			progress.report({ increment: 0 });

			this.LoadTreeItems();

			return new Promise<void>(resolve => { resolve(); });
		});
	}

	LoadTreeItems(){
		ui.logToOutput('S3TreeView.loadTreeItems Started');

		this.treeDataProvider.LoadRegionNodeList();
		this.treeDataProvider.LoadLogGroupNodeList();
		this.treeDataProvider.LoadLogStreamNodeList();
		this.treeDataProvider.Refresh();
		this.SetViewTitle();
	}

	ResetView(): void {
		ui.logToOutput('S3TreeView.resetView Started');
		this.FilterString = '';

		this.treeDataProvider.Refresh();
		this.SetViewTitle();

		this.SaveState();
		this.Refresh();
	}

	async AddToFav(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.AddToFav Started');
		node.IsFav = true;
		node.refreshUI();
	}

	async DeleteFromFav(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.DeleteFromFav Started');
		node.IsFav = false;
		node.refreshUI();
	}

	async Filter() {
		ui.logToOutput('S3TreeView.Filter Started');
		let filterStringTemp = await vscode.window.showInputBox({ value: this.FilterString, placeHolder: 'Enter Your Filter Text' });

		if (filterStringTemp === undefined) { return; }

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

	async SetViewTitle(){
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
		} catch (error) {
			ui.logToOutput("S3TreeView.saveState Error !!!");
		}
	}

	LoadState() {
		ui.logToOutput('S3TreeView.loadState Started');
		try {

			let AwsProfileTemp: string | undefined = this.context.globalState.get('AwsProfile');
			if (AwsProfileTemp) {
				this.AwsProfile = AwsProfileTemp;
			}

			let filterStringTemp: string | undefined = this.context.globalState.get('FilterString');
			if (filterStringTemp) {
				this.FilterString = filterStringTemp;
			}

			let ShowOnlyFavoriteTemp: boolean | undefined = this.context.globalState.get('ShowOnlyFavorite');
			if (ShowOnlyFavoriteTemp) { this.isShowOnlyFavorite = ShowOnlyFavoriteTemp; }

			let LogGroupListTemp:[[string,string]] | undefined  = this.context.globalState.get('LogGroupList');
			if(LogGroupListTemp)
			{
				this.treeDataProvider.LogGroupList = LogGroupListTemp;
			}

			let LogStreamListTemp:[[string,string,string]] | undefined  = this.context.globalState.get('LogStreamList');
			if(LogStreamListTemp)
			{
				this.treeDataProvider.LogStreamList = LogStreamListTemp;
			}

			let ViewTypeTemp:number | undefined = this.context.globalState.get('ViewType');
			if(ViewTypeTemp)
			{
				this.treeDataProvider.ViewType = ViewTypeTemp;
			}

			ui.logToOutput("S3TreeView.loadState Successfull");

		} 
		catch (error) 
		{
			ui.logToOutput("S3TreeView.loadState Error !!!");
		}
	}

	SetFilterMessage(){
		this.view.message = "Profile:" + this.AwsProfile + " " + this.GetBoolenSign(this.isShowOnlyFavorite) + "Fav, " + this.FilterString;
	}

	GetBoolenSign(variable: boolean){
		return variable ? "✓" : "𐄂";
	}

	async AddLogGroup(){
		ui.logToOutput('S3TreeView.AddLogGroup Started');


	}

	async AddLogGroupByName(){
		ui.logToOutput('S3TreeView.AddLogGroupByName Started');


	}

	async RemoveLogGroup(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.RemoveLogGroup Started');
		
		if(node.TreeItemType !== TreeItemType.LogGroup) { return;}
		if(!node.Region || !node.LogGroup) { return; }
		
		this.treeDataProvider.RemoveLogGroup(node.Region, node.LogGroup);
		this.SaveState();
	}

	async AddLogStream(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.AddLogStream Started');

	}

	async AddAllLogStreams(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.AddLogStream Started');

	}

	async RemoveLogStream(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.RemoveLogStream Started');


	}

	async RemoveAllLogStreams(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.RemoveAllLogStreams Started');
		
	}

	async ShowS3LogView(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.ShowS3LogView Started');
		
	}

	async SelectAwsProfile(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.SelectAwsProfile Started');

		var result = await api.GetAwsProfileList();
		if(!result.isSuccessful){ return; }

		let selectedAwsProfile = await vscode.window.showQuickPick(result.result, {canPickMany:false, placeHolder: 'Select Aws Profile'});
		if(!selectedAwsProfile){ return; }

		this.AwsProfile = selectedAwsProfile;
		this.SaveState();
		this.SetFilterMessage();
	}

}
