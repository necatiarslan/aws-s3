"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Search = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const ui = require("../common/UI");
const api = require("../common/API");
const S3TreeView_1 = require("./S3TreeView");
const S3TreeItem_1 = require("./S3TreeItem");
const S3ExplorerItem_1 = require("./S3ExplorerItem");
const s3_helper = require("./S3Helper");
const S3Explorer_1 = require("./S3Explorer");
const Telemetry_1 = require("../common/Telemetry");
class S3Search {
    constructor(panel, extensionUri, node) {
        this._disposables = [];
        this.S3ExplorerItem = new S3ExplorerItem_1.S3ExplorerItem("undefined", "");
        this.FileName = "";
        this.FileExtension = "";
        this.FolderName = "";
        ui.logToOutput('S3Search.constructor Started');
        this.SetS3ExplorerItem(node);
        this.extensionUri = extensionUri;
        this._panel = panel;
        this._panel.onDidDispose(this.dispose, null, this._disposables);
        this._setWebviewMessageListener(this._panel.webview);
        this.Load();
        ui.logToOutput('S3Search.constructor Completed');
    }
    SetS3ExplorerItem(node) {
        if (node.TreeItemType === S3TreeItem_1.TreeItemType.Bucket && node.Bucket) {
            this.S3ExplorerItem = new S3ExplorerItem_1.S3ExplorerItem(node.Bucket, "");
        }
        else if (node.TreeItemType === S3TreeItem_1.TreeItemType.Shortcut && node.Bucket && node.Shortcut) {
            this.S3ExplorerItem = new S3ExplorerItem_1.S3ExplorerItem(node.Bucket, node.Shortcut);
        }
        else {
            this.S3ExplorerItem = new S3ExplorerItem_1.S3ExplorerItem("undefined", "");
        }
    }
    async RenderHtml() {
        ui.logToOutput('S3Search.RenderHmtl Started');
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, this.extensionUri);
        ui.logToOutput('S3Search.RenderHmtl Completed');
    }
    async Load() {
        Telemetry_1.Telemetry.Current?.send("S3Search.Load");
        ui.logToOutput('S3Search.LoadLogs Started');
        if (!S3TreeView_1.S3TreeView.Current) {
            return;
        }
        var result = await api.SearchObject(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key, this.FileName, this.FileExtension, this.FolderName);
        if (result.isSuccessful) {
            this.S3ObjectList = result.result;
        }
        this.RenderHtml();
    }
    ResetCurrentState() {
    }
    static Render(extensionUri, node) {
        ui.logToOutput('S3Search.Render Started');
        Telemetry_1.Telemetry.Current?.send("S3Search.Render");
        if (S3Search.Current) {
            S3Search.Current.ResetCurrentState();
            S3Search.Current.SetS3ExplorerItem(node);
            S3Search.Current.Load();
            S3Search.Current._panel.reveal(vscode.ViewColumn.One);
        }
        else {
            const panel = vscode.window.createWebviewPanel("S3Search", "S3 Search", vscode.ViewColumn.One, {
                enableScripts: true,
            });
            S3Search.Current = new S3Search(panel, extensionUri, node);
        }
    }
    GetFileExtension(Key) {
        if (!Key) {
            return "";
        }
        if (Key.endsWith("/")) {
            return "Folder";
        }
        return s3_helper.GetFileExtension(s3_helper.GetFileNameWithExtension(Key));
    }
    GetFolderName(Key) {
        if (!Key) {
            return "";
        }
        if (!Key.endsWith("/")) {
            return Key;
        }
        var path = Key.split('/');
        path.pop();
        return path.pop() || "";
    }
    GetNavigationPath(Key) {
        let result = [["/", ""]];
        if (Key) {
            var paths = Key?.split("/");
            let full_path = "";
            for (var p of paths) {
                if (!p) {
                    continue;
                }
                if (Key.includes(p + "/")) {
                    full_path += p + "/";
                    p = p + "/";
                }
                else {
                    full_path += p;
                }
                result.push([p, full_path]);
            }
        }
        return result;
    }
    _getWebviewContent(webview, extensionUri) {
        ui.logToOutput('S3Search._getWebviewContent Started');
        //file URIs
        const vscodeElementsUri = ui.getUri(webview, extensionUri, ["node_modules", "@vscode-elements", "elements", "dist", "bundled.js"]);
        const s3SearchJSUri = ui.getUri(webview, extensionUri, ["media", "s3SearchJS.js"]);
        const styleUri = ui.getUri(webview, extensionUri, ["media", "style.css"]);
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
        const bookmark_yesUri = ui.getUri(webview, extensionUri, ["media", "bookmark_yes.png"]);
        const bookmark_noUri = ui.getUri(webview, extensionUri, ["media", "bookmark_no.png"]);
        const fileUri = ui.getUri(webview, extensionUri, ["media", "file.png"]);
        const folderUri = ui.getUri(webview, extensionUri, ["media", "folder.png"]);
        let fileCounter = 0;
        let folderCounter = 0;
        let S3RowHtml = "";
        if (this.S3ObjectList) {
            if (this.S3ObjectList) {
                for (var file of this.S3ObjectList) {
                    if (!file.Key) {
                        continue;
                    }
                    if (file.Key === this.S3ExplorerItem.Key) {
                        continue;
                    } //do not list object itself
                    let isFile = s3_helper.IsFile(file.Key);
                    let fileName = s3_helper.GetFileNameWithExtension(file.Key);
                    let folderName = s3_helper.GetFolderName(file.Key);
                    if (isFile)
                        fileCounter++;
                    else
                        folderCounter++;
                    S3RowHtml += `
                    <tr>
                        <td style="width:20px">
                            <vscode-checkbox id="checkbox_${file.Key}" ></vscode-checkbox>
                        </td>
                        <td style="width:20px">
                            <img 
                                id="add_shortcut_${file.Key}"
                                src="${S3TreeView_1.S3TreeView.Current?.DoesShortcutExists(this.S3ExplorerItem.Bucket, file.Key) ? bookmark_yesUri : bookmark_noUri}">
                            </img>
                        </td>
                        <td style="white-space:nowrap;">
                            <img src="${isFile ? fileUri : folderUri}"></img>
                            <a id="open_${file.Key}">${isFile ? fileName : folderName}</a>
                        </td>
                        <td style="white-space:nowrap;">
                            ${s3_helper.GetParentFolderKey(file.Key)}
                        </td>
                        <td style="text-align:right; width:100px">${this.GetFileExtension(file.Key)}</td>
                        <td style="text-align:right; width:100px">${file.LastModified ? file.LastModified.toLocaleDateString() : ""}</td>
                        <td style="text-align:right; width:100px">${ui.bytesToText(file.Size)}</td>
                    </tr>
                    `;
                }
            }
        }
        if (fileCounter === 0) {
            S3RowHtml += `
            <tr>
                <td colspan="7" style="text-align:center;">No Files Found</td>
            </tr>
            `;
        }
        let result = /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <script type="module" src="${vscodeElementsUri}"></script>
        <script type="module" src="${s3SearchJSUri}"></script>
        <link href="${codiconsUri}" rel="stylesheet" id="vscode-codicon-stylesheet"/>
        <link rel="stylesheet" href="${styleUri}">
        <title></title>
      </head>
      <body>  
        
        <div style="display: flex; align-items: center;">
            <h2>${this.S3ExplorerItem.GetFullPath()}</h2>
        </div>

        <table>
            <tr>
                <td colspan="3">
                    <vscode-textfield id="file_name" placeholder="File Name" value="${this.FileName}" style="width: 20ch; vertical-align: top;">
                        <vscode-icon slot="content-before" name="search" title="search"></vscode-icon>
                    </vscode-textfield>

                    <vscode-textfield id="file_extension" placeholder="Extension" value="${this.FileExtension}" style="width: 20ch; vertical-align: top;">
                        <vscode-icon slot="content-before" name="search" title="search"></vscode-icon>
                    </vscode-textfield>

                    <vscode-textfield id="folder_name" placeholder="Key / Folder" value="${this.FolderName}" style="width: 20ch;">
                        <vscode-icon slot="content-before" name="search" title="search"></vscode-icon>
                    </vscode-textfield>

                    <vscode-single-select style="width: 100px; vertical-align: top;" id="copy_dropdown">
                        <vscode-option>Copy</vscode-option>
                        <vscode-option>File Name(s) No Ext</vscode-option>
                        <vscode-option>File Name(s) /w Ext</vscode-option>
                        <vscode-option>Key(s)</vscode-option>
                        <vscode-option>ARN(s)</vscode-option>
                        <vscode-option>S3 URI(s)</vscode-option>
                        <vscode-option>URL(s)</vscode-option>
                    </vscode-single-select>
                </td>
                <td colspan="4" style="text-align:right;">
                    <vscode-button secondary id="refresh" style="vertical-align: top;">Search</vscode-button>
                </td>
            </tr>
            </table>

            <table>
            <tr>
                <th style="width:20px"></th>
                <th style="width:20px"></th>
                <th>Name</th>
                <th>Folder</th>
                <th style="width:100px; text-align:center">Type</th>
                <th style="width:100px; text-align:center">Modified</th>
                <th style="width:100px; text-align:center">Size</th>
            </tr>
            </table>

            <table>
            ${S3RowHtml}
            </table>

            <table>
            <tr>
                <th style="width:50px;">
                    Select
                </th>
                <th colspan="2" style="text-align:left">
                    <vscode-button secondary id="select_all">All</vscode-button>
                    <vscode-button secondary id="select_none">None</vscode-button>
                </th>
                <th colspan="4" style="text-align:right">
                    ${fileCounter} File(s), ${folderCounter} Folder(s) 
                </th>
            </tr>

        </table>
        
        <br>        
        <br>
        <br>
        <br>
                    
        <table>
            <tr>
                <td>
                    <a href="https://github.com/necatiarslan/aws-s3/issues/new" style="cursor: pointer; text-decoration: none;">Bug Report & Feature Request</a>
                </td>
            </tr>
        </table>
        <table>
            <tr>
                <td>
                    <a href="https://bit.ly/s3-extension-survey" style="cursor: pointer; text-decoration: none;">New Feature Survey</a>
                </td>
            </tr>
        </table>
        <table>
            <tr>
                <td>
                    <a href="https://github.com/sponsors/necatiarslan" style="cursor: pointer; text-decoration: none;">Donate to support this extension</a>
                </td>
            </tr>
        </table>
      </body>
    </html>
    `;
        ui.logToOutput('S3Search._getWebviewContent Completed');
        return result;
    }
    _setWebviewMessageListener(webview) {
        ui.logToOutput('S3Search._setWebviewMessageListener Started');
        webview.onDidReceiveMessage((message) => {
            const command = message.command;
            let id;
            ui.logToOutput('S3Search._setWebviewMessageListener Message Received ' + message.command);
            switch (command) {
                case "refresh":
                    this.FileName = message.file_name;
                    this.FileExtension = message.file_extension;
                    this.FolderName = message.folder_name;
                    this.Load();
                    return;
                case "open":
                    id = message.id;
                    id = id.replace("open_", "");
                    let node = new S3TreeItem_1.S3TreeItem("", S3TreeItem_1.TreeItemType.Shortcut);
                    node.Bucket = this.S3ExplorerItem.Bucket;
                    node.Shortcut = id;
                    S3Explorer_1.S3Explorer.Render(this.extensionUri, node);
                    return;
                case "copy":
                    if (message.keys.length == 0) {
                        return;
                    }
                    switch (message.action) {
                        case "File Name(s) No Ext":
                            this.CopyFileNameWithoutExtension(message.keys);
                            return;
                        case "File Name(s) /w Ext":
                            this.CopyFileNameWithExtension(message.keys);
                            return;
                        case "Key(s)":
                            this.CopyKeys(message.keys);
                            return;
                        case "ARN(s)":
                            this.CopyFileARNs(message.keys);
                            return;
                        case "S3 URI(s)":
                            this.CopyS3URI(message.keys);
                            return;
                        case "URL(s)":
                            this.CopyURLs(message.keys);
                            return;
                    }
                    return;
                case "add_shortcut":
                    id = message.id;
                    id = id.replace("add_shortcut_", "");
                    this.AddShortcut(id);
                    return;
            }
        }, undefined, this._disposables);
    }
    AddShortcut(key) {
        Telemetry_1.Telemetry.Current?.send("S3Search.AddShortcut");
        S3TreeView_1.S3TreeView.Current?.AddOrRemoveShortcut(this.S3ExplorerItem.Bucket, key);
        this.RenderHtml();
    }
    CopyS3URI(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Search.CopyS3URI");
        if (keys.length === 0 || !keys.includes("|")) {
            return;
        }
        var keyList = keys.split("|");
        var listToCopy = [];
        for (var key of keyList) {
            if (key) {
                listToCopy.push(s3_helper.GetURI(this.S3ExplorerItem.Bucket, key));
            }
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("S3 URI(s) are copied to clipboard");
        }
    }
    CopyURLs(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Search.CopyURLs");
        if (keys.length === 0 || !keys.includes("|")) {
            return;
        }
        var keyList = keys.split("|");
        var listToCopy = [];
        for (var key of keyList) {
            if (key) {
                listToCopy.push(s3_helper.GetURL(this.S3ExplorerItem.Bucket, key));
            }
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("URL(s) are copied to clipboard");
        }
    }
    CopyFileNameWithExtension(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Search.CopyFileNameWithExtension");
        if (keys.length === 0 || !keys.includes("|")) {
            return;
        }
        var keyList = keys.split("|");
        var listToCopy = [];
        for (var key of keyList) {
            if (key) {
                listToCopy.push(s3_helper.GetFileNameWithExtension(key));
            }
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("File Name(s) /w Ext are copied to clipboard");
        }
    }
    CopyFileNameWithoutExtension(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Search.CopyFileNameWithoutExtension");
        if (keys.length === 0 || !keys.includes("|")) {
            return;
        }
        var keyList = keys.split("|");
        var listToCopy = [];
        for (var key of keyList) {
            if (key) {
                listToCopy.push(s3_helper.GetFileNameWithoutExtension(key));
            }
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("File Name(s) No Ext are copied to clipboard");
        }
    }
    CopyKeys(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Search.CopyKeys");
        if (keys.length === 0 || !keys.includes("|")) {
            return;
        }
        var keyList = keys.split("|");
        let result = ui.CopyListToClipboard(keyList);
        if (result.isSuccessful) {
            ui.showInfoMessage("Key(s) are copied to clipboard");
        }
    }
    CopyFileARNs(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Search.CopyFileARNs");
        if (keys.length === 0 || !keys.includes("|")) {
            return;
        }
        var keyList = keys.split("|");
        var listToCopy = [];
        for (var key of keyList) {
            if (key) {
                listToCopy.push(s3_helper.GetARN(this.S3ExplorerItem.Bucket, key));
            }
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("ARN(s) are copied to clipboard");
        }
    }
    dispose() {
        ui.logToOutput('S3Search.dispose Started');
        S3Search.Current = undefined;
        if (this._panel)
            this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
exports.S3Search = S3Search;
//# sourceMappingURL=S3Search.js.map