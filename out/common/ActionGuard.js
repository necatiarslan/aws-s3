"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.needsConfirmation = needsConfirmation;
exports.confirmProceed = confirmProceed;
const vscode = __importStar(require("vscode"));
function needsConfirmation(command) {
    const c = command.toLowerCase();
    return (c.startsWith('put') ||
        c.startsWith('post') ||
        c.startsWith('upload') ||
        c.startsWith('download') ||
        c.startsWith('delete') ||
        c.startsWith('copy') ||
        c.startsWith('create') ||
        c.startsWith('update') ||
        c.startsWith('insert') ||
        c.startsWith('commit') ||
        c.startsWith('rollback') ||
        c.startsWith('send') ||
        c.startsWith('publish') ||
        c.startsWith('invoke') ||
        c.startsWith('start') ||
        c.startsWith('execute') ||
        c.startsWith('receive'));
}
async function confirmProceed(command, params) {
    let message = `Confirm to execute action command: ${command}`;
    if (params && Object.keys(params).length > 0) {
        message += '\n\nParameters:\n';
        for (let [key, value] of Object.entries(params)) {
            if (key == 'Body') {
                value = '[...]';
            }
            else if (value.length > 100) {
                value = `${value.substring(0, 10)}...`;
            }
            message += `${key}: ${value}\n`;
        }
    }
    const selection = await vscode.window.showWarningMessage(message, { modal: true }, 'Proceed', 'Cancel');
    return selection === 'Proceed';
}
//# sourceMappingURL=ActionGuard.js.map