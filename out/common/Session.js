"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
const ui = require("./UI");
const vscode = require("vscode");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const MessageHub = require("./MessageHub");
class Session {
    constructor(context) {
        this.AwsProfile = "default";
        this.AwsRegion = "us-east-1";
        this.DisabledTools = new Set();
        this.DisabledCommands = new Map();
        this.HostAppName = '';
        this.IsProVersion = true;
        this._onDidChangeSession = new vscode.EventEmitter();
        this.onDidChangeSession = this._onDidChangeSession.event;
        Session.Current = this;
        this.Context = context;
        this.ExtensionUri = context.extensionUri;
        this.LoadState();
        this.GetCredentials();
        this.HostAppName = vscode.env.appName;
    }
    IsHostSupportLanguageTools() {
        const supportedHosts = ['Visual Studio Code', 'Visual Studio Code - Insiders', 'VSCodium'];
        return supportedHosts.includes(this.HostAppName);
    }
    IsDebugMode() {
        return this.Context.extensionMode === vscode.ExtensionMode.Development;
    }
    SaveState() {
        ui.logToOutput('Saving state...');
        try {
            this.Context.globalState.update('AwsProfile', Session.Current?.AwsProfile);
            this.Context.globalState.update('AwsEndPoint', Session.Current?.AwsEndPoint);
            this.Context.globalState.update('AwsRegion', Session.Current?.AwsRegion);
            // Save disabled tools and commands
            this.Context.globalState.update('DisabledTools', Array.from(Session.Current?.DisabledTools || []));
            const disabledCommandsObj = {};
            Session.Current?.DisabledCommands.forEach((commands, tool) => {
                disabledCommandsObj[tool] = Array.from(commands);
            });
            this.Context.globalState.update('DisabledCommands', disabledCommandsObj);
            this._onDidChangeSession.fire();
        }
        catch (error) {
            ui.logToOutput("Session.SaveState Error !!!", error);
        }
    }
    LoadState() {
        ui.logToOutput('Loading state...');
        try {
            const AwsProfileTemp = this.Context.globalState.get('AwsProfile');
            const AwsEndPointTemp = this.Context.globalState.get('AwsEndPoint');
            const AwsRegionTemp = this.Context.globalState.get('AwsRegion');
            if (AwsEndPointTemp) {
                Session.Current.AwsEndPoint = AwsEndPointTemp;
            }
            if (AwsRegionTemp) {
                Session.Current.AwsRegion = AwsRegionTemp;
            }
            if (AwsProfileTemp) {
                Session.Current.AwsProfile = AwsProfileTemp;
            }
            // Load disabled tools and commands
            const disabledToolsArray = this.Context.globalState.get('DisabledTools');
            if (disabledToolsArray) {
                Session.Current.DisabledTools = new Set(disabledToolsArray);
            }
            const disabledCommandsObj = this.Context.globalState.get('DisabledCommands');
            if (disabledCommandsObj) {
                Session.Current.DisabledCommands = new Map();
                Object.entries(disabledCommandsObj).forEach(([tool, commands]) => {
                    Session.Current.DisabledCommands.set(tool, new Set(commands));
                });
            }
        }
        catch (error) {
            ui.logToOutput("Session.LoadState Error !!!", error);
        }
    }
    async SetAwsEndpoint() {
        const current = Session.Current?.AwsEndPoint || '';
        const value = await vscode.window.showInputBox({
            prompt: 'Enter AWS Endpoint URL (e.g., https://s3.amazonaws.com or custom S3-compatible endpoint)',
            placeHolder: 'https://example-endpoint',
            value: current,
        });
        if (value !== undefined) {
            if (!Session.Current) {
                ui.showErrorMessage('Session not initialized', new Error('No session'));
                return;
            }
            Session.Current.AwsEndPoint = value.trim() || undefined;
            Session.Current.SaveState();
            ui.showInfoMessage('AWS Endpoint updated');
            ui.logToOutput('AWS Endpoint set to ' + (Session.Current.AwsEndPoint || 'undefined'));
            Session.Current.ClearCredentials();
        }
    }
    async SetAwsRegion() {
        const current = Session.Current?.AwsRegion || 'us-east-1';
        const value = await vscode.window.showInputBox({
            prompt: 'Enter default AWS region',
            placeHolder: 'us-east-1',
            value: current,
        });
        if (value !== undefined) {
            if (!Session.Current) {
                ui.showErrorMessage('Session not initialized', new Error('No session'));
                return;
            }
            Session.Current.AwsRegion = value.trim() || 'us-east-1';
            Session.Current.SaveState();
            Session.Current.ClearCredentials();
            ui.showInfoMessage('Default AWS Region updated');
            ui.logToOutput('AWS Region set to ' + (Session.Current.AwsRegion || 'us-east-1'));
        }
    }
    async GetCredentials() {
        if (this.CurrentCredentials !== undefined) {
            ui.logToOutput(`Using cached credentials (AccessKeyId=${this.CurrentCredentials.accessKeyId})`);
            return this.CurrentCredentials;
        }
        try {
            process.env.AWS_PROFILE = this.AwsProfile;
            const provider = (0, credential_providers_1.fromNodeProviderChain)({ ignoreCache: true });
            this.CurrentCredentials = await provider();
            if (!this.CurrentCredentials) {
                MessageHub.CredentialsChanged();
                throw new Error('AWS credentials not found');
            }
            ui.logToOutput(`Credentials loaded (AccessKeyId=${this.CurrentCredentials.accessKeyId})`);
            MessageHub.CredentialsChanged();
            return this.CurrentCredentials;
        }
        catch (error) {
            ui.logToOutput('Failed to get credentials', error);
            throw error;
        }
    }
    RefreshCredentials() {
        this.CurrentCredentials = undefined;
        this.GetCredentials();
        this._onDidChangeSession.fire();
        // MessageHub.CredentialsChanged();
        ui.logToOutput('Credentials cache refreshed');
    }
    ClearCredentials() {
        this.CurrentCredentials = undefined;
        MessageHub.CredentialsChanged();
        this._onDidChangeSession.fire();
        ui.logToOutput('Credentials cache cleared');
    }
    dispose() {
        Session.Current = undefined;
        this._onDidChangeSession.dispose();
    }
}
exports.Session = Session;
Session.Current = undefined;
//# sourceMappingURL=Session.js.map