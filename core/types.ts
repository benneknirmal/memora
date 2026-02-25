export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface FunctionCall {
    name: string;
    arguments: string;
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: FunctionCall;
}

export interface Message {
    role: MessageRole;
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
    images?: string[]; // Array of base64 image strings
}

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required?: string[];
        };
    };
}

export interface ToolResult {
    forLLM: string;
    forUser?: string;
    silent?: boolean;
    error?: Error;
    images?: string[];
}

export interface LLMResponse {
    content: string | null;
    toolCalls?: ToolCall[];
}

export interface LLMProvider {
    chat(messages: Message[], tools?: ToolDefinition[]): Promise<LLMResponse>;
    createEmbedding(text: string): Promise<number[]>;
}

export interface AgentConfig {
    model: string;
    maxIterations: number;
    systemPrompt?: string;
    maxHistory?: number;
}

export interface Session {
    id: string;
    messages: Message[];
    summary?: string;
    metadata?: Record<string, any>;
}
