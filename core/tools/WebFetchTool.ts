import { ToolDefinition, ToolResult } from '../types';

/**
 * WebFetchTool — Give the AI the ability to read web pages and search the internet.
 *
 * Two tools:
 * - web_fetch: Read and clean the HTML content of a specific URL
 * - web_search: Search DuckDuckGo and return top results (no API key required)
 */

// ─── web_fetch ─────────────────────────────────────────────────────────────────

export const WebFetchToolDefinition: ToolDefinition = {
    type: 'function',
    function: {
        name: 'web_fetch',
        description: `Read and analyze the content of a specific URL.
USE CASES:
- Summarize articles, blog posts, or news stories.
- Extract specific data (prices, stats, dates) from a product or report page.
- Read technical documentation, terms of service, or manuals.
Use this tool whenever the user provides a direct link.`,
        parameters: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The exact URL to fetch and analyze.'
                }
            },
            required: ['url']
        }
    }
};

export async function executeWebFetch(args: { url: string }): Promise<ToolResult> {
    try {
        const response = await fetch(args.url);
        if (!response.ok) {
            return {
                forLLM: `Error fetching URL: ${response.status} ${response.statusText}`,
                silent: false
            };
        }

        let text = await response.text();

        // Strip scripts, styles, and HTML tags for a clean plain-text result
        text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '');
        text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '');
        text = text.replace(/<[^>]+>/g, ' ');
        text = text.replace(/\s+/g, ' ').trim();

        // Truncate to avoid context window overflow
        const truncated = text.length > 12000
            ? text.substring(0, 12000) + '... [truncated for brevity]'
            : text;

        return {
            forLLM: `Content from ${args.url}:\n\n${truncated}`,
            forUser: `I've retrieved the information from ${args.url}.`,
            silent: false
        };
    } catch (error: any) {
        return {
            forLLM: `Error fetching URL: ${error.message}`,
            silent: false,
            error
        };
    }
}

// ─── web_search ────────────────────────────────────────────────────────────────

export const WebSearchToolDefinition: ToolDefinition = {
    type: 'function',
    function: {
        name: 'web_search',
        description: `Search the web for real-time information.
USE CASES:
- Latest news, sports scores, stock prices.
- Business details (phone numbers, addresses, hours).
- Product comparisons and reviews.
- Fact verification and research.
Always use this for questions involving current or changing data.`,
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'A specific, detailed search query (e.g., "The Ritz London official phone number and address").'
                }
            },
            required: ['query']
        }
    }
};

export async function executeWebSearch(args: { query: string }): Promise<ToolResult> {
    try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Memora/1.0)'
            }
        });

        if (!response.ok) throw new Error('Search service returned an error.');

        const text = await response.text();
        const results: string[] = [];
        const resultMatches = text.matchAll(
            /class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
        );

        for (const match of resultMatches) {
            if (results.length >= 8) break;
            const [, url, title, snippet] = match;
            results.push(
                `Title: ${title.trim()}\nURL: ${url}\nSnippet: ${snippet.replace(/<[^>]+>/g, '').trim()}\n`
            );
        }

        if (results.length === 0) {
            return {
                forLLM: 'No search results found. Try a different query.',
                forUser: "I couldn't find any results for that search.",
                silent: false
            };
        }

        return {
            forLLM: `Search results for "${args.query}":\n\n${results.join('\n---\n')}`,
            forUser: `Search complete for "${args.query}".`,
            silent: false
        };
    } catch (error: any) {
        return {
            forLLM: `Web search error: ${error.message}`,
            forUser: 'I had trouble searching the web right now.',
            silent: false,
            error
        };
    }
}
