"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeLicense = initializeLicense;
exports.validateLicenseOnline = validateLicenseOnline;
exports.isLicenseValid = isLicenseValid;
exports.getLicensePlan = getLicensePlan;
exports.clearLicense = clearLicense;
exports.promptForLicense = promptForLicense;
const vscode = require("vscode");
const ui = require("./UI");
const Telemetry_1 = require("./Telemetry");
// Storage keys
const LICENSE_KEY_SECRET = 'aws-s3.licenseKey';
const LICENSE_STATUS_KEY = 'aws-s3.licenseStatus';
// API endpoint
const LICENSE_API_URL = 'https://www.sairefe.com/wp-json/vscode/v1/license/validate';
// Validation frequency (7 Days)
const VALIDATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const GRACE_PERIOD_DAYS = 7;
const PRODUCT_NAME = 'Aws S3 Vscode Extension Pro';
const PRODUCT_ID = 748567; //807043;
// In-memory cache of the current license status
let cachedStatus = null;
let extensionContext = null;
/**
 * Initialize the license system
 * Called once from activate()
 * Loads cached license and performs online validation if needed
 */
async function initializeLicense(context) {
    extensionContext = context;
    // Load cached status from globalState
    cachedStatus = context.globalState.get(LICENSE_STATUS_KEY, null);
    // Check if we have a license key
    const licenseKey = await context.secrets.get(LICENSE_KEY_SECRET);
    if (!licenseKey) {
        // No license key stored, mark as invalid
        cachedStatus = {
            valid: false,
            error: null,
            product_id: null,
            product_name: null,
            variant_id: null,
            variant_name: null,
            customer_name: null,
            customer_email: null,
            expires_at: null,
            checked_at: Date.now(),
        };
        return;
    }
    // If we have no cached status or it's been more than 24 hours, validate online
    const now = Date.now();
    if (!cachedStatus || (now - cachedStatus.checked_at) > VALIDATION_INTERVAL_MS) {
        try {
            await validateLicenseOnline(context);
        }
        catch (error) {
            // Network error - rely on cached status with grace period
            ui.logToOutput('License validation failed, using cached status:', error);
        }
    }
}
/**
 * Validate license online by calling WordPress REST API
 * Updates the cache and returns validation result
 */
async function validateLicenseOnline(context) {
    Telemetry_1.Telemetry.Current?.send('License.licenseValidationStarted');
    const licenseKey = await context.secrets.get(LICENSE_KEY_SECRET);
    if (!licenseKey) {
        // No license key, update cache to invalid
        cachedStatus = {
            valid: false,
            error: null,
            product_id: null,
            product_name: null,
            variant_id: null,
            variant_name: null,
            customer_name: null,
            customer_email: null,
            expires_at: null,
            checked_at: Date.now(),
        };
        await context.globalState.update(LICENSE_STATUS_KEY, cachedStatus);
        return false;
    }
    const env = process.env.VSCODE_DEBUG_MODE === 'true' ? 'QA' : 'PROD';
    try {
        // Call the WordPress REST API
        const response = await fetch(LICENSE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                licenseKey: licenseKey,
                machineId: vscode.env.machineId,
                env: env
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Update cache with server response
        cachedStatus = {
            valid: data.valid,
            error: data.error || null,
            product_id: data.product_id || null,
            product_name: data.product_name || null,
            variant_id: data.variant_id || null,
            variant_name: data.variant_name || null,
            customer_name: data.customer_name || null,
            customer_email: data.customer_email || null,
            expires_at: data.expires_at || null,
            checked_at: data.checked_at || Date.now(),
        };
        if (cachedStatus.product_id !== PRODUCT_ID) {
            ui.logToOutput('License product ID does not match this product.');
            cachedStatus.valid = false;
            cachedStatus.error = 'License is not valid for this product.';
        }
        // Persist to globalState
        await context.globalState.update(LICENSE_STATUS_KEY, cachedStatus);
        return cachedStatus.valid;
    }
    catch (error) {
        // Network error or server error - don't update cache
        // Return false if we have no cached status
        ui.logToOutput('License validation error:', error);
        Telemetry_1.Telemetry.Current?.sendError('License.licenseValidationError', error);
        if (!cachedStatus) {
            cachedStatus = {
                valid: false,
                error: null,
                product_id: null,
                product_name: null,
                variant_id: null,
                variant_name: null,
                customer_name: null,
                customer_email: null,
                expires_at: null,
                checked_at: Date.now(),
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
function isLicenseValid() {
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
    const now = Date.now() / 1000; // in seconds
    const daysSinceCheck = (now - cachedStatus.checked_at) / (60 * 60 * 24);
    if (daysSinceCheck > GRACE_PERIOD_DAYS) {
        // Grace period expired
        return false;
    }
    return true;
}
/**
 * Get the current license plan
 * Returns null if no valid license
 */
function getLicensePlan() {
    if (!cachedStatus || !isLicenseValid()) {
        return null;
    }
    return cachedStatus.product_name;
}
/**
 * Clear all license data
 * Removes stored license key and cached status
 */
async function clearLicense() {
    if (!extensionContext) {
        return;
    }
    // Clear license key from secrets
    await extensionContext.secrets.delete(LICENSE_KEY_SECRET);
    // Clear cached status
    cachedStatus = {
        valid: false,
        error: null,
        product_id: null,
        product_name: null,
        variant_id: null,
        variant_name: null,
        customer_name: null,
        customer_email: null,
        expires_at: null,
        checked_at: Date.now(),
    };
    await extensionContext.globalState.update(LICENSE_STATUS_KEY, cachedStatus);
}
/**
 * Prompt user to enter license key
 * Shows VS Code input box, stores key securely, and validates online
 */
async function promptForLicense(context) {
    Telemetry_1.Telemetry.Current?.send('License.licensePromptShown');
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
        if (cachedStatus?.customer_email) {
            const email = await vscode.window.showInputBox({
                prompt: 'Enter your Email associated with license key',
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Email cannot be empty';
                    }
                    return null;
                }
            });
            if (!email) {
                await clearLicense();
                return;
            }
            if (email.trim() !== cachedStatus.customer_email) {
                vscode.window.showErrorMessage('The provided email does not match the license record.');
                await clearLicense();
                return;
            }
        }
        if (isValid) {
            vscode.window.showInformationMessage(`License activated successfully! Product: ${cachedStatus?.product_name || 'Unknown'}`);
            Telemetry_1.Telemetry.Current?.send('License.licenseActivated');
        }
        else {
            ui.logToOutput('License validation failed:', new Error(cachedStatus?.error || 'Unknown error'));
            vscode.window.showErrorMessage('License validation failed. Please check your license key.');
            // Clear the invalid license
            await clearLicense();
        }
    });
}
//# sourceMappingURL=License.js.map