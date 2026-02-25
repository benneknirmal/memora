# Memora — The AI Assistant That Actually Remembers You. 🧠✨

<p align="center">
  <img src="assets/images/icon.png" width="160" alt="Memora Logo" />
</p>

<p align="center">
  <strong>Stop repeating yourself to AI.</strong><br/>
  An open-source, local-first AI agent that gives your LLM an infinite, persistent memory.
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708">
    <img src="https://img.shields.io/badge/App%20Store-Download-black?logo=apple&logoColor=white" alt="Download on the App Store" />
  </a>
  <a href="https://github.com/benneknirmal/memora"><img src="https://img.shields.io/github/stars/benneknirmal/memora?style=social" alt="Stars" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/built%20with-Expo-000020?logo=expo" alt="Expo" />
</p>

---

## 🛑 The Problem: The "Context Window Wall"

I use ChatGPT, Claude, and Gemini every day. They are brilliant, but they all have the same fatal flaw: **They are goldfish.**

Even with "10 million token" context windows, the AI eventually forgets. If I told it my favorite coffee order three days ago, it's gone. If I want to find a book recommendation from last month, I have to scroll through dozens of chats or copy-paste my life back into the prompt. 

**I was tired of:**
1. **Repeating myself** every few hours or days.
2. **Context degradation** — the more you talk, the more the AI gets "confused" or misses details.
3. **App Switching** — going from AI to Calendar to Weather to Maps. It's high-friction and wastes time.

So, I built **Memora**.

---

## 🔥 What is Memora?

Memora is a personal AI assistant for mobile that **ends the cycle of forgetfulness**. It’s not just a chatbot; it’s an **agentic memory engine**. It stores years of data locally on your device and retrieves exactly what it needs, when it needs it.

### 🌐 Zero Servers. Total Privacy.
The most common question: *"Are you storing my data on your servers?"*
**Simple answer: No.** 

Memora stores everything locally in a high-performance SQLite database on your device. We don't have a database "in the cloud" for your personal life. You own your data. You choose your LLM provider (OpenAI, Groq, or even a local model). 

---

## 🧠 The Technical "Magic": How it remembers years of data

You might wonder: *How can an AI find one specific detail from 2 years ago without hitting a context window limit?*

### 1. Semantic Search (RAG)
When you talk to Memora, it doesn't just send the whole chat history to the LLM. Instead, it uses **Retrieval-Augmented Generation (RAG)**. 
- Every memory and important message is converted into a **vector embedding** (a mathematical map of the meaning).
- Using **local Cosine Similarity**, Memora scans your entire history in milliseconds to find the most relevant "memory snippets."

### 2. The Local Database
While the "thinking" happens in the cloud (or via your chosen provider), the **knowledge library** lives in your pocket. Memora only sends the *relevant* memories to the AI's short-term context window. 

**Result:** An "Infinite Context Window" that never gets slow or confused.

---

## 🚀 What can Memora actually do?

Memora is built for the real world. Here are some examples of what it handles daily:

*   **🍴 Infinite Recall**: *"What did we eat last Christmas?"* — Memora recalls exact details from your past conversations.
*   **⏰ Productivity Multi-Tool**: *"Set a 25 min timer and check my calendar."* — Manage your daily schedule via local tools.
*   **✉️ Action-Oriented**: *"Tell mom that I'm nearly home."* — Hands-free messaging and direct actions.
*   **📍 Location Aware**: *"Remind me when I'm at the store to buy eggs."* — Local alerts for your daily errands.
*   **🌦️ Smart Reasoning**: *"Check today's weather; if it's bad, tell Mike hiking is cancelled."* — Multi-step reasoning based on live data.
*   **📸 Vision Intelligence**: *"What kind of plant is this?"* — Identify objects and get info using your camera.
*   **💰 Local Audit**: *"How much did I spend on coffee this week?"* — Securely audit your local financial and expense data.
*   **🌍 Direct Web Action**: *"Find a nearby hotel and call them for a room."* — Smart web search integrated with direct actions.
*   **📚 Personal Librarian**: *"What was that book Mike said I should read?"* — Infinite recall of recommendations from old chats.
*   **🚗 Intelligent Routing**: *"Fastest way home before the rain starts."* — Intelligent routing using live weather and traffic.
*   **💡 Knowledge Synthesis**: *"Based on all the research papers I read last month, what's the common theme?"*
*   **🤝 Networking**: *"Who was that developer I met at the conference who worked on React Native?"*
*   **🎁 Gift Ideas**: *"What did my wife say she wanted for her birthday back in July?"*

---

## 🛠️ The "Infinite Context" Tech Stack

How does it work without a $1,000/mo server bill?

1.  **Local SQLite + Vector Search**: Every time you talk, Memora creates a vector embedding of your message. It then performs a high-speed local search across years of logs and memories.
2.  **Smart Retrieval (RAG)**: Only the *most relevant* pieces of information are injected into the LLM's current "thought process."
3.  **Autonomous Agent Loop**: The agent doesn't just guess. It acts. It can check the weather, then search its memory, then set a timer — all in one go.

### "Does it send my data to your servers?"
**Never.** Your data is stored in a `memora.db` file on your phone's local storage. The "AI processing" happens directly between your phone and your chosen provider (OpenAI, Groq, etc.). There is no "Memora Cloud" middleman.

---

## 🏗️ Technical Architecture

```
memora/
├── core/
│   ├── Agent.ts              # Think-Act-Observe loop (autonomous reasoning)
│   ├── types.ts              # Shared interfaces
│   ├── llm/
│   │   └── OpenAIProvider.ts # Pluggable LLM interface
│   ├── storage/
│   │   └── DatabaseService.ts # Local SQLite + Vector Search Logic
│   └── tools/
│       ├── MemoryTool.ts     # The RAG memory interface
│       ├── WebFetchTool.ts   # Live web search & crawling
│       └── ...               # Weather, Time, and more.
└── app/                      # Expo / React Native UI
```

---

## 🚀 Quick Start (Build Your Own)

Memora is open-source because we believe everyone should have a private AI assistant they can trust.

### 1. Clone & Install
```bash
git clone https://github.com/benneknirmal/memora.git
cd memora
npm install
```

### 2. Set your keys
Create a `.env` file:
```env
EXPO_PUBLIC_OPENAI_API_KEY=your_key
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-mini
```

### 3. Run
```bash
npx expo run:ios # or android
```

---

## 📱 Download the Production App

The full Memora experience with advanced native tools (Contact access, Calendar sync, and high-quality UI) is available now on the App Store.

**[Download Memora on the App Store](https://apps.apple.com/us/app/memora-private-ai-assistant/id6759516708)**

---

## 🤝 Roadmap & Vision

We are just getting started. The goal is to make Memora the ultimate **Local OS for your life**.
- [ ] Local Llama integration (Fully offline reasoning)
- [ ] Improved semantic clustering for memories
- [ ] More native hooks (HealthKit, HomeKit)
- [ ] Community tool registry

**If this mission sounds exciting to you, please ⭐ the repo and join the community!**

---

<p align="center">
  Built with ❤️ for a more private, permanent AI.<br/>
  <strong>benneknirmal</strong>
</p>
