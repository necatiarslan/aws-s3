"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeItemType = exports.S3TreeItem = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
class S3TreeItem extends vscode.TreeItem {
    set IsHidden(value) {
        this._isHidden = value;
        this.setContextValue();
    }
    get IsHidden() {
        return this._isHidden;
    }
    set IsFav(value) {
        this._isFav = value;
        this.setContextValue();
    }
    get IsFav() {
        return this._isFav;
    }
    constructor(text, treeItemType) {
        super(text);
        this._isFav = false;
        this.Children = [];
        this._isHidden = false;
        this.Text = text;
        this.TreeItemType = treeItemType;
        this.refreshUI();
    }
    setContextValue() {
        let contextValue = "#";
        contextValue += this.IsFav ? "Fav#" : "!Fav#";
        contextValue += this.IsHidden ? "Hidden#" : "!Hidden#";
        contextValue += this.TreeItemType === TreeItemType.Bucket ? "Bucket#" : "";
        contextValue += this.TreeItemType === TreeItemType.Shortcut ? "Shortcut#" : "";
        this.contextValue = contextValue;
    }
    refreshUI() {
        if (this.TreeItemType === TreeItemType.Bucket) {
            this.iconPath = new vscode.ThemeIcon('package');
        }
        else if (this.TreeItemType === TreeItemType.Shortcut) {
            this.iconPath = new vscode.ThemeIcon('file-symlink-directory');
        }
        else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
        this.setContextValue();
    }
    IsAnyChidrenFav() {
        return this.IsAnyChidrenFavInternal(this);
    }
    IsAnyChidrenFavInternal(node) {
        for (var n of node.Children) {
            if (n.IsFav) {
                return true;
            }
            else if (n.Children.length > 0) {
                return this.IsAnyChidrenFavInternal(n);
            }
        }
        return false;
    }
    IsFilterStringMatch(FilterString) {
        if (this.Text.includes(FilterString)) {
            return true;
        }
        if (this.IsFilterStringMatchAnyChildren(this, FilterString)) {
            return true;
        }
        return false;
    }
    IsFilterStringMatchAnyChildren(node, FilterString) {
        for (var n of node.Children) {
            if (n.Text.includes(FilterString)) {
                return true;
            }
            else if (n.Children.length > 0) {
                return this.IsFilterStringMatchAnyChildren(n, FilterString);
            }
        }
        return false;
    }
}
exports.S3TreeItem = S3TreeItem;
var TreeItemType;
(function (TreeItemType) {
    TreeItemType[TreeItemType["Bucket"] = 1] = "Bucket";
    TreeItemType[TreeItemType["Shortcut"] = 2] = "Shortcut";
})(TreeItemType = exports.TreeItemType || (exports.TreeItemType = {}));
//# sourceMappingURL=S3TreeItem.js.map