"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionTool = void 0;
const Session_1 = require("./Session");
const BaseTool_1 = require("./BaseTool");
class SessionTool extends BaseTool_1.BaseTool {
    constructor() {
        super(...arguments);
        this.toolName = 'SessionTool';
    }
    updateResourceContext(command, params) {
        // Session tool primarily updates global session, not specific resource context
    }
    async executeCommand(command, params) {
        switch (command) {
            case 'GetSession':
                return this.getSession();
            case 'SetSession':
                return this.setSession(params);
            case 'ListProfiles':
                return this.listProfiles();
            case 'RefreshCredentials':
                return this.refreshCredentials();
            default:
                throw new Error(`Unsupported command: ${command}`);
        }
    }
    getSession() {
        if (!Session_1.Session.Current) {
            throw new Error('Session not initialized');
        }
        return {
            AwsProfile: Session_1.Session.Current.AwsProfile,
            AwsEndPoint: Session_1.Session.Current.AwsEndPoint,
            AwsRegion: Session_1.Session.Current.AwsRegion,
        };
    }
    setSession(params) {
        if (!Session_1.Session.Current) {
            throw new Error('Session not initialized');
        }
        if (params.AwsProfile !== undefined) {
            Session_1.Session.Current.AwsProfile = params.AwsProfile || 'default';
        }
        if (params.AwsEndPoint !== undefined) {
            Session_1.Session.Current.AwsEndPoint = params.AwsEndPoint || undefined;
        }
        if (params.AwsRegion !== undefined) {
            Session_1.Session.Current.AwsRegion = params.AwsRegion || 'us-east-1';
        }
        Session_1.Session.Current.SaveState();
        Session_1.Session.Current.ClearCredentials();
        return this.getSession();
    }
    listProfiles() {
    }
    async refreshCredentials() {
        if (!Session_1.Session.Current) {
            throw new Error('Session not initialized');
        }
        Session_1.Session.Current.RefreshCredentials();
        return { ok: true };
    }
}
exports.SessionTool = SessionTool;
//# sourceMappingURL=SessionTool.js.map