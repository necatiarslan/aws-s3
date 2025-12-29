export interface CommandHistoryEntry {
    timestamp: number;
    toolName: string;
    command: string;
    params: any;
    response: any;
    success: boolean;
    durationMs: number;
}

export class CommandHistoryManager {
    private static _instance: CommandHistoryManager;
    private _history: CommandHistoryEntry[] = [];

    private constructor() { }

    public static get Instance(): CommandHistoryManager {
        return this._instance || (this._instance = new this());
    }

    public add(entry: CommandHistoryEntry): void {
        this._history.push(entry);
    }

    public getHistory(): CommandHistoryEntry[] {
        return this._history;
    }

    public clear(): void {
        this._history = [];
    }
}
