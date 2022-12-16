/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { S3TreeItem, TreeItemType } from './S3TreeItem';
import { S3TreeView } from './S3TreeView';

export class S3TreeDataProvider implements vscode.TreeDataProvider<S3TreeItem>
{
	private _onDidChangeTreeData: vscode.EventEmitter<S3TreeItem | undefined | void> = new vscode.EventEmitter<S3TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<S3TreeItem | undefined | void> = this._onDidChangeTreeData.event;
	RegionNodeList: S3TreeItem[] = [];
	LogGroupNodeList: S3TreeItem[] = [];
	LogStreamNodeList: S3TreeItem[] = [];
	LogGroupList: [[string,string]] = [["???","???"]];
	LogStreamList: [[string,string,string]] = [["???","???","???"]];
	public ViewType:ViewType = ViewType.Region_LogGroup_LogStream;

	constructor() {
		this.LogGroupList.splice(0,1);
		this.LogStreamList.splice(0,1);
	}

	Refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	AddLogGroup(Region:string, LogGroup:string){
		for(var lg of this.LogGroupList)
		{
			if(lg[0] === Region && lg[1] === LogGroup)
			{
				return;
			}
		}

		this.LogGroupList.push([Region, LogGroup]);
		this.LoadLogGroupNodeList();
		this.LoadRegionNodeList();
		this.Refresh();
	}

	RemoveLogGroup(Region:string, LogGroup:string){
		for(let i = 0; i < this.LogStreamList.length; i++)
		{
			if(this.LogStreamList[i][0] === Region && this.LogStreamList[i][1] === LogGroup)
			{
				this.LogStreamList.splice(i, 1);
				i--;
			}
		}
		this.LoadLogStreamNodeList();

		for(let i = 0; i < this.LogGroupList.length; i++)
		{
			if(this.LogGroupList[i][0] === Region && this.LogGroupList[i][1] === LogGroup)
			{
				this.LogGroupList.splice(i, 1);
				i--;
			}
		}
		this.LoadLogGroupNodeList();
		this.LoadRegionNodeList();
		this.Refresh();
	}

	RemoveAllLogStreams(Region:string, LogGroup:string){
		for(let i = 0; i < this.LogStreamList.length; i++)
		{
			if(this.LogStreamList[i][0] === Region && this.LogStreamList[i][1] === LogGroup)
			{
				this.LogStreamList.splice(i, 1);
				i--;
			}
		}
		this.LoadLogStreamNodeList();
		this.Refresh();
	}

	AddLogStream(Region:string, LogGroup:string, LogStream:string){
		for(var ls of this.LogStreamList)
		{
			if(ls[0] === Region && ls[1] === LogGroup && ls[2] === LogStream)
			{
				return;
			}
		}


		this.LogStreamList.push([Region, LogGroup, LogStream]);
		this.LoadLogStreamNodeList();
		this.Refresh();
	}

	RemoveLogStream(Region:string, LogGroup:string, LogStream:string){
		for(let i = 0; i < this.LogStreamList.length; i++)
		{
			if(this.LogStreamList[i][0] === Region && this.LogStreamList[i][1] === LogGroup && this.LogStreamList[i][2] === LogStream)
			{
				this.LogStreamList.splice(i, 1);
				i--;
			}
		}
		this.LoadLogStreamNodeList();
		this.Refresh();
	}

	LoadLogGroupNodeList(){
		this.LogGroupNodeList = [];
		
		for(var lg of this.LogGroupList)
		{
			if(lg[0] === "???"){ continue; }
			let treeItem = new S3TreeItem(lg[1], TreeItemType.LogGroup);
			treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
			treeItem.Region = lg[0];
			treeItem.LogGroup = lg[1];
			this.LogGroupNodeList.push(treeItem);
		}
	}

	LoadRegionNodeList(){
		this.LogGroupNodeList = [];
		
		for(var lg of this.LogGroupList)
		{
			if(lg[0] === "???"){ continue; }
			if(this.GetRegionNode(lg[0]) === undefined)
			{
				let treeItem = new S3TreeItem(lg[0], TreeItemType.Region);
				treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				treeItem.Region = lg[0];
				this.RegionNodeList.push(treeItem);
			}
		}
	}

	GetRegionNode(Region:string):S3TreeItem | undefined{
		for(var node of this.RegionNodeList)
		{
			if(node.Region === Region)
			{
				return node;
			}
		}
		return undefined;
	}

	LoadLogStreamNodeList(){
		this.LogStreamNodeList = [];
		
		for(var lg of this.LogStreamList)
		{
			if(lg[0] === "???"){ continue; }
			let treeItem = new S3TreeItem(lg[2], TreeItemType.LogStream);
			treeItem.Region = lg[0];
			treeItem.LogGroup = lg[1];
			treeItem.LogStream = lg[2];
			this.LogStreamNodeList.push(treeItem);
		}
	}

