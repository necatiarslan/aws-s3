"use strict";
/**
 * AWS Connection Manager
 *
 * Manages AWS SDK clients and credentials with proper lifecycle management
 *
 * @module ConnectionManager
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
exports.getConnectionManager = getConnectionManager;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_iam_1 = require("@aws-sdk/client-iam");
const client_sts_1 = require("@aws-sdk/client-sts");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const ui = require("./UI");
/**
 * Singleton class to manage AWS connections
 * Provides connection pooling and proper lifecycle management
 */
class ConnectionManager {
    /**
     * Private constructor to enforce singleton pattern
     */
    constructor() {
        this.config = {};
        this.isConnected = false;
        ui.logToOutput('ConnectionManager instance created');
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
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
    updateConfig(config) {
        const configChanged = config.profile !== this.config.profile ||
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
    async getCredentials() {
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
            const provider = (0, credential_providers_1.fromNodeProviderChain)({ ignoreCache: true });
            this.credentials = await provider();
            if (!this.credentials) {
                throw new Error("AWS credentials not found");
            }
            ui.logToOutput(`AWS credentials obtained: AccessKeyId=${this.credentials.accessKeyId}`);
            return this.credentials;
        }
        catch (error) {
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
    async getS3Client() {
        if (this.s3Client) {
            return this.s3Client;
        }
        const credentials = await this.getCredentials();
        this.s3Client = new client_s3_1.S3Client({
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
    async getIAMClient() {
        if (this.iamClient) {
            return this.iamClient;
        }
        const credentials = await this.getCredentials();
        this.iamClient = new client_iam_1.IAMClient({
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
    async getSTSClient(region) {
        const credentials = await this.getCredentials();
        // Always create a new STS client if region is specified
        // Otherwise use cached instance
        if (region || !this.stsClient) {
            const stsClient = new client_sts_1.STSClient({
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
    async startConnection() {
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
        }
        catch (error) {
            ui.logToOutput('Failed to start connection session', error);
            throw error;
        }
    }
    /**
     * Stop the connection session
     * Clears cached clients and credentials
     */
    async stopConnection() {
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
    reset() {
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
    isConnectionActive() {
        return this.isConnected;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.ConnectionManager = ConnectionManager;
/**
 * Helper function to get the connection manager instance
 */
function getConnectionManager() {
    return ConnectionManager.getInstance();
}
//# sourceMappingURL=ConnectionManager.js.map