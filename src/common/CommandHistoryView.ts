/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as ui from './UI';
import { CommandHistoryManager } from "./CommandHistoryManager";
import { AIHandler } from "../chat/AIHandler";

export class CommandHistoryView {
    public static Current: CommandHistoryView | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private extensionUri: vscode.Uri;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        this._panel = panel;
        this._panel.onDidDispose(this.dispose, null, this._disposables);
        this._setWebviewMessageListener(this._panel.webview);
        this.RenderHtml();
    }

    public static Render(extensionUri: vscode.Uri) {
        if (CommandHistoryView.Current) {
            CommandHistoryView.Current._panel.reveal(vscode.ViewColumn.One);
            CommandHistoryView.Current.RenderHtml();
        } else {
            const panel = vscode.window.createWebviewPanel("CommandHistoryView", "Command History", vscode.ViewColumn.One, {
                enableScripts: true,
            });

            CommandHistoryView.Current = new CommandHistoryView(panel, extensionUri);
        }
    }

    public RenderHtml() {
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, this.extensionUri);
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const vscodeElementsUri = ui.getUri(webview, extensionUri, ["node_modules", "@vscode-elements", "elements", "dist", "bundled.js"]);
        const styleUri = ui.getUri(webview, extensionUri, ["media", "cloudwatch", "style.css"]); // Reusing cloudwatch style for basic table styling
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

        const history = CommandHistoryManager.Instance.getHistory().slice().reverse(); // Newest first

        let historyRows = "";
        if (history.length > 0) {
            let rowNumber = history.length;
            for (const entry of history) {
                const timeString = new Date(entry.timestamp).toLocaleTimeString();
                const paramsStr = JSON.stringify(entry.params || {});
                const responseStr = JSON.stringify(entry.response || {});
                const statusColor = entry.success ? "var(--vscode-charts-green)" : "var(--vscode-charts-red)";
                const toolName = entry.toolName || 'Unknown';
                const command = entry.command || 'Unknown';
                const durationMs = entry.durationMs || 0;
                
                historyRows += `
                    <tr>
                        <td>${rowNumber}</td>
                        <td style="white-space:nowrap;">${timeString}</td>
                        <td>${toolName}</td>
                        <td>${command}</td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${paramsStr.replace(/"/g, '&quot;')}">${paramsStr}</td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${responseStr.replace(/"/g, '&quot;')}">${responseStr}</td>
                        <td style="color: ${statusColor}">${entry.success ? "Success" : "Failed"}</td>
                        <td>${durationMs}ms</td>
                    </tr>
                `;
                rowNumber--;
            }
        } else {
            historyRows = '<tr><td colspan="8">No history yet.</td></tr>';
        }

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
            <script type="module" src="${vscodeElementsUri}"></script>
            <link rel="stylesheet" href="${styleUri}">
            <link href="${codiconsUri}" rel="stylesheet" id="vscode-codicon-stylesheet"/>
            <title>Command History</title>
            <style>
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid var(--vscode-editor-lineHighlightBorder); padding: 5px; text-align: left; }
                th { background-color: var(--vscode-editor-background); }
            </style>
        </head>
        <body>
            <h1>Command History</h1>
            <div style="margin-bottom: 10px;">
                <vscode-button appearance="primary" id="refresh">Refresh</vscode-button>
                <vscode-button appearance="secondary" id="clear">Clear History</vscode-button>
                <vscode-button appearance="secondary" id="export">Export JSON</vscode-button>
                <vscode-button appearance="secondary" id="exportChat">Export Chat History</vscode-button>
            </div>
            <table>
                <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Tool</th>
                    <th>Command</th>
                    <th>Params</th>
                    <th>Response</th>
                    <th>Status</th>
                    <th>Duration</th>
                </tr>
                ${historyRows}
            </table>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('refresh').addEventListener('click', () => {
                    vscode.postMessage({ command: 'refresh' });
                });
                document.getElementById('clear').addEventListener('click', () => {
                    vscode.postMessage({ command: 'clear' });
                });
                document.getElementById('export').addEventListener('click', () => {
                    vscode.postMessage({ command: 'export' });
                });
                document.getElementById('exportChat').addEventListener('click', () => {
                    vscode.postMessage({ command: 'exportChat' });
                });
            </script>
        </body>
        </html>
        `;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            (message: any) => {
                const command = message.command;
                switch (command) {
                    case "refresh":
                        this.RenderHtml();
                        return;
                    case "clear":
                        CommandHistoryManager.Instance.clear();
                        this.RenderHtml();
                        return;
                    case "export":
                        void this._exportHistory();
                        return;
                    case "exportChat":
                        //todo: implement chat history export
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }

    private async _exportHistory() {
        try {
            const history = CommandHistoryManager.Instance.getHistory();
            if (history.length === 0) {
                ui.showInfoMessage("No command history to export.");
                return;
            }

            const defaultFileName = `command-history-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
            const defaultUri = vscode.Uri.file(path.join(os.homedir(), defaultFileName));
            const targetUri = await vscode.window.showSaveDialog({
                filters: { JSON: ["json"] },
                defaultUri,
                saveLabel: "Export"
            });

            if (!targetUri) {
                return;
            }

            const content = JSON.stringify(history, null, 2);
            await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content));
            ui.showInfoMessage(`Command history exported to ${targetUri.fsPath}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            ui.showErrorMessage(`Failed to export command history: ${message}`, err as Error);
        }
    }

    public dispose() {
        CommandHistoryView.Current = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
