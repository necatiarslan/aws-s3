"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudWatchLogView = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const ui = require("../common/UI");
const api = require("../common/API");
const CloudWatchTreeView_1 = require("./CloudWatchTreeView");
class CloudWatchLogView {
    constructor(panel, extensionUri, Region, LogGroup, LogStream) {
        this._disposables = [];
        this.StartTime = 0;
        this.LogEvents = [];
        ui.logToOutput('CloudWatchLogView.constructor Started');
        this.Region = Region;
        this.LogGroup = LogGroup;
        this.LogStream = LogStream;
        this.extensionUri = extensionUri;
        this._panel = panel;
        this._panel.onDidDispose(this.dispose, null, this._disposables);
        this._setWebviewMessageListener(this._panel.webview);
        this.LoadLogs();
        this.StartTimer();
        ui.logToOutput('CloudWatchLogView.constructor Completed');
    }
    async RenderHmtl() {
        ui.logToOutput('CloudWatchLogView.RenderHmtl Started');
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, this.extensionUri);
        ui.logToOutput('CloudWatchLogView.RenderHmtl Completed');
    }
    async LoadLogs() {
        ui.logToOutput('CloudWatchLogView.LoadLogs Started');
        if (!CloudWatchTreeView_1.CloudWatchTreeView.Current) {
            return;
        }
        var result = await api.GetLogEvents(CloudWatchTreeView_1.CloudWatchTreeView.Current.AwsProfile, this.Region, this.LogGroup, this.LogStream, this.StartTime);
        if (result.isSuccessful) {
            if (result.result.length > 0) {
                this.LogEvents = this.LogEvents.concat(result.result);
                this.LogEvents = this.LogEvents.sort(this.CompareEventsFunction);
                if (this.LogEvents.length > 0 && this.LogEvents[0].timestamp) {
                    this.StartTime = this.LogEvents[0].timestamp + 1;
                    let now = new Date();
                    now.setHours(now.getHours() - 1);
                    if (new Date(this.StartTime) < now) {
                        this.StopTimer();
                    }
                }
            }
            else {
                ui.logToOutput('CloudWatchLogView.LoadLogs No New Log');
            }
            this.RenderHmtl();
        }
        else {
            this.StopTimer();
        }
    }
    ResetCurrentState() {
        this.LogEvents = [];
        this.StartTime = 0;
    }
    static Render(extensionUri, Region, LogGroup, LogStream) {
        ui.logToOutput('CloudWatchLogView.Render Started');
        if (CloudWatchLogView.Current) {
            CloudWatchLogView.Current.ResetCurrentState();
            CloudWatchLogView.Current.Region = Region;
            CloudWatchLogView.Current.LogGroup = LogGroup;
            CloudWatchLogView.Current.LogStream = LogStream;
            CloudWatchLogView.Current.LoadLogs();
            CloudWatchLogView.Current.RenderHmtl();
        }
        else {
            const panel = vscode.window.createWebviewPanel("CloudWatchLogView", "CloudWatch Logs", vscode.ViewColumn.One, {
                enableScripts: true,
            });
            CloudWatchLogView.Current = new CloudWatchLogView(panel, extensionUri, Region, LogGroup, LogStream);
        }
    }
    CompareEventsFunction(a, b) {
        if (a.timestamp && b.timestamp) {
            return a.timestamp > b.timestamp ? -1 : 1;
        }
        return 1;
    }
    _getWebviewContent(webview, extensionUri) {
        ui.logToOutput('CloudWatchLogView._getWebviewContent Started');
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
        let logRowHtml = "";
        let rowNumber = 1;
        if (this.LogEvents && this.LogEvents.length > 0) {
            rowNumber = this.LogEvents.length;
            for (var event of this.LogEvents) {
                let timeString = "";
                if (event.timestamp) {
                    timeString = new Date(event.timestamp).toLocaleTimeString();
                }
                logRowHtml += '<tr><td>' + rowNumber.toString() + '</td><td>' + event.message + '</td><td>' + timeString + '</td></tr>';
                rowNumber--;
            }
        }
        else {
            logRowHtml += '<tr><td colspan=3> no log </td></tr>';
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
                <vscode-button appearance="primary" id="pause_timer" >${this.IsTimerTicking() ? "Pause" : "Resume"}</vscode-button>
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
                    <vscode-link href="https://github.com/necatiarslan/aws-cloudwatch/issues/new">Bug Report & Feature Request</vscode-link>
                </td>
            </tr>
        </table>
      </body>
    </html>
    `;
        ui.logToOutput('CloudWatchLogView._getWebviewContent Completed');
        return result;
    }
    _setWebviewMessageListener(webview) {
        ui.logToOutput('CloudWatchLogView._setWebviewMessageListener Started');
        webview.onDidReceiveMessage((message) => {
            const command = message.command;
            ui.logToOutput('CloudWatchLogView._setWebviewMessageListener Message Received ' + message.command);
            switch (command) {
                case "pause_timer":
                    this.IsTimerTicking() ? this.StopTimer() : this.StartTimer();
                    this.RenderHmtl();
                    return;
                case "export_logs":
                    this.ExportLogs();
                    return;
            }
        }, undefined, this._disposables);
    }
    dispose() {
        ui.logToOutput('CloudWatchLogView.dispose Started');
        CloudWatchLogView.Current = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    async StartTimer() {
        ui.logToOutput('CloudWatchLogView.StartTimer Started');
        if (this.Timer) {
            clearInterval(this.Timer); //stop prev checking
            this.Timer = undefined;
        }
        this.Timer = setInterval(this.OnTimerTick, 5 * 1000, this);
    }
    async StopTimer() {
        ui.logToOutput('CloudWatchLogView.StopTimer Started');
        if (this.Timer) {
            clearInterval(this.Timer); //stop prev checking
            this.Timer = undefined;
        }
    }
    IsTimerTicking() {
        return (this.Timer !== undefined);
    }
    async OnTimerTick(CloudWatchLogView) {
        ui.logToOutput('CloudWatchLogView.OnTimerTick Started');
        CloudWatchLogView.LoadLogs();
    }
    async ExportLogs() {
        ui.logToOutput('CloudWatchLogView.ExportLogs Started');
        const tmp = require('tmp');
        var fs = require('fs');
        const tmpFile = tmp.fileSync({ mode: 0o644, prefix: this.LogStream, postfix: '.log' });
        fs.appendFileSync(tmpFile.name, this.Region + "/" + this.LogGroup + "/" + this.LogStream);
        for (var message of this.LogEvents) {
            fs.appendFileSync(tmpFile.name, "\n" + "----------------------------------------------------------");
            fs.appendFileSync(tmpFile.name, "\n" + message.message);
        }
        fs.appendFileSync(tmpFile.name, "\n" + "---------------------------END OF LOGS--------------------");
        ui.openFile(tmpFile.name);
    }
}
exports.CloudWatchLogView = CloudWatchLogView;
//# sourceMappingURL=CloudWatchLogView.js.map