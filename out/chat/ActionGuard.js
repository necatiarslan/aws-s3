"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.needsConfirmation = needsConfirmation;
exports.confirmProceed = confirmProceed;
const vscode = require("vscode");
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