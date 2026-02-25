import * as SQLite from 'expo-sqlite';
import { Message } from '../types';

const DB_NAME = 'memora.db';

/**
 * DatabaseService — SQLite-backed persistence for sessions, messages, and memory.
 *
 * Tables:
 * - `sessions` — Chat session metadata (id, title, summary, timestamps)
 * - `messages` — Full message history per session, with optional embedding support
 * - `memory` — Persistent key-value memory store (used by MemoryTool)
 *
 * All data is stored entirely on-device. Nothing is sent to any server.
 *
 * @example
 * ```typescript
 * import { dbService } from './core/storage/DatabaseService';
 *
 * await dbService.init();
 * await dbService.createSession('session-1', 'New Chat');
 * await dbService.saveMessage('session-1', { role: 'user', content: 'Hello!' });
 * ```
 */
export class DatabaseService {
    public db: SQLite.SQLiteDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /** Initialize the database and create tables if they don't exist. */
    async init() {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                this.db = await SQLite.openDatabaseAsync(DB_NAME);

                await this.db.execAsync(`
                    CREATE TABLE IF NOT EXISTS sessions (
                        id TEXT PRIMARY KEY,
                        title TEXT,
                        summary TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT,
                        role TEXT,
                        content TEXT,
                        tool_calls TEXT,
                        tool_call_id TEXT,
                        name TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS memory (
                        key TEXT PRIMARY KEY,
                        content TEXT,
                        embedding TEXT,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `);

                // Migrations — add columns if they don't exist yet
                const msgTableInfo: any[] = await this.db.getAllAsync('PRAGMA table_info(messages)');
                const memTableInfo: any[] = await this.db.getAllAsync('PRAGMA table_info(memory)');

                if (!msgTableInfo.some(col => col.name === 'embedding')) {
                    await this.db.execAsync('ALTER TABLE messages ADD COLUMN embedding TEXT;');
                }
                if (!msgTableInfo.some(col => col.name === 'images')) {
                    await this.db.execAsync('ALTER TABLE messages ADD COLUMN images TEXT;');
                }
                if (!memTableInfo.some(col => col.name === 'embedding')) {
                    await this.db.execAsync('ALTER TABLE memory ADD COLUMN embedding TEXT;');
                }
            } catch (error) {
                this.initPromise = null;
                throw error;
            }
        })();

        return this.initPromise;
    }

    // ─── Sessions ──────────────────────────────────────────────────────────────

    async createSession(id: string, title: string): Promise<void> {
        await this.init();
        await this.db!.runAsync(
            'INSERT INTO sessions (id, title) VALUES (?, ?)',
            [id, title]
        );
    }

    async updateSessionTitle(id: string, title: string): Promise<void> {
        await this.init();
        await this.db!.runAsync(
            'UPDATE sessions SET title = ? WHERE id = ?',
            [title, id]
        );
    }

    async updateSessionSummary(id: string, summary: string): Promise<void> {
        await this.init();
        await this.db!.runAsync(
            'UPDATE sessions SET summary = ? WHERE id = ?',
            [summary, id]
        );
    }

    async getSessions(): Promise<any[]> {
        await this.init();
        return await this.db!.getAllAsync('SELECT * FROM sessions ORDER BY updated_at DESC');
    }

    async deleteSession(id: string): Promise<void> {
        await this.init();
        await this.db!.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
    }

    // ─── Messages ──────────────────────────────────────────────────────────────

    /**
     * Save a message to a session, optionally with an embedding vector
     * for semantic search support.
     */
    async saveMessage(
        sessionId: string,
        message: Message,
        embedding?: number[]
    ): Promise<void> {
        await this.init();
        const toolCallsJson = message.tool_calls ? JSON.stringify(message.tool_calls) : null;
        const embeddingJson = embedding ? JSON.stringify(embedding) : null;
        const imagesJson = message.images ? JSON.stringify(message.images) : null;

        await this.db!.runAsync(
            'INSERT INTO messages (session_id, role, content, tool_calls, tool_call_id, name, embedding, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                sessionId,
                message.role,
                message.content,
                toolCallsJson,
                message.tool_call_id || null,
                message.name || null,
                embeddingJson,
                imagesJson
            ]
        );

        await this.db!.runAsync(
            'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [sessionId]
        );
    }

    async getMessages(sessionId: string): Promise<Message[]> {
        await this.init();
        const rows: any[] = await this.db!.getAllAsync(
            'SELECT role, content, tool_calls, tool_call_id, name, images FROM messages WHERE session_id = ? ORDER BY id ASC',
            [sessionId]
        );

        return rows.map(row => ({
            role: row.role as any,
            content: row.content,
            tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
            tool_call_id: row.tool_call_id,
            name: row.name,
            images: row.images ? JSON.parse(row.images) : undefined
        }));
    }

    /**
     * Truncate messages from a given index onwards (useful for "edit and regenerate").
     * @param sessionId - The session to truncate
     * @param index - Messages from this index (0-based) will be deleted
     */
    async truncateMessages(sessionId: string, index: number): Promise<void> {
        await this.init();
        const rows: any[] = await this.db!.getAllAsync(
            'SELECT id FROM messages WHERE session_id = ? ORDER BY id ASC',
            [sessionId]
        );

        if (rows.length > index) {
            const targetId = rows[index].id;
            await this.db!.runAsync(
                'DELETE FROM messages WHERE session_id = ? AND id >= ?',
                [sessionId, targetId]
            );
        }
    }

    // ─── Semantic Search ───────────────────────────────────────────────────────

    /**
     * Perform in-memory cosine similarity search across all stored message embeddings.
     * Requires messages to have been saved with an embedding vector.
     *
     * @param queryEmbedding - The embedding vector of the search query
     * @param limit - Maximum number of results to return
     */
    async searchSemantic(queryEmbedding: number[], limit: number = 5): Promise<any[]> {
        await this.init();
        const rows: any[] = await this.db!.getAllAsync(
            'SELECT content, role, created_at, embedding FROM messages WHERE embedding IS NOT NULL AND role IN ("user", "assistant")'
        );

        const results = rows.map(row => {
            const rowEmbedding = JSON.parse(row.embedding);
            const similarity = this.cosineSimilarity(queryEmbedding, rowEmbedding);
            return { ...row, similarity };
        });

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    /**
     * Search specifically within the long-term memory store.
     */
    async searchSemanticMemory(queryEmbedding: number[], limit: number = 8): Promise<any[]> {
        await this.init();
        const rows: any[] = await this.db!.getAllAsync(
            'SELECT key, content, embedding FROM memory WHERE embedding IS NOT NULL'
        );

        const results = rows.map(row => {
            const rowEmbedding = JSON.parse(row.embedding);
            const similarity = this.cosineSimilarity(queryEmbedding, rowEmbedding);
            return { ...row, similarity };
        });

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // ─── Utility ───────────────────────────────────────────────────────────────

    /** Clear all messages and sessions (does NOT clear memory) */
    async clearAllData(): Promise<void> {
        await this.init();
        await this.db!.runAsync('DELETE FROM messages');
        await this.db!.runAsync('DELETE FROM sessions');
    }
}

/** Singleton instance for use across the app */
export const dbService = new DatabaseService();
