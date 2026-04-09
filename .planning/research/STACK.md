# Technology Stack

**Project:** Second Brain - Automated Browsing Capture & AI Curation
**Researched:** 2026-04-09
**Confidence:** HIGH

## Executive Summary

This stack prioritizes **TypeScript + Node.js** for the backend, **WXT** for browser extension development, and **native messaging** for extension-to-backend communication. The architecture uses **SQLite** for local storage, swappable LLM providers via **Anthropic SDK + Ollama**, and generates Obsidian-compatible markdown files. All choices prioritize macOS compatibility, developer experience, and privacy flexibility.

---

## Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **TypeScript** | ^5.5 | Type-safe development across browser extension and backend | Industry standard for 2026. Catches errors at compile time, provides autocomplete, and enables typed message passing between extension components. Zod handles runtime validation. |
| **Node.js** | ^20 LTS | Backend runtime for processing and AI curation | Best ecosystem for file operations, native messaging hosts, and TypeScript tooling. Faster iteration than Python for this use case. Runs on macOS without additional dependencies. |
| **WXT** | ^0.20 | Browser extension framework (Manifest V3) | Market leader for 2026. Vite-based HMR provides instant feedback. Handles Chrome + Comet (Chromium-based) with single codebase. 43% smaller bundles than alternatives. Framework-agnostic — can use vanilla JS or add React later if needed. |

**Rationale:** TypeScript + Node.js + WXT provides the fastest development cycle with best-in-class tooling. WXT abstracts Manifest V3 complexity and provides hot module reloading — critical for extension development.

---

## Browser Extension Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **WXT** | ^0.20 | Extension framework | Handles Manifest V3 boilerplate, provides dev mode with HMR, auto-generates manifest, simplifies cross-browser compatibility. |
| **webextension-polyfill** | ^0.12 | Cross-browser API compatibility | Mozilla's official polyfill. Makes Chrome APIs work in both Chrome and Comet. Provides Promise-based API instead of callbacks. Battle-tested. |
| **Chrome APIs** | MV3 | Browser integration | `tabs`, `history`, `webNavigation` for passive capture. Native messaging for backend communication. |

**Key Permissions Required:**
- `tabs` — Read URL, title, favIconUrl
- `history` — Fallback for when extension isn't running
- `webNavigation` — Track page loads and navigation events
- `nativeMessaging` — Communicate with local Node.js backend

**Installation:**
```bash
npm install -D wxt
npm install webextension-polyfill
npm install -D @types/webextension-polyfill
```

**Why NOT Plasmo:** Larger bundles (~800KB vs ~400KB), less flexible, vendor lock-in concerns.

**Comet Compatibility:** Comet is Chromium-based. Chrome extensions from Chrome Web Store work natively. Exception: extensions that modify new tab page are blocked.

---

## Backend Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **TypeScript** | ^5.5 | Type-safe backend code | Same language as extension = shared types. Runtime safety with Zod. |
| **better-sqlite3** | ^12.8 | Local database for browsing history | 2x faster than node-sqlite3. Synchronous API is simpler and more performant for local use. Native bindings, no network latency. Perfect for metadata-only storage. |
| **Zod** | ^4.3 | Runtime schema validation | TypeScript provides compile-time types, Zod validates runtime data. 20M weekly downloads. Essential for validating data from browser extension and LLM responses. |
| **fs-extra** | ^11.3 | File system operations | Promise-based API. Methods like `ensureDir`, `copy`, `remove` not in native `fs`. Graceful-fs prevents EMFILE errors. |
| **gray-matter** | ^4.0 | Markdown frontmatter parsing | Battle-tested by Gatsby, Astro, VitePress. Reads/writes YAML frontmatter for Obsidian compatibility. Handles edge cases better than regex. |
| **dotenv** | ^17.4 | Environment variable management | Load API keys and config from `.env`. Standard across Node.js ecosystem. Keep secrets out of git. |

**Installation:**
```bash
npm install better-sqlite3 zod fs-extra gray-matter dotenv
npm install -D @types/better-sqlite3 @types/fs-extra
```

**Why SQLite over JSON files:** Queryable, handles concurrency, indexes for fast lookups, supports relational data (future: link visits to vault notes).

**Why better-sqlite3 over node-sqlite3:** Synchronous API is faster and simpler. No callback hell. Achieves 2000+ queries/sec on indexed tables.

---

## AI Curation Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Anthropic SDK** | ^0.86 | Claude API client (default LLM) | Official TypeScript SDK. Streaming support, automatic retries, type-safe. Claude Opus 4.6 / Sonnet 4.6 recommended for curation tasks (large context windows, good at summarization). |
| **Ollama** | ^0.6 | Local LLM provider (privacy option) | Node.js client for Ollama. Enables swappable provider architecture. Zero-cost inference for users who want privacy. |
| **Zod** | ^4.3 | LLM response validation | Validate structured outputs from LLMs. Prevents malformed responses from breaking the system. |

**Swappable Provider Pattern:**
```typescript
interface LLMProvider {
  generateCuration(history: BrowsingHistory[]): Promise<CuratedSummary>
}

class ClaudeProvider implements LLMProvider { /* ... */ }
class OllamaProvider implements LLMProvider { /* ... */ }

// User configures in .env: LLM_PROVIDER=claude|ollama
const provider = getProvider(process.env.LLM_PROVIDER)
```

**Installation:**
```bash
npm install @anthropic-ai/sdk ollama
```

**Why swappable providers:** Privacy flexibility. Power users can run local models (Llama 3.3, Qwen, etc.). Default users get Claude's quality. No vendor lock-in.

**Why NOT LangChain:** Overkill for this use case. Adds complexity and bundle size. Direct SDK calls are simpler and more maintainable for single-provider swapping.

---

## Native Messaging (Extension ↔ Backend)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Chrome Native Messaging** | Built-in | Bridge between extension and Node.js | Standard protocol. Chrome starts native host (Node.js script), communicates via stdin/stdout using JSON messages (max 1MB response, 4GB request). |
| **chrome-native-messaging** | ^1.0 | Node.js transform streams | Handles Chrome's message format (32-bit length prefix + JSON). Simplifies native messaging host implementation. |

**How it works:**
1. Extension sends message via `chrome.runtime.sendNativeMessage()`
2. Chrome launches Node.js script (defined in native host manifest)
3. Node.js receives JSON via stdin, processes, responds via stdout
4. Extension receives response

**Native Host Manifest (macOS):**
```json
{
  "name": "com.gcg.second_brain",
  "description": "Second Brain Native Messaging Host",
  "path": "/Users/ggiannon/Documents/gcg/second-brain/backend/native-host.js",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://[EXTENSION_ID]/"
  ]
}
```

Installed to: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.gcg.second_brain.json`

**Installation:**
```bash
npm install chrome-native-messaging
```

**Why native messaging over HTTP server:** Simpler. No port conflicts, no CORS, no authentication. Chrome manages lifecycle. Perfect for local-only communication.

---

## File System Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Obsidian Markdown** | N/A (format) | Output format for daily logs | User's vault is already Obsidian. Use `[[wikilinks]]`, YAML frontmatter, standard markdown. |
| **fs-extra** | ^11.3 | File operations | Promise-based. Ensures directories exist. Atomic writes to prevent corruption. |
| **gray-matter** | ^4.0 | Frontmatter handling | Parse existing notes to extract wikilink targets. Generate frontmatter for daily pages. |

**File Structure:**
```
/Users/ggiannon/Documents/gcg/second-brain/
├── Daily/
│   └── 2026-04-09.md  # Generated daily log
├── Topics/
│   └── Reinforcement Learning.md  # Existing notes (for wikilink matching)
└── .planning/
    └── browsing.db  # SQLite database (metadata only)
```

**Daily Page Template:**
```markdown
---
date: 2026-04-09
type: daily-log
generated: true
---

# Daily Browsing Log - April 9, 2026

## AI Curation Summary

You explored **4 reinforcement learning papers** and **2 blog posts on transformer architecture**.

### Recommended Reading
- [[Reinforcement Learning]] - 3 arxiv papers found
- [[Transformers]] - 2 technical blog posts

### Unread Queue
- [Title](URL) - opened at 2:34pm, not visited

---

## Raw Timeline

