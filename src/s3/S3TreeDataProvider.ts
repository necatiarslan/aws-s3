/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { S3TreeItem, TreeItemType } from './S3TreeItem';
import { S3TreeView } from './S3TreeView';
import * as ui from '../common/UI';

export class S3TreeDataProvider implements vscode.TreeDataProvider<S3TreeItem>
{
	private _onDidChangeTreeData: vscode.EventEmitter<S3TreeItem | undefined | void> = new vscode.EventEmitter<S3TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<S3TreeItem | undefined | void> = this._onDidChangeTreeData.event;
	
	BucketNodeList: S3TreeItem[] = [];
	ShortcutNodeList: S3TreeItem[] = [];

	public BucketList: string[] = [];
	public ShortcutList: { Bucket:string, Shortcut:string }[] = [];
	public ViewType:ViewType = ViewType.Bucket_Shortcut;
	public BucketProfileList: { Bucket:string, Profile:string }[] = [];

	constructor() {
		
	}

	Refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	public GetBucketList(){
		return this.BucketList;
	}

	public GetShortcutList(){
		return this.ShortcutList;
	}

	public SetBucketList(BucketList: string[]){
		this.BucketList = BucketList;
		this.LoadBucketNodeList();
	}

	public SetShortcutList(ShortcutList: { Bucket:string, Shortcut:string }[]){
		this.ShortcutList = ShortcutList;
		this.LoadShortcutNodeList();
	}

	public AddBucketProfile(Bucket:string, Profile:string){
		if(!Bucket || !Profile) { return; }
		
		let profile = this.GetBucketProfile(Bucket);
		if(profile === Profile){ return; }
		if(profile && profile !== Profile){ this.RemoveBucketProfile(Bucket); }

		this.BucketProfileList.push({Bucket:Bucket, Profile:Profile});
	}

	public RemoveBucketProfile(Bucket:string){
		for(let i = 0; i < this.BucketProfileList.length; i++)
		{
			if(this.BucketProfileList[i].Bucket === Bucket)
			{
				this.BucketProfileList.splice(i, 1);
				i--;
			}
		}
	}

	public GetBucketProfile(Bucket:string){
		for(let i = 0; i < this.BucketProfileList.length; i++)
		{
			if(this.BucketProfileList[i].Bucket === Bucket)
			{
				return this.BucketProfileList[i].Profile;
			}
		}
		return "";
	}

	AddBucket(Bucket:string){
		if(this.BucketList.includes(Bucket)){ return; }

		this.BucketList.push(Bucket);
		this.LoadBucketNodeList();
		this.Refresh();
	}

	RemoveBucket(Bucket:string){
		for(let i = 0; i < this.ShortcutList.length; i++)
		{
			if(this.ShortcutList[i]["Bucket"] === Bucket)
			{
				this.ShortcutList.splice(i, 1);
				i--;
			}
		}
		this.LoadShortcutNodeList();

		for(let i = 0; i < this.BucketList.length; i++)
		{
			if(this.BucketList[i] === Bucket)
			{
				this.BucketList.splice(i, 1);
				i--;
			}
		}
		this.LoadBucketNodeList();
		this.Refresh();
	}

	RemoveAllShortcuts(Bucket:string){
		for(let i = 0; i < this.ShortcutList.length; i++)
		{
			if(this.ShortcutList[i]["Bucket"] === Bucket)
			{
				this.ShortcutList.splice(i, 1);
				i--;
			}
		}
		this.LoadShortcutNodeList();
		this.Refresh();
	}

	DoesShortcutExists(Bucket:string, Key:string):boolean{
		if(!Bucket || !Key) { return false; }

		for(var ls of this.ShortcutList)
		{
			if(ls["Bucket"] === Bucket && ls["Shortcut"] === Key)
			{
				return true;
			}
		}
		return false;
	}

	AddShortcut(Bucket:string, Key:string){
		if(!Bucket || !Key) { return; }
		
		if(this.DoesShortcutExists(Bucket, Key))
		{
			return;
		}

		this.ShortcutList.push({Bucket:Bucket, Shortcut:Key});
		this.LoadShortcutNodeList();
		this.Refresh();
	}

