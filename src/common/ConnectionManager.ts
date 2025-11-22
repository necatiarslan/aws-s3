/**
 * AWS Connection Manager
 * 
 * Manages AWS SDK clients and credentials with proper lifecycle management
 * 
 * @module ConnectionManager
 */

import { S3Client } from "@aws-sdk/client-s3";
import { IAMClient } from "@aws-sdk/client-iam";
import { STSClient } from "@aws-sdk/client-sts";
import { AwsCredentialIdentity } from "@aws-sdk/types";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import * as ui from './UI';

/**
 * Connection configuration interface
 */
export interface ConnectionConfig {
    profile?: string;
    endpoint?: string;
    region?: string;
}

/**
 * Singleton class to manage AWS connections
 * Provides connection pooling and proper lifecycle management
 */
export class ConnectionManager {
    private static instance: ConnectionManager | undefined;
    
    private s3Client: S3Client | undefined;
    private iamClient: IAMClient | undefined;
    private stsClient: STSClient | undefined;
    private credentials: AwsCredentialIdentity | undefined;
    private config: ConnectionConfig = {};
    private isConnected: boolean = false;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        ui.logToOutput('ConnectionManager instance created');
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }

    /**
     * Update connection configuration
     * 
     * @param config - New connection configuration
     */
    public updateConfig(config: Partial<ConnectionConfig>): void {
        const configChanged = 
            config.profile !== this.config.profile ||
            config.endpoint !== this.config.endpoint ||
            config.region !== this.config.region;

        if (configChanged) {
            ui.logToOutput('Connection configuration changed, resetting connections');
            this.config = { ...this.config, ...config };
            this.reset();
        }
    }

    /**
     * Get AWS credentials
     * 
     * @returns AWS credentials
     * @throws Error if credentials cannot be obtained
     */
    public async getCredentials(): Promise<AwsCredentialIdentity> {
        if (this.credentials) {
            ui.logToOutput(`Using cached credentials for AccessKeyId=${this.credentials.accessKeyId}`);
            return this.credentials;
        }

        try {
            // Set AWS_PROFILE environment variable if profile is specified
            if (this.config.profile) {
                process.env.AWS_PROFILE = this.config.profile;
            }

            // Get credentials using the default provider chain
            const provider = fromNodeProviderChain({ ignoreCache: true });
            this.credentials = await provider();

            if (!this.credentials) {
                throw new Error("AWS credentials not found");
            }

            ui.logToOutput(`AWS credentials obtained: AccessKeyId=${this.credentials.accessKeyId}`);
            return this.credentials;
        } catch (error: any) {
            ui.showErrorMessage("Failed to obtain AWS credentials", error);
            ui.logToOutput("getCredentials Error", error);
            throw error;
        }
    }

    /**
     * Get S3 client instance
     * 
     * @returns S3Client instance
     */
    public async getS3Client(): Promise<S3Client> {
        if (this.s3Client) {
            return this.s3Client;
        }

        const credentials = await this.getCredentials();
        
        this.s3Client = new S3Client({
            credentials,
            endpoint: this.config.endpoint,
            forcePathStyle: true,
            region: this.config.region,
        });

        ui.logToOutput('S3Client created');
        return this.s3Client;
    }

    /**
     * Get IAM client instance
     * 
     * @returns IAMClient instance
     */
    public async getIAMClient(): Promise<IAMClient> {
        if (this.iamClient) {
            return this.iamClient;
        }

        const credentials = await this.getCredentials();
        
        this.iamClient = new IAMClient({ 
            credentials,
            region: this.config.region,
        });

        ui.logToOutput('IAMClient created');
        return this.iamClient;
    }

    /**
     * Get STS client instance
     * 
     * @param region - AWS region (optional, uses config region if not specified)
     * @returns STSClient instance
     */
    public async getSTSClient(region?: string): Promise<STSClient> {
        const credentials = await this.getCredentials();
        
        // Always create a new STS client if region is specified
        // Otherwise use cached instance
        if (region || !this.stsClient) {
            const stsClient = new STSClient({
                region: region || this.config.region,
                credentials,
                endpoint: this.config.endpoint,
            });

            if (!region) {
                this.stsClient = stsClient;
            }

            ui.logToOutput(`STSClient created for region: ${region || this.config.region}`);
            return stsClient;
        }

        return this.stsClient;
    }

    /**
     * Start a connection session
     * Pre-initializes clients for better performance
     */
    public async startConnection(): Promise<void> {
        if (this.isConnected) {
            ui.logToOutput('Connection already started');
            return;
        }

        ui.logToOutput('Starting connection session');
        
        try {
            // Pre-fetch credentials and initialize S3 client
            await this.getCredentials();
            await this.getS3Client();
            
            this.isConnected = true;
            ui.logToOutput('Connection session started successfully');
        } catch (error: any) {
            ui.logToOutput('Failed to start connection session', error);
            throw error;
        }
    }

    /**
     * Stop the connection session
     * Clears cached clients and credentials
     */
    public async stopConnection(): Promise<void> {
        if (!this.isConnected) {
            ui.logToOutput('Connection not started');
            return;
        }

        ui.logToOutput('Stopping connection session');
        this.reset();
        this.isConnected = false;
        ui.logToOutput('Connection session stopped');
    }

    /**
     * Reset all cached clients and credentials
     * Forces re-initialization on next use
     */
    private reset(): void {
        // Destroy clients
        if (this.s3Client) {
            this.s3Client.destroy();
            this.s3Client = undefined;
        }

        if (this.iamClient) {
            this.iamClient.destroy();
            this.iamClient = undefined;
        }

        if (this.stsClient) {
            this.stsClient.destroy();
            this.stsClient = undefined;
        }

        // Clear credentials
        this.credentials = undefined;
        
        ui.logToOutput('Connection manager reset');
    }

    /**
     * Check if connection is active
     */
    public isConnectionActive(): boolean {
        return this.isConnected;
    }

    /**
     * Get current configuration
     */
    public getConfig(): Readonly<ConnectionConfig> {
        return { ...this.config };
    }
}

/**
 * Helper function to get the connection manager instance
 */
export function getConnectionManager(): ConnectionManager {
    return ConnectionManager.getInstance();
}
