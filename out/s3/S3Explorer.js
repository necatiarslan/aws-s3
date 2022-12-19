"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Explorer = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const ui = require("../common/UI");
const api = require("../common/API");
const S3TreeView_1 = require("./S3TreeView");
const S3TreeItem_1 = require("./S3TreeItem");
const S3ExplorerItem_1 = require("./S3ExplorerItem");
class S3Explorer {
    constructor(panel, extensionUri, node) {
        this._disposables = [];
        this.S3ExplorerItem = new S3ExplorerItem_1.S3ExplorerItem("undefined", "");
        ui.logToOutput('S3Explorer.constructor Started');
        this.SetS3ExplorerItem(node);
        this.extensionUri = extensionUri;
        this._panel = panel;
        this._panel.onDidDispose(this.dispose, null, this._disposables);
        this._setWebviewMessageListener(this._panel.webview);
        this.Load();
        ui.logToOutput('S3Explorer.constructor Completed');
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
        this.HomeKey = node.Shortcut;
    }
    async RenderHtml() {
        ui.logToOutput('S3Explorer.RenderHmtl Started');
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, this.extensionUri);
        ui.logToOutput('S3Explorer.RenderHmtl Completed');
    }
    async Load() {
        ui.logToOutput('S3Explorer.LoadLogs Started');
        if (!S3TreeView_1.S3TreeView.Current) {
            return;
        }
        var result = await api.GetS3ObjectList(S3TreeView_1.S3TreeView.Current.AwsProfile, this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key);
        if (result.isSuccessful) {
            this.S3ObjectList = result.result;
        }
        this.RenderHtml();
    }
    ResetCurrentState() {
    }
    static Render(extensionUri, node) {
        ui.logToOutput('S3Explorer.Render Started');
        if (S3Explorer.Current) {
            S3Explorer.Current.ResetCurrentState();
            S3Explorer.Current.SetS3ExplorerItem(node);
            S3Explorer.Current.Load();
        }
        else {
            const panel = vscode.window.createWebviewPanel("S3Explorer", "S3 Explorer", vscode.ViewColumn.One, {
                enableScripts: true,
            });
            S3Explorer.Current = new S3Explorer(panel, extensionUri, node);
        }
    }
    s3KeyType(Key) {
        if (!Key) {
            return "";
        }
        if (Key.endsWith("/")) {
            return "Folder";
        }
        if (!Key.includes(".")) {
            return "File";
        }
        return Key.split('.').pop() || "";
    }
    GetFileName(Key) {
        if (!Key) {
            return "";
        }
        if (Key.endsWith("/")) {
            return Key;
        }
        if (!Key.includes("/")) {
            return Key;
        }
        return Key.split('/').pop() || "";
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
        ui.logToOutput('S3Explorer._getWebviewContent Started');
        //file URIs
        const toolkitUri = ui.getUri(webview, extensionUri, [
            "node_modules",
            "@vscode",
            "webview-ui-toolkit",
            "dist",
            "toolkit.js", // A toolkit.min.js file is also available
        ]);
        const mainUri = ui.getUri(webview, extensionUri, ["media", "main.js"]);
        const styleUri = ui.getUri(webview, extensionUri, ["media", "style.css"]);
        const bucketUri = ui.getUri(webview, extensionUri, ["media", "aws-s3-logo-activitybar.png"]);
        const downloadUri = ui.getUri(webview, extensionUri, ["media", "download.png"]);
        const copyUri = ui.getUri(webview, extensionUri, ["media", "edit-copy.png"]);
        const deleteUri = ui.getUri(webview, extensionUri, ["media", "edit-delete.png"]);
        const renameUri = ui.getUri(webview, extensionUri, ["media", "edit-rename.png"]);
        const addShortcutUri = ui.getUri(webview, extensionUri, ["media", "bookmarks.png"]);
        const moveUri = ui.getUri(webview, extensionUri, ["media", "edit-move.png"]);
        const copyUriUri = ui.getUri(webview, extensionUri, ["media", "edit-copy-uri.png"]);
        const copyUrlUri = ui.getUri(webview, extensionUri, ["media", "edit-copy-url.png"]);
        const upArrowUri = ui.getUri(webview, extensionUri, ["media", "arrow-up.png"]);
        const goHomeUri = ui.getUri(webview, extensionUri, ["media", "go-home.png"]);
        let NavigationRowHtml = "";
        let PathNavigationHtml = "";
        if (!this.S3ExplorerItem.IsRoot()) {
            for (var item of this.GetNavigationPath(this.S3ExplorerItem.Key)) {
                PathNavigationHtml += `&nbsp;<vscode-link id="go_key_${item[1]}">${item[0]}</vscode-link>`;
            }
            NavigationRowHtml += `
            <tr>
            <td colspan="4">
                <vscode-link id="go_home"><img src="${goHomeUri}" alt="Go Home"></vscode-link>
                &nbsp;
                <vscode-link id="go_up"><img src="${upArrowUri}" alt="Go Up"></vscode-link>
                &nbsp;
                ${PathNavigationHtml}
            </td>
            <td style="text-align:right">
                <vscode-link id="add_shortcut_${this.S3ExplorerItem.Key}">[+]</vscode-link>
                <vscode-link id="download_${this.S3ExplorerItem.Key}"><img src="${downloadUri}" alt="Download"></vscode-link>
                <vscode-link id="delete_${this.S3ExplorerItem.Key}"><img src="${deleteUri}" alt="Delete"></vscode-link>
                <vscode-link id="copy_${this.S3ExplorerItem.Key}"><img src="${copyUri}" alt="Copy"></vscode-link>
                <vscode-link id="move_${this.S3ExplorerItem.Key}"><img src="${moveUri}" alt="Move"></vscode-link>
                <vscode-link id="rename_${this.S3ExplorerItem.Key}"><img src="${renameUri}" alt="Rename"></vscode-link>
                <vscode-link id="copy_url_${this.S3ExplorerItem.Key}"><img src="${copyUrlUri}" alt="Copy URL"></vscode-link>
                <vscode-link id="copy_s3_uri_${this.S3ExplorerItem.Key}"><img src="${copyUriUri}" alt="Copy S3 URI"></vscode-link>
                
            </td>
            </tr>`;
        }
        let S3RowHtml = "";
        if (this.S3ObjectList) {
            if (this.S3ObjectList.CommonPrefixes) {
                for (var folder of this.S3ObjectList.CommonPrefixes) {
                    if (folder.Prefix === this.S3ExplorerItem.Key) {
                        continue;
                    }
                    S3RowHtml += `
                    <tr>
                        <td>
                        <vscode-link id="open_${folder.Prefix}">${folder.Prefix}</vscode-link>
                        </td>
                        <td>Folder</td>
                        <td></td>
                        <td></td>
                        <td style="text-align:right">
                            <vscode-link id="add_shortcut_${folder.Prefix}">[+]</vscode-link>
                            <vscode-link id="download_${folder.Prefix}"><img src="${downloadUri}" alt="Download"></vscode-link>
                            <vscode-link id="delete_${folder.Prefix}"><img src="${deleteUri}" alt="Delete"></vscode-link>
                            <vscode-link id="copy_${folder.Prefix}"><img src="${copyUri}" alt="Copy"></vscode-link>
                            <vscode-link id="move_${folder.Prefix}"><img src="${moveUri}" alt="Move"></vscode-link>
                            <vscode-link id="rename_${folder.Prefix}"><img src="${renameUri}" alt="Rename"></vscode-link>
                            <vscode-link id="copy_url_${folder.Prefix}"><img src="${copyUrlUri}" alt="Copy URL"></vscode-link>
                            <vscode-link id="copy_s3_uri_${folder.Prefix}"><img src="${copyUriUri}" alt="Copy S3 URI"></vscode-link>
                            
                        </td>
                    </tr>
                    `;
                }
            }
            if (this.S3ObjectList.Contents) {
                for (var file of this.S3ObjectList.Contents) {
                    if (file.Key === this.S3ExplorerItem.Key) {
                        continue;
                    }
                    S3RowHtml += `
                    <tr>
                        <td>
                        <vscode-link id="open_${file.Key}">${this.GetFileName(file.Key)}</vscode-link>
                        </td>
                        <td>${this.s3KeyType(file.Key)}</td>
                        <td>${file.LastModified ? file.LastModified.toLocaleDateString() : ""}</td>
                        <td>${ui.bytesToText(file.Size)}</td>
                        <td style="text-align:right">
                            <vscode-link id="add_shortcut_${file.Key}">[+]</vscode-link>
                            <vscode-link id="download_${file.Key}"><img src="${downloadUri}" alt="Download"></vscode-link>
                            <vscode-link id="delete_${file.Key}"><img src="${deleteUri}" alt="Delete"></vscode-link>
                            <vscode-link id="copy_${file.Key}"><img src="${copyUri}" alt="Copy"></vscode-link>
                            <vscode-link id="move_${file.Key}"><img src="${moveUri}" alt="Move"></vscode-link>
                            <vscode-link id="rename_${file.Key}"><img src="${renameUri}" alt="Rename"></vscode-link>
                            <vscode-link id="copy_url_${file.Key}"><img src="${copyUrlUri}" alt="Copy URL"></vscode-link>
                            <vscode-link id="copy_s3_uri_${file.Key}"><img src="${copyUriUri}" alt="Copy S3 URI"></vscode-link>
                        </td>
                    </tr>
                    `;
                }
            }
        }
        else {
            S3RowHtml = `
            <tr>
            <th></th>
            <th>No Objects !!!</th>
            <th></th>
            <th></th>
            <th></th>
            </tr>
            `;
        }
        let result = /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <script type="module" src="${mainUri}"></script>
        <link rel="stylesheet" href="${styleUri}">
        <title>Logs</title>
      </head>
      <body>  
        
        <div style="display: flex; align-items: center;">
            <h2>${this.S3ExplorerItem.GetFullPath()}</h2>
        </div>

        <table>
            <tr>
                <td colspan="4" style="text-align:left">
                <vscode-button appearance="primary" id="refresh">Refresh</vscode-button>
                <vscode-button appearance="primary" id="create_folder" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""}>Create Folder</vscode-button>
                <vscode-button appearance="primary" id="upload" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""}>Upload</vscode-button>
                </td>
                <td style="text-align:right"><vscode-text-field id="search_text" placeholder="Search" disabled></vscode-text-field></td>
            </tr>
            <tr>
                <th>Name</th>
                <th style="width:100px">Type</th>
                <th style="width:100px">Last Modified</th>
                <th style="width:100px">Size</th>
                <th>#</th>
            </tr>

            ${NavigationRowHtml}

            ${S3RowHtml}

        </table>
        
        <br>        
        <br>
        <br>
        <br>
                    
        <table>
            <tr>
                <td colspan="3">
                    <vscode-link href="https://github.com/necatiarslan/aws-s3/issues/new">Bug Report & Feature Request</vscode-link>
                </td>
            </tr>
        </table>
      </body>
    </html>
    `;
        ui.logToOutput('S3Explorer._getWebviewContent Completed');
        return result;
    }
    _setWebviewMessageListener(webview) {
        ui.logToOutput('S3Explorer._setWebviewMessageListener Started');
        webview.onDidReceiveMessage((message) => {
            const command = message.command;
            let id;
            ui.logToOutput('S3Explorer._setWebviewMessageListener Message Received ' + message.command);
            switch (command) {
                case "refresh":
                    this.Load();
                    this.RenderHtml();
                    return;
                case "create_folder":
                    return;
                case "upload":
                    return;
                case "open":
                    id = message.id;
                    id = id.replace("open_", "");
                    this.S3ExplorerItem.Key = id;
                    this.Load();
                    return;
                case "download":
                    id = message.id;
                    id = id.replace("download_", "");
                    this.DownloadFile(id);
                    return;
                case "delete":
                    id = message.id;
                    id = id.replace("delete_", "");
                    this.DeleteFile(id);
                    return;
                case "copy":
                    id = message.id;
                    id = id.replace("copy_", "");
                    this.CopyFile(id);
                    return;
                case "move":
                    id = message.id;
                    id = id.replace("move_", "");
                    this.MoveFile(id);
                    return;
                case "copy_url":
                    id = message.id;
                    id = id.replace("copy_url_", "");
                    this.CopyFileUrl(id);
                    return;
                case "copy_s3_uri":
                    id = message.id;
                    id = id.replace("copy_s3_uri_", "");
                    this.CopyFileS3Uri(id);
                    return;
                case "add_shortcut":
                    id = message.id;
                    id = id.replace("add_shortcut_", "");
                    this.AddShortcut(id);
                    return;
                case "go_up":
                    this.S3ExplorerItem.Key = this.S3ExplorerItem.GetParentFolder();
                    this.Load();
                    return;
                case "go_home":
                    if (this.HomeKey) {
                        this.S3ExplorerItem.Key = this.HomeKey;
                    }
                    else {
                        this.S3ExplorerItem.Key = "";
                    }
                    this.Load();
                    return;
                case "go_key":
                    id = message.id;
                    id = id.replace("go_key_", "");
                    this.S3ExplorerItem.Key = id;
                    this.Load();
                    return;
            }
        }, undefined, this._disposables);
    }
    AddShortcut(key) {
        S3TreeView_1.S3TreeView.Current?.AddShortcut(this.S3ExplorerItem.Bucket, key);
    }
    CopyFileS3Uri(key) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    CopyFileUrl(key) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    MoveFile(key) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    CopyFile(key) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    DeleteFile(key) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    DownloadFile(key) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    dispose() {
        ui.logToOutput('S3Explorer.dispose Started');
        S3Explorer.Current = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
exports.S3Explorer = S3Explorer;
//# sourceMappingURL=S3Explorer.js.map