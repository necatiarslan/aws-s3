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
exports.ClientManager = void 0;
const Session_1 = require("./Session");
const ui = __importStar(require("./UI"));
/**
 * Manages AWS SDK clients and handles lifecycle/caching.
 * Automatically clears clients when the session (profile/region) changes.
 */
class ClientManager {
    constructor() {
        this._clients = new Map();
        this._pendingClients = new Map(); // Mutex for concurrent requests
        this._disposables = [];
        if (Session_1.Session.Current) {
            this._disposables.push(Session_1.Session.Current.onDidChangeSession(() => this.clearClients()));
        }
    }
    static get Instance() {
        if (!ClientManager._instance) {
            ClientManager._instance = new ClientManager();
        }
        return ClientManager._instance;
    }
    /**
     * Get or create a client for a specific service.
     * Uses mutex pattern to prevent duplicate client creation from concurrent calls.
     * @param serviceName Unique key for the service (e.g., 's3', 'ec2')
     * @param factory Factory function to create the client if not cached
     */
    async getClient(serviceName, factory) {
        // Return cached client immediately if available
        if (this._clients.has(serviceName)) {
            return this._clients.get(serviceName);
        }
        // If a client is being created, wait for it instead of creating a duplicate
        if (this._pendingClients.has(serviceName)) {
            return this._pendingClients.get(serviceName);
        }
        if (!Session_1.Session.Current) {
            throw new Error('Session not initialized');
        }
        // Create client with mutex pattern to prevent race conditions
        const clientPromise = (async () => {
            ui.logToOutput(`ClientManager: Creating new client for ${serviceName} (Region: ${Session_1.Session.Current.AwsRegion})`);
            const client = await factory(Session_1.Session.Current);
            this._clients.set(serviceName, client);
            this._pendingClients.delete(serviceName);
            return client;
        })();
        this._pendingClients.set(serviceName, clientPromise);
        return clientPromise;
    }
    /**
     * Clears all cached clients. Called when session settings change.
     */
    clearClients() {
        ui.logToOutput('ClientManager: Clearing all cached AWS clients due to session change.');
        // Destroy clients that have a destroy method to clean up sockets
        for (const [name, client] of this._clients) {
            if (typeof client.destroy === 'function') {
                try {
                    client.destroy();
                }
                catch (e) {
                    ui.logToOutput(`ClientManager: Error destroying ${name} client`, e instanceof Error ? e : undefined);
                }
            }
        }
        this._clients.clear();
        this._pendingClients.clear();
    }
    dispose() {
        this.clearClients();
        this._disposables.forEach(d => d.dispose());
    }
}
exports.ClientManager = ClientManager;
//# sourceMappingURL=ClientManager.js.map