import { ToolDefinition, ToolResult } from '../types';

export type ToolExecuteFunc = (args: any) => Promise<ToolResult>;

export interface RegisteredTool {
    definition: ToolDefinition;
    execute: ToolExecuteFunc;
}

/**
 * A simple registry for tools that the agent can call.
 * Tools are registered with a definition (for the LLM) and an executor (for runtime).
 *
 * @example
 * ```typescript
 * const registry = new ToolRegistry();
 *
 * registry.register(MyToolDefinition, async (args) => {
 *   return { forLLM: 'Tool result', silent: false };
 * });
 * ```
 */
export class ToolRegistry {
    private tools: Map<string, RegisteredTool> = new Map();

    /**
     * Register a tool with its definition and executor.
     * @param definition - OpenAI function-calling format tool definition
     * @param execute - Async function that executes the tool and returns a ToolResult
     */
    register(definition: ToolDefinition, execute: ToolExecuteFunc) {
        this.tools.set(definition.function.name, { definition, execute });
    }

    /** Get a registered tool by its function name */
    get(name: string): RegisteredTool | undefined {
        return this.tools.get(name);
    }

    /** Returns all tool definitions (used when calling the LLM) */
    getAllDefinitions(): ToolDefinition[] {
        return Array.from(this.tools.values()).map(t => t.definition);
    }

    /** Execute a tool by name with the given arguments */
    async execute(name: string, args: any): Promise<ToolResult> {
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                forLLM: `Error: Tool '${name}' not found.`,
                silent: false,
            };
        }

        try {
            return await tool.execute(args);
        } catch (error: any) {
            return {
                forLLM: `Error executing tool '${name}': ${error.message}`,
                silent: false,
                error,
            };
        }
    }
}
