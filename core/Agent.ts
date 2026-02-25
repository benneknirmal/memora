import {
    Message,
    LLMProvider,
    ToolDefinition,
    AgentConfig,
    ToolResult,
    LLMResponse
} from './types';
import { ToolRegistry } from './tools/ToolRegistry';
import { dbService } from './storage/DatabaseService';

export type OnResponseChunk = (content: string) => void;
export type OnToolCall = (name: string, args: any) => void;
export type OnMessage = (message: Message) => void;
export type OnStatus = (status: string) => void;

/**
 * The main Agent class that drives the agentic loop.
 *
 * Supports:
 * - Multi-step tool calling (the agent can call multiple tools in sequence)
 * - Persistent message history with context window management
 * - Image inputs (base64) for vision-capable models
 *
 * @example
 * ```typescript
 * const provider = new OpenAIProvider({ apiKey: '...', model: 'gpt-4o-mini' });
 * const registry = new ToolRegistry();
 *
 * const agent = new Agent(provider, registry, {
 *   model: 'gpt-4o-mini',
 *   maxIterations: 10,
 *   systemPrompt: 'You are Memora, a helpful AI assistant.',
 * });
 *
 * const response = await agent.process("What's the weather like in Paris?");
 * ```
 */
export class Agent {
    private provider: LLMProvider;
    private tools: ToolRegistry;
    private config: AgentConfig;
    private history: Message[] = [];
    private maxHistory: number = 20;

    public onMessage?: OnMessage;
    public onChunk?: OnResponseChunk;
    public onStatus?: OnStatus;

    constructor(
        provider: LLMProvider,
        tools: ToolRegistry,
        config: AgentConfig,
        initialHistory: Message[] = []
    ) {
        this.provider = provider;
        this.tools = tools;
        this.config = config;
        this.maxHistory = config.maxHistory || 20;

        if (initialHistory.length > 0) {
            const hasSystem = initialHistory.some(m => m.role === 'system');
            if (hasSystem) {
                const filtered = initialHistory.filter(m => m.role !== 'system');
                this.history = config.systemPrompt
                    ? [{ role: 'system', content: config.systemPrompt }, ...filtered]
                    : filtered;
            } else {
                this.history = config.systemPrompt
                    ? [{ role: 'system', content: config.systemPrompt }, ...initialHistory]
                    : [...initialHistory];
            }
        } else if (config.systemPrompt) {
            this.history.push({ role: 'system', content: config.systemPrompt });
        }
    }

    /**
     * Trims history to fit within the configured maxHistory window,
     * always preserving the system prompt.
     */
    private getOptimizedHistory(): Message[] {
        const systemPrompt = this.history.find(m => m.role === 'system');
        const others = this.history.filter(m => m.role !== 'system');

        let truncated = others.slice(-this.maxHistory);

        // Ensure we never start with a 'tool' message (must follow assistant tool_calls)
        while (truncated.length > 0 && truncated[0].role === 'tool') {
            truncated.shift();
        }

        return systemPrompt ? [systemPrompt, ...truncated] : truncated;
    }

    /**
     * Process a user message through the agentic loop.
     * The agent will call tools as needed until it reaches a final response.
     *
     * @param userInput - The user's text message
     * @param images - Optional array of base64-encoded images for vision
     * @returns The agent's final text response
     */
    async process(userInput: string, images?: string[]): Promise<string> {
        const lastMsg = this.history[this.history.length - 1];
        if (lastMsg && lastMsg.role === 'user' && lastMsg.content === userInput) {
            if (images && images.length > 0 && (!lastMsg.images || lastMsg.images.length === 0)) {
                lastMsg.images = images;
            }
        } else {
            const userMessage: Message = { role: 'user', content: userInput, images };
            this.history.push(userMessage);
            this.onMessage?.(userMessage);
        }

        let iteration = 0;
        let finalContent = "";

        while (iteration < this.config.maxIterations) {
            iteration++;

            this.onStatus?.("Thinking...");
            const toolDefs = this.tools.getAllDefinitions();
            let optimizedHistory = this.getOptimizedHistory();

            // --- PROACTIVE MEMORY RETRIEVAL ---
            // On the first iteration, try to pull relevant memories into the context
            if (iteration === 1 && optimizedHistory.length > 0) {
                try {
                    const query = optimizedHistory[optimizedHistory.length - 1].content;
                    if (query && typeof query === 'string') {
                        const embedding = await this.provider.createEmbedding(query);
                        const memories = await dbService.searchSemanticMemory(embedding, 5);

                        if (memories.length > 0) {
                            const memorySnippet = `\n\n[RELEVANT MEMORIES]:\n${memories.map((m: any) => `- ${m.key}: ${m.content}`).join('\n')}`;

                            // Inject memories into the system prompt for this turn
                            if (optimizedHistory[0].role === 'system') {
                                optimizedHistory[0] = {
                                    ...optimizedHistory[0],
                                    content: (optimizedHistory[0].content || '') + memorySnippet
                                };
                            }
                        }
                    }
                } catch (e) {
                    console.error("Memory retrieval failed:", e);
                }
            }

            const response: LLMResponse = await this.provider.chat(optimizedHistory, toolDefs);

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.content,
                tool_calls: response.toolCalls,
            };
            this.history.push(assistantMessage);
            this.onMessage?.(assistantMessage);

            if (response.content) {
                this.onChunk?.(response.content);
            }

            // If no tool calls, we have our final answer
            if (!response.toolCalls || response.toolCalls.length === 0) {
                finalContent = response.content || "";
                break;
            }

            // Execute each tool call and add results to history
            for (const toolCall of response.toolCalls) {
                const name = toolCall.function.name;
                let args: any;

                try {
                    args = JSON.parse(toolCall.function.arguments);
                } catch (e) {
                    const errorResult: Message = {
                        role: 'tool',
                        content: `Error: Malformed JSON in tool arguments for '${name}'.`,
                        tool_call_id: toolCall.id,
                    };
                    this.history.push(errorResult);
                    continue;
                }

                const friendlyName = name
                    .split('_')
                    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                this.onStatus?.(`Using ${friendlyName}...`);

                const result: ToolResult = await this.tools.execute(name, args);
                this.onStatus?.(`${friendlyName} complete.`);

                const toolMessage: Message = {
                    role: 'tool',
                    content: result.forLLM,
                    tool_call_id: toolCall.id,
                    images: result.images,
                };

                this.history.push(toolMessage);
                this.onMessage?.(toolMessage);
            }
        }

        return finalContent;
    }

    /** Returns the full message history */
    getHistory(): Message[] {
        return this.history;
    }

    /** Clears history, preserving the system prompt */
    clearHistory() {
        this.history = [];
        if (this.config.systemPrompt) {
            this.history.push({ role: 'system', content: this.config.systemPrompt });
        }
    }
}
