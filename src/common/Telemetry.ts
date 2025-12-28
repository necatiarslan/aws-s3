import { TelemetryReporter } from "@vscode/extension-telemetry";
import * as vscode from "vscode";

export class Telemetry {

    private connectionString = "InstrumentationKey=40e9caac-d127-4931-820e-c8c3a2e164e4;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=c895058e-15ad-48ce-9074-07ceb21bad00";
    public static Current: Telemetry | undefined;

    private reporter: TelemetryReporter | undefined = undefined;

    constructor(context: vscode.ExtensionContext) {
        Telemetry.Current = this;
        if (vscode.env.isTelemetryEnabled && this.connectionString) {
            this.reporter = new TelemetryReporter(this.connectionString);
            context.subscriptions.push(this.reporter);
        }
    }

    public send(eventName: string, properties?: { [key: string]: string }, measurements?: { [key: string]: number }) {
        if (this.reporter) {
            this.reporter.sendTelemetryEvent(eventName, properties, measurements);
        }
    }

    public sendError(eventName: string, errorOrProps?: Error | { [key: string]: string }, measurements?: { [key: string]: number }) {
        if (!this.reporter) return;

        if (errorOrProps instanceof Error) {
            this.reporter.sendTelemetryErrorEvent(eventName, {
                message: errorOrProps.message,
                name: errorOrProps.name,
                stack: errorOrProps.stack ?? ''
            }, measurements);
        } else {
            this.reporter.sendTelemetryErrorEvent(eventName, errorOrProps, measurements);
        }
    }

    public dispose() {
        if (this.reporter) {
            this.reporter.dispose();
        }
    }

}

