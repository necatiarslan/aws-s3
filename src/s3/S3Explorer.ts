/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as ui from '../common/UI';
import * as api from '../common/API';
import * as AWS from "aws-sdk";
import { S3TreeView } from "./S3TreeView";
import { S3TreeItem, TreeItemType } from "./S3TreeItem";
import { S3ExplorerItem } from "./S3ExplorerItem";

export class S3Explorer {
    public static Current: S3Explorer | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private extensionUri: vscode.Uri;

    public S3ExplorerItem: S3ExplorerItem = new S3ExplorerItem("undefined", "");
    public S3ObjectList: AWS.S3.ObjectList | undefined;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, node:S3TreeItem) {
        ui.logToOutput('S3Explorer.constructor Started');

        this.SetS3ExplorerItem(node);

        this.extensionUri = extensionUri;

        this._panel = panel;
        this._panel.onDidDispose(this.dispose, null, this._disposables);
        this._setWebviewMessageListener(this._panel.webview);
        this.Load();
        ui.logToOutput('S3Explorer.constructor Completed');
    }

    public SetS3ExplorerItem(node:S3TreeItem){
        if(node.TreeItemType === TreeItemType.Bucket && node.Bucket)
        {
            this.S3ExplorerItem = new S3ExplorerItem(node.Bucket, "");
        }
        else if(node.TreeItemType === TreeItemType.Shortcut && node.Bucket && node.Shortcut)
        {
            this.S3ExplorerItem = new S3ExplorerItem(node.Bucket, node.Shortcut);
        }
        else
        {
            this.S3ExplorerItem = new S3ExplorerItem("undefined", "");
        }
    }

    public async RenderHtml() {
        ui.logToOutput('S3Explorer.RenderHmtl Started');
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, this.extensionUri);
        
        ui.logToOutput('S3Explorer.RenderHmtl Completed');
    }

    public async Load(){
        ui.logToOutput('S3Explorer.LoadLogs Started');
        if(!S3TreeView.Current){return;}

        var result = await api.GetS3ObjectList(S3TreeView.Current.AwsProfile, this.S3ExplorerItem.Bucket, this.S3ExplorerItem.Key);
        if(result.isSuccessful)
        {
            this.S3ObjectList = result.result;
        }

        this.RenderHtml();
    }

    public ResetCurrentState(){

    }

    public static Render(extensionUri: vscode.Uri, node:S3TreeItem) {
        ui.logToOutput('S3Explorer.Render Started');
        if (S3Explorer.Current) {
            S3Explorer.Current.ResetCurrentState();
            S3Explorer.Current.SetS3ExplorerItem(node);
            S3Explorer.Current.Load();
        } 
        else 
        {
            const panel = vscode.window.createWebviewPanel("S3Explorer", "S3 Explorer", vscode.ViewColumn.One, {
                enableScripts: true,
            });

            S3Explorer.Current = new S3Explorer(panel, extensionUri, node);
        }
    }

    public s3KeyType(Key:string | undefined)
    {
        if(!Key) { return ""; }
        if(Key.endsWith("/")) { return "Folder";}
        return Key.split('.').pop() || "";
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
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
        const addShortcutUri = ui.getUri(webview, extensionUri, ["media", "edit-addshortcut.png"]);
        const moveUri = ui.getUri(webview, extensionUri, ["media", "edit-move.png"]);
        const copyUriUri = ui.getUri(webview, extensionUri, ["media", "edit-copy-uri.png"]);
        const copyUrlUri = ui.getUri(webview, extensionUri, ["media", "edit-copy-url.png"]);


        let GoFolderUpRowHtml:string="";
        if(!this.S3ExplorerItem.IsRoot())
        {
            GoFolderUpRowHtml += `<tr><td colspan="5"><vscode-link id="go_up">Go Up</vscode-link></td></tr>`
        }


        let S3RowHtml:string="";
        if(this.S3ObjectList)
        {
            for(var object of this.S3ObjectList)
            {
                S3RowHtml += `
                <tr>
                    <td>
                    <vscode-link id="download_${object.Key}"><img src="${downloadUri}" alt="Download"></vscode-link>
                    <vscode-link id="delete_${object.Key}"><img src="${deleteUri}" alt="Delete"></vscode-link>
                    <vscode-link id="copy_${object.Key}"><img src="${copyUri}" alt="Copy"></vscode-link>
                    <vscode-link id="move_${object.Key}"><img src="${moveUri}" alt="Move"></vscode-link>
                    <vscode-link id="rename_${object.Key}"><img src="${renameUri}" alt="Rename"></vscode-link>
                    <vscode-link id="copy_url_${object.Key}"><img src="${copyUrlUri}" alt="Copy URL"></vscode-link>
                    <vscode-link id="copy_s3_uri_${object.Key}"><img src="${copyUriUri}" alt="Copy S3 URI"></vscode-link>
                    <vscode-link id="add_shortcut_${object.Key}"><img src="${addShortcutUri}" alt="Add Shortcut"> [+]</vscode-link>
                    </td>
                    <td>
                    <vscode-link id="open_${object.Key}">${object.Key}</vscode-link>
                    </td>
                    <td>${this.s3KeyType(object.Key)}</td>
                    <td>${object.LastModified ? object.LastModified.toLocaleDateString() : ""}</td>
                    <td>${ui.bytesToText(object.Size)}</td>
                </tr>
                `;
            }
        }
        else
        {
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
                <vscode-button appearance="primary" id="create_folder" ${this.S3ExplorerItem.IsFile() ? "disabled":""}>Create Folder</vscode-button>
                <vscode-button appearance="primary" id="upload" ${this.S3ExplorerItem.IsFile() ? "disabled":""}>Upload</vscode-button>
                </td>
                <td style="text-align:right"><vscode-text-field id="search_text" placeholder="Search" disabled></vscode-text-field></td>
            </tr>
            <tr>
                <th>#</th>
                <th>Name</th>
                <th>Type</th>
                <th>Last Modified</th>
                <th>Size</th>
            </tr>

            ${GoFolderUpRowHtml}

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

    private _setWebviewMessageListener(webview: vscode.Webview) {
        ui.logToOutput('S3Explorer._setWebviewMessageListener Started');
        webview.onDidReceiveMessage(
            (message: any) => {
                const command = message.command;
                let id:string;

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

                }

            },
            undefined,
            this._disposables
        );
    }
    AddShortcut(key: string) {
        S3TreeView.Current?.AddShortcut(this.S3ExplorerItem.Bucket, key);
    }
    CopyFileS3Uri(key: string) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    CopyFileUrl(key: string) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    MoveFile(key: string) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    CopyFile(key: string) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    DeleteFile(key: string) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }
    DownloadFile(key: string) {
        ui.showInfoMessage("Stay Tuned ... key=" + key);
    }

    public dispose() {
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