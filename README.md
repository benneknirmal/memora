# Memora — The Private AI Memory Assistant for Mobile

<p align="center">
  <img src="assets/images/icon.png" width="120" alt="Memora Logo" />
</p>

<p align="center">
  <strong>Your personal AI that actually remembers you.</strong><br/>
  An open-source, on-device AI agent framework built with Expo & React Native.
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708">
    <img src="https://img.shields.io/badge/App%20Store-Download-black?logo=apple&logoColor=white" alt="Download on the App Store" />
  </a>
  <a href="https://github.com/benneknirmal/memora/releases"><img src="https://img.shields.io/github/v/release/benneknirmal/memora?label=version&color=7c3aed" alt="Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/built%20with-Expo-000020?logo=expo" alt="Expo" />
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708">
    <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83" alt="Download on the App Store" height="50" />
  </a>
</p>

---

## What is Memora?

Memora is a privacy-first AI assistant designed for mobile. Unlike typical chatbots that "forget" everything once a session ends, Memora features a persistent, on-device memory engine that allows it to learn and recall information about you dynamically.

**📱 [Download the official app on the App Store](https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708)**

This repository contains the **Memora Core Engine** — the exact same agentic loop and memory architecture that powers our production mobile app. We've open-sourced this core to help developers build smarter, more personalized mobile AI experiences.

---

## ✨ Core Pillars

| Pillar | Why it matters |
|---|---|
| 🧠 **Persistent Memory** | Uses a local SQLite database to store and retrieve facts about the user. No more repetitive introductions. |
| 🛡️ **Privacy Centric** | All memories and chat histories stay on your device. Your data is never stored on our servers. |
| 🤖 **Agentic Reasoning** | Built on a multi-step "Think-Act-Observe" loop. The AI can use tools in sequence to solve complex tasks. |
| 🔌 **Provider Agnostic** | Total flexibility. Plug in any OpenAI-compatible API (GPT-4, Groq, local Ollama, etc.). |

---

## 🛠️ Features included

This "Community Edition" includes the full core stack:

- **Semantic Memory**: Save, query, and delete user facts with ease.
- **Web Intelligence**: Search the live web and fetch content from URLs.
- **Real-time Tools**: Live weather forecasting and smart world-clocks.
- **SQLite Storage**: Production-ready local persistence for sessions and messages.
- **Extensible Registry**: Add your own native mobile tools in minutes.

---

## 🏗️ Architecture Overview

The project is structured to be modular and easy to drop into any Expo project:

```
memora/
├── core/
│   ├── Agent.ts              # The "Brain" — manages the reasoning loop & tool calls
│   ├── types.ts              # Type-safe interfaces for tools, LLMs, and messages
│   ├── llm/
│   │   └── OpenAIProvider.ts # Standard implementation for OpenAI-compatible APIs
│   ├── storage/
│   │   └── DatabaseService.ts # Local SQLite engine for history & memory
│   └── tools/
│       ├── ToolRegistry.ts   # Dependency injection for agent capabilities
│       ├── MemoryTool.ts     # Interface for the persistent memory system
│       ├── TimeTool.ts       # Native-ready time & notification management
│       ├── WeatherTool.ts    # Weather integration (Open-Meteo)
│       └── WebFetchTool.ts   # Web search & content extraction
└── app/                      # Reference UI implementation (Expo Router)
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- An API Key (OpenAI, Groq, or a local provider like Ollama)

### 1. Setup

```bash
git clone https://github.com/benneknirmal/memora.git
cd memora
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
EXPO_PUBLIC_OPENAI_API_KEY=your_key_here
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-mini
```

### 3. Launch

```bash
# Push into your simulator/emulator
npx expo run:ios
npx expo run:android
```

---

## 🧠 Using the Memory System

Memora doesn't just store text; it categorizes and manages facts. The internal agent uses three primary functions to handle your data:

- `save_memory`: Stores a fact (e.g., "User likes spicy food").
- `get_memory`: Recalls facts by key or recently updated list.
- `delete_memory`: Cleans up outdated or incorrect information.

**All data is stored in `memora.db` on the device.**

---

## 🔌 Extending with Custom Tools

Adding native capabilities (like Contacts, Calendar, or Location) is simple. Define your tool and register it in the `ToolRegistry`:

```typescript
registry.register(
  {
    type: 'function',
    function: {
      name: 'my_new_tool',
      description: 'Explain what it does to the AI',
      parameters: { ... }
    }
  },
  async (args) => {
    // Your React Native logic here
    return { forLLM: "Result for the AI's next thought" };
  }
);
```

---

## 📖 Design Principles

1. **On-Device First**: We believe the most personal data should never leave the device.
2. **Speed & Reliability**: No complex backend required. Memora runs entirely in the client.
3. **Transparency**: The reasoning loop is visible and debuggable via the `onStatus` callback.
4. **Community Driven**: Build the tools you need, and share them with others.

---

## 🤝 Contributing & License

We welcome contributions! Please feel free to open issues or submit pull requests to make Memora's core even better.

**License**: MIT — Use it for personal projects or commercial apps. See [LICENSE](LICENSE).

---

<p align="center">
  Built with ❤️ for the mobile AI community.<br/>
  <strong>📱 [Download the full experience on the App Store](https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708)</strong>
</p>
