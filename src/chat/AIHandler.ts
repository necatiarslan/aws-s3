import * as vscode from "vscode";
import * as ui from "../common/UI";
import { Session } from "../common/Session";
import * as fs from "fs";
import * as path from "path";
import * as MessageHub from "../common/MessageHub";
import { encodingForModel } from "js-tiktoken";

const PARTICIPANT_ID = "s3.chat";
const DEFAULT_PROMPT = "What can you do to help me with AWS S3 tasks?";

export class AIHandler {
  public static Current: AIHandler;

  // Token management constants
  private static readonly MAX_TOKEN_BUDGET_RATIO = 0.75; // Use 75% of model's max tokens
  private static readonly MAX_TOOL_RESULT_CHARS = 8000; // ~2000 tokens per result
  private static readonly MAX_RESOURCES_TO_KEEP = 5; // Limit resource context
  private static readonly SLIDING_WINDOW_SIZE = 10; // Keep last N messages in loop

  private latestResources: {
    [type: string]: { type: string; name: string; arn?: string };
  } = {};
  
  private paginationContext: {
    toolName: string;
    command: string;
    params: any;
    paginationToken: string;
    tokenType: string;
  } | null = null;
  
  constructor() {
    AIHandler.Current = this;
    this.registerChatParticipant();
  }

  public updateLatestResource(resource: {
    type: string;
    name: string;
    arn?: string;
  }): void {
    this.latestResources[resource.type] = resource;
  }

  private getLatestResources(): vscode.LanguageModelChatMessage[] {
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

  public registerChatParticipant(): void {
    const participant = vscode.chat.createChatParticipant(
      PARTICIPANT_ID,
      this.aIHandler.bind(AIHandler.Current)
    );
    if (!Session.Current) {
      return;
    }

    const context: vscode.ExtensionContext = Session.Current?.Context;
    participant.iconPath = vscode.Uri.joinPath(
      context.extensionUri,
      "media",
      "extension",
      "chat-icon.png"
    );
    context.subscriptions.push(participant);
  }

  public async aIHandler(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
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
      markdown: (value: string | vscode.MarkdownString) => {
        assistantResponse += typeof value === "string" ? value : value.value;
        return stream.markdown(value);
      },
      progress: (value: string) => stream.progress(value),
      button: (command: vscode.Command) => stream.button(command),
      filetree: (value: vscode.ChatResponseFileTree[], baseUri: vscode.Uri) =>
        stream.filetree(value, baseUri),
      reference: (
        value: vscode.Uri | vscode.Location,
        iconPath?: vscode.Uri | vscode.ThemeIcon | undefined
      ) => stream.reference(value, iconPath),
      anchor: (value: vscode.Uri, title?: string | undefined) =>
        stream.anchor(value, title),
      push: (part: vscode.ChatResponsePart) => stream.push(part),
    } as vscode.ChatResponseStream;

    try {
      const tools: vscode.LanguageModelChatTool[] = this.getToolsFromPackageJson();
      const messages: vscode.LanguageModelChatMessage[] = this.buildInitialMessages(request, context);
      const usedAppreciated = request.prompt.toLowerCase().includes("thank");
      const defaultPromptUsed = request.prompt === DEFAULT_PROMPT;

      let model:vscode.LanguageModelChat | undefined = request.model;
      if (request.model.id.includes('auto')) {
          const models = await vscode.lm.selectChatModels({ vendor: model.vendor, family: model.family });
          if (models.length > 0)
          {
              model = models[0];
              ui.logToOutput(`Auto-selected model: ${model.name} (${model.id})`);
          }
          else
          {
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

      if (Session.Current?.IsProVersion) {
        await this.runToolCallingLoop(
          model,
          messages,
          tools,
          wrappedStream,
          token
        );
      } else {
        this.renderProVersionMessage(wrappedStream);
      }
      
      this.renderResponseButtons(wrappedStream);

      if (usedAppreciated || defaultPromptUsed) {
        this.renderAppreciationMessage(wrappedStream);
      }

      endWorkingOnce();
    } catch (err) {
      this.handleError(err, wrappedStream);
      endWorkingOnce();
    } finally {
      cancelListener.dispose();
    }
  }

  private detectResourcesInPrompt(request: vscode.ChatRequest) {
    try {
      const bucketMatch = request?.prompt?.match(/Bucket:\s*([^?\s]+)/i);
      if (bucketMatch && bucketMatch[1]) {
        const bucketName = bucketMatch[1].replace(/^\"|\'|\"$/g, "");
        this.updateLatestResource({ type: "S3 Bucket", name: bucketName });
        ui.logToOutput(`AIHandler: Detected bucket in prompt - ${bucketName}`);
      }
    } catch (err) {
      // Non-fatal - continue without blocking AI handling
    }

    try {
      const keyMatch = request?.prompt?.match(/Key:\s*([^?\s]+)/i);
      if (keyMatch && keyMatch[1]) {
        const keyName = keyMatch[1].replace(/^\"|\'|\"$/g, "");
        this.updateLatestResource({ type: "S3 Key", name: keyName });
        ui.logToOutput(`AIHandler: Detected key in prompt - ${keyName}`);
      }
    } catch (err) {
      // Non-fatal - continue without blocking AI handling
    }
  }

  private buildInitialMessages(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext
  ): vscode.LanguageModelChatMessage[] {
    const messages: vscode.LanguageModelChatMessage[] = [];

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
  private estimateTokenCount(messages: vscode.LanguageModelChatMessage[]): number {
    let totalChars = 0;
    
    for (const message of messages) {
      const content = message.content as string | vscode.LanguageModelTextPart[];
      if (typeof content === 'string') 
      {
        totalChars += content.length;
      } else if (Array.isArray(content)) {
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
  private getModelMaxTokens(model: vscode.LanguageModelChat): number {
    // Default context windows for common model families
    const family = model.family.toLowerCase();
    
    if (family.includes('claude')) {
      return 200000; // Claude 3.5 Sonnet has 200k context
    } else if (family.includes('gpt-4')) {
      return 128000; // GPT-4 Turbo
    } else if (family.includes('gpt-3.5')) {
      return 16000;
    }
    
    // Conservative default
    return 8000;
  }

  /**
   * Prune messages to fit within token budget
   * Keeps system prompt + user prompt + recent conversation
   */
  private pruneMessages(
    messages: vscode.LanguageModelChatMessage[],
    maxTokens: number
  ): vscode.LanguageModelChatMessage[] {
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

  private async runToolCallingLoop(
    model: vscode.LanguageModelChat,
    messages: vscode.LanguageModelChatMessage[],
    tools: vscode.LanguageModelChatTool[],
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
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

  private async collectToolCalls(
    chatResponse: vscode.LanguageModelChatResponse,
    stream: vscode.ChatResponseStream
  ): Promise<vscode.LanguageModelToolCallPart[]> {
    // Stream the markdown response
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }

    // Collect tool calls from the response
    const toolCalls: vscode.LanguageModelToolCallPart[] = [];
    for await (const part of chatResponse.stream) {
      if (part instanceof vscode.LanguageModelToolCallPart) {
        toolCalls.push(part);
      }
    }
    return toolCalls;
  }

  private async executeToolCalls(
    toolCalls: vscode.LanguageModelToolCallPart[],
    messages: vscode.LanguageModelChatMessage[],
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    for (const toolCall of toolCalls) {
      let prompt = `Calling : ${toolCall.name}`;
      if (toolCall.input && 'command' in toolCall.input) {
        prompt += ` (${toolCall.input['command']})`;
      }      
      stream.progress(prompt);


      ui.logToOutput(`AIHandler: Invoking tool ${toolCall.name} with input: ${JSON.stringify(toolCall.input)}`);

      try {
        const result = await vscode.lm.invokeTool(
          toolCall.name,
          { input: toolCall.input } as any,
          token
        );

        const resultText = this.extractResultText(result);
        this.checkForPaginationToken(resultText, toolCall);

        messages.push(
          vscode.LanguageModelChatMessage.User([
            new vscode.LanguageModelToolResultPart(toolCall.callId, [
              new vscode.LanguageModelTextPart(resultText),
            ]),
          ])
        );
      } catch (err) {
        const errorMessage = `Tool execution failed: ${
          err instanceof Error ? err.message : String(err)
        }`;
        ui.logToOutput(`AIHandler: ${errorMessage}`);
        messages.push(
          vscode.LanguageModelChatMessage.User([
            new vscode.LanguageModelToolResultPart(toolCall.callId, [
              new vscode.LanguageModelTextPart(errorMessage),
            ]),
          ])
        );
      } finally {
        MessageHub.StartWorking();
      }
    }
  }

  private extractResultText(result: vscode.LanguageModelToolResult): string {
    const fullText = result.content
      .filter((part) => part instanceof vscode.LanguageModelTextPart)
      .map((part) => (part as vscode.LanguageModelTextPart).value)
      .join("\n");
    
    return this.truncateToolResult(fullText);
  }

  /**
   * Truncate large tool results to prevent token overflow
   * Preserves JSON structure when possible
   */
  private truncateToolResult(resultText: string): string {
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
    } catch (e) {
      // Not JSON, do simple text truncation
      return resultText.slice(0, AIHandler.MAX_TOOL_RESULT_CHARS) + 
             `\n... (truncated from ${resultText.length} chars)`;
    }
  }

  private checkForPaginationToken(
    resultText: string,
    toolCall: vscode.LanguageModelToolCallPart
  ): void {
    try {
      const parsedResponse = JSON.parse(resultText);
      if (parsedResponse?.pagination?.hasMore) {
        const pagination = parsedResponse.pagination;
        const tokenType = Object.keys(pagination).find(
          (k) => k.endsWith("Token") && k !== "hasMore"
        );
        if (tokenType && pagination[tokenType]) {
          const input = toolCall.input as any;
          this.paginationContext = {
            toolName: toolCall.name,
            command: input.command,
            params: input.params || {},
            paginationToken: pagination[tokenType],
            tokenType: tokenType,
          };
        }
      }
    } catch (parseErr) {
      // If response is not JSON, ignore pagination detection
    }
  }

  private renderResponseButtons(stream: vscode.ChatResponseStream): void {
    this.renderActivateProButton(stream);
    this.renderCloudWatchButton(stream);
    this.renderS3Button(stream);
    this.renderPaginationButton(stream);
  }

  private renderCloudWatchButton(stream: vscode.ChatResponseStream): void {
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

  private renderS3Button(stream: vscode.ChatResponseStream): void {
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

  private renderActivateProButton(stream: vscode.ChatResponseStream): void {
    if (Session.Current?.IsProVersion) {
      return;
    }
    stream.markdown("\n\n");
    stream.button({
      command: "S3TreeView.ActivatePro",
      title: "Activate Pro Version",
    });
  }

  private renderPaginationButton(stream: vscode.ChatResponseStream): void {
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

  private renderAppreciationMessage(stream: vscode.ChatResponseStream): void {
    stream.markdown("\n\n\n");
    stream.markdown(
      "\n🙏 [Donate](https://github.com/sponsors/necatiarslan) if you found me useful!"
    );
    stream.markdown(
      "\n🤔 [New Feature](https://github.com/necatiarslan/aws-s3/issues/new) Request"
    );
  }

  private renderProVersionMessage(stream: vscode.ChatResponseStream): void {
    stream.markdown("\n");
    stream.markdown(
      "🚀 Upgrade to Pro version for advanced AI features!"
    );
  }

  private handleError(err: unknown, stream: vscode.ChatResponseStream): void {
    if (err instanceof Error) {
      stream.markdown(
        `I'm sorry, I couldn't connect to the AI model: ${err.message}`
      );
    } else {
      stream.markdown("I'm sorry, I couldn't connect to the AI model.");
    }
    stream.markdown(
      "\n🪲 Please [Report an Issue](https://github.com/necatiarslan/aws-s3/issues/new)"
    );
  }

  public async isChatCommandAvailable(): Promise<boolean> {
    const commands = await vscode.commands.getCommands(true); // 'true' includes internal commands
    return commands.includes("workbench.action.chat.open");
  }

  public async askAI(prompt?: string): Promise<void> {
    ui.logToOutput("AIHandler.askAI Started");

    if (!(await this.isChatCommandAvailable())) {
      ui.showErrorMessage(
        "Chat command is not available. Please ensure you have access to VS Code AI features.",
        new Error("Chat command unavailable")
      );
      return;
    }

    const commandId = this.getCommandIdForEnvironment();
    await vscode.commands.executeCommand(commandId, {
      query: "@aws-s3 " + (prompt || DEFAULT_PROMPT),
    });
  }

  private getCommandIdForEnvironment(): string {
    const appName = vscode.env.appName;

    if (appName.includes("Antigravity")) {
      return "antigravity.startAgentTask";
    } else if (
      appName.includes("Code - OSS") ||
      appName.includes("Visual Studio Code")
    ) {
      return "workbench.action.chat.open";
    }

    return "workbench.action.chat.open";
  }

  private getToolsFromPackageJson(): vscode.LanguageModelChatTool[] {
    try {
      const packageJsonPath = path.join(__dirname, "../../package.json");
      const raw = fs.readFileSync(packageJsonPath, "utf8");
      const pkg = JSON.parse(raw) as any;
      const lmTools = pkg?.contributes?.languageModelTools as any[] | undefined;

      if (!Array.isArray(lmTools)) {
        ui.logToOutput(
          "AIHandler: No languageModelTools found in package.json"
        );
        return [];
      }

      return lmTools.map(
        (tool) =>
          ({
            name: tool.name,
            description:
              tool.modelDescription ||
              tool.userDescription ||
              tool.displayName ||
              "Tool",
            inputSchema: tool.inputSchema ?? { type: "object" },
          } satisfies vscode.LanguageModelChatTool)
      );
    } catch (err) {
      ui.logToOutput(
        "AIHandler: Failed to load tools from package.json",
        err instanceof Error ? err : undefined
      );
      return [];
    }
  }
}
