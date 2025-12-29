"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHistoryManager = void 0;
class CommandHistoryManager {
    constructor() {
        this._history = [];
    }
    static get Instance() {
        return this._instance || (this._instance = new this());
    }
    add(entry) {
        this._history.push(entry);
    }
    getHistory() {
        return this._history;
    }
    clear() {
        this._history = [];
    }
}
exports.CommandHistoryManager = CommandHistoryManager;
//# sourceMappingURL=CommandHistoryManager.js.map