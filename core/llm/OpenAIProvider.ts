import { LLMProvider, Message, ToolDefinition, LLMResponse } from '../types';

export interface OpenAIConfig {
    /** Your API key (OpenAI, Groq, Together, or any compatible provider) */
    apiKey: string;
    /** Override the base URL for non-OpenAI providers (e.g. Ollama, Groq) */
    baseURL?: string;
    /** The model to use (e.g. "gpt-4o-mini", "llama3", "gemma2") */
    model: string;
}

/**
 * OpenAIProvider — An LLMProvider implementation for the OpenAI API.
 *
 * Compatible with any OpenAI-format API:
 * - OpenAI (https://api.openai.com/v1)
 * - Groq (https://api.groq.com/openai/v1)
 * - Together AI (https://api.together.xyz/v1)
 * - Ollama (http://localhost:11434/v1)
 * - Any other OpenAI-compatible endpoint
 *
 * Supports:
 * - Text chat with tool/function calling
 * - Image inputs (vision) via base64 encoding
 * - Text embeddings (for semantic search)
 *
 * @example
 * ```typescript
 * // OpenAI
 * const provider = new OpenAIProvider({
 *   apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY!,
 *   model: 'gpt-4o-mini',
 * });
 *
 * // Local Ollama
 * const provider = new OpenAIProvider({
 *   apiKey: 'ollama',
 *   baseURL: 'http://localhost:11434/v1',
 *   model: 'llama3',
 * });
 * ```
 */
export class OpenAIProvider implements LLMProvider {
    private config: OpenAIConfig;

    constructor(config: OpenAIConfig) {
        this.config = config;
    }

    async chat(messages: Message[], tools?: ToolDefinition[]): Promise<LLMResponse> {
        const url = `${this.config.baseURL || 'https://api.openai.com/v1'}/chat/completions`;

        // Format messages — attach images as vision content when present
        const formattedMessages = messages.map(msg => {
            if ((msg.role === 'user' || msg.role === 'tool') && msg.images && msg.images.length > 0) {
                const content: any[] = [];
                if (msg.content) {
                    content.push({ type: 'text', text: msg.content });
                }
                msg.images.forEach(img => {
                    content.push({
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${img}` }
                    });
                });
                return {
                    role: msg.role,
                    content,
                    ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {})
                };
            }
            return msg;
        });

        const body: any = {
            model: this.config.model,
            messages: formattedMessages,
        };

        if (tools && tools.length > 0) {
            body.tools = tools;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LLM API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const message = choice.message;

        return {
            content: message.content,
            toolCalls: message.tool_calls,
        };
    }

    /**
     * Generate a text embedding vector.
     * Used for semantic search (see DatabaseService.searchSemantic).
     */
    async createEmbedding(text: string): Promise<number[]> {
        const url = `${this.config.baseURL || 'https://api.openai.com/v1'}/embeddings`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Embedding API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
    }
}
