"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIHandler = void 0;
const vscode = require("vscode");
const ui = require("../common/UI");
const Session_1 = require("../common/Session");
const fs = require("fs");
const path = require("path");
const MessageHub = require("../common/MessageHub");
const PARTICIPANT_ID = "s3.chat";
const DEFAULT_PROMPT = "What can you do to help me with AWS S3 tasks?";
class AIHandler {
    constructor() {
        this.latestResources = {};
        this.paginationContext = null;
        AIHandler.Current = this;
        this.registerChatParticipant();
    }
    updateLatestResource(resource) {
        this.latestResources[resource.type] = resource;
    }
    getLatestResources() {
        const resources = Object.values(this.latestResources);
        if (resources.length === 0) {
            return [];
        }
        // Keep only the most recent resources
        const recentResources = resources.slice(-AIHandler.MAX_RESOURCES_TO_KEEP);
        // Combine into single concise message
        const resourceSummary = recentResources
            .map(r => `${r.type}: ${r.name}${r.arn ? ` (${r.arn})` : ''}`)
            .join('; ');
        return [
            vscode.LanguageModelChatMessage.User(`Recent AWS resources: ${resourceSummary}`)
        ];
    }
    registerChatParticipant() {
        const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, this.aIHandler.bind(AIHandler.Current));
        if (!Session_1.Session.Current) {
            return;
        }
        const context = Session_1.Session.Current?.Context;
        participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "extension", "chat-icon.png");
        context.subscriptions.push(participant);
    }
    async aIHandler(request, context, stream, token) {
        MessageHub.StartWorking();
        // Detect S3 bucket mention in the incoming prompt and record it as a recent resource
        this.detectResourcesInPrompt(request);
        let workingEnded = false;
        const endWorkingOnce = () => {
            if (workingEnded) {
                return;
            }
            workingEnded = true;
            MessageHub.EndWorking();
        };
        const cancelListener = token.onCancellationRequested(endWorkingOnce);
        // Capture assistant response
        let assistantResponse = "";
        const wrappedStream = {
            markdown: (value) => {
                assistantResponse += typeof value === "string" ? value : value.value;
                return stream.markdown(value);
            },
            progress: (value) => stream.progress(value),
            button: (command) => stream.button(command),
            filetree: (value, baseUri) => stream.filetree(value, baseUri),
            reference: (value, iconPath) => stream.reference(value, iconPath),
            anchor: (value, title) => stream.anchor(value, title),
            push: (part) => stream.push(part),
        };
        try {
            const tools = this.getToolsFromPackageJson();
            const messages = this.buildInitialMessages(request, context);
            const usedAppreciated = request.prompt.toLowerCase().includes("thank");
            const defaultPromptUsed = request.prompt === DEFAULT_PROMPT;
            let model = request.model;
            if (request.model.id.includes('auto')) {
                const models = await vscode.lm.selectChatModels({ vendor: model.vendor, family: model.family });
                if (models.length > 0) {
                    model = models[0];
                    ui.logToOutput(`Auto-selected model: ${model.name} (${model.id})`);
                }
                else {
                    ui.logToOutput(`No models found for vendor: ${model.vendor}, family: ${model.family}`);
                    model = undefined;
                }
            }
            if (!model) {
                wrappedStream.markdown("No suitable AI model found.");
                endWorkingOnce();
                return;
            }
            ui.logToOutput(`AIHandler: Using model ${model.family} (${model.name})`);
            //ui.logToOutput(`AIHandler: Initial messages: ${JSON.stringify(messages)}`);
            if (Session_1.Session.Current?.IsProVersion) {
                await this.runToolCallingLoop(model, messages, tools, wrappedStream, token);
            }
            else {
                this.renderProVersionMessage(wrappedStream);
            }
            this.renderResponseButtons(wrappedStream);
            if (usedAppreciated || defaultPromptUsed) {
                this.renderAppreciationMessage(wrappedStream);
            }
            endWorkingOnce();
        }
        catch (err) {
            this.handleError(err, wrappedStream);
            endWorkingOnce();
        }
        finally {
            cancelListener.dispose();
        }
    }
    detectResourcesInPrompt(request) {
        try {
            const bucketMatch = request?.prompt?.match(/Bucket:\s*([^?\s]+)/i);
            if (bucketMatch && bucketMatch[1]) {
                const bucketName = bucketMatch[1].replace(/^\"|\'|\"$/g, "");
                this.updateLatestResource({ type: "S3 Bucket", name: bucketName });
                ui.logToOutput(`AIHandler: Detected bucket in prompt - ${bucketName}`);
            }
        }
        catch (err) {
            // Non-fatal - continue without blocking AI handling
        }
        try {
            const keyMatch = request?.prompt?.match(/Key:\s*([^?\s]+)/i);
            if (keyMatch && keyMatch[1]) {
                const keyName = keyMatch[1].replace(/^\"|\'|\"$/g, "");
                this.updateLatestResource({ type: "S3 Key", name: keyName });
                ui.logToOutput(`AIHandler: Detected key in prompt - ${keyName}`);
            }
        }
        catch (err) {
            // Non-fatal - continue without blocking AI handling
        }
    }
    buildInitialMessages(request, chatContext) {
        const messages = [];
        messages.push(vscode.LanguageModelChatMessage.User(`AWS Expert: Use tools for tasks. Respond in Markdown; no JSON unless requested.`));
        // Add summarized resources
        messages.push(...this.getLatestResources());
        messages.push(vscode.LanguageModelChatMessage.User(request.prompt));
        return messages;
    }
    /**
     * Estimate token count for messages (rough approximation)
     * More accurate than character count, less overhead than full tokenization
     */
    estimateTokenCount(messages) {
        let totalChars = 0;
        for (const message of messages) {
            const content = message.content;
            if (typeof content === 'string') {
                totalChars += content.length;
            }
            else if (Array.isArray(content)) {
                for (const part of content) {
                    if (part instanceof vscode.LanguageModelTextPart) {
                        totalChars += part.value.length;
                    }
                }
            }
        }
        // Rough estimate: 1 token ≈ 4 characters for English text
        // Add 10% overhead for message structure
        return Math.ceil(totalChars / 4 * 1.1);
    }
    /**
     * Get max tokens based on model family
     */
    getModelMaxTokens(model) {
        // Default context windows for common model families
        const family = model.family.toLowerCase();
        if (family.includes('claude')) {
            return 200000; // Claude 3.5 Sonnet has 200k context
        }
        else if (family.includes('gpt-4')) {
            return 128000; // GPT-4 Turbo
        }
        else if (family.includes('gpt-3.5')) {
            return 16000;
        }
        // Conservative default
        return 8000;
    }
    /**
     * Prune messages to fit within token budget
     * Keeps system prompt + user prompt + recent conversation
     */
    pruneMessages(messages, maxTokens) {
        const estimatedTokens = this.estimateTokenCount(messages);
        if (estimatedTokens <= maxTokens) {
            return messages;
        }
        ui.logToOutput(`AIHandler: Pruning messages - ${estimatedTokens} tokens exceeds ${maxTokens}`);
        // Always keep: system prompt (first message) + user prompt (last N messages)
        const systemMessages = messages.slice(0, 1);
        const recentMessages = messages.slice(-AIHandler.SLIDING_WINDOW_SIZE);
        const prunedMessages = [...systemMessages, ...recentMessages];
        const newTokenCount = this.estimateTokenCount(prunedMessages);
        ui.logToOutput(`AIHandler: After pruning - ${newTokenCount} tokens`);
        return prunedMessages;
    }
    async runToolCallingLoop(model, messages, tools, stream, token) {
        const modelMaxTokens = this.getModelMaxTokens(model);
        const tokenBudget = Math.floor(modelMaxTokens * AIHandler.MAX_TOKEN_BUDGET_RATIO);
        ui.logToOutput(`AIHandler: Token budget set to ${tokenBudget} (${Math.floor(AIHandler.MAX_TOKEN_BUDGET_RATIO * 100)}% of ${modelMaxTokens})`);
        let keepGoing = true;
        while (keepGoing && !token.isCancellationRequested) {
            keepGoing = false;
            // Prune messages before sending to stay within token budget
            const prunedMessages = this.pruneMessages(messages, tokenBudget);
            const chatResponse = await model.sendRequest(prunedMessages, { tools }, token);
            const toolCalls = await this.collectToolCalls(chatResponse, stream);
            if (toolCalls.length > 0) {
                keepGoing = true;
                messages.push(vscode.LanguageModelChatMessage.Assistant(toolCalls));
                await this.executeToolCalls(toolCalls, messages, stream, token);
            }
        }
    }
    async collectToolCalls(chatResponse, stream) {
        // Stream the markdown response
        for await (const fragment of chatResponse.text) {
            stream.markdown(fragment);
        }
        // Collect tool calls from the response
        const toolCalls = [];
        for await (const part of chatResponse.stream) {
            if (part instanceof vscode.LanguageModelToolCallPart) {
                toolCalls.push(part);
            }
        }
        return toolCalls;
    }
    async executeToolCalls(toolCalls, messages, stream, token) {
        for (const toolCall of toolCalls) {
            let prompt = `Calling : ${toolCall.name}`;
            if (toolCall.input && 'command' in toolCall.input) {
                prompt += ` (${toolCall.input['command']})`;
            }
            stream.progress(prompt);
            ui.logToOutput(`AIHandler: Invoking tool ${toolCall.name} with input: ${JSON.stringify(toolCall.input)}`);
            try {
                const result = await vscode.lm.invokeTool(toolCall.name, { input: toolCall.input }, token);
                const resultText = this.extractResultText(result);
                this.checkForPaginationToken(resultText, toolCall);
                messages.push(vscode.LanguageModelChatMessage.User([
                    new vscode.LanguageModelToolResultPart(toolCall.callId, [
                        new vscode.LanguageModelTextPart(resultText),
                    ]),
                ]));
            }
            catch (err) {
                const errorMessage = `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`;
                ui.logToOutput(`AIHandler: ${errorMessage}`);
                messages.push(vscode.LanguageModelChatMessage.User([
                    new vscode.LanguageModelToolResultPart(toolCall.callId, [
                        new vscode.LanguageModelTextPart(errorMessage),
                    ]),
                ]));
            }
            finally {
                MessageHub.StartWorking();
            }
        }
    }
    extractResultText(result) {
        const fullText = result.content
            .filter((part) => part instanceof vscode.LanguageModelTextPart)
            .map((part) => part.value)
            .join("\n");
        return this.truncateToolResult(fullText);
    }
    /**
     * Truncate large tool results to prevent token overflow
     * Preserves JSON structure when possible
     */
    truncateToolResult(resultText) {
        if (resultText.length <= AIHandler.MAX_TOOL_RESULT_CHARS) {
            return resultText;
        }
        ui.logToOutput(`AIHandler: Truncating tool result from ${resultText.length} to ${AIHandler.MAX_TOOL_RESULT_CHARS} chars`);
        // Try to parse as JSON and truncate intelligently
        try {
            const parsed = JSON.parse(resultText);
            // If it has an array of items, truncate the array
            if (parsed.items && Array.isArray(parsed.items)) {
                const originalCount = parsed.items.length;
                const maxItems = 10; // Keep first 10 items
                if (originalCount > maxItems) {
                    parsed.items = parsed.items.slice(0, maxItems);
                    parsed.truncated = true;
                    parsed.totalItems = originalCount;
                    parsed.showingItems = maxItems;
                    const truncatedJson = JSON.stringify(parsed, null, 2);
                    return truncatedJson + `\n\n... (Showing ${maxItems} of ${originalCount} items)`;
                }
            }
            // If still too large, do simple truncation on stringified version
            const stringified = JSON.stringify(parsed, null, 2);
            if (stringified.length > AIHandler.MAX_TOOL_RESULT_CHARS) {
                return stringified.slice(0, AIHandler.MAX_TOOL_RESULT_CHARS) +
                    `\n... (truncated from ${stringified.length} chars)`;
            }
            return stringified;
        }
        catch (e) {
            // Not JSON, do simple text truncation
            return resultText.slice(0, AIHandler.MAX_TOOL_RESULT_CHARS) +
                `\n... (truncated from ${resultText.length} chars)`;
        }
    }
    checkForPaginationToken(resultText, toolCall) {
        try {
            const parsedResponse = JSON.parse(resultText);
            if (parsedResponse?.pagination?.hasMore) {
                const pagination = parsedResponse.pagination;
                const tokenType = Object.keys(pagination).find((k) => k.endsWith("Token") && k !== "hasMore");
                if (tokenType && pagination[tokenType]) {
                    const input = toolCall.input;
                    this.paginationContext = {
                        toolName: toolCall.name,
                        command: input.command,
                        params: input.params || {},
                        paginationToken: pagination[tokenType],
                        tokenType: tokenType,
                    };
                }
            }
        }
        catch (parseErr) {
            // If response is not JSON, ignore pagination detection
        }
    }
    renderResponseButtons(stream) {
        this.renderActivateProButton(stream);
        this.renderCloudWatchButton(stream);
        this.renderS3Button(stream);
        this.renderPaginationButton(stream);
    }
    renderCloudWatchButton(stream) {
        if (!this.latestResources["CloudWatch Log Group"]) {
            return;
        }
        const logGroup = this.latestResources["CloudWatch Log Group"].name;
        const logStream = this.latestResources["CloudWatch Log Stream"]?.name;
        stream.markdown("\n\n");
        stream.button({
            command: "aws-s3.OpenCloudWatchView",
            title: "Open Log View",
            arguments: logStream ? [logGroup, logStream] : [logGroup],
        });
    }
    renderS3Button(stream) {
        if (!this.latestResources["S3 Bucket"]) {
            return;
        }
        const bucket = this.latestResources["S3 Bucket"].name;
        const key = this.latestResources["S3 Key"]?.name;
        stream.markdown("\n\n");
        stream.button({
            command: "aws-s3.OpenS3ExplorerView",
            title: "Open S3 View",
            arguments: [bucket, key],
        });
    }
    renderActivateProButton(stream) {
        if (Session_1.Session.Current?.IsProVersion) {
            return;
        }
        stream.markdown("\n\n");
        stream.button({
            command: "S3TreeView.ActivatePro",
            title: "Activate Pro Version",
        });
        stream.button({
            command: "S3TreeView.EnterLicenseKey",
            title: "Enter License Key",
        });
    }
    renderPaginationButton(stream) {
        if (!this.paginationContext) {
            return;
        }
        stream.markdown("\n\n");
        stream.button({
            command: "aws-s3.LoadMoreResults",
            title: "Load More",
            arguments: [this.paginationContext],
        });
    }
    renderAppreciationMessage(stream) {
        stream.markdown("\n\n\n");
        stream.markdown("\n🙏 [Donate](https://github.com/sponsors/necatiarslan) if you found me useful!");
        stream.markdown("\n🤔 [New Feature](https://github.com/necatiarslan/aws-s3/issues/new) Request");
    }
    renderProVersionMessage(stream) {
        stream.markdown("\n");
        stream.markdown("🚀 Upgrade to Pro version for advanced AI features!");
    }
    handleError(err, stream) {
        if (err instanceof Error) {
            stream.markdown(`I'm sorry, I couldn't connect to the AI model: ${err.message}`);
        }
        else {
            stream.markdown("I'm sorry, I couldn't connect to the AI model.");
        }
        stream.markdown("\n🪲 Please [Report an Issue](https://github.com/necatiarslan/aws-s3/issues/new)");
    }
    async isChatCommandAvailable() {
        const commands = await vscode.commands.getCommands(true); // 'true' includes internal commands
        return commands.includes("workbench.action.chat.open");
    }
    async askAI(prompt) {
        ui.logToOutput("AIHandler.askAI Started");
        if (!(await this.isChatCommandAvailable())) {
            ui.showErrorMessage("Chat command is not available. Please ensure you have access to VS Code AI features.", new Error("Chat command unavailable"));
            return;
        }
        const commandId = this.getCommandIdForEnvironment();
        await vscode.commands.executeCommand(commandId, {
            query: "@aws-s3 " + (prompt || DEFAULT_PROMPT),
        });
    }
    getCommandIdForEnvironment() {
        const appName = vscode.env.appName;
        if (appName.includes("Antigravity")) {
            return "antigravity.startAgentTask";
        }
        else if (appName.includes("Code - OSS") ||
            appName.includes("Visual Studio Code")) {
            return "workbench.action.chat.open";
        }
        return "workbench.action.chat.open";
    }
    getToolsFromPackageJson() {
        try {
            const packageJsonPath = path.join(__dirname, "../../package.json");
            const raw = fs.readFileSync(packageJsonPath, "utf8");
            const pkg = JSON.parse(raw);
            const lmTools = pkg?.contributes?.languageModelTools;
            if (!Array.isArray(lmTools)) {
                ui.logToOutput("AIHandler: No languageModelTools found in package.json");
                return [];
            }
            return lmTools.map((tool) => ({
                name: tool.name,
                description: tool.modelDescription ||
                    tool.userDescription ||
                    tool.displayName ||
                    "Tool",
                inputSchema: tool.inputSchema ?? { type: "object" },
            }));
        }
        catch (err) {
            ui.logToOutput("AIHandler: Failed to load tools from package.json", err instanceof Error ? err : undefined);
            return [];
        }
    }
}
exports.AIHandler = AIHandler;
// Token management constants
AIHandler.MAX_TOKEN_BUDGET_RATIO = 0.75; // Use 75% of model's max tokens
AIHandler.MAX_TOOL_RESULT_CHARS = 8000; // ~2000 tokens per result
AIHandler.MAX_RESOURCES_TO_KEEP = 5; // Limit resource context
AIHandler.SLIDING_WINDOW_SIZE = 10; // Keep last N messages in loop
//# sourceMappingURL=AIHandler.js.map