"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Telemetry = void 0;
const extension_telemetry_1 = require("@vscode/extension-telemetry");
const vscode = require("vscode");
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