/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { S3TreeItem, TreeItemType } from './S3TreeItem';
import { S3TreeDataProvider } from './S3TreeDataProvider';
import * as ui from '../common/UI';
import * as api from '../common/API';
import { APIGateway } from 'aws-sdk';
import { S3Explorer } from './S3Explorer';

export class S3TreeView {

	public static Current: S3TreeView | undefined;
	public view: vscode.TreeView<S3TreeItem>;
	public treeDataProvider: S3TreeDataProvider;
	public context: vscode.ExtensionContext;
	public FilterString: string = "";
	public isShowOnlyFavorite: boolean = false;
	public AwsProfile: string = "default";	

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

		//this.treeDataProvider.LoadRegionNodeList();
		//this.treeDataProvider.LoadLogGroupNodeList();
		//this.treeDataProvider.LoadLogStreamNodeList();
		//this.treeDataProvider.Refresh();
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
			this.context.globalState.update('BucketList', this.treeDataProvider.GetBucketList());
			this.context.globalState.update('ShortcutList', this.treeDataProvider.GetShortcutList());
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

			let BucketListTemp:string[] | undefined  = this.context.globalState.get('BucketList');
			if(BucketListTemp)
			{
				this.treeDataProvider.SetBucketList(BucketListTemp);
			}

			let ShortcutListTemp:[[string,string]] | undefined  = this.context.globalState.get('ShortcutList');
			if(ShortcutListTemp)
			{
				this.treeDataProvider.SetShortcutList(ShortcutListTemp);
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

	async AddBucket(){
		ui.logToOutput('S3TreeView.AddBucket Started');

		let selectedBucketName = await vscode.window.showInputBox({ placeHolder: 'Enter Bucket Name / Search Text' });
		if(selectedBucketName===undefined){ return; }

		var resultBucket = await api.GetBucketList(this.AwsProfile, selectedBucketName);
		if(!resultBucket.isSuccessful){ return; }

		let selectedBucketList = await vscode.window.showQuickPick(resultBucket.result, {canPickMany:true, placeHolder: 'Select Bucket(s)'});
		if(!selectedBucketList || selectedBucketList.length===0){ return; }

		for(var selectedBucket of selectedBucketList)
		{
			this.treeDataProvider.AddBucket(selectedBucket);
		}
		this.SaveState();
	}

	async RemoveBucket(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.RemoveBucket Started');
		
		if(node.TreeItemType !== TreeItemType.Bucket) { return;}
		if(!node.Bucket) { return; }

		this.treeDataProvider.RemoveBucket(node.Bucket);		
		this.SaveState();
	}

	async AddOrRemoveShortcut(Bucket:string, Key:string) {
		ui.logToOutput('S3TreeView.AddShortcut Started');
		if(!Bucket || !Key) { return; }
		
		if(this.treeDataProvider.DoesShortcutExists(Bucket, Key))
		{
			this.treeDataProvider.RemoveShortcut(Bucket, Key);
		}
		else
		{
			this.treeDataProvider.AddShortcut(Bucket, Key);
		}
		
		this.SaveState();
	}

	DoesShortcutExists(Bucket:string, Key:string|undefined):boolean {
		if(!Key){return false;}
		return this.treeDataProvider.DoesShortcutExists(Bucket, Key);
	}

	async RemoveShortcut(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.RemoveShortcut Started');
		if(node.TreeItemType !== TreeItemType.Shortcut) { return;}
		if(!node.Bucket || !node.Shortcut) { return; }
		
		this.treeDataProvider.RemoveShortcut(node.Bucket, node.Shortcut);
		S3Explorer.Current?.RenderHtml();//to update shortcut icon
		this.SaveState();
	}

	async ShowS3Explorer(node: S3TreeItem) {
		ui.logToOutput('S3TreeView.ShowS3Explorer Started');
		

		S3Explorer.Render(this.context.extensionUri, node);
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
