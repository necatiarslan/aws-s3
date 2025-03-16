/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';

export class S3TreeItem extends vscode.TreeItem {
	private _isFav: boolean = false;
	public TreeItemType:TreeItemType;
	public Text:string;
	public Bucket:string | undefined;
	public Shortcut:string | undefined;
	public Parent:S3TreeItem | undefined;
	public Children:S3TreeItem[] = [];
	private _isHidden: boolean = false;
	public ProfileToShow: string = "";

	public set IsHidden(value: boolean) {
		this._isHidden = value;
		this.setContextValue();
	}

	public get IsHidden(): boolean {
		return this._isHidden;
	}

	public set IsFav(value: boolean) {
		this._isFav = value;
		this.setContextValue();
	}

	public get IsFav(): boolean {
		return this._isFav;
	}

	constructor(text:string, treeItemType:TreeItemType) {
		super(text);
		this.Text = text;
		this.TreeItemType = treeItemType;
		this.refreshUI();
	}

	public setContextValue(){
		let contextValue = "#";
		contextValue += this.IsFav ? "Fav#" : "!Fav#";
		contextValue += this.IsHidden ? "Hidden#" : "!Hidden#";
		contextValue += this.TreeItemType === TreeItemType.Bucket ? "Bucket#" : "";
		contextValue += this.TreeItemType === TreeItemType.Shortcut ? "Shortcut#" : "";

		this.contextValue = contextValue;
	}

	public refreshUI() {

		if(this.TreeItemType === TreeItemType.Bucket)
		{
			this.iconPath = new vscode.ThemeIcon('package');
		}
		else if(this.TreeItemType === TreeItemType.Shortcut)
		{
			this.iconPath = new vscode.ThemeIcon('file-symlink-directory');
		}
		else
		{
			this.iconPath = new vscode.ThemeIcon('circle-outline');
		}
		this.setContextValue();
	}

	public IsAnyChidrenFav(){
		return this.IsAnyChidrenFavInternal(this);
	}

	public IsAnyChidrenFavInternal(node:S3TreeItem): boolean{
		for(var n of node.Children)
		{
			if(n.IsFav)
			{
				return true;
			}
			else if (n.Children.length > 0)
			{
				return this.IsAnyChidrenFavInternal(n);
			}
		}

		return false;
	}

	public IsFilterStringMatch(FilterString:string){
		if(this.Text.includes(FilterString))
		{
			return true;
		}

		if(this.IsFilterStringMatchAnyChildren(this, FilterString))
		{
			return true;
		}

		return false;
	}

	public IsFilterStringMatchAnyChildren(node:S3TreeItem, FilterString:string): boolean{
		for(var n of node.Children)
		{
			if(n.Text.includes(FilterString))
			{
				return true;
			}
			else if (n.Children.length > 0)
			{
				return this.IsFilterStringMatchAnyChildren(n, FilterString);
			}
		}

		return false;
	}
}

export enum TreeItemType{
	Bucket = 1,
	Shortcut = 2,
}