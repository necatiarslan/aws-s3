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
const Telemetry_1 = require("../common/Telemetry");
const fs = require("fs");
const os = require("os");
const path = require("path");
class S3Explorer {
    constructor(panel, extensionUri, node) {
        this._disposables = [];
        this._isAutoRefreshEnabled = false;
        this.S3ExplorerItem = new S3ExplorerItem_1.S3ExplorerItem("undefined", "");
        this.SearchText = "";
        this.SortColumn = "Name";
        this.SortDirection = "asc";
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
        this._panel.webview.html = await this._getWebviewContent(this._panel.webview, this.extensionUri);
        ui.logToOutput('S3Explorer.RenderHmtl Completed');
    }
    async Load() {
        ui.logToOutput('S3Explorer.LoadLogs Started');
        Telemetry_1.Telemetry.Current?.send("S3Explorer.Load");
        if (!S3TreeView_1.S3TreeView.Current) {
            return;
        }
        var result = await api.GetFolderList(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key);
        if (result.isSuccessful) {
            this.S3ObjectList = result.result;
        }
        this.RenderHtml();
    }
    ResetCurrentState() {
    }
    static Render(extensionUri, node, changeKey = undefined) {
        ui.logToOutput('S3Explorer.Render Started');
        Telemetry_1.Telemetry.Current?.send("S3Explorer.Render");
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
    SortList() {
        if (!this.S3ObjectList) {
            return;
        }
        const direction = this.SortDirection === 'asc' ? 1 : -1;
        // Sort Folders (CommonPrefixes) - Only by Name as they don't have other properties usually
        if (this.S3ObjectList.CommonPrefixes) {
            this.S3ObjectList.CommonPrefixes.sort((a, b) => {
                const nameA = s3_helper.GetFolderName(a.Prefix || "").toLowerCase();
                const nameB = s3_helper.GetFolderName(b.Prefix || "").toLowerCase();
                if (nameA < nameB) {
                    return -1 * direction;
                }
                if (nameA > nameB) {
                    return 1 * direction;
                }
                return 0;
            });
        }
        // Sort Files (Contents)
        if (this.S3ObjectList.Contents) {
            this.S3ObjectList.Contents.sort((a, b) => {
                let valA;
                let valB;
                switch (this.SortColumn) {
                    case 'Name':
                        valA = s3_helper.GetFileNameWithExtension(a.Key || "").toLowerCase();
                        valB = s3_helper.GetFileNameWithExtension(b.Key || "").toLowerCase();
                        break;
                    case 'Type':
                        valA = this.GetFileExtension(a.Key || "").toLowerCase();
                        valB = this.GetFileExtension(b.Key || "").toLowerCase();
                        break;
                    case 'Modified':
                        valA = a.LastModified?.getTime() || 0;
                        valB = b.LastModified?.getTime() || 0;
                        break;
                    case 'Size':
                        valA = a.Size || 0;
                        valB = b.Size || 0;
                        break;
                    default:
                        valA = s3_helper.GetFileNameWithExtension(a.Key || "").toLowerCase();
                        valB = s3_helper.GetFileNameWithExtension(b.Key || "").toLowerCase();
                        break;
                }
                if (valA < valB) {
                    return -1 * direction;
                }
                if (valA > valB) {
                    return 1 * direction;
                }
                return 0;
            });
        }
    }
    async _getWebviewContent(webview, extensionUri) {
        ui.logToOutput('S3Explorer._getWebviewContent Started');
        //file URIs
        const vscodeElementsUri = ui.getUri(webview, extensionUri, ["node_modules", "@vscode-elements", "elements", "dist", "bundled.js"]);
        const s3ExplorerJSUri = ui.getUri(webview, extensionUri, ["media", "s3ExplorerJS.js"]);
        const styleUri = ui.getUri(webview, extensionUri, ["media", "style.css"]);
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'));
        const bookmark_yesUri = ui.getUri(webview, extensionUri, ["media", "bookmark_yes.png"]);
        const bookmark_noUri = ui.getUri(webview, extensionUri, ["media", "bookmark_no.png"]);
        const goHomeUri = ui.getUri(webview, extensionUri, ["media", "go-home.png"]);
        const goUpUri = ui.getUri(webview, extensionUri, ["media", "go-up.png"]);
        const fileDownloadUri = ui.getUri(webview, extensionUri, ["media", "file-download.png"]);
        const fileUploadUri = ui.getUri(webview, extensionUri, ["media", "file-upload.png"]);
        const folderCreateUri = ui.getUri(webview, extensionUri, ["media", "folder-create.png"]);
        const fileDeleteUri = ui.getUri(webview, extensionUri, ["media", "file-delete.png"]);
        const fileRenameUri = ui.getUri(webview, extensionUri, ["media", "file-rename.png"]);
        const fileMoveUri = ui.getUri(webview, extensionUri, ["media", "file-move.png"]);
        const fileCopyUri = ui.getUri(webview, extensionUri, ["media", "file-copy.png"]);
        const fileUri = ui.getUri(webview, extensionUri, ["media", "file.png"]);
        const folderUri = ui.getUri(webview, extensionUri, ["media", "folder.png"]);
        let fileCounter = 0;
        let folderCounter = 0;
        this.SortList();
        let NavigationRowHtml = "";
        let PathNavigationHtml = "";
        let FolderIsEmpty = true;
        for (var item of this.GetNavigationPath(this.S3ExplorerItem.Key)) {
            PathNavigationHtml += `&nbsp;<a style="font-size: 16px; font-weight: bold; cursor: pointer;" id="go_key_${item[1]}">${item[0]}</a>`;
        }
        let isChecked = this.S3ExplorerItem.IsFile();
        NavigationRowHtml += `
        <tr style="height:30px">
            <td style="width:20px">
                <vscode-checkbox id="checkbox_${this.S3ExplorerItem.Key}" ${isChecked ? "checked" : ""}></vscode-checkbox>
            </td>
            <td style="width:20px">
                <img 
                    id="add_shortcut_${this.S3ExplorerItem.Key}" 
                    src="${S3TreeView_1.S3TreeView.Current?.DoesShortcutExists(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key) ? bookmark_yesUri : bookmark_noUri}"
                    style="cursor: pointer;">
                </img>
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
                    if (this.SearchText && this.SearchText.length > 0 && !folderName.toLowerCase().includes(this.SearchText.toLowerCase())) {
                        continue;
                    }
                    folderCounter++;
                    S3RowHtml += `
                    <tr>
                        <td style="width:20px">
                            <vscode-checkbox id="checkbox_${folder.Prefix}" ></vscode-checkbox>
                        </td>
                        <td style="width:20px">
                            <img  
                                id="add_shortcut_${folder.Prefix}" 
                                src="${S3TreeView_1.S3TreeView.Current?.DoesShortcutExists(this.S3ExplorerItem.Bucket, folder.Prefix) ? bookmark_yesUri : bookmark_noUri}"
                                style="cursor: pointer;">
                            </img>
                        </td>
                        <td>
                            <img src="${folderUri}" id="open_${folder.Prefix}" style="cursor: pointer;"></img>
                            <a id="open_${folder.Prefix}" style="cursor: pointer;">${folderName}</a>
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
                    if (this.SearchText && this.SearchText.length > 0 && !fileName.toLowerCase().includes(this.SearchText.toLowerCase())) {
                        continue;
                    }
                    fileCounter++;
                    S3RowHtml += `
                    <tr>
                        <td style="width:20px">
                            <vscode-checkbox id="checkbox_${file.Key}"></vscode-checkbox>
                        </td>
                        <td style="width:20px">
                            <img 
                                id="add_shortcut_${file.Key}" 
                                src="${S3TreeView_1.S3TreeView.Current?.DoesShortcutExists(this.S3ExplorerItem.Bucket, file.Key) ? bookmark_yesUri : bookmark_noUri}"
                                style="cursor: pointer;">
                            </img>
                        </td>
                        <td>
                            <img src="${fileUri}" id="open_${file.Key}" style="cursor: pointer;"></img>
                            <a id="open_${file.Key}" style="cursor: pointer;">${fileName}</a>
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
                <vscode-button secondary id="upload_empty_folder">Upload File</vscode-button>
                &nbsp;
                <vscode-button secondary id="create_folder_in_empty_folder">Create Folder</vscode-button>
                &nbsp;
                <vscode-button secondary id="delete_folder">Delete Folder</vscode-button>
            </td>
            </tr>
            `;
        }
        if (this.S3ExplorerItem.IsFile()) {
            let lastModifiedDate = "";
            let fileSize = "";
            let fileMetaData;
            let resultObject = await api.GetObjectProperties(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key);
            if (resultObject.isSuccessful && resultObject.result) {
                if (resultObject.result.LastModified)
                    lastModifiedDate = resultObject.result.LastModified.toLocaleDateString() + "   " + resultObject.result.LastModified.toLocaleTimeString();
                if (resultObject.result.ContentLength)
                    fileSize = ui.bytesToText(resultObject.result.ContentLength);
                fileMetaData = resultObject.result.Metadata;
            }
            S3RowHtml = `
            <tr style="height:50px; text-align:center;">
            <td colspan="6">
                <vscode-button secondary id="preview_current_file">Preview</vscode-button>
                &nbsp;
                <vscode-button secondary id="download_current_file">Download</vscode-button>
                &nbsp;
                <vscode-button secondary id="update_file">Upload</vscode-button>
                &nbsp;
                <vscode-button secondary id="delete_file">Delete</vscode-button>
                &nbsp;
                <vscode-button secondary id="rename_file">Rename</vscode-button>
                &nbsp;
                <vscode-button secondary id="copy_file">Copy</vscode-button>
                &nbsp;
                <vscode-button secondary id="move_file">Move</vscode-button>
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
                <td>Last Modified</td>
                <td>:</td>
                <td colspan="4">${lastModifiedDate}</td>
            </tr>   
            <tr>
                <td>Size</td>
                <td>:</td>
                <td colspan="4">${fileSize}</td>
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
            if (fileMetaData) {
                for (var key in fileMetaData) {
                    S3RowHtml += `
                    <tr>
                        <td>${key}</td>
                        <td>:</td>
                        <td colspan="4">${fileMetaData[key]}</td>
                    </tr>
                    `;
                }
            }
        }
        let result = /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <script type="module" src="${vscodeElementsUri}"></script>
        <script type="module" src="${s3ExplorerJSUri}"></script>
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
                <td colspan="4" style="text-align:left">
                <vscode-button secondary id="ask_ai" title="Ask AI">💬</vscode-button>
                <vscode-button secondary id="refresh">Refresh</vscode-button>
                <vscode-button secondary id="search" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""}>Search</vscode-button>
                <vscode-button secondary id="download" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""}>Download</vscode-button>
                <vscode-button secondary id="upload" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""}>Upload</vscode-button>
                <vscode-button secondary id="create_folder" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""}>Create Folder</vscode-button>

                <vscode-single-select id="edit_dropdown" style="width: 100px; vertical-align:top" >
                    <vscode-option>Edit</vscode-option>
                    <vscode-option>Delete</vscode-option>
                    <vscode-option>Rename</vscode-option>
                    <vscode-option>Copy</vscode-option>
                    <vscode-option>Move</vscode-option>
                </vscode-single-select >

                <vscode-single-select id="copy_dropdown" style="width: 150px; vertical-align:top" >
                    <vscode-option>Copy</vscode-option>
                    <vscode-option>File Name(s) No Ext</vscode-option>
                    <vscode-option>File Name(s) /w Ext</vscode-option>
                    <vscode-option>Key(s)</vscode-option>
                    <vscode-option>ARN(s)</vscode-option>
                    <vscode-option>S3 URI(s)</vscode-option>
                    <vscode-option>URL(s)</vscode-option>
                </vscode-single-select >
                </td>
                <td colspan="2" style="text-align:right">
                    <vscode-textfield id="search_text" placeholder="Search" value="${this.SearchText}" ${this.S3ExplorerItem.IsFile() ? "disabled" : ""} style="width: 20ch; vertical-align:top">
                        <vscode-icon slot="content-before" name="search" title="search"></vscode-icon>
                    </vscode-textfield>
                </td>
            </tr>
            </table>
            
            <br>

            <table>
            <tr style="height:25px; border-bottom: 1px solid var(--vscode-editorWidget-border);">
                <th style="width:20px; text-align:center; vertical-align:middle">
                    <a id="go_home"><img src="${goHomeUri}" title="Go Home" style="cursor: pointer;"></a>
                </th>
                <th style="width:20px; text-align:center; vertical-align:middle">
                    <a id="go_up"><img src="${goUpUri}" title="Go Back" style="cursor: pointer;"></a>
                </th>
                <th style="width:160px; text-align:center; vertical-align:middle">
                    
                    <a id="file_download"><img src="${fileDownloadUri}" title="Download" style="cursor: pointer;"></a>
                    <a id="file_upload"><img src="${fileUploadUri}" title="Upload" style="cursor: pointer;"></a>
                    <a id="folder_create"><img src="${folderCreateUri}" title="Create Folder" style="cursor: pointer;"></a>
                    
                    <a id="file_delete"><img src="${fileDeleteUri}" title="Delete" style="cursor: pointer;"></a>
                    <a id="file_rename"><img src="${fileRenameUri}" title="Rename" style="cursor: pointer;"></a>
                    <a id="file_copy"><img src="${fileCopyUri}" title="Copy" style="cursor: pointer;"></a>
                    <a id="file_move"><img src="${fileMoveUri}" title="Move" style="cursor: pointer;"></a>
                </th>
                <th>
                    Name 
                    <a style="cursor:pointer; text-decoration:none;" id="sort_Name_asc">&#9650;</a>
                    <a style="cursor:pointer; text-decoration:none;" id="sort_Name_desc">&#9660;</a>
                </th>
                <th style="width:100px; text-align:center; vertical-align:middle">
                    Type
                    <a style="cursor:pointer; text-decoration:none;" id="sort_Type_asc">&#9650;</a>
                    <a style="cursor:pointer; text-decoration:none;" id="sort_Type_desc">&#9660;</a>
                </th>
                <th style="width:100px; text-align:center; vertical-align:middle">
                    Modified
                    <a style="cursor:pointer; text-decoration:none;" id="sort_Modified_asc">&#9650;</a>
                    <a style="cursor:pointer; text-decoration:none;" id="sort_Modified_desc">&#9660;</a>
                </th>
                <th style="width:100px; text-align:center; vertical-align:middle">
                    Size
                    <a style="cursor:pointer; text-decoration:none;" id="sort_Size_asc">&#9650;</a>
                    <a style="cursor:pointer; text-decoration:none;" id="sort_Size_desc">&#9660;</a>
                </th>
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
                    <vscode-button secondary id="select_all">All</vscode-button>
                    <vscode-button secondary id="select_none">None</vscode-button>
                </th>
                <th colspan="3" style="text-align:right">
                    ${fileCounter} File(s), ${folderCounter} Folder(s)
                </th>
            </tr>
            </table>
        <br>
        <table border="0">
            <tr>
                <td style="width:20px">
                    <vscode-checkbox id="auto_refresh_checkbox"></vscode-checkbox>
                </td>
                <td style="text-align:left;">
                    <span style="margin-left: 15px; vertical-align: middle;">Auto Refresh (every 15 sec)</span>
                    <span id="auto_refresh_icon" style="display: none; margin-left: 15px;" class="spinner">⌛</span>
                </td>
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
                    <a href="https://docs.google.com/forms/d/e/1FAIpQLSdAbmozmNCK-o0Y2wD2mL1HjYSlR1ZKdchR6HXYxBx44AfcLw/viewform?usp=share_link" style="cursor: pointer; text-decoration: none;">New Feature Survey</a>
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
        ui.logToOutput('S3Explorer._getWebviewContent Completed');
        return result;
    }
    _setWebviewMessageListener(webview) {
        ui.logToOutput('S3Explorer._setWebviewMessageListener Started');
        webview.onDidReceiveMessage(async (message) => {
            const command = message.command;
            let id;
            ui.logToOutput('S3Explorer._setWebviewMessageListener Message Received ' + message.command);
            if (command.startsWith("sort_")) {
                const parts = command.split("_");
                if (parts.length === 3) {
                    this.SortColumn = parts[1];
                    this.SortDirection = parts[2];
                    this.Load();
                    return;
                }
            }
            switch (command) {
                case "refresh":
                    this.SearchText = message.search_text;
                    this.Load();
                    return;
                case "ask_ai":
                    ui.logToOutput('S3Explorer.AskAI Started');
                    try {
                        const { AIHandler } = await Promise.resolve().then(() => require('../chat/AIHandler'));
                        if (!AIHandler.Current) {
                            ui.showErrorMessage('AIHandler not initialized', new Error('AI handler is not available'));
                            return;
                        }
                        await AIHandler.Current.askAI(`How can you help with Bucket:${this.S3ExplorerItem.Bucket} Key:${this.S3ExplorerItem.Key} ?`);
                    }
                    catch (error) {
                        ui.showErrorMessage('AskAI Error !!!', error);
                        ui.logToOutput("AskAI Error !!!", error);
                    }
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
                    this.DeleteObject(this.S3ExplorerItem.Key);
                    return;
                case "rename_file":
                    this.RenameObject(this.S3ExplorerItem.Key);
                    return;
                case "move_file":
                    this.MoveObject(this.S3ExplorerItem.Key);
                    return;
                case "copy_file":
                    this.CopyObject(this.S3ExplorerItem.Key);
                    return;
                case "delete_folder":
                    this.DeleteObject(this.S3ExplorerItem.Key);
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
                    if (!message.keys || message.keys.length == 0) {
                        return;
                    }
                    switch (message.action) {
                        case "Delete":
                            this.DeleteObject(message.keys);
                            return;
                        case "Rename":
                            this.RenameObject(message.keys);
                            return;
                        case "Copy":
                            this.CopyObject(message.keys);
                            return;
                        case "Move":
                            this.MoveObject(message.keys);
                            return;
                    }
                    return;
                case "copy":
                    if (!message.keys || message.keys.length == 0) {
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
                case "go_up":
                    this.S3ExplorerItem.Key = this.S3ExplorerItem.GetParentFolderKey();
                    this.Load();
                    return;
                case "go_home":
                    this.S3ExplorerItem.Key = "";
                    this.Load();
                    return;
                case "go_to":
                    const shortcut = await vscode.window.showInputBox({
                        placeHolder: 'Enter a Folder/File Key'
                    });
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
                case "auto_refresh_toggle":
                    this._isAutoRefreshEnabled = message.enabled;
                    this.SetAutoRefresh(this._isAutoRefreshEnabled);
                    return;
            }
        }, undefined, this._disposables);
    }
    AddShortcut(key) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.AddShortcut");
        S3TreeView_1.S3TreeView.Current?.AddOrRemoveShortcut(this.S3ExplorerItem.Bucket, key);
        this.RenderHtml();
    }
    CopyS3URI(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.CopyS3URI");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        var listToCopy = [];
        for (var key of keyList) {
            listToCopy.push(s3_helper.GetURI(this.S3ExplorerItem.Bucket, key));
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("S3 URI(s) are copied to clipboard");
        }
    }
    CopyURLs(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.CopyURLs");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        var listToCopy = [];
        for (var key of keyList) {
            listToCopy.push(s3_helper.GetURL(this.S3ExplorerItem.Bucket, key));
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("URL(s) are copied to clipboard");
        }
    }
    CopyFileNameWithExtension(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.CopyFileNameWithExtension");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        var listToCopy = [];
        for (var key of keyList) {
            if (!key || key === "") {
                continue;
            }
            listToCopy.push(s3_helper.GetFileNameWithExtension(key));
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("File Name(s) /w Ext are copied to clipboard");
        }
    }
    GetSelectedKeys(keys) {
        if (!keys || keys.length === 0) {
            return [];
        }
        if (!keys.includes("|")) {
            return [keys];
        }
        var keyList = keys.split("|");
        keyList = keyList.filter(key => key !== "");
        return keyList;
    }
    CopyFileNameWithoutExtension(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.CopyFileNameWithoutExtension");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        var listToCopy = [];
        for (var key of keyList) {
            listToCopy.push(s3_helper.GetFileNameWithoutExtension(key));
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("File Name(s) No Ext are copied to clipboard");
        }
    }
    CopyKeys(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.CopyKeys");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        let result = ui.CopyListToClipboard(keyList);
        if (result.isSuccessful) {
            ui.showInfoMessage("Key(s) are copied to clipboard");
        }
    }
    CopyFileARNs(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.CopyFileARNs");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        var listToCopy = [];
        for (var key of keyList) {
            listToCopy.push(s3_helper.GetARN(this.S3ExplorerItem.Bucket, key));
        }
        let result = ui.CopyListToClipboard(listToCopy);
        if (result.isSuccessful) {
            ui.showInfoMessage("ARN(s) are copied to clipboard");
        }
    }
    async MoveObject(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.MoveObject");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        let targetKey = await vscode.window.showInputBox({ placeHolder: 'Target Path with / at the end (Move)' });
        if (targetKey === undefined) {
            return;
        }
        if (!targetKey.endsWith("/")) {
            ui.showInfoMessage("Add / at the end");
            return;
        }
        if (targetKey !== "/" && targetKey.startsWith("/")) {
            ui.showInfoMessage("No / at the start");
            return;
        }
        let results = [];
        await ui.withProgress(async (progress) => {
            if (targetKey === undefined) {
                return;
            }
            if (targetKey === "/") {
                targetKey = "";
            }
            progress.report({ increment: 0 });
            await api.StartConnection();
            for (var key of keyList) {
                let result = await api.MoveObject(this.S3ExplorerItem.Bucket, key, targetKey);
                progress.report({ increment: 100 / keyList.length, message: `Moved ${key}` });
                if (result.isSuccessful) {
                    results = results.concat(result.result || []);
                }
            }
            await api.StopConnection();
        });
        if (results.length > 0) {
            this.S3ExplorerItem.Key = targetKey;
            this.Load();
            ui.showInfoMessage("File/Folder is Moved. Objects Moved: " + results.length.toString());
        }
    }
    async CopyObject(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.CopyObject");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        let targetKey = await vscode.window.showInputBox({ placeHolder: 'Target Path with / at the end (Copy)' });
        if (targetKey === undefined) {
            return;
        }
        if (!targetKey.endsWith("/")) {
            ui.showInfoMessage("Add / at the end");
            return;
        }
        if (targetKey !== "/" && targetKey.startsWith("/")) {
            ui.showInfoMessage("No / at the start");
            return;
        }
        let results = [];
        await ui.withProgress(async (progress) => {
            if (targetKey === undefined) {
                return;
            }
            if (targetKey === "/") {
                targetKey = "";
            }
            progress.report({ increment: 0 });
            await api.StartConnection();
            for (var key of keyList) {
                let result = await api.CopyObject(this.S3ExplorerItem.Bucket, key, targetKey);
                progress.report({ increment: 100 / keyList.length, message: `Copied ${key}` });
                if (result.isSuccessful) {
                    results = results.concat(result.result || []);
                }
            }
            await api.StopConnection();
        });
        if (results.length > 0) {
            this.S3ExplorerItem.Key = targetKey;
            this.Load();
            ui.showInfoMessage("File/Folder is Copied. Objects Copied: " + results.length.toString());
        }
    }
    async DeleteObject(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.DeleteObject");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        let confirm = await vscode.window.showInputBox({ placeHolder: 'print delete to confirm' });
        if (confirm === undefined || !["delete", "d"].includes(confirm)) {
            return;
        }
        let goto_parent_folder = false;
        await ui.withProgress(async (progress) => {
            progress.report({ increment: 0 });
            let deleteCounter = 0;
            await api.StartConnection();
            for (var key of keyList) {
                let response = await api.DeleteObject(this.S3ExplorerItem.Bucket, key);
                if (response.isSuccessful) {
                    let fileCountDeleted = response.result.length;
                    //ui.showInfoMessage(key + " is deleted " + fileCountDeleted.toString() + " object(s)");
                    progress.report({ increment: 100 / keyList.length, message: `Deleted ${key}` });
                    deleteCounter++;
                    S3TreeView_1.S3TreeView.Current?.RemoveShortcutByKey(this.S3ExplorerItem.Bucket, key);
                    if (this.S3ExplorerItem.Key === key) {
                        goto_parent_folder = true;
                    }
                }
                else {
                    //ui.showInfoMessage(key + " is not deleted");
                    progress.report({ increment: 100 / keyList.length, message: `Delete Failed ${key}` });
                }
            }
            await api.StopConnection();
            ui.showInfoMessage(deleteCounter.toString() + " File/Folder(s) are deleted");
        });
        //go up if current file/folder is deleted
        if (goto_parent_folder) {
            this.S3ExplorerItem.Key = this.S3ExplorerItem.GetParentFolderKey();
        }
        this.Load();
    }
    async RenameObject(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.RenameObject");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
        if (keyList.length !== 1) {
            ui.showInfoMessage("Select 1 File/Folder");
            return;
        }
        var key = keyList[0];
        let targetName = await vscode.window.showInputBox({ placeHolder: 'New File/Folder Name (Without Ext)' });
        if (targetName === undefined) {
            return;
        }
        let result;
        await ui.withProgress(async (progress) => {
            if (targetName === undefined) {
                return;
            }
            progress.report({ increment: 0 });
            await api.StartConnection();
            result = await api.RenameObject(this.S3ExplorerItem.Bucket, key, targetName);
            progress.report({ increment: 100, message: `Renamed ${key}` });
            await api.StopConnection();
        });
        if (result && result.isSuccessful) {
            if (s3_helper.IsFile(key) && result.result && result.result.length > 0 && key === this.S3ExplorerItem.Key) {
                this.S3ExplorerItem.Key = result.result[0];
            }
            else if (s3_helper.IsFolder(key) && result.result && result.result.length > 0 && key === this.S3ExplorerItem.Key) {
                let TargetFolderKey = s3_helper.GetParentFolderKey(key) + targetName + "/";
                this.S3ExplorerItem.Key = TargetFolderKey;
            }
            this.Load();
            ui.showInfoMessage(" File/Folder is Renamed");
        }
        else {
            this.Load();
            ui.showInfoMessage(" File/Folder is not Renamed");
        }
    }
    async DownloadFile(keys) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.DownloadFile");
        var keyList = this.GetSelectedKeys(keys);
        if (keyList.length === 0) {
            ui.showInfoMessage("Select File/Folder");
            return;
        }
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
        await ui.withProgress(async (progress) => {
            if (!selectedFolder) {
                return;
            }
            progress.report({ increment: 0 });
            await api.StartConnection();
            for (var key of keyList) {
                await api.DownloadFile(this.S3ExplorerItem.Bucket, key, selectedFolder[0].fsPath);
                progress.report({ increment: 100 / keyList.length, message: `Downloading ${key}` });
            }
            await api.StopConnection();
        });
        ui.showInfoMessage(keyList.length.toString() + " File(s) are downloaded to " + selectedFolder[0].fsPath);
    }
    async PreviewFile(key) {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.PreviewFile");
        if (!key || key.length === 0) {
            return;
        }
        if (key && s3_helper.IsFile(key)) {
            const tempFolderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aws-s3-'));
            let result = await api.DownloadFile(this.S3ExplorerItem.Bucket, key, tempFolderPath);
            if (result.isSuccessful) {
                ui.openFile(result.result);
            }
            else {
                ui.logToOutput("File is not downloaded", result.error);
                ui.showInfoMessage("File is not downloaded");
            }
        }
    }
    async UploadFile() {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.UploadFile");
        if (!this.S3ExplorerItem.IsFolder()) {
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
        await ui.withProgress(async (progress) => {
            if (!selectedFileList || selectedFileList.length == 0) {
                return;
            }
            progress.report({ increment: 0 });
            await api.StartConnection();
            for (var file of selectedFileList) {
                let fileNameWithExt = s3_helper.GetFileNameWithExtension(file.fsPath);
                let result = await api.UploadFileToFolder(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key, file.fsPath);
                if (result.isSuccessful) {
                    progress.report({ increment: 100 / selectedFileList.length, message: `Uploaded ${fileNameWithExt}` });
                }
                else {
                    ui.showInfoMessage(fileNameWithExt + " is not uploaded");
                    progress.report({ increment: 100 / selectedFileList.length, message: `Upload Failed ${fileNameWithExt}` });
                }
            }
            await api.StopConnection();
        });
        ui.showInfoMessage(selectedFileList.length.toString() + " File(s) are uploaded");
        this.Load();
    }
    async UpdateFile() {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.UpdateFile");
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
        let result = await api.UploadFile(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key, file.fsPath);
        if (result.isSuccessful) {
            ui.showInfoMessage(s3_helper.GetFileNameWithExtension(file.fsPath) + " is replaced");
            this.Load();
        }
    }
    async CreateFolder() {
        Telemetry_1.Telemetry.Current?.send("S3Explorer.CreateFolder");
        if (!this.S3ExplorerItem.IsFolder()) {
            return;
        }
        let folderName = await vscode.window.showInputBox({ placeHolder: 'Folder Name' });
        if (folderName === undefined) {
            return;
        }
        let result = await api.CreateFolder(this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key, folderName);
        if (result.isSuccessful) {
            ui.showInfoMessage(result.result + " Folder is Created");
            this.Load();
        }
    }
    SetAutoRefresh(enabled) {
        if (enabled) {
            // Clear any existing interval
            if (this._autoRefreshInterval) {
                clearInterval(this._autoRefreshInterval);
            }
            // Start auto-refresh every 15 seconds
            this._autoRefreshInterval = setInterval(() => {
                this.Load();
            }, 15000);
        }
        else {
            // Stop auto-refresh
            if (this._autoRefreshInterval) {
                clearInterval(this._autoRefreshInterval);
                this._autoRefreshInterval = undefined;
            }
        }
    }
    dispose() {
        ui.logToOutput('S3Explorer.dispose Started');
        // Clear auto-refresh interval if active
        if (this._autoRefreshInterval) {
            clearInterval(this._autoRefreshInterval);
            this._autoRefreshInterval = undefined;
        }
        S3Explorer.Current = undefined;
        if (this._panel)
            this._panel.dispose();
        if (this._disposables) {
            while (this._disposables.length) {
                const disposable = this._disposables.pop();
                if (disposable) {
                    disposable.dispose();
                }
            }
        }
    }
}
exports.S3Explorer = S3Explorer;
//# sourceMappingURL=S3Explorer.js.map