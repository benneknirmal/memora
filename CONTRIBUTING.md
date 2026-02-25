# Contributing to Memora

Thank you for your interest in contributing! Here's how to get involved.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally: `git clone https://github.com/YOUR_USERNAME/memora.git`
3. **Install** dependencies: `npm install`
4. **Create** a branch: `git checkout -b feat/your-feature-name`

## What We Welcome

- 🐛 **Bug fixes** — If you find an issue, open a PR!
- 🔧 **New tools** — Add new capabilities to the `core/tools/` directory. Follow the existing pattern.
- 📖 **Documentation** — Improvements to README, code comments, or examples.
- ✅ **Tests** — Help us improve test coverage.

## Tool Contribution Guidelines

When adding a new tool to `core/tools/`:

1. Create a new file named `YourTool.ts`
2. Export a `ToolDefinition` object (following OpenAI function calling format)
3. Export an executor function that takes typed args and returns `Promise<ToolResult>`
4. Register it in your app's `ToolRegistry`
5. Add documentation to the README

```typescript
// core/tools/MyNewTool.ts
import { ToolDefinition, ToolResult } from '../types';

export const MyNewToolDefinition: ToolDefinition = {
    type: 'function',
    function: {
        name: 'my_new_tool',
        description: 'Clear description of what this tool does.',
        parameters: {
            type: 'object',
            properties: {
                // Define your parameters here
            },
            required: []
        }
    }
};

export async function executeMyNewTool(args: any): Promise<ToolResult> {
    // Your implementation
    return {
        forLLM: 'Result for the AI to process',
        forUser: 'Human-friendly message',
        silent: false
    };
}
```

## Code Style

- TypeScript with strict mode enabled
- Clear, descriptive variable names
- Comment anything non-obvious

## Pull Request Process

1. Ensure your code works with `npx expo start`
2. Update the README if you've added new tools or changed behavior
3. Open a Pull Request with a clear description of what you changed and why

## Code of Conduct

Be respectful. We're building something useful together.