	RemoveShortcut(Bucket:string, Shortcut:string){
		for(let i = 0; i < this.ShortcutList.length; i++)
		{
			if(this.ShortcutList[i]["Bucket"] === Bucket && this.ShortcutList[i]["Shortcut"] === Shortcut)
			{
				this.ShortcutList.splice(i, 1);
				i--;
			}
		}
		this.LoadShortcutNodeList();
		this.Refresh();
	}

	UpdateShortcut(Bucket:string, Shortcut:string, NewShortcut:string){
		for(let i = 0; i < this.ShortcutList.length; i++)
		{
			if(this.ShortcutList[i]["Bucket"] === Bucket && this.ShortcutList[i]["Shortcut"] === Shortcut)
			{
				this.ShortcutList[i]["Shortcut"] = NewShortcut
			}
		}
		this.LoadShortcutNodeList();
		this.Refresh();
	}

	LoadBucketNodeList(){
		this.BucketNodeList = [];
		
		for(var bucket of this.BucketList)
		{
			let treeItem = new S3TreeItem(bucket, TreeItemType.Bucket);
			treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
			treeItem.Bucket = bucket;
			treeItem.ProfileToShow = this.GetBucketProfile(bucket);
			this.BucketNodeList.push(treeItem);
		}
	}

	LoadShortcutNodeList(){
		this.ShortcutNodeList = [];
		
		for(var lg of this.ShortcutList)
		{
			let treeItem = new S3TreeItem(lg["Shortcut"], TreeItemType.Shortcut);
			treeItem.Bucket = lg["Bucket"];
			treeItem.Shortcut = lg["Shortcut"];
			this.ShortcutNodeList.push(treeItem);
		}
	}

	getChildren(node: S3TreeItem): Thenable<S3TreeItem[]> {
		let result:S3TreeItem[] = [];

		if(this.ViewType === ViewType.Bucket_Shortcut)
		{
			result = this.GetNodesBucketShortcut(node);
		}

		return Promise.resolve(result);
	}

	GetNodesShortcut(node: S3TreeItem):S3TreeItem[]
	{
		let result:S3TreeItem[] = [];
		result = this.GetShortcutNodes();
		return result;
	}

	GetNodesBucketShortcut(node: S3TreeItem):S3TreeItem[]
	{
		let result:S3TreeItem[] = [];
		
		if (!node) {
			result = this.GetBucketNodes();
		}
		else if(node.TreeItemType === TreeItemType.Bucket){
			result = this.GetShortcutNodesParentBucket(node);
		}

		return result;
	}

	GetBucketNodes(): S3TreeItem[]{
		var result: S3TreeItem[] = [];
		for (var node of this.BucketNodeList) {
			if (S3TreeView.Current && S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView.Current.FilterString)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) { continue; }
			if (S3TreeView.Current && !S3TreeView.Current.isShowHiddenNodes && (node.IsHidden)) { continue; }
			if (S3TreeView.Current && !S3TreeView.Current.isShowHiddenNodes && (node.ProfileToShow && node.ProfileToShow !== S3TreeView.Current.AwsProfile)) { continue; }
			
			result.push(node);
		}
		return result;
	}

	GetShortcutNodesParentBucket(BucketNode:S3TreeItem): S3TreeItem[]{
		var result: S3TreeItem[] = [];
		for (var node of this.ShortcutNodeList) {
			if(!(node.Bucket === BucketNode.Bucket)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView.Current.FilterString)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) { continue; }
			if (S3TreeView.Current && !S3TreeView.Current.isShowHiddenNodes && (node.IsHidden)) { continue; }
			if (S3TreeView.Current && !S3TreeView.Current.isShowHiddenNodes && (node.ProfileToShow && node.ProfileToShow !== S3TreeView.Current.AwsProfile)) { continue; }

			node.Parent = BucketNode;
			if(BucketNode.Children.indexOf(node) === -1)
			{
				BucketNode.Children.push(node);
			}
			result.push(node);
		}
		return result;
	}

	GetShortcutNodes(): S3TreeItem[]{
		var result: S3TreeItem[] = [];
		for (var node of this.ShortcutNodeList) {
			if (S3TreeView.Current && S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView.Current.FilterString)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) { continue; }
			if (S3TreeView.Current && !S3TreeView.Current.isShowHiddenNodes && (node.IsHidden)) { continue; }

			result.push(node);
		}
		return result;
	}
	
	getTreeItem(element: S3TreeItem): S3TreeItem {
		return element;
	}
}

export enum ViewType{
	Bucket_Shortcut = 1
}