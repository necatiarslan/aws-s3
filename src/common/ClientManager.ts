import * as vscode from 'vscode';
import { Session } from './Session';
import * as ui from './UI';

/**
 * Manages AWS SDK clients and handles lifecycle/caching.
 * Automatically clears clients when the session (profile/region) changes.
 */
export class ClientManager implements vscode.Disposable {
    private static _instance: ClientManager;
    private _clients: Map<string, any> = new Map();
    private _pendingClients: Map<string, Promise<any>> = new Map(); // Mutex for concurrent requests
    private _disposables: vscode.Disposable[] = [];

    private constructor() {
        if (Session.Current) {
           this._disposables.push(Session.Current.onDidChangeSession(() => this.clearClients()));
        }
    }

    public static get Instance(): ClientManager {
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
    public async getClient<T>(serviceName: string, factory: (session: Session) => Promise<T>): Promise<T> {
        // Return cached client immediately if available
        if (this._clients.has(serviceName)) {
            return this._clients.get(serviceName);
        }

        // If a client is being created, wait for it instead of creating a duplicate
        if (this._pendingClients.has(serviceName)) {
            return this._pendingClients.get(serviceName);
        }

        if (!Session.Current) {
            throw new Error('Session not initialized');
        }

        // Create client with mutex pattern to prevent race conditions
        const clientPromise = (async () => {
            ui.logToOutput(`ClientManager: Creating new client for ${serviceName} (Region: ${Session.Current!.AwsRegion})`);
            const client = await factory(Session.Current!);
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
    public clearClients(): void {
        ui.logToOutput('ClientManager: Clearing all cached AWS clients due to session change.');
        // Destroy clients that have a destroy method to clean up sockets
        for (const [name, client] of this._clients) {
            if (typeof client.destroy === 'function') {
                try {
                    client.destroy();
                } catch (e) {
                    ui.logToOutput(`ClientManager: Error destroying ${name} client`, e instanceof Error ? e : undefined);
                }
            }
        }
        this._clients.clear();
        this._pendingClients.clear();
    }

    public dispose(): void {
        this.clearClients();
        this._disposables.forEach(d => d.dispose());
    }
}
