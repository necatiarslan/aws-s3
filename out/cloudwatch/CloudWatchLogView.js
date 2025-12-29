"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudWatchLogView = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const ui = require("../common/UI");
const api = require("./API");
const tmp = require("tmp");
const fs = require("fs");
const Session_1 = require("../common/Session");
class CloudWatchLogView {
    constructor(panel, extensionUri, Region, LogGroup, LogStream) {
        this._disposables = [];
        this.LogStreams = [];
        this.StartTime = 0;
        this.LogEvents = [];
        this.SearchText = "";
        this.HideText = "";
        this.FilterText = "";
        this.WrapText = true; // Default to wrapped text
        this.UseDateTimeFilter = false; // Date/Time filter checkbox
        this.FilterStartDate = ""; // YYYY-MM-DD format
        this.FilterStartTime = "00"; // HH format (0-23)
        ui.logToOutput('CloudWatchLogView.constructor Started');
        this.Region = Region;
        this.LogGroup = LogGroup;
        this.LogStream = LogStream;
        this.extensionUri = extensionUri;
        this._panel = panel;
        this._panel.onDidDispose(this.dispose, null, this._disposables);
        this._setWebviewMessageListener(this._panel.webview);
        this.LoadLogStreams().then(() => {
            this.LoadLogs();
            this.StartTimer();
        });
        ui.logToOutput('CloudWatchLogView.constructor Completed');
    }
    async RenderHtml() {
        ui.logToOutput('CloudWatchLogView.RenderHmtl Started');
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, this.extensionUri);
        ui.logToOutput('CloudWatchLogView.RenderHmtl Completed');
    }
    async LoadLogStreams() {
        ui.logToOutput('CloudWatchLogView.LoadLogStreams Started');
        if (!Session_1.Session.Current) {
            return;
        }
        var logStreamsResult = await api.GetLogStreams(this.Region, this.LogGroup, undefined, 50);
        if (logStreamsResult.isSuccessful && logStreamsResult.result) {
            this.LogStreams = logStreamsResult.result
                .map(ls => ls.logStreamName)
                .filter((name) => name !== undefined);
            ui.logToOutput('CloudWatchLogView.LoadLogStreams Count=' + this.LogStreams.length);
        }
        else {
            ui.logToOutput('CloudWatchLogView.LoadLogStreams No LogStreams Found');
            this.LogStreams = [];
        }
    }
    async LoadLogs() {
        ui.logToOutput('CloudWatchLogView.LoadLogs Started');
        if (!Session_1.Session.Current) {
            return;
        }
        if (!this.LogStream) {
            // get latest logstream
            var logStreamsResult = await api.GetLogStreams(this.Region, this.LogGroup, undefined, 1);
            if (logStreamsResult.isSuccessful && logStreamsResult.result && logStreamsResult.result.length > 0) {
                this.LogStream = logStreamsResult.result[0].logStreamName || "";
                ui.logToOutput('CloudWatchLogView.LoadLogs Latest LogStream=' + this.LogStream);
            }
            else {
                ui.logToOutput('CloudWatchLogView.LoadLogs No LogStream Found');
                return;
            }
        }
        var result = await api.GetLogEvents(this.Region, this.LogGroup, this.LogStream, this.StartTime);
        if (result.isSuccessful) {
            if (result.result.length > 0) {
                this.LogEvents = this.LogEvents.concat(result.result);
                //this.LogEvents = this.LogEvents.sort(this.CompareEventsFunction);
                if (this.LogEvents.length > 0) {
                    let latestTimeStamp = this.LogEvents[this.LogEvents.length - 1].timestamp;
                    if (!latestTimeStamp) {
                        latestTimeStamp = 0;
                    }
                    this.StartTime = latestTimeStamp + 1;
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
            this.RenderHtml();
        }
        else {
            this.StopTimer();
        }
    }
    ResetCurrentState() {
        this.LogEvents = [];
        this.StartTime = 0;
    }
    /**
     * Get the first log event timestamp for default date/time filter values
     */
    GetFirstLogTimestamp() {
        if (this.LogEvents && this.LogEvents.length > 0 && this.LogEvents[0].timestamp) {
            return new Date(this.LogEvents[0].timestamp);
        }
        return null;
    }
    /**
     * Get default filter date in YYYY-MM-DD format from first log
     */
    GetDefaultFilterDate() {
        const firstLog = this.GetFirstLogTimestamp();
        if (firstLog) {
            return firstLog.toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
    }
    /**
     * Get default filter time (hour) from first log
     */
    GetDefaultFilterTime() {
        const firstLog = this.GetFirstLogTimestamp();
        if (firstLog) {
            return firstLog.getHours().toString().padStart(2, '0');
        }
        return '00';
    }
    static Render(extensionUri, Region, LogGroup, LogStream) {
        ui.logToOutput('CloudWatchLogView.Render Started');
        if (CloudWatchLogView.Current) {
            CloudWatchLogView.Current.ResetCurrentState();
            CloudWatchLogView.Current.Region = Region;
            CloudWatchLogView.Current.LogGroup = LogGroup;
            CloudWatchLogView.Current.LogStream = LogStream;
            CloudWatchLogView.Current.LoadLogs();
        }
        else {
            const panel = vscode.window.createWebviewPanel("CloudWatchLogView", "CloudWatch Logs", vscode.ViewColumn.One, {
                enableScripts: true,
            });
            CloudWatchLogView.Current = new CloudWatchLogView(panel, extensionUri, Region, LogGroup, LogStream);
        }
    }
    SetCustomColorCoding(message) {
        if (!message) {
            return message;
        }
        let result = message;
        //result=result.replace(/"([^"]*)"/g, (match, capture1) => `<span class="color_code_blue">"${capture1}"</span>`);//any string between ""
        //result=result.replace(/'([^']*)'/g, (match, capture1) => `<span class="color_code_blue">'${capture1}'</span>`);//any string between ''
        result = result.replace(/(error)/i, (match, capture1) => `<span class="color_code_red">${capture1}</span>`);
        // result=result.replace(/([error])/g, (match, capture1) => `<span class="color_code_red">${capture1}</span>`);
        result = result.replace(/(exception)/i, (match, capture1) => `<span class="color_code_red">${capture1}</span>`);
        // result=result.replace(/([exception])/g, (match, capture1) => `<span class="color_code_red">${capture1}</span>`);
        // result=result.replace(/(failure)/g, (match, capture1) => `<span class="color_code_red">${capture1}</span>`);
        // result=result.replace(/([failure])/g, (match, capture1) => `<span class="color_code_red">${capture1}</span>`);
        //result=result.replace(/(\[info\])/i, (match, capture1) => `<span class="color_code_yellow">${capture1}</span>`);
        // result=result.replace(/([info])/g, (match, capture1) => `<span class="color_code_yellow">${capture1}</span>`);
        // result=result.replace(/(warning)/g, (match, capture1) => `<span class="color_code_yellow">${capture1}</span>`);
        // result=result.replace(/([warning])/g, (match, capture1) => `<span class="color_code_yellow">${capture1}</span>`);
        //result=result.replace(/(\d{4}-\d{2}-\d{2})/g, (match, capture1) => `<span class="color_code_green">${capture1}</span>`);
        //result=result.replace(/(\d{2}\/\d{2}\/\d{4})/g, (match, capture1) => `<span class="color_code_green">${capture1}</span>`);
        //result=result.replace(/(\d{2}:\d{2}:\d{2})/g, (match, capture1) => `<span class="color_code_green">${capture1}</span>`);
        if (this.FilterText) {
            const filterTextArray = this.FilterText.split(",");
            for (var i = 0; i < filterTextArray.length; i++) {
                const regex = new RegExp("(" + filterTextArray[i].trim() + ")", "i");
                result = result.replace(regex, (match, capture1) => `<span class="color_code_search_result">${capture1}</span>`);
            }
        }
        if (this.SearchText) {
            const searchTextArray = this.SearchText.split(",");
            for (var i = 0; i < searchTextArray.length; i++) {
                const regex = new RegExp("(" + searchTextArray[i].trim() + ")", "i");
                result = result.replace(regex, (match, capture1) => `<span class="color_code_search_result">${capture1}</span>`);
            }
        }
        return result;
    }
    _getWebviewContent(webview, extensionUri) {
        ui.logToOutput('CloudWatchLogView._getWebviewContent Started');
        //file URIs
        const vscodeElementsUri = ui.getUri(webview, extensionUri, ["node_modules", "@vscode-elements", "elements", "dist", "bundled.js"]);
        const mainUri = ui.getUri(webview, extensionUri, ["media", "cloudwatch", "main.js"]);
        const styleUri = ui.getUri(webview, extensionUri, ["media", "cloudwatch", "style.css"]);
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
        let logRowHtml = "";
        if (this.LogEvents && this.LogEvents.length > 0) {
            let rowNumber = 0;
            for (var event of this.LogEvents) {
                rowNumber++;
                if (this.IsHideEvent(event)) {
                    continue;
                }
                let timeString = "";
                if (event.timestamp) {
                    timeString = new Date(event.timestamp).toLocaleTimeString();
                }
                // Apply wrapping styles based on WrapText state
                const messageStyle = this.WrapText
                    ? 'word-wrap: break-word; overflow-wrap: break-word; white-space: normal; vertical-align: top;'
                    : 'white-space: nowrap; vertical-align: top;';
                logRowHtml += '<tr><td>' + rowNumber.toString() + '</td><td style="' + messageStyle + '" >' + this.SetCustomColorCoding(event.message) + '</td><td style="white-space:nowrap;">' + timeString + '</td></tr>';
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
        <script type="module" src="${vscodeElementsUri}"></script>
        <script type="module" src="${mainUri}"></script>
        <link rel="stylesheet" href="${styleUri}">
        <link href="${codiconsUri}" rel="stylesheet" id="vscode-codicon-stylesheet"/>
        <title>Logs</title>
      </head>
      <body>  
        
        <div style="display: flex; align-items: center;">
            <h1>${this.LogGroup}</h1>
        </div>

        <div style="margin-bottom: 10px;">
            <vscode-single-select id="logstream_select" style="width: 400px; --vscode-font-size: 16px;">
                ${this.LogStreams.map(stream => `<vscode-option ${stream === this.LogStream ? 'selected' : ''} value="${stream}">${stream}</vscode-option>`).join('')}
            </vscode-single-select>
        </div>

        <table>
            <tr>
                <td style="text-align:left"  width="300px">
                    <vscode-button appearance="primary" id="pause_timer" >${this.IsTimerTicking() ? "Pause" : "Resume"}</vscode-button>
                    <vscode-button appearance="primary" id="refresh" >Refresh</vscode-button>
                    <vscode-button appearance="primary" id="export_logs" >Export Logs</vscode-button>
                    <vscode-button appearance="secondary" id="ask_ai" >Ask AI</vscode-button>
                </td>
                <td style="text-align:left" width="20px">
                    <div style="visibility: ${this.IsTimerTicking() ? "visible" : "hidden"}; display: flex; align-items: center;">
                    <vscode-progress-ring></vscode-progress-ring>
                    </div>
                </td>
                <td style="text-align:right">
                    <vscode-textfield id="search_text" placeholder="Search" value="${this.SearchText}" style="width: 20ch; margin: 0;" >
                        <vscode-icon slot="content-before" name="search" title="search"></vscode-icon>
                    </vscode-textfield>
                    <vscode-textfield id="filter_text" placeholder="Filter" value="${this.FilterText}" style="width: 20ch; margin: 0;" >
                        <vscode-icon slot="content-before" name="filter" title="filter"></vscode-icon>
                    </vscode-textfield>
                    <vscode-textfield id="hide_text" placeholder="Hide" value="${this.HideText}" style="width: 20ch; margin: 0;" >
                        <vscode-icon slot="content-before" name="eye-closed" title="eye-closed"></vscode-icon>
                    </vscode-textfield>
                    <vscode-checkbox id="wrap_text" ${this.WrapText ? 'checked' : ''} style="margin-left: 10px;">
                        Wrap
                    </vscode-checkbox>
                </td>
            </tr>
            <tr>
                <td colspan="3" style="text-align:right; padding-top: 10px;">
                    <vscode-checkbox id="use_datetime_filter" ${this.UseDateTimeFilter ? 'checked' : ''} style="margin-right: 10px;">
                        Date/Time Filter
                    </vscode-checkbox>
                    <label style="margin-right: 5px;">From:</label>
                    <input type="date" id="filter_start_date" value="${this.FilterStartDate || this.GetDefaultFilterDate()}" 
                           style="padding: 4px 8px; margin-right: 10px; background: var(--vscode-input-background); 
                                  color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border);" 
                           ${!this.UseDateTimeFilter ? 'disabled' : ''} />
                    <label style="margin-right: 5px;">Hour:</label>
                    <select id="filter_start_time" 
                            style="padding: 4px 8px; background: var(--vscode-input-background); 
                                   color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border);" 
                            ${!this.UseDateTimeFilter ? 'disabled' : ''}>
                        ${this.GenerateHourOptions(this.FilterStartTime || this.GetDefaultFilterTime())}
                    </select>
                </td>
            </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
                <th style="width: 10px;">#</th>
                <th>Message</th>
                <th style="width: 100px;">Time</th>
            </tr>

            ${logRowHtml}

        </table>

        <br>
        Region : ${this.Region} 
        <br>
        LogGroup : ${this.LogGroup} 
        <br>
        LogStream : ${this.LogStream}
        
        <br>
        <br>
        <br>
                    
        <table>
            <tr>
                <td>
                    <a href="https://github.com/necatiarslan/awsflow/issues/new" style="cursor: pointer; text-decoration: none;">Bug Report & Feature Request</a>
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
        ui.logToOutput('CloudWatchLogView._getWebviewContent Completed');
        return result;
    }
    /**
     * Generate HTML options for hour selection (0-23)
     */
    GenerateHourOptions(selectedHour) {
        let options = '';
        for (let i = 0; i < 24; i++) {
            const hourValue = i.toString().padStart(2, '0');
            const selected = hourValue === selectedHour ? 'selected' : '';
            options += `<option value="${hourValue}" ${selected}>${hourValue}:00</option>`;
        }
        return options;
    }
    IsHideEvent(event) {
        // Check date/time filter first
        if (this.UseDateTimeFilter && event.timestamp) {
            if (!this.IsEventInDateTimeRange(event)) {
                return true; // Hide events outside the date/time range
            }
        }
        if (this.HideText.length > 0) {
            let hideTerms = this.HideText.split(",");
            for (var term of hideTerms) {
                const regex = new RegExp(term.trim(), "i");
                if (event.message?.search(regex) !== -1) {
                    return true;
                }
            }
            return false;
        }
        if (this.FilterText.length > 0) {
            let searchTerms = this.FilterText.split(",");
            for (var term of searchTerms) {
                const regex = new RegExp(term.trim(), "i");
                if (event.message?.search(regex) !== -1) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    /**
     * Check if log event is within the selected date/time range
     */
    IsEventInDateTimeRange(event) {
        if (!event.timestamp || !this.FilterStartDate || !this.FilterStartTime) {
            return true;
        }
        const eventDate = new Date(event.timestamp);
        const filterDateTime = new Date(`${this.FilterStartDate}T${this.FilterStartTime}:00:00`);
        // Show events from the selected date/time onwards
        return eventDate >= filterDateTime;
    }
    _setWebviewMessageListener(webview) {
        ui.logToOutput('CloudWatchLogView._setWebviewMessageListener Started');
        webview.onDidReceiveMessage((message) => {
            const command = message.command;
            ui.logToOutput('CloudWatchLogView._setWebviewMessageListener Message Received ' + message.command);
            switch (command) {
                case "refresh":
                    this.SearchText = message.search_text;
                    this.HideText = message.hide_text;
                    this.FilterText = message.filter_text;
                    this.WrapText = message.wrap_text !== undefined ? message.wrap_text : this.WrapText;
                    this.UseDateTimeFilter = message.use_datetime_filter !== undefined ? message.use_datetime_filter : this.UseDateTimeFilter;
                    this.FilterStartDate = message.filter_start_date || this.FilterStartDate;
                    this.FilterStartTime = message.filter_start_time || this.FilterStartTime;
                    this.LoadLogs();
                    this.RenderHtml();
                    return;
                case "refresh_nologload":
                    this.SearchText = message.search_text;
                    this.HideText = message.hide_text;
                    this.FilterText = message.filter_text;
                    this.WrapText = message.wrap_text !== undefined ? message.wrap_text : this.WrapText;
                    this.UseDateTimeFilter = message.use_datetime_filter !== undefined ? message.use_datetime_filter : this.UseDateTimeFilter;
                    this.FilterStartDate = message.filter_start_date || this.FilterStartDate;
                    this.FilterStartTime = message.filter_start_time || this.FilterStartTime;
                    this.RenderHtml();
                    return;
                case "pause_timer":
                    if (this.IsTimerTicking()) {
                        this.StopTimer();
                    }
                    else {
                        this.StartTimer();
                    }
                    this.RenderHtml();
                    return;
                case "export_logs":
                    this.ExportLogs();
                    return;
                case "ask_ai":
                    this.AskAI();
                    return;
                case "toggle_wrap":
                    this.WrapText = message.wrap_text;
                    this.RenderHtml();
                    return;
                case "toggle_datetime_filter":
                    this.UseDateTimeFilter = message.use_datetime_filter;
                    if (this.UseDateTimeFilter && !this.FilterStartDate) {
                        // Set defaults from first log if not already set
                        this.FilterStartDate = this.GetDefaultFilterDate();
                        this.FilterStartTime = this.GetDefaultFilterTime();
                    }
                    this.RenderHtml();
                    return;
                case "update_datetime_filter":
                    this.FilterStartDate = message.filter_start_date;
                    this.FilterStartTime = message.filter_start_time;
                    this.RenderHtml();
                    return;
                case "logstream_changed":
                    this.LogStream = message.logstream;
                    this.ResetCurrentState();
                    this.LoadLogs();
                    return;
            }
        }, undefined, this._disposables);
    }
    dispose() {
        ui.logToOutput('CloudWatchLogView.dispose Started');
        this.StopTimer(); // Ensure timer is cleaned up to prevent memory leak
        CloudWatchLogView.Current = undefined;
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
        try {
            const fileName = this.LogStream.replace(/[^a-zA-Z0-9]/g, "_");
            const tmpFile = tmp.fileSync({ mode: 0o644, prefix: fileName, postfix: '.log' });
            // Build content as a string first, then write once (async to avoid blocking)
            let content = this.Region + "/" + this.LogGroup + "/" + this.LogStream;
            for (const message of this.LogEvents) {
                content += "\n" + "----------------------------------------------------------";
                content += "\n" + message.message;
            }
            content += "\n" + "---------------------------END OF LOGS--------------------";
            await fs.promises.writeFile(tmpFile.name, content);
            ui.openFile(tmpFile.name);
        }
        catch (error) {
            ui.showErrorMessage('ExportLogs Error !!!', error);
            ui.logToOutput("ExportLogs Error !!!", error);
        }
    }
    async AskAI() {
        ui.logToOutput('CloudWatchLogView.AskAI Started');
        try {
            const { AIHandler } = await Promise.resolve().then(() => require('../chat/AIHandler'));
            if (!AIHandler.Current) {
                ui.showErrorMessage('AIHandler not initialized', new Error('AI handler is not available'));
                return;
            }
            await AIHandler.Current.askAI("Analyse CloudWatch Logs " + this.LogGroup + " Stream:" + this.LogStream);
        }
        catch (error) {
            ui.showErrorMessage('AskAI Error !!!', error);
            ui.logToOutput("AskAI Error !!!", error);
        }
    }
}
exports.CloudWatchLogView = CloudWatchLogView;
//# sourceMappingURL=CloudWatchLogView.js.map