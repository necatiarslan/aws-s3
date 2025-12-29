/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as ui from './UI';
import { Session } from "./Session";

// Tool registry with all commands for each tool
interface ToolDefinition {
    name: string;
    displayName: string;
    commands: string[];
}

const TOOL_REGISTRY: ToolDefinition[] = [
    {
        name: "TestAwsConnectionTool",
        displayName: "Test AWS Connection",
        commands: ["TestConnection"]
    },
    {
        name: "STSTool",
        displayName: "STS (Security Token Service)",
        commands: ["GetCallerIdentity", "GetSessionToken", "AssumeRole", "DecodeAuthorizationMessage"]
    },
    // {
    //     name: "SessionTool",
    //     displayName: "Session Management",
    //     commands: ["GetSession", "SetSession", "ListProfiles", "RefreshCredentials"]
    // },
    {
        name: "S3Tool",
        displayName: "S3 (Simple Storage Service)",
        commands: ["HeadBucket", "HeadObject", "ListBuckets", "ListObjectsV2", "ListObjectVersions", 
                  "GetBucketPolicy", "GetBucketNotificationConfiguration", "GetObject", "PutObject", 
                  "DeleteObject", "CopyObject", "SelectObjectContent", "OpenS3Explorer"]
    },
    {
        name: "S3FileOperationsTool",
        displayName: "S3 File Operations",
        commands: ["UploadFile", "DownloadFile", "UploadFolder", "DownloadFolder"]
    },
    {
        name: "SNSTool",
        displayName: "SNS (Simple Notification Service)",
        commands: ["CheckIfPhoneNumberIsOptedOut", "GetEndpointAttributes", "GetPlatformApplicationAttributes",
                  "GetSMSAttributes", "GetSubscriptionAttributes", "GetTopicAttributes", 
                  "ListPhoneNumbersOptedOut", "ListSubscriptionsByTopic", "ListSubscriptions",
                  "ListTagsForResource", "ListTopics", "Publish"]
    },
    {
        name: "SQSTool",
        displayName: "SQS (Simple Queue Service)",
        commands: ["ListQueues", "GetQueueAttributes", "GetQueueUrl", "SendMessage", 
                  "ReceiveMessage", "DeleteMessage", "PurgeQueue", "ListQueueTags"]
    },
    {
        name: "EC2Tool",
        displayName: "EC2 (Elastic Compute Cloud)",
        commands: ["DescribeInstances", "DescribeImages", "DescribeVolumes", "DescribeSnapshots",
                  "DescribeSecurityGroups", "DescribeKeyPairs", "DescribeVpcs", "DescribeSubnets",
                  "DescribeRouteTables", "DescribeInternetGateways", "DescribeNatGateways"]
    },
    {
        name: "EMRTool",
        displayName: "EMR (Elastic MapReduce)",
        commands: ["DescribeCluster", "DescribeJobFlows", "DescribeNotebookExecution", "DescribePersistentAppUI",
                  "DescribeReleaseLabel", "DescribeSecurityConfiguration", "DescribeStep", "DescribeStudio",
                  "GetAutoTerminationPolicy", "GetBlockPublicAccessConfiguration", "GetClusterSessionCredentials",
                  "GetManagedScalingPolicy", "GetOnClusterAppUIPresignedURL", "GetPersistentAppUIPresignedURL",
                  "GetStudioSessionMapping", "ListBootstrapActions", "ListClusters", "ListInstanceFleets",
                  "ListInstanceGroups", "ListInstances", "ListNotebookExecutions", "ListReleaseLabels",
                  "ListSecurityConfigurations", "ListSteps", "ListStudios", "ListStudioSessionMappings",
                  "ListSupportedInstanceTypes"]
    },
    {
        name: "LambdaTool",
        displayName: "Lambda",
        commands: ["ListFunctions", "GetFunction", "GetFunctionConfiguration", "Invoke",
                  "ListVersionsByFunction", "ListAliases", "GetPolicy", "ListEventSourceMappings"]
    },
    {
        name: "DynamoDBTool",
        displayName: "DynamoDB",
        commands: ["ListTables", "DescribeTable", "CreateTable", "DeleteTable", "Query",
                  "Scan", "PutItem", "UpdateItem", "DeleteItem", "GetItem", "UpdateTable",
                  "UpdateTimeToLive", "ListTagsOfResource"]
    },
    {
        name: "RDSTool",
        displayName: "RDS (Relational Database Service)",
        commands: ["DescribeDBInstances", "DescribeDBClusters", "DescribeDBSnapshots",
                  "DescribeDBClusterSnapshots", "DescribeDBEngineVersions", "DescribeDBParameterGroups"]
    },
    {
        name: "RDSDataTool",
        displayName: "RDS Data API",
        commands: ["ExecuteStatement", "BatchExecuteStatement", "BeginTransaction", 
                  "CommitTransaction", "RollbackTransaction"]
    },
    {
        name: "CloudFormationTool",
        displayName: "CloudFormation",
        commands: ["ListStacks", "DescribeStacks", "DescribeStackResources", "DescribeStackEvents",
                  "GetTemplate", "ValidateTemplate", "ListStackResources"]
    },
    {
        name: "CloudWatchLogTool",
        displayName: "CloudWatch Logs",
        commands: ["DescribeLogGroups", "DescribeLogStreams", "GetLogEvents", "FilterLogEvents",
                  "PutLogEvents", "CreateLogGroup", "CreateLogStream", "DeleteLogGroup",
                  "DeleteLogStream", "OpenCloudWatchView"]
    },
    {
        name: "StepFuncTool",
        displayName: "Step Functions",
        commands: ["ListStateMachines", "DescribeStateMachine", "DescribeExecution",
                  "ListExecutions", "StartExecution", "StopExecution", "GetExecutionHistory"]
    },
    {
        name: "GlueTool",
        displayName: "Glue",
        commands: ["GetDatabases", "GetTables", "GetTable", "GetDatabase", "GetJobs",
                  "GetJob", "GetCrawlers", "GetCrawler", "GetPartitions"]
    },
    {
        name: "IAMTool",
        displayName: "IAM (Identity & Access Management)",
        commands: ["ListUsers", "ListGroups", "ListRoles", "ListPolicies", "GetUser",
                  "GetGroup", "GetRole", "GetPolicy", "ListAttachedUserPolicies",
                  "ListAttachedGroupPolicies", "ListAttachedRolePolicies"]
    },
    {
        name: "APIGatewayTool",
        displayName: "API Gateway",
        commands: ["GetRestApis", "GetResources", "GetStages", "GetDeployments",
                  "GetIntegration", "GetMethod", "GetApiKeys", "GetUsagePlans"]
    },
    {
        name: "FileOperationsTool",
        displayName: "File Operations",
        commands: ["ReadFile", "ReadFileStream", "ReadFileAsBase64", "GetFileInfo",
                  "ListFiles", "ZipTextFile"]
    }
];

export class ServiceAccessView {
    public static Current: ServiceAccessView | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private extensionUri: vscode.Uri;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        this._panel = panel;
        this._panel.onDidDispose(this.dispose, null, this._disposables);
        this._setWebviewMessageListener(this._panel.webview);
        this.RenderHtml();
    }

    public static Render(extensionUri: vscode.Uri) {
        if (ServiceAccessView.Current) {
            ServiceAccessView.Current._panel.reveal(vscode.ViewColumn.One);
            ServiceAccessView.Current.RenderHtml();
        } else {
            const panel = vscode.window.createWebviewPanel(
                "ServiceAccessView", 
                "Service Access Settings", 
                vscode.ViewColumn.One, 
                {
                    enableScripts: true,
                }
            );

            ServiceAccessView.Current = new ServiceAccessView(panel, extensionUri);
        }
    }

    public RenderHtml() {
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, this.extensionUri);
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const vscodeElementsUri = ui.getUri(webview, extensionUri, ["node_modules", "@vscode-elements", "elements", "dist", "bundled.js"]);
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

        const disabledTools = Session.Current?.DisabledTools || new Set<string>();
        const disabledCommands = Session.Current?.DisabledCommands || new Map<string, Set<string>>();

        // Generate tool sections with checkboxes
        let toolSections = "";
        for (const tool of TOOL_REGISTRY) {
            const toolDisabled = disabledTools.has(tool.name);
            const toolChecked = !toolDisabled ? "checked" : "";
            
            // Generate command checkboxes
            let commandCheckboxes = "";
            const toolDisabledCommands = disabledCommands.get(tool.name) || new Set<string>();
            
            for (const command of tool.commands) {
                const commandDisabled = toolDisabledCommands.has(command);
                const commandChecked = !commandDisabled ? "checked" : "";
                
                commandCheckboxes += `
                    <div class="command-item">
                        <vscode-checkbox 
                            class="command-checkbox" 
                            data-tool="${tool.name}" 
                            data-command="${command}"
                            ${commandChecked}>
                            ${command}
                        </vscode-checkbox>
                    </div>
                `;
            }

            toolSections += `
                <vscode-divider></vscode-divider>
                <details class="tool-section" ${!toolDisabled ? "open" : ""}>
                    <summary class="tool-header">
                        <vscode-checkbox 
                            class="tool-checkbox" 
                            data-tool="${tool.name}"
                            ${toolChecked}>
                            <strong>${tool.displayName}</strong> (${tool.name})
                        </vscode-checkbox>
                    </summary>
                    <div class="commands-container">
                        ${commandCheckboxes}
                    </div>
                </details>
            `;
        }

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
            <script type="module" src="${vscodeElementsUri}"></script>
            <link href="${codiconsUri}" rel="stylesheet" id="vscode-codicon-stylesheet"/>
            <title>Service Access Settings</title>
            <style>
                body {
                    padding: 20px;
                    font-family: var(--vscode-font-family);
                }
                h1 {
                    margin-bottom: 10px;
                }
                .description {
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 20px;
                }
                .actions {
                    margin-bottom: 20px;
                    display: flex;
                    gap: 10px;
                }
                .tool-section {
                    margin: 10px 0;
                }
                .tool-header {
                    cursor: pointer;
                    padding: 8px 0;
                    user-select: none;
                    list-style: none;
                }
                .tool-header::-webkit-details-marker {
                    display: none;
                }
                .commands-container {
                    padding-left: 30px;
                    margin-top: 10px;
                }
                .command-item {
                    margin: 5px 0;
                }
                vscode-checkbox {
                    cursor: pointer;
                }
                .warning {
                    background-color: var(--vscode-inputValidation-warningBackground);
                    border: 1px solid var(--vscode-inputValidation-warningBorder);
                    padding: 10px;
                    margin-bottom: 20px;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <h1>Service Access Settings</h1>
            <div class="description">
                Configure which AWS services and commands are available to the AI assistant.
                Unchecked items will be disabled and cannot be executed.
            </div>

            <div class="actions">
                <vscode-button appearance="primary" id="save-btn">
                    <span class="codicon codicon-save"></span> Save Settings
                </vscode-button>
                <vscode-button appearance="secondary" id="reset-btn">
                    <span class="codicon codicon-refresh"></span> Reset to Defaults
                </vscode-button>
                <vscode-button appearance="secondary" id="enable-all-btn">
                    <span class="codicon codicon-check-all"></span> Enable All
                </vscode-button>
            </div>

            <div id="tools-container">
                ${toolSections}
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                // Handle tool checkbox changes
                document.querySelectorAll('.tool-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const toolName = e.target.dataset.tool;
                        const isChecked = e.target.checked;
                        
                        // If tool is checked, check all its commands
                        if (isChecked) {
                            document.querySelectorAll(\`.command-checkbox[data-tool="\${toolName}"]\`).forEach(cmdCheckbox => {
                                cmdCheckbox.checked = true;
                            });
                        }
                        // If tool is unchecked, uncheck all its commands
                        else {
                            document.querySelectorAll(\`.command-checkbox[data-tool="\${toolName}"]\`).forEach(cmdCheckbox => {
                                cmdCheckbox.checked = false;
                            });
                        }
                    });
                });

                // Handle command checkbox changes
                document.querySelectorAll('.command-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const toolName = e.target.dataset.tool;
                        const toolCheckbox = document.querySelector(\`.tool-checkbox[data-tool="\${toolName}"]\`);
                        
                        // Get all command checkboxes for this tool
                        const allCommands = document.querySelectorAll(\`.command-checkbox[data-tool="\${toolName}"]\`);
                        const checkedCommands = Array.from(allCommands).filter(cmd => cmd.checked);
                        
                        // If at least one command is checked, check the tool
                        if (checkedCommands.length > 0) {
                            toolCheckbox.checked = true;
                        }
                        // If all commands are unchecked, uncheck the tool
                        else {
                            toolCheckbox.checked = false;
                        }
                    });
                });

                // Save button
                document.getElementById('save-btn').addEventListener('click', () => {
                    const disabledTools = [];
                    const disabledCommands = {};

                    // Collect disabled tools (tools where ALL commands are unchecked)
                    document.querySelectorAll('.tool-checkbox').forEach(checkbox => {
                        const toolName = checkbox.dataset.tool;
                        const allCommands = document.querySelectorAll(\`.command-checkbox[data-tool="\${toolName}"]\`);
                        const checkedCommands = Array.from(allCommands).filter(cmd => cmd.checked);
                        
                        // Only mark tool as disabled if all commands are unchecked
                        if (checkedCommands.length === 0) {
                            disabledTools.push(toolName);
                        }
                    });

                    // Collect disabled commands
                    document.querySelectorAll('.command-checkbox').forEach(checkbox => {
                        const toolName = checkbox.dataset.tool;
                        const commandName = checkbox.dataset.command;
                        
                        if (!checkbox.checked) {
                            if (!disabledCommands[toolName]) {
                                disabledCommands[toolName] = [];
                            }
                            disabledCommands[toolName].push(commandName);
                        }
                    });

                    vscode.postMessage({
                        command: 'save',
                        disabledTools: disabledTools,
                        disabledCommands: disabledCommands
                    });
                });

                // Reset button
                document.getElementById('reset-btn').addEventListener('click', () => {
                    vscode.postMessage({ command: 'reset' });
                });

                // Enable all button
                document.getElementById('enable-all-btn').addEventListener('click', () => {
                    document.querySelectorAll('.tool-checkbox').forEach(checkbox => {
                        checkbox.checked = true;
                    });
                    document.querySelectorAll('.command-checkbox').forEach(checkbox => {
                        checkbox.checked = true;
                    });
                });
            </script>
        </body>
        </html>
        `;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            (message: any) => {
                const command = message.command;
                switch (command) {
                    case "save":
                        this.handleSave(message.disabledTools, message.disabledCommands);
                        return;
                    case "reset":
                        this.handleReset();
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }

    private handleSave(disabledTools: string[], disabledCommands: Record<string, string[]>) {
        if (!Session.Current) {
            ui.showErrorMessage('Session not initialized', new Error('No session'));
            return;
        }

        // Update Session with disabled tools and commands
        Session.Current.DisabledTools = new Set(disabledTools);
        Session.Current.DisabledCommands = new Map();
        
        Object.entries(disabledCommands).forEach(([tool, commands]) => {
            Session.Current!.DisabledCommands.set(tool, new Set(commands));
        });

        // Save to persistent storage
        Session.Current.SaveState();

        ui.showInfoMessage('Service access settings saved successfully');
        ui.logToOutput('Service access settings updated');
        ui.logToOutput(`Disabled tools: ${JSON.stringify(disabledTools)}`);
        ui.logToOutput(`Disabled commands: ${JSON.stringify(disabledCommands)}`);
    }

    private handleReset() {
        if (!Session.Current) {
            ui.showErrorMessage('Session not initialized', new Error('No session'));
            return;
        }

        // Clear all disabled tools and commands (enable everything)
        Session.Current.DisabledTools.clear();
        Session.Current.DisabledCommands.clear();
        Session.Current.SaveState();

        ui.showInfoMessage('Service access settings reset to defaults (all enabled)');
        ui.logToOutput('Service access settings reset to defaults');

        // Refresh the view
        this.RenderHtml();
    }

    public dispose() {
        ServiceAccessView.Current = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