**14:23** - [Paper Title](https://arxiv.org/...) - arxiv.org
**14:45** - [Blog Post](https://example.com) - example.com
```

**Wikilink Auto-Matching:**
- Scan existing vault for note titles
- LLM identifies topics in browsing data
- Generate `[[Note Title]]` when topic matches existing note
- Fallback: plain text if no match

---

## Scheduling & Automation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **launchd** | Built-in macOS | Schedule end-of-day curation | macOS standard. Better than cron for laptops — runs missed jobs on wake. More reliable permissions integration. |
| **Node.js script** | N/A | Curation runner | Single entry point: `npm run curate`. Reads from SQLite, calls LLM, writes markdown. |

**launchd plist (`~/Library/LaunchAgents/com.gcg.second-brain.plist`):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gcg.second-brain</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/ggiannon/Documents/gcg/second-brain/backend/curate.js</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>23</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/ggiannon/Documents/gcg/second-brain/.planning/curation.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/ggiannon/Documents/gcg/second-brain/.planning/curation.err</string>
</dict>
</plist>
```

**Load agent:**
```bash
launchctl load ~/Library/LaunchAgents/com.gcg.second-brain.plist
```

**Why launchd over cron:** Runs missed jobs on wake (critical for laptops). Better macOS permissions integration. Shows in System Settings → Login Items. More reliable.

---

## Testing Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vitest** | ^4.1 | Test framework | Vite-native. 5x faster than Jest. Browser mode (stable in v4.0) for testing extension code in real browsers. TypeScript support out of the box. |
| **@vitest/browser-playwright** | Latest | Browser testing provider | Run extension tests in real Chrome/Chromium. More accurate than jsdom for extension APIs. |

**Installation:**
```bash
npm install -D vitest @vitest/browser-playwright
```

**Test structure:**
```
tests/
├── extension/
│   ├── capture.test.ts  # Test tab/history capture
│   └── messaging.test.ts  # Test native messaging
├── backend/
│   ├── database.test.ts  # Test SQLite operations
│   ├── curation.test.ts  # Test LLM integration
│   └── markdown.test.ts  # Test file generation
└── integration/
    └── end-to-end.test.ts  # Full flow: capture → process → generate
```

**Why Vitest over Jest:** Browser mode is first-class. Faster. Vite ecosystem alignment (WXT uses Vite). TypeScript works without configuration.

---

## Development Tools

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **VS Code** | Latest | IDE | Best TypeScript support. Extension debugging built-in. Free. |
| **gws** | Installed | Gmail integration | Already available. Used for morning email digest. Handles OAuth via system keyring. |
| **Chrome DevTools** | Built-in | Extension debugging | Inspect background service worker, content scripts, native messaging. Essential for development. |

**VS Code Extensions:**
- **Vitest** (vitest.explorer) — Run tests in sidebar
- **TypeScript Vue Plugin (Volar)** — Better TS support
- **WXT Intellisense** — If available

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Extension Framework | WXT | Plasmo | Larger bundles (800KB vs 400KB), less flexible, vendor lock-in |
| Extension Framework | WXT | Extension.js | Less mature, smaller ecosystem, fewer examples |
| Extension Framework | WXT | Raw Manifest V3 | Too much boilerplate, no HMR, error-prone |
| Backend Language | Node.js + TypeScript | Python | Worse native messaging story, slower iteration, separate type systems |
| Database | SQLite (better-sqlite3) | PostgreSQL | Overkill for local metadata, requires server, adds complexity |
| Database | SQLite (better-sqlite3) | JSON files | No queries, no indexes, concurrency issues, slow at scale |
| Database | better-sqlite3 | node-sqlite3 | Async API is slower, callback hell, worse DX |
| LLM Framework | Direct SDKs | LangChain | Overkill for simple provider swapping, large bundle, complexity |
| LLM Framework | Direct SDKs | LlamaIndex | RAG-focused, not needed for this use case |
| Testing | Vitest | Jest | Slower, no native browser mode, requires more config |
| File Parsing | gray-matter | Custom regex | Fragile, doesn't handle edge cases, reinventing the wheel |
| Scheduling | launchd | cron | Doesn't run missed jobs on wake, worse permissions on modern macOS |
| Communication | Native Messaging | HTTP server | Port conflicts, CORS, authentication complexity, unnecessary |

---

## Installation Summary

### Extension
```bash
npm init -y
npm install -D wxt
npm install webextension-polyfill
npm install -D @types/webextension-polyfill
```

### Backend
```bash
npm install better-sqlite3 @anthropic-ai/sdk ollama zod fs-extra gray-matter dotenv chrome-native-messaging
npm install -D @types/better-sqlite3 @types/fs-extra @types/node typescript
```

### Development
```bash
npm install -D vitest @vitest/browser-playwright
```

### Scripts (package.json)
```json
{
  "scripts": {
    "dev:extension": "wxt",
    "build:extension": "wxt build",
    "dev:backend": "tsx watch backend/native-host.ts",
    "curate": "node backend/curate.js",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Dependency Graph

```
Browser Extension (WXT + TypeScript)
    ↓
Chrome Native Messaging
    ↓
Node.js Backend (TypeScript)
    ↓
    ├─→ SQLite (better-sqlite3) → Browse history storage
    ├─→ LLM Provider (Anthropic/Ollama) → AI curation
    └─→ File System (fs-extra + gray-matter) → Obsidian markdown
        ↓
    Daily log in vault (2026-04-09.md)
```

---

## Environment Variables

Create `.env` in project root:

```bash
# LLM Provider Configuration
LLM_PROVIDER=claude  # or 'ollama'
ANTHROPIC_API_KEY=sk-ant-...  # Required if LLM_PROVIDER=claude
OLLAMA_HOST=http://localhost:11434  # Required if LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.3  # Model to use with Ollama

# Paths
VAULT_PATH=/Users/ggiannon/Documents/gcg/second-brain
DATABASE_PATH=/Users/ggiannon/Documents/gcg/second-brain/.planning/browsing.db

# Email Digest (optional)
SEND_EMAIL_DIGEST=true
EMAIL_RECIPIENT=user@example.com
```

**Never commit `.env` to git.** Add to `.gitignore`.

---

## Confidence Assessment

| Component | Confidence | Rationale |
|-----------|------------|-----------|
| Browser Extension Stack | **HIGH** | WXT is market leader for 2026. Manifest V3 is mandatory. Chrome + Comet both Chromium-based. Verified via official docs. |
| Backend Stack | **HIGH** | TypeScript + Node.js is industry standard. better-sqlite3 is battle-tested. All libraries actively maintained. |
| AI Curation Layer | **HIGH** | Anthropic SDK is official, well-documented. Ollama is standard for local LLMs. Swappable pattern is proven. |
| Native Messaging | **HIGH** | Chrome's standard protocol. Documented in official Chrome docs. Multiple npm packages available. |
| File System Integration | **HIGH** | Obsidian markdown format is well-defined. gray-matter is used by major static site generators. |
| Scheduling | **HIGH** | launchd is macOS standard. Documented in Apple developer docs. Preferred over cron for laptops. |
| Testing | **HIGH** | Vitest 4.0 has stable browser mode. Verified via official release notes and developer blogs. |

**Overall Stack Confidence: HIGH**

All recommendations are based on current (2026) documentation, verified versions, and established best practices. No deprecated technologies. All choices prioritize macOS compatibility, developer experience, and the specific requirements of this project.

---

## Sources

### Browser Extension Development
- [Chrome Extensions - What's New](https://developer.chrome.com/docs/extensions/whats-new)
- [Building Chrome Extensions in 2026: Manifest V3 Guide](https://dev.to/ryu0705/building-chrome-extensions-in-2026-a-practical-guide-with-manifest-v3-12h2)
- [Chrome Extension Best Practices 2026](https://extensionbooster.com/blog/best-practices-build-browser-extension/)
- [WXT Framework](https://wxt.dev/)
- [Comet Browser Extension Compatibility](https://comet-help.perplexity.ai/en/articles/11734716-extensions)

### Native Messaging
- [Chrome Native Messaging Docs](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [MDN Native Messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)

### AI/LLM Integration
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Claude API Docs](https://platform.claude.com/docs/en/api/client-sdks)
- [Ollama Documentation](https://docs.ollama.com/integrations/claude-code)
- [LangChain vs LlamaIndex 2026](https://www.morphllm.com/comparisons/langchain-vs-llamaindex)

### Database & Storage
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3)
- [Understanding Better-SQLite3](https://dev.to/lovestaco/understanding-better-sqlite3-the-fastest-sqlite-library-for-nodejs-4n8)

### Testing
- [Vitest in 2026](https://dev.to/ottoaria/vitest-in-2026-the-testing-framework-that-makes-you-actually-want-to-write-tests-kap)
- [Vitest 4.0 Browser Mode](https://www.infoq.com/news/2025/12/vitest-4-browser-mode/)

### macOS Automation
- [Scheduling Jobs with launchd](https://blog.serghei.pl/posts/scheduling-recurring-tasks-on-macos-using-launchd/)
- [Apple Developer: Scheduling Timed Jobs](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/ScheduledJobs.html)

### Obsidian Integration
- [obsidian-wiki GitHub](https://github.com/Ar9av/obsidian-wiki)
- [Obsidian Skills by kepano](https://github.com/kepano/obsidian-skills)
- [gray-matter npm](https://www.npmjs.com/package/gray-matter)

### TypeScript & Tooling
- [Best TypeScript Backend Frameworks 2026](https://encore.dev/articles/best-typescript-backend-frameworks)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Environment Variables with dotenv 2026](https://configu.com/blog/dotenv-typescript-the-basics-and-a-quick-tutorial/)
