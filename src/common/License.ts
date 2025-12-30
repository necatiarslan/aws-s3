import * as vscode from 'vscode';

// License status interface that represents the current state
export interface LicenseStatus {
    valid: boolean;
    plan: string | null;
    expires_at: string | null; // ISO date string or null for lifetime
    checked_at: number; // Unix timestamp of last validation
    grace_days: number; // Number of grace days allowed
}

// Storage keys
const LICENSE_KEY_SECRET = 'aws-s3.licenseKey';
const LICENSE_STATUS_KEY = 'aws-s3.licenseStatus';

// API endpoint
const LICENSE_API_URL = 'https://www.sairefe.com/wp-json/vscode/v1/license/validate';

// Validation frequency (24 hours)
const VALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

// In-memory cache of the current license status
let cachedStatus: LicenseStatus | null = null;
let extensionContext: vscode.ExtensionContext | null = null;

/**
 * Initialize the license system
 * Called once from activate()
 * Loads cached license and performs online validation if needed
 */
export async function initializeLicense(context: vscode.ExtensionContext): Promise<void> {
    extensionContext = context;
    
    // Load cached status from globalState
    cachedStatus = context.globalState.get<LicenseStatus | null>(LICENSE_STATUS_KEY, null);
    
    // Check if we have a license key
    const licenseKey = await context.secrets.get(LICENSE_KEY_SECRET);
    if (!licenseKey) {
        // No license key stored, mark as invalid
        cachedStatus = {
            valid: false,
            plan: null,
            expires_at: null,
            checked_at: Date.now(),
            grace_days: 0
        };
        return;
    }
    
    // If we have no cached status or it's been more than 24 hours, validate online
    const now = Date.now();
    if (!cachedStatus || (now - cachedStatus.checked_at) > VALIDATION_INTERVAL_MS) {
        try {
            await validateLicenseOnline(context);
        } catch (error) {
            // Network error - rely on cached status with grace period
            console.log('License validation failed, using cached status:', error);
        }
    }
}

/**
 * Validate license online by calling WordPress REST API
 * Updates the cache and returns validation result
 */
export async function validateLicenseOnline(context: vscode.ExtensionContext): Promise<boolean> {
    const licenseKey = await context.secrets.get(LICENSE_KEY_SECRET);
    if (!licenseKey) {
        // No license key, update cache to invalid
        cachedStatus = {
            valid: false,
            plan: null,
            expires_at: null,
            checked_at: Date.now(),
            grace_days: 0
        };
        await context.globalState.update(LICENSE_STATUS_KEY, cachedStatus);
        return false;
    }
    
    try {
        // Call the WordPress REST API
        const response = await fetch(LICENSE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                licenseKey: licenseKey,
                machineId: vscode.env.machineId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json() as { valid: boolean; plan?: string; expires_at?: string; checked_at?: number; grace_days?: number };
        
        // Update cache with server response
        cachedStatus = {
            valid: data.valid,
            plan: data.plan || null,
            expires_at: data.expires_at || null,
            checked_at: data.checked_at || Date.now(),
            grace_days: data.grace_days || 7
        };
        
        // Persist to globalState
        await context.globalState.update(LICENSE_STATUS_KEY, cachedStatus);
        
        return cachedStatus.valid;
        
    } catch (error) {
        // Network error or server error - don't update cache
        // Return false if we have no cached status
        console.error('License validation error:', error);
        
        if (!cachedStatus) {
            cachedStatus = {
                valid: false,
                plan: null,
                expires_at: null,
                checked_at: Date.now(),
                grace_days: 0
            };
            await context.globalState.update(LICENSE_STATUS_KEY, cachedStatus);
        }
        
        return false;
    }
}

/**
 * Check if license is valid based on cached status
 * Considers expiration date and grace period
 * Does NOT make network calls
 */
export function isLicenseValid(): boolean {
    // if (process.env.VSCODE_DEBUG_MODE === 'true') {
    //     return true;
    // }
    
    if (!cachedStatus) {
        return false;
    }
    
    // Check if server marked license as invalid
    if (!cachedStatus.valid) {
        return false;
    }
    
    // Check expiration date
    if (cachedStatus.expires_at) {
        const expirationDate = new Date(cachedStatus.expires_at).getTime();
        const now = Date.now();
        
        if (now > expirationDate) {
            // License expired
            return false;
        }
    }
    
    // Check grace period for offline usage
    // If last check was more than grace_days ago, consider invalid
    const now = Date.now();
    const daysSinceCheck = (now - cachedStatus.checked_at) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCheck > cachedStatus.grace_days) {
        // Grace period expired
        return false;
    }
    
    return true;
}

/**
 * Get the current license plan
 * Returns null if no valid license
 */
export function getLicensePlan(): string | null {
    if (!cachedStatus || !isLicenseValid()) {
        return null;
    }
    return cachedStatus.plan;
}

/**
 * Clear all license data
 * Removes stored license key and cached status
 */
export async function clearLicense(): Promise<void> {
    if (!extensionContext) {
        return;
    }
    
    // Clear license key from secrets
    await extensionContext.secrets.delete(LICENSE_KEY_SECRET);
    
    // Clear cached status
    cachedStatus = {
        valid: false,
        plan: null,
        expires_at: null,
        checked_at: Date.now(),
        grace_days: 0
    };
    
    await extensionContext.globalState.update(LICENSE_STATUS_KEY, cachedStatus);
}

/**
 * Prompt user to enter license key
 * Shows VS Code input box, stores key securely, and validates online
 */
export async function promptForLicense(context: vscode.ExtensionContext): Promise<void> {
    // Show input box for license key
    const licenseKey = await vscode.window.showInputBox({
        prompt: 'Enter your license key',
        placeHolder: 'XXXX-XXXX-XXXX-XXXX',
        ignoreFocusOut: true,
        password: false, // Set to true if you want to hide the input
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'License key cannot be empty';
            }
            return null;
        }
    });
    
    if (!licenseKey) {
        // User cancelled
        return;
    }
    
    // Store license key securely
    await context.secrets.store(LICENSE_KEY_SECRET, licenseKey.trim());
    
    // Show progress indicator while validating
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Validating license...',
        cancellable: false
    }, async () => {
        // Validate online
        const isValid = await validateLicenseOnline(context);
        
        if (isValid) {
            vscode.window.showInformationMessage(`License activated successfully! Plan: ${cachedStatus?.plan || 'Unknown'}`);
        } else {
            vscode.window.showErrorMessage('License validation failed. Please check your license key.');
            // Clear the invalid license
            await clearLicense();
        }
    });
}