	getChildren(node: S3TreeItem): Thenable<S3TreeItem[]> {
		let result:S3TreeItem[] = [];

		if(this.ViewType === ViewType.Region_LogGroup_LogStream)
		{
			result = this.GetNodesRegionLogGroupLogStream(node);
		}
		else if(this.ViewType === ViewType.LogGroup_LogStream)
		{
			result = this.GetNodesLogGroupLogStream(node);
		}
		else if(this.ViewType === ViewType.LogStream)
		{
			result = this.GetNodesLogStream(node);
		}

		return Promise.resolve(result);
	}

	GetNodesRegionLogGroupLogStream(node: S3TreeItem):S3TreeItem[]
	{
		let result:S3TreeItem[] = [];

		if (!node) {
			result = this.GetRegionNodes();
		}
		else if(node.TreeItemType === TreeItemType.Region){
			result = this.GetLogGroupNodesParentRegion(node);
		}
		else if(node.TreeItemType === TreeItemType.LogGroup){
			result = this.GetLogStreamNodesParentLogGroup(node);
		}

		return result;
	}

	GetRegionNodes():S3TreeItem[]
	{
		var result: S3TreeItem[] = [];
		for (var node of this.RegionNodeList) {
			if (S3TreeView.Current && S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView.Current.FilterString)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) { continue; }

			result.push(node);
		}
		return result;
	}

	GetNodesLogStream(node: S3TreeItem):S3TreeItem[]
	{
		let result:S3TreeItem[] = [];
		result = this.GetLogStreamNodes();
		return result;
	}

	GetNodesLogGroupLogStream(node: S3TreeItem):S3TreeItem[]
	{
		let result:S3TreeItem[] = [];
		
		if (!node) {
			result = this.GetLogGroupNodes();
		}
		else if(node.TreeItemType === TreeItemType.LogGroup){
			result = this.GetLogStreamNodesParentLogGroup(node);
		}

		return result;
	}

	GetLogGroupNodes(): S3TreeItem[]{
		var result: S3TreeItem[] = [];
		for (var node of this.LogGroupNodeList) {
			if (S3TreeView.Current && S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView.Current.FilterString)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) { continue; }

			result.push(node);
		}
		return result;
	}

	GetLogGroupNodesParentRegion(RegionNode: S3TreeItem): S3TreeItem[]{
		var result: S3TreeItem[] = [];
		for (var node of this.LogGroupNodeList) {
			if(node.Region !== RegionNode.Region) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView.Current.FilterString)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) { continue; }

			node.Parent = RegionNode;
			if(RegionNode.Children.indexOf(node) === -1)
			{
				RegionNode.Children.push(node);
			}

			result.push(node);
		}
		return result;
	}

	GetLogStreamNodesParentLogGroup(LogGroupNode:S3TreeItem): S3TreeItem[]{
		var result: S3TreeItem[] = [];
		for (var node of this.LogStreamNodeList) {
			if(!(node.Region === LogGroupNode.Region && node.LogGroup === LogGroupNode.LogGroup)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView.Current.FilterString)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) { continue; }

			node.Parent = LogGroupNode;
			if(LogGroupNode.Children.indexOf(node) === -1)
			{
				LogGroupNode.Children.push(node);
			}
			result.push(node);
		}
		return result;
	}

	GetLogStreamNodes(): S3TreeItem[]{
		var result: S3TreeItem[] = [];
		for (var node of this.LogStreamNodeList) {
			if (S3TreeView.Current && S3TreeView.Current.FilterString && !node.IsFilterStringMatch(S3TreeView.Current.FilterString)) { continue; }
			if (S3TreeView.Current && S3TreeView.Current.isShowOnlyFavorite && !(node.IsFav || node.IsAnyChidrenFav())) { continue; }

			result.push(node);
		}
		return result;
	}
	
	getTreeItem(element: S3TreeItem): S3TreeItem {
		return element;
	}

	public async ChangeView(){
		if(this.ViewType === ViewType.Region_LogGroup_LogStream)
		{
			this.ViewType = ViewType.LogGroup_LogStream;
		}
		else if(this.ViewType === ViewType.LogGroup_LogStream)
		{
			this.ViewType = ViewType.LogStream;
		}
		else if(this.ViewType === ViewType.LogStream)
		{
			this.ViewType = ViewType.Region_LogGroup_LogStream;
		}
		this.Refresh();
	}
}

export enum ViewType{
	Region_LogGroup_LogStream = 1,
	LogGroup_LogStream = 2,
	LogStream = 3,
}