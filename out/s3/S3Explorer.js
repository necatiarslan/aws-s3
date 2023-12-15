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
const s3_helper = require("./S3Helper");
const S3Search_1 = require("./S3Search");
class S3Explorer {
    constructor(panel, extensionUri, node) {
        this._disposables = [];
        this.S3ExplorerItem = new S3ExplorerItem_1.S3ExplorerItem("undefined", "");
        this.SearchText = "";
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
        var result = await api.GetS3ObjectList(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key);
        if (result.isSuccessful) {
            this.S3ObjectList = result.result;
        }
        this.RenderHtml();
    }
    ResetCurrentState() {
    }
    static Render(extensionUri, node, changeKey = undefined) {
        ui.logToOutput('S3Explorer.Render Started');
        if (S3Explorer.Current) {
            S3Explorer.Current.ResetCurrentState();
            S3Explorer.Current.SetS3ExplorerItem(node);
            S3Explorer.Current.Load();
            S3Explorer.Current._panel.reveal(vscode.ViewColumn.One);
        }
        else {
            const panel = vscode.window.createWebviewPanel("S3Explorer", "S3 Explorer", vscode.ViewColumn.One, {
                enableScripts: true,
            });
            S3Explorer.Current = new S3Explorer(panel, extensionUri, node);
        }
        if (changeKey) {
            S3Explorer.Current.S3ExplorerItem.Key = changeKey;
            S3Explorer.Current.Load();
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
            "toolkit.js",
        ]);
        const s3ExplorerJSUri = ui.getUri(webview, extensionUri, ["media", "s3ExplorerJS.js"]);
        const styleUri = ui.getUri(webview, extensionUri, ["media", "style.css"]);
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
        const bookmark_yesUri = ui.getUri(webview, extensionUri, ["media", "bookmark_yes.png"]);
        const bookmark_noUri = ui.getUri(webview, extensionUri, ["media", "bookmark_no.png"]);
        const goUpUri = ui.getUri(webview, extensionUri, ["media", "go-up.png"]);
        const goHomeUri = ui.getUri(webview, extensionUri, ["media", "go-home.png"]);
        const fileUri = ui.getUri(webview, extensionUri, ["media", "file.png"]);
        const folderUri = ui.getUri(webview, extensionUri, ["media", "folder.png"]);
        let fileCounter = 0;
        let folderCounter = 0;
        let NavigationRowHtml = "";
        let PathNavigationHtml = "";
        let FolderIsEmpty = true;
        for (var item of this.GetNavigationPath(this.S3ExplorerItem.Key)) {
            PathNavigationHtml += `&nbsp;<vscode-link style="font-size: 16px; font-weight: bold;" id="go_key_${item[1]}">${item[0]}</vscode-link>`;
        }
        NavigationRowHtml += `
        <tr style="height:30px">
            <td style="width:20px">
                <vscode-checkbox id="checkbox_${this.S3ExplorerItem.Key}" ></vscode-checkbox>
            </td>
            <td style="width:20px">
                <vscode-button appearance="icon" id="add_shortcut_${this.S3ExplorerItem.Key}">
                    <span><img src="${S3TreeView_1.S3TreeView.Current?.DoesShortcutExists(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key) ? bookmark_yesUri : bookmark_noUri}"></img></span>
                </vscode-button>
            </td>
            <td colspan="4">
            ${PathNavigationHtml}
            </td>
        </tr>`;
        let S3RowHtml = "";
        if (this.S3ObjectList) {
            if (this.S3ObjectList.CommonPrefixes) {
                for (var folder of this.S3ObjectList.CommonPrefixes) {
                    if (folder.Prefix === this.S3ExplorerItem.Key) {
                        continue;
                    } //do not list object itself
                    FolderIsEmpty = false;
                    let folderName = s3_helper.GetFolderName(folder.Prefix);
                    if (this.SearchText.length > 0 && !folderName.includes(this.SearchText)) {
                        continue;
                    }
                    folderCounter++;
                    S3RowHtml += `
                    <tr>
                        <td style="width:20px">
                            <vscode-checkbox id="checkbox_${folder.Prefix}" ></vscode-checkbox>
                        </td>
                        <td style="width:20px">
                            <vscode-button appearance="icon" id="add_shortcut_${folder.Prefix}">
                                <span><img src="${S3TreeView_1.S3TreeView.Current?.DoesShortcutExists(this.S3ExplorerItem.Bucket, folder.Prefix) ? bookmark_yesUri : bookmark_noUri}"></img></span>
                            </vscode-button>
                        </td>
                        <td>
                            <img src="${folderUri}"></img>
                            <vscode-link id="open_${folder.Prefix}">${folderName}</vscode-link>
                        </td>
                        <td style="text-align:right; width:100px">Folder</td>
                        <td style="text-align:right; width:100px"><!--modified column--></td>
                        <td style="text-align:right; width:100px"><!--size column--></td>
                    </tr>
                    `;
                }
            }
            if (this.S3ObjectList.Contents) {
                for (var file of this.S3ObjectList.Contents) {
                    if (file.Key === this.S3ExplorerItem.Key) {
                        continue;
                    } //do not list object itself
                    FolderIsEmpty = false;
                    let fileName = s3_helper.GetFileNameWithExtension(file.Key);
                    if (this.SearchText.length > 0 && !fileName.includes(this.SearchText)) {
                        continue;
                    }
                    fileCounter++;
                    S3RowHtml += `
                    <tr>
                        <td style="width:20px">
                            <vscode-checkbox id="checkbox_${file.Key}" ></vscode-checkbox>
                        </td>
                        <td style="width:20px">
                            <vscode-button appearance="icon" id="add_shortcut_${file.Key}">
                                <span><img src="${S3TreeView_1.S3TreeView.Current?.DoesShortcutExists(this.S3ExplorerItem.Bucket, file.Key) ? bookmark_yesUri : bookmark_noUri}"></img></span>
                            </vscode-button>
                        </td>
                        <td>
                            <img src="${fileUri}"></img>
                            <vscode-link id="open_${file.Key}">${fileName}</vscode-link>
                        </td>
                        <td style="text-align:right; width:100px">${this.GetFileExtension(file.Key)}</td>
                        <td style="text-align:right; width:100px">${file.LastModified ? file.LastModified.toLocaleDateString() : ""}</td>
                        <td style="text-align:right; width:100px">${ui.bytesToText(file.Size)}</td>
                    </tr>
                    `;
                }
            }
        }
        if (this.S3ExplorerItem.IsFolder() && FolderIsEmpty) {
            S3RowHtml = `
            <tr>
            <td style="height:50px; text-align:center;" colspan="6">Folder Is Empty</td>
            </tr>
            <tr style="height:50px; text-align:center;">
            <td colspan="6">
                <vscode-button appearance="secondary" id="upload_empty_folder">Upload File</vscode-button>
                &nbsp;
                <vscode-button appearance="secondary" id="delete_folder">Delete Folder</vscode-button>
            </td>
            </tr>
            `;
        }
        if (this.S3ExplorerItem.IsFile()) {
            S3RowHtml = `
            <tr style="height:50px; text-align:center;">
            <td colspan="6">
                <vscode-button appearance="secondary" id="preview_current_file">Preview</vscode-button>
                &nbsp;
                <vscode-button appearance="secondary" id="download_current_file">Download</vscode-button>
                &nbsp;
                <vscode-button appearance="secondary" id="update_file">Update</vscode-button>
                &nbsp;
                <vscode-button appearance="secondary" id="delete_file">Delete</vscode-button>
                &nbsp;
                <vscode-button appearance="secondary" id="rename_file">Rename</vscode-button>
                &nbsp;
                <vscode-button appearance="secondary" id="copy_file">Copy</vscode-button>
                &nbsp;
                <vscode-button appearance="secondary" id="move_file">Move</vscode-button>
            </td>
            </tr>
            <tr>
                <td>File Name</td>
                <td>:</td>
                <td colspan="4">${s3_helper.GetFileNameWithExtension(this.S3ExplorerItem.Key)}</td>
            </tr>
            <tr>
                <td>Extension</td>
                <td>:</td>
                <td colspan="4">${this.GetFileExtension(this.S3ExplorerItem.Key)}</td>
            </tr>  
            <tr>
                <td>Folder</td>
                <td>:</td>
                <td colspan="4">${s3_helper.GetParentFolderKey(this.S3ExplorerItem.Key)}</td>
            </tr>                
            <tr>
                <td>Key</td>
                <td>:</td>
                <td colspan="4">${this.S3ExplorerItem.Key}</td>
            </tr>
            <tr>
                <td>ARN</td>
                <td>:</td>
                <td colspan="4">${s3_helper.GetARN(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key)}</td>
            </tr>
            <tr>
                <td>S3 URL</td>
                <td>:</td>
                <td colspan="4">${s3_helper.GetURI(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key)}</td>
            </tr>
            <tr>
                <td>URL</td>
                <td>:</td>
                <td colspan="4">${s3_helper.GetURL(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key)}</td>
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
        <script type="module" src="${s3ExplorerJSUri}"></script>
        <link href="${codiconsUri}" rel="stylesheet" />
        <link rel="stylesheet" href="${styleUri}">
        <title></title>
      </head>
      <body>  
        
        <div style="display: flex; align-items: center;">
            <h2>${this.S3ExplorerItem.GetFullPath()}</h2>
        </div>

        <table>
            <tr>
                <td colspan="4" style="text-align:left">
                <vscode-button appearance="secondary" id="refresh">Refresh</vscode-button>
                <vscode-button appearance="secondary" id="search" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""}>Search</vscode-button>
                <vscode-button appearance="secondary" id="download">Download</vscode-button>
                <vscode-button appearance="secondary" id="upload" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""}>Upload</vscode-button>
                <vscode-button appearance="secondary" id="create_folder" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""}>Create Folder</vscode-button>
                <vscode-dropdown id="edit_dropdown">
                    <vscode-option>Edit</vscode-option>
                    <vscode-option>Delete</vscode-option>
                    <vscode-option>Rename</vscode-option>
                    <vscode-option>Copy</vscode-option>
                    <vscode-option>Move</vscode-option>
                </vscode-dropdown>
                <vscode-dropdown style="width: 200px" id="copy_dropdown">
                    <vscode-option>Copy</vscode-option>
                    <vscode-option>File Name(s) Without Extension</vscode-option>
                    <vscode-option>File Name(s) With Extension</vscode-option>
                    <vscode-option>Key(s)</vscode-option>
                    <vscode-option>ARN(s)</vscode-option>
                    <vscode-option>S3 URI(s)</vscode-option>
                    <vscode-option>URL(s)</vscode-option>
                </vscode-dropdown>
                </td>
                <td colspan="2" style="text-align:right">
                    <vscode-text-field id="search_text" placeholder="Search" value="${this.SearchText}">
                        <span slot="start" class="codicon codicon-search"></span>
                    </vscode-text-field>
                </td>
            </tr>
            </table>

            <table>
            <tr>
                <th style="width:20px; text-align:center">
                    <vscode-link id="go_home"><img src="${goHomeUri}" alt="Go Home"></vscode-link>
                </th>
                <th style="width:20px; text-align:center">
                    <vscode-link id="go_up"><img src="${goUpUri}" alt="Go Up"></vscode-link>
                </th>
                <th style="width:40px; text-align:center">
                    <!--<vscode-link id="go_to">Goto</vscode-link>-->
                </th>
                <th>Name</th>
                <th style="width:100px; text-align:center">Type</th>
                <th style="width:80px; text-align:center">Modified</th>
                <th style="width:80px; text-align:center">Size</th>
            </tr>
            </table>

            <table>
            ${NavigationRowHtml}
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
                    <vscode-button appearance="secondary" id="select_all">All</vscode-button>
                    <vscode-button appearance="secondary" id="select_none">None</vscode-button>
                </th>
                <th colspan="3" style="text-align:right">
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
                    <vscode-link href="https://github.com/necatiarslan/aws-s3/issues/new">Bug Report & Feature Request</vscode-link>
                </td>
            </tr>
        </table>
        <table>
            <tr>
                <td>
                    <vscode-link href="https://bit.ly/s3-extension-survey">New Feature Survey</vscode-link>
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
                    this.SearchText = message.search_text;
                    this.Load();
                    return;
                case "search":
                    let node;
                    if (this.S3ExplorerItem.IsRoot()) {
                        node = new S3TreeItem_1.S3TreeItem("", S3TreeItem_1.TreeItemType.Bucket);
                        node.Bucket = this.S3ExplorerItem.Bucket;
                    }
                    else {
                        node = new S3TreeItem_1.S3TreeItem("", S3TreeItem_1.TreeItemType.Shortcut);
                        node.Bucket = this.S3ExplorerItem.Bucket;
                        node.Shortcut = this.S3ExplorerItem.Key;
                    }
                    S3Search_1.S3Search.Render(this.extensionUri, node);
                    return;
                case "create_folder":
                    this.CreateFolder();
                    return;
                case "upload":
                    this.UploadFile();
                    return;
                case "update_file":
                    this.UpdateFile();
                    return;
                case "delete_file":
                    this.DeleteFile(this.S3ExplorerItem.Key);
                    return;
                case "rename_file":
                    this.RenameFile(this.S3ExplorerItem.Key);
                    return;
                case "move_file":
                    this.MoveFile(this.S3ExplorerItem.Key);
                    return;
                case "copy_file":
                    this.CopyFile(this.S3ExplorerItem.Key);
                    return;
                case "delete_folder":
                    this.DeleteFile(this.S3ExplorerItem.Key);
                    return;
                case "open":
                    id = message.id;
                    id = id.replace("open_", "");
                    this.S3ExplorerItem.Key = id;
                    this.Load();
                    return;
                case "download":
                    this.DownloadFile(message.keys);
                    return;
                case "preview_current_file":
                    this.PreviewFile(this.S3ExplorerItem.Key);
                    return;
                case "download_current_file":
                    this.DownloadFile(this.S3ExplorerItem.Key);
                    return;
                case "edit":
                    if (message.keys.length == 0) {
                        return;
                    }
                    switch (message.action) {
                        case "Delete":
                            this.DeleteFile(message.keys);
                            return;
                        case "Rename":
                            this.RenameFile(message.keys);
                            return;
                        case "Copy":
                            this.CopyFile(message.keys);
                            return;
                        case "Move":
                            this.MoveFile(message.keys);
                            return;
                    }
                    return;
                case "copy":
                    if (message.keys.length == 0) {
                        return;
                    }
                    switch (message.action) {
                        case "File Name(s) Without Extension":
                            this.CopyFileNameWithoutExtension(message.keys);
                            return;
                        case "File Name(s) With Extension":
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
                case "go_up":
                    this.S3ExplorerItem.Key = this.S3ExplorerItem.GetParentFolderKey();
                    this.Load();
                    return;
                case "go_home":
                    this.S3ExplorerItem.Key = "";
                    this.Load();
                    return;
                case "go_to":
                    let shortcut = undefined;
                    vscode.window.showInputBox({ placeHolder: 'Enter a Folder/File Key' }).then(shortcut);
                    if (shortcut === undefined) {
                        return;
                    }
                    this.S3ExplorerItem.Key = shortcut;
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
        S3TreeView_1.S3TreeView.Current?.AddOrRemoveShortcut(this.S3ExplorerItem.Bucket, key);
        this.RenderHtml();
    }
    CopyS3URI(keys) {
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
            ui.showInfoMessage("File Name(s) with extension are copied to clipboard");
        }
    }
    CopyFileNameWithoutExtension(keys) {
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
            ui.showInfoMessage("File Name(s) without extension are copied to clipboard");
        }
    }
    CopyKeys(keys) {
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
    async MoveFile(keys) {
        let key = this.getFirstKeyFromKeys(keys);
        if (!key) {
            return;
        }
        if (s3_helper.IsFolder(key)) {
            ui.showWarningMessage("Select a file");
            return;
        }
        let targetPath = await vscode.window.showInputBox({ placeHolder: 'Target Path with / at the end' });
        if (targetPath === undefined) {
            return;
        }
        let result = await api.MoveFile(this.S3ExplorerItem.Bucket, key, targetPath);
        if (result.isSuccessful) {
            S3TreeView_1.S3TreeView.Current?.UpdateShortcutByKey(this.S3ExplorerItem.Bucket, key, result.result);
            this.S3ExplorerItem.Key = result.result;
            this.Load();
            ui.showInfoMessage("File is Moved");
        }
    }
    async CopyFile(keys) {
        let key = this.getFirstKeyFromKeys(keys);
        if (!key) {
            return;
        }
        if (s3_helper.IsFolder(key)) {
            ui.showWarningMessage("Select a file");
            return;
        }
        let targetPath = await vscode.window.showInputBox({ placeHolder: 'Target Path with / at the end' });
        if (targetPath === undefined) {
            return;
        }
        let result = await api.CopyFile(this.S3ExplorerItem.Bucket, key, targetPath);
        if (result.isSuccessful) {
            this.S3ExplorerItem.Key = result.result;
            this.Load();
            ui.showInfoMessage("File is Copied");
        }
    }
    async DeleteFile(keys) {
        if (keys.length === 0) {
            return;
        }
        var keyList = keys.split("|");
        let confirm = await vscode.window.showInputBox({ placeHolder: 'print delete to confirm' });
        if (confirm === undefined || confirm != "delete") {
            return;
        }
        let goto_parent_folder = false;
        let deleteCounter = 0;
        for (var key of keyList) {
            if (key) {
                let response = await api.DeleteObject(this.S3ExplorerItem.Bucket, key);
                if (response.isSuccessful) {
                    deleteCounter++;
                    S3TreeView_1.S3TreeView.Current?.RemoveShortcutByKey(this.S3ExplorerItem.Bucket, key);
                    if (this.S3ExplorerItem.Key === key) {
                        goto_parent_folder = true;
                    }
                }
            }
        }
        //go up if current file/folder is deleted
        if (goto_parent_folder) {
            this.S3ExplorerItem.Key = this.S3ExplorerItem.GetParentFolderKey();
        }
        this.Load();
        ui.showInfoMessage(deleteCounter.toString() + " object(s) are deleted");
    }
    getFirstKeyFromKeys(keys) {
        if (keys.length === 0) {
            return undefined;
        }
        var keyList = keys.split("|");
        for (var key of keyList) {
            if (key) {
                return key;
            }
        }
        return undefined;
    }
    async RenameFile(keys) {
        let key = this.getFirstKeyFromKeys(keys);
        if (!key) {
            return;
        }
        if (s3_helper.IsFolder(key)) {
            ui.showWarningMessage("Select a file");
            return;
        }
        let fileName = await vscode.window.showInputBox({ placeHolder: 'New File Name Without Extension' });
        if (fileName === undefined) {
            return;
        }
        let result = await api.RenameFile(this.S3ExplorerItem.Bucket, key, fileName);
        if (result.isSuccessful) {
            S3TreeView_1.S3TreeView.Current?.UpdateShortcutByKey(this.S3ExplorerItem.Bucket, key, result.result);
            this.S3ExplorerItem.Key = result.result;
            this.Load();
            ui.showInfoMessage(" File is Renamed");
        }
    }
    async DownloadFile(keys) {
        if (keys.length === 0) {
            return;
        }
        var keyList = keys.split("|");
        var listToCopy = [];
        let param = {
            canSelectFolders: true,
            canSelectFiles: false,
            openLabel: "Select",
            title: "Select Folder To Save",
            canSelectMany: false,
        };
        let selectedFolder = await vscode.window.showOpenDialog(param);
        if (!selectedFolder) {
            return;
        }
        let downloadCounter = 0;
        for (var key of keyList) {
            if (key && s3_helper.IsFile(key)) {
                api.DownloadS3File(this.S3ExplorerItem.Bucket, key, selectedFolder[0].path);
                downloadCounter++;
            }
        }
        ui.showInfoMessage(downloadCounter.toString() + " File(s) are downloaded");
    }
    async PreviewFile(key) {
        if (key.length === 0) {
            return;
        }
        if (key && s3_helper.IsFile(key)) {
            const tmp = require('tmp');
            const tempFolderPath = tmp.dirSync().name;
            let result = await api.DownloadS3File(this.S3ExplorerItem.Bucket, key, tempFolderPath);
            if (result.isSuccessful) {
                ui.openFile(result.result);
            }
        }
    }
    async UploadFile() {
        if (!this.S3ExplorerItem.IsFolder) {
            return;
        }
        let param = {
            canSelectFolders: false,
            canSelectFiles: true,
            openLabel: "Select File(s)",
            title: "Select File(s) To Upload",
            canSelectMany: true,
        };
        let selectedFileList = await vscode.window.showOpenDialog(param);
        if (!selectedFileList || selectedFileList.length == 0) {
            return;
        }
        for (var file of selectedFileList) {
            let result = await api.UploadFileToFolder(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key, file.path);
            if (result.isSuccessful) {
                ui.showInfoMessage(s3_helper.GetFileNameWithExtension(file.path) + " is uploaded");
            }
        }
        this.Load();
    }
    async UpdateFile() {
        if (!this.S3ExplorerItem.IsFile()) {
            return;
        }
        let param = {
            canSelectFolders: false,
            canSelectFiles: true,
            openLabel: "Select File",
            title: "Select File To Upload",
            canSelectMany: false,
        };
        let selectedFileList = await vscode.window.showOpenDialog(param);
        if (!selectedFileList || selectedFileList.length == 0) {
            return;
        }
        let file = selectedFileList[0];
        let result = await api.UploadFile(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key, file.path);
        if (result.isSuccessful) {
            ui.showInfoMessage(s3_helper.GetFileNameWithExtension(file.path) + " is replaced");
            this.Load();
        }
    }
    async CreateFolder() {
        if (!this.S3ExplorerItem.IsFolder) {
            return;
        }
        let folderName = await vscode.window.showInputBox({ placeHolder: 'Folder Name' });
        if (folderName === undefined) {
            return;
        }
        let result = await api.CreateS3Folder(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key, folderName);
        if (result.isSuccessful) {
            ui.showInfoMessage(result.result + " Folder is Created");
            this.Load();
        }
    }
    dispose() {
        ui.logToOutput('S3Explorer.dispose Started');
        S3Explorer.Current = undefined;
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
exports.S3Explorer = S3Explorer;
//# sourceMappingURL=S3Explorer.js.map