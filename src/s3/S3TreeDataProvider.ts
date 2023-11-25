/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { S3TreeItem, TreeItemType } from './S3TreeItem';
import { S3TreeView } from './S3TreeView';

export class S3TreeDataProvider implements vscode.TreeDataProvider<S3TreeItem>
{
	private _onDidChangeTreeData: vscode.EventEmitter<S3TreeItem | undefined | void> = new vscode.EventEmitter<S3TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<S3TreeItem | undefined | void> = this._onDidChangeTreeData.event;
	
	BucketNodeList: S3TreeItem[] = [];
	ShortcutNodeList: S3TreeItem[] = [];

	private BucketList: string[] = [];
	private ShortcutList: [[string,string]] = [["???","???"]];
	public ViewType:ViewType = ViewType.Bucket_Shortcut;

	constructor() {
		this.ShortcutList.splice(0,1);
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

	public SetShortcutList(ShortcutList: [[string,string]]){
		this.ShortcutList = ShortcutList;
		this.LoadShortcutNodeList();
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
			if(this.ShortcutList[i][0] === Bucket)
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
			if(this.ShortcutList[i][0] === Bucket)
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
			if(ls[0] === Bucket && ls[1] === Key)
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

		this.ShortcutList.push([Bucket, Key]);
		this.LoadShortcutNodeList();
		this.Refresh();
	}

	RemoveShortcut(Bucket:string, Shortcut:string){
		for(let i = 0; i < this.ShortcutList.length; i++)
		{
			if(this.ShortcutList[i][0] === Bucket && this.ShortcutList[i][1] === Shortcut)
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
			if(this.ShortcutList[i][0] === Bucket && this.ShortcutList[i][1] === Shortcut)
			{
				this.ShortcutList[i][1] = NewShortcut
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
			this.BucketNodeList.push(treeItem);
		}
	}

	LoadShortcutNodeList(){
		this.ShortcutNodeList = [];
		
		for(var lg of this.ShortcutList)
		{
			let treeItem = new S3TreeItem(lg[1], TreeItemType.Shortcut);
			treeItem.Bucket = lg[0];
			treeItem.Shortcut = lg[1];
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