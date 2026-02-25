import { ToolDefinition, ToolResult } from '../types';

/**
 * MemoryTool — Save, retrieve, and delete persistent facts about the user.
 *
 * All data is stored locally on-device in SQLite via DatabaseService.
 * Nothing leaves the device.
 *
 * Three tools are exported:
 * - save_memory: Store a key-value fact
 * - get_memory: Retrieve a specific fact or list recent ones
 * - delete_memory: Remove a fact by key
 */

// ─── save_memory ───────────────────────────────────────────────────────────────

export const MemoryToolDefinition: ToolDefinition = {
    type: 'function',
    function: {
        name: 'save_memory',
        description: 'Save important information about the user, a contact, or an event for permanent reference. Use a descriptive key so you can recall it later.',
        parameters: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'A descriptive key to categorize the memory (e.g., "user_name", "favorite_food", "work_project").'
                },
                content: {
                    type: 'string',
                    description: 'The actual information to remember.'
                }
            },
            required: ['key', 'content']
        }
    }
};

export async function createMemoryExecutor(dbService: any, provider?: any) {
    return async (args: { key: string; content: string }): Promise<ToolResult> => {
        try {
            await dbService.init();

            let embeddingJson = null;
            if (provider?.createEmbedding) {
                const vector = await provider.createEmbedding(`${args.key}: ${args.content}`);
                embeddingJson = JSON.stringify(vector);
            }

            await dbService.db.runAsync(
                'INSERT OR REPLACE INTO memory (key, content, embedding, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                [args.key, args.content, embeddingJson]
            );

            return {
                forLLM: `Memory saved successfully: [${args.key}] ${args.content}`,
                forUser: `I've remembered that for you: "${args.content}"`,
                silent: false
            };
        } catch (error: any) {
            return {
                forLLM: `Error saving memory: ${error.message}`,
                silent: false,
                error
            };
        }
    };
}

// ─── get_memory ────────────────────────────────────────────────────────────────

export const GetMemoryToolDefinition: ToolDefinition = {
    type: 'function',
    function: {
        name: 'get_memory',
        description: 'Retrieve saved information. Provide a key to get a specific fact, or omit it to get the most recent memories.',
        parameters: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'The specific key to retrieve. If omitted, returns the 15 most recently updated memories.'
                }
            }
        }
    }
};

export async function createGetMemoryExecutor(dbService: any) {
    return async (args: { key?: string }): Promise<ToolResult> => {
        try {
            await dbService.init();

            if (args.key) {
                const result: any = await dbService.db.getFirstAsync(
                    'SELECT content FROM memory WHERE key = ?',
                    [args.key]
                );

                if (!result) {
                    return {
                        forLLM: `No memory found for key: ${args.key}`,
                        silent: false
                    };
                }

                return {
                    forLLM: `Memory found for ${args.key}: ${result.content}`,
                    forUser: `I remember you mentioned: ${result.content}`,
                    silent: false
                };
            } else {
                const results: any[] = await dbService.db.getAllAsync(
                    'SELECT key, content FROM memory ORDER BY updated_at DESC LIMIT 15'
                );

                if (results.length === 0) {
                    return {
                        forLLM: 'Memory registry is empty.',
                        silent: true
                    };
                }

                const summary = results.map(r => `[${r.key}] ${r.content}`).join('\n');
                return {
                    forLLM: `Relevant memories found:\n${summary}`,
                    silent: true
                };
            }
        } catch (error: any) {
            return {
                forLLM: `Error retrieving memory: ${error.message}`,
                silent: false,
                error
            };
        }
    };
}

// ─── delete_memory ─────────────────────────────────────────────────────────────

export const DeleteMemoryToolDefinition: ToolDefinition = {
    type: 'function',
    function: {
        name: 'delete_memory',
        description: 'Delete a specific saved memory by its key.',
        parameters: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'The key of the memory to delete.'
                }
            },
            required: ['key']
        }
    }
};

export async function createDeleteMemoryExecutor(dbService: any) {
    return async (args: { key: string }): Promise<ToolResult> => {
        try {
            await dbService.init();
            await dbService.db.runAsync('DELETE FROM memory WHERE key = ?', [args.key]);

            return {
                forLLM: `Successfully deleted memory with key: ${args.key}`,
                forUser: `I've forgotten the info for "${args.key}".`,
                silent: false
            };
        } catch (error: any) {
            return {
                forLLM: `Error deleting memory: ${error.message}`,
                silent: false,
                error
            };
        }
    };
}
