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
exports.Telemetry = void 0;
const extension_telemetry_1 = require("@vscode/extension-telemetry");
const vscode = __importStar(require("vscode"));
class Telemetry {
    constructor(context) {
        this.connectionString = "InstrumentationKey=40e9caac-d127-4931-820e-c8c3a2e164e4;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=c895058e-15ad-48ce-9074-07ceb21bad00";
        this.reporter = undefined;
        Telemetry.Current = this;
        if (vscode.env.isTelemetryEnabled && this.connectionString) {
            this.reporter = new extension_telemetry_1.TelemetryReporter(this.connectionString);
            context.subscriptions.push(this.reporter);
        }
    }
    send(eventName, properties, measurements) {
        if (!vscode.env.isTelemetryEnabled)
            return;
        if (!this.reporter)
            return;
        this.reporter.sendTelemetryEvent(eventName, properties, measurements);
    }
    sendError(eventName, errorOrProps, measurements) {
        if (!vscode.env.isTelemetryEnabled)
            return;
        if (!this.reporter)
            return;
        if (errorOrProps instanceof Error) {
            this.reporter.sendTelemetryErrorEvent(eventName, {
                message: errorOrProps.message,
                name: errorOrProps.name,
                stack: errorOrProps.stack ?? ''
            }, measurements);
        }
        else {
            const props = errorOrProps || {};
            this.reporter.sendTelemetryErrorEvent(eventName, props, measurements);
        }
    }
    dispose() {
        if (this.reporter) {
            this.reporter.dispose();
        }
    }
}
exports.Telemetry = Telemetry;
//# sourceMappingURL=Telemetry.js.map