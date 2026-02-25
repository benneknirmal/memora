# Memora — AI Memory Assistant for Mobile

<p align="center">
  <img src="assets/images/icon.png" width="120" alt="Memora Logo" />
</p>

<p align="center">
  <strong>Your personal AI that actually remembers you.</strong><br/>
  An open-source mobile AI assistant built with Expo & React Native,<br/>powered by the OpenClaw agentic framework.
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708">
    <img src="https://img.shields.io/badge/App%20Store-Download-black?logo=apple&logoColor=white" alt="Download on the App Store" />
  </a>
  <a href="https://github.com/openclaw/memora/releases"><img src="https://img.shields.io/github/v/release/openclaw/memora?label=version&color=7c3aed" alt="Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/built%20with-Expo-000020?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/powered%20by-OpenClaw-7c3aed" alt="OpenClaw" />
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708">
    <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83" alt="Download on the App Store" height="50" />
  </a>
</p>

---

## What is Memora?

Memora is the **mobile version of [OpenClaw](https://github.com/openclaw)** — an agentic AI framework that's currently trending on GitHub. While OpenClaw is a full-featured desktop/server agent, Memora brings a focused, privacy-first AI assistant to your phone.

**📱 [Download Memora on the App Store](https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708)**

> **Why open source only part of it?**
> We believe in giving back to the community. This repo shares Memora's **core intelligence** — the memory engine, the agent loop, and a few useful tools — so you can learn from it, build on it, or integrate it into your own mobile app.
> The full production app (with premium UI, subscriptions, and advanced native tools) is available on the [App Store](https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708).

---

## ✨ Features in This Repo

This is a **curated, community version** of Memora. It includes:

| Feature | Description |
|---|---|
| 🧠 **Memory Engine** | SQLite-backed persistent long-term memory. Save, retrieve, and delete facts about the user. |
| 🤖 **Agent Loop** | The core agentic reasoning loop — handles multi-step tool calling with any OpenAI-compatible LLM. |
| 🔌 **LLM Provider** | A clean `LLMProvider` interface + OpenAI implementation. Swap in any provider. |
| 🌐 **Web Search & Fetch** | Let the AI search the web (DuckDuckGo) and read page content. |
| ⛅ **Weather Tool** | Get real-time weather for any city using the free Open-Meteo API. No API key needed. |
| ⏱️ **Time Tool** | World clocks, timer setting via push notification, time calculations. |
| 🗄️ **Database Service** | Full SQLite-backed session + message persistence with semantic search support. |

---

## 🏗️ Architecture Overview

```
memora/
├── core/
│   ├── Agent.ts              # Main agentic loop (tool calling, history management)
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── llm/
│   │   └── OpenAIProvider.ts # OpenAI-compatible LLM provider
│   ├── storage/
│   │   └── DatabaseService.ts # SQLite session, message & memory storage
│   └── tools/
│       ├── ToolRegistry.ts   # Tool registration & execution dispatcher
│       ├── MemoryTool.ts     # save_memory / get_memory / delete_memory
│       ├── TimeTool.ts       # manage_time (world clocks, timers)
│       ├── WeatherTool.ts    # get_weather (via Open-Meteo, free & no API key)
│       └── WebFetchTool.ts   # web_search & web_fetch
└── app/                      # Expo Router app screens (entry points)
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- An OpenAI (or compatible) API key

### 1. Clone the repo

```bash
git clone https://github.com/openclaw/memora.git
cd memora
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your API key

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-key-here...
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-mini
```

> ⚠️ **Never commit your `.env` file.** It is already in `.gitignore`.

### 4. Run the app

```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android

# Expo Go (limited native features)
npx expo start
```

---

## 🧠 Memory System

Memora's memory system is what makes it feel genuinely personal. The AI can call three tools:

| Tool | Description |
|---|---|
| `save_memory` | Persist a key-value fact (e.g., `user_name → "Alex"`) |
| `get_memory` | Recall a specific fact or list recent memories |
| `delete_memory` | Remove a fact by key |

All memory is stored **locally on-device** in SQLite. Nothing is sent to any server except your LLM provider.

```typescript
// Example: how the agent saves memory
// When user says "My name is Alex", the AI calls:
save_memory({ key: "user_name", content: "Alex" })

// Later, when user asks "What's my name?", the AI calls:
get_memory({ key: "user_name" })
// Returns: "Alex"
```

---

## 🔌 Adding Your Own Tools

The `ToolRegistry` makes it simple to extend Memora with new capabilities:

```typescript
import { ToolRegistry } from './core/tools/ToolRegistry';

const registry = new ToolRegistry();

// Register a custom tool
registry.register(
  {
    type: 'function',
    function: {
      name: 'my_custom_tool',
      description: 'Does something awesome',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'The input to process' }
        },
        required: ['input']
      }
    }
  },
  async (args) => {
    // Your tool logic here
    return {
      forLLM: `Result: ${args.input}`,
      forUser: `Done! I processed: ${args.input}`,
      silent: false
    };
  }
);
```

---

## 🌐 Swapping the LLM Provider

Memora uses a clean `LLMProvider` interface. You can swap in any compatible provider:

```typescript
// Use OpenAI
const provider = new OpenAIProvider({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY!,
  model: 'gpt-4o-mini'
});

// Use a local Ollama instance
const provider = new OpenAIProvider({
  apiKey: 'ollama',
  baseURL: 'http://localhost:11434/v1',
  model: 'llama3'
});

// Use any OpenAI-compatible API (Groq, Together, etc.)
const provider = new OpenAIProvider({
  apiKey: 'your-groq-key',
  baseURL: 'https://api.groq.com/openai/v1',
  model: 'llama-3.3-70b-versatile'
});
```

---

## 🛠️ Included Tools

### `MemoryTool` — Persistent Memory
- **`save_memory(key, content)`** — Store a fact permanently
- **`get_memory(key?)`** — Retrieve a specific or recent facts
- **`delete_memory(key)`** — Forget a stored fact

### `TimeTool` — Time & Timers
- **`get_world_time(location)`** — Current time in any city
- **`set_timer(hours, minutes, seconds, message)`** — Push notification timer

### `WeatherTool` — Real-time Weather
- **`get_weather(location?)`** — Current weather + forecast via [Open-Meteo](https://open-meteo.com/) (free, no key needed)

### `WebFetchTool` — Web Access
- **`web_search(query)`** — Search the web via DuckDuckGo
- **`web_fetch(url)`** — Read the contents of any URL

---

## 📖 Key Design Principles

1. **Privacy first** — All data stays on-device. Memory, chat history, and app settings are stored locally in SQLite and AsyncStorage.
2. **Bring your own key** — You connect Memora to your own LLM provider. No middleman, no data sharing.
3. **Tool-first architecture** — The agent loop is designed around OpenAI-style function calling, making it easy to add, remove, or modify capabilities.
4. **Provider agnostic** — Swap out OpenAI for any compatible API with one config change.

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, a new tool, or documentation improvements:

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/my-new-tool`)
3. Commit your changes (`git commit -m 'feat: add my new tool'`)
4. Push to the branch (`git push origin feat/my-new-tool`)
5. Open a Pull Request

Please check [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Related Projects

- **[Memora on the App Store](https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708)** — The full production app with premium UI and advanced native tools
- **[OpenClaw](https://github.com/openclaw)** — The full desktop/server agentic framework that powers Memora
- **[Open-Meteo](https://open-meteo.com/)** — Free weather API used by the WeatherTool

---

<p align="center">
  Built with ❤️ by the OpenClaw team.<br/>
  <em>If you find this useful, please ⭐ the repo!</em><br/><br/>
  <a href="https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708">
    <strong>📱 Download Memora on the App Store →</strong>
  </a>
</p>
