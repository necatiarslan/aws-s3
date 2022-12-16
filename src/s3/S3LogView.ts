/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as ui from '../common/UI';
import * as api from '../common/API';
import * as AWS from "aws-sdk";
import { S3TreeView } from "./S3TreeView";

export class S3LogView {
    public static Current: S3LogView | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private extensionUri: vscode.Uri;

    public Region: string;
    public LogGroup:string;
    public LogStream:string;

    public StartTime:number = 0;

    private Timer: NodeJS.Timer | undefined;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, Region: string, LogGroup:string, LogStream:string) {
        ui.logToOutput('S3LogView.constructor Started');

        this.Region = Region;
        this.LogGroup = LogGroup;
        this.LogStream = LogStream;

        this.extensionUri = extensionUri;

        this._panel = panel;
        this._panel.onDidDispose(this.dispose, null, this._disposables);
        this._setWebviewMessageListener(this._panel.webview);
        this.LoadLogs();
        this.StartTimer();
        ui.logToOutput('S3LogView.constructor Completed');
    }

    public async RenderHmtl() {
        ui.logToOutput('S3LogView.RenderHmtl Started');
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, this.extensionUri);
        
        ui.logToOutput('S3LogView.RenderHmtl Completed');
    }

    public async LoadLogs(){
        ui.logToOutput('S3LogView.LoadLogs Started');
        if(!S3TreeView.Current){return;}

    }

    public ResetCurrentState(){

    }

    public static Render(extensionUri: vscode.Uri, Region: string, LogGroup:string, LogStream:string) {
        ui.logToOutput('S3LogView.Render Started');
        if (S3LogView.Current) {
            S3LogView.Current.ResetCurrentState();
            S3LogView.Current.Region = Region;
            S3LogView.Current.LogGroup = LogGroup;
            S3LogView.Current.LogStream = LogStream;
            S3LogView.Current.LoadLogs();
            S3LogView.Current.RenderHmtl();
        } 
        else 
        {
            const panel = vscode.window.createWebviewPanel("S3LogView", "S3 Logs", vscode.ViewColumn.One, {
                enableScripts: true,
            });

            S3LogView.Current = new S3LogView(panel, extensionUri, Region, LogGroup, LogStream);
        }
    }


    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
        ui.logToOutput('S3LogView._getWebviewContent Started');

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

        let logRowHtml:string="";

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
            <h2>${this.LogStream}</h2>
        </div>

        <table>
            <tr>
                <td colspan=3 style="text-align:right"><vscode-text-field id="search_text" placeholder="Search" disabled></vscode-text-field></td>
            </tr>
            <tr><th width="5px">#</th><th>Message</th><th width="75px">Time</th></tr>

            ${logRowHtml}

        </table>
        <br>
        <table>
            <tr>
                <th style="text-align:left" width="20px">
                    <div style="visibility: ${this.IsTimerTicking() ? "visible" : "hidden"}; display: flex; align-items: center;">
                    <vscode-progress-ring></vscode-progress-ring>
                    </div>
                </th>
                <th style="text-align:left">
                <vscode-button appearance="primary" id="pause_timer" >${this.IsTimerTicking()?"Pause":"Resume"}</vscode-button>
                <vscode-button appearance="primary" id="export_logs" >Export Logs</vscode-button>
                </th>
            </tr>
        </table>
        <br>
        ${this.Region} / ${this.LogGroup} / ${this.LogStream}
        
        <br>
        <br>
        <br>
                    
        <table>
            <tr>
                <td colspan="3">
                    <vscode-link href="https://github.com/necatiarslan/aws-/issues/new">Bug Report & Feature Request</vscode-link>
                </td>
            </tr>
        </table>
      </body>
    </html>
    `;
        ui.logToOutput('S3LogView._getWebviewContent Completed');
        return result;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        ui.logToOutput('S3LogView._setWebviewMessageListener Started');
        webview.onDidReceiveMessage(
            (message: any) => {
                const command = message.command;

                ui.logToOutput('S3LogView._setWebviewMessageListener Message Received ' + message.command);
                switch (command) {
                    case "pause_timer":
                        this.IsTimerTicking() ? this.StopTimer() : this.StartTimer();
                        this.RenderHmtl();
                        return;
                    
                    case "export_logs":
                        this.ExportLogs();
                        return;
                }

            },
            undefined,
            this._disposables
        );
    }

    public dispose() {
        ui.logToOutput('S3LogView.dispose Started');
        S3LogView.Current = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    async StartTimer() {
        ui.logToOutput('S3LogView.StartTimer Started');

        if (this.Timer) {
            clearInterval(this.Timer);//stop prev checking
            this.Timer = undefined;
        }

        this.Timer = setInterval(this.OnTimerTick, 5 * 1000, this);
    }

    async StopTimer() {
        ui.logToOutput('S3LogView.StopTimer Started');
        if (this.Timer) {
            clearInterval(this.Timer);//stop prev checking
            this.Timer = undefined;
        }
    }

    public IsTimerTicking(){
        return (this.Timer !== undefined);
    }

    async OnTimerTick(S3LogView: S3LogView) {
        ui.logToOutput('S3LogView.OnTimerTick Started');

        S3LogView.LoadLogs();
    }

    async ExportLogs(){
        ui.logToOutput('S3LogView.ExportLogs Started');


    }
}