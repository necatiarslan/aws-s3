"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartWorking = StartWorking;
exports.EndWorking = EndWorking;
exports.CredentialsChanged = CredentialsChanged;
exports.StartAwsCommand = StartAwsCommand;
exports.EndAwsCommand = EndAwsCommand;
const StatusBarItem_1 = require("../statusbar/StatusBarItem");
function StartWorking() {
    StatusBarItem_1.StatusBarItem.Current?.StartWorking();
}
function EndWorking() {
    StatusBarItem_1.StatusBarItem.Current?.EndWorking();
}
function CredentialsChanged() {
    StatusBarItem_1.StatusBarItem.Current?.RefreshText();
}
function StartAwsCommand() {
    StatusBarItem_1.StatusBarItem.Current?.StartAwsCommand();
}
function EndAwsCommand() {
    StatusBarItem_1.StatusBarItem.Current?.EndAwsCommand();
}
//# sourceMappingURL=MessageHub.js.map