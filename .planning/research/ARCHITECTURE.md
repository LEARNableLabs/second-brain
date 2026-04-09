# Architecture Research

**Domain:** Automated browsing capture + AI curation system
**Researched:** 2026-04-09
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Extension Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │  Service   │  │  Content   │  │  Storage   │                 │
│  │  Worker    │  │  Script    │  │  Manager   │                 │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘                 │
│         │               │               │                        │
│         └───────────────┴───────────────┘                        │
│                         ↓                                        │
├─────────────────────────────────────────────────────────────────┤
│                   Local Storage Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐      │
│  │  OPFS + SQLite (browsing metadata buffer)             │      │
│  └───────────────────────────────────────────────────────┘      │
│                         ↓                                        │
├─────────────────────────────────────────────────────────────────┤
│                 Batch Processing Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ launchd │→│ Exporter│→│   LLM   │→│ Markdown│            │
│  │ Agent   │  │ Script  │  │ Curator │  │Generator│            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                         ↓                                        │
├─────────────────────────────────────────────────────────────────┤
│                  Obsidian Vault Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ Daily Notes  │  │ Wikilink     │                             │
│  │ (raw log)    │  │ Matcher      │                             │
│  └──────────────┘  └──────────────┘                             │
│                         ↓                                        │
├─────────────────────────────────────────────────────────────────┤
│                    Email Layer (Optional)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ gws CLI      │→│ Gmail API    │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Browser Extension - Service Worker** | Event-driven background processing, history API monitoring, blocklist filtering | JavaScript service worker (MV3), terminates when idle |
| **Browser Extension - Content Script** | Captures page metadata (title, URL, timestamp) from active tabs | Injected JavaScript on tab navigation |
| **Browser Extension - Storage Manager** | Buffers captured data locally, handles OPFS/SQLite writes | WebAssembly SQLite with OPFS backend |
| **Batch Exporter** | Reads accumulated browsing data from extension storage, exports to JSON/CSV | Node.js or Python script triggered by launchd |
| **LLM Curator** | Topic clustering, unread queue detection, highlights extraction | Claude API (default) or Ollama/llama.cpp (local) |
| **Markdown Generator** | Converts curated data to Obsidian-flavored markdown with wikilinks | Template-based generation with wikilink matching |
| **Wikilink Matcher** | Scans existing vault for topic matches, generates [[links]] | Fuzzy string matching or vector embedding similarity |
| **Email Digest** | Sends morning summary of curated highlights | gws CLI wrapper for Gmail API |

## Recommended Project Structure

```
second-brain-capture/
├── extension/                  # Browser extension (Chrome + Comet)
│   ├── manifest.json          # MV3 manifest with history permissions
│   ├── background/            # Service worker
│   │   ├── service-worker.js  # Event handlers, history monitoring
│   │   └── blocklist.js       # Domain filtering logic
│   ├── content/               # Content scripts
│   │   └── capture.js         # Page metadata extraction
│   ├── storage/               # Local storage management
│   │   ├── sqlite-wasm.js     # SQLite WebAssembly
│   │   └── db-schema.sql      # Schema for browsing_history table
│   ├── popup/                 # Extension UI (settings, blocklist)
│   │   ├── popup.html
│   │   └── popup.js
│   └── icons/
│
├── processor/                  # Batch processing scripts
│   ├── export-browsing-data.js # Reads from extension DB, outputs JSON
│   ├── curate.js              # LLM-based curation pipeline
│   │   ├── cluster-topics.js  # Topic extraction and grouping
│   │   ├── unread-detector.js # Identifies pages opened but not read
│   │   └── highlight-ranker.js # Prioritizes most relevant items
│   ├── generate-markdown.js   # Obsidian markdown generation
│   │   ├── templates/         # Daily note template
│   │   └── wikilink-matcher.js # Links to existing vault notes
│   └── send-digest.js         # Email via gws CLI
│
├── scheduler/                  # macOS scheduling
│   └── com.gcg.secondbrain.plist  # launchd agent (end-of-day trigger)
│
├── config/                     # Configuration
│   ├── blocklist.json         # Default blocklist (Gmail, search, banking)
│   ├── llm-config.json        # LLM provider settings (Claude/Ollama)
│   └── vault-path.json        # Path to Obsidian vault
│
└── docs/
    ├── INSTALLATION.md
    └── ARCHITECTURE.md
```

### Structure Rationale

- **extension/:** Fully self-contained browser extension following MV3 architecture patterns. Separate folders for service worker, content scripts, and storage management align with MV3's event-driven model.
- **processor/:** Node.js scripts for batch processing. Modular design allows swapping LLM providers (curate.js) or changing output format (generate-markdown.js) without affecting data capture.
- **scheduler/:** launchd agent configuration lives separately for clarity. This is macOS-specific infrastructure.
- **config/:** Centralized configuration makes the system adaptable (different LLM providers, custom blocklists, different vault paths).

## Architectural Patterns

### Pattern 1: Event-Driven Extension Architecture (MV3)

**What:** Chrome Manifest V3 replaces persistent background pages with service workers that terminate when idle and wake on browser events (tab navigation, history changes).

**When to use:** All modern Chrome extensions (MV2 deprecated in 2026). Required for Chrome Web Store submissions and Comet browser compatibility.

**Trade-offs:**
- **Pro:** Better performance and battery life — service workers sleep when not needed
- **Pro:** Enforces cleaner event-driven design
- **Con:** Must reconstruct state from storage on every wakeup
- **Con:** No persistent WebSocket connections or long-running timers

**Example:**
```javascript
// background/service-worker.js
// Service worker wakes on history state changes
chrome.history.onVisited.addListener(async (historyItem) => {
  // Check blocklist
  const blocked = await isBlocked(historyItem.url);
  if (blocked) return;
  
  // Write to OPFS-backed SQLite
  await db.insert('browsing_history', {
    url: historyItem.url,
    title: historyItem.title,
    timestamp: Date.now()
  });
  
  // Service worker terminates after this — state persisted to DB
});
```

### Pattern 2: OPFS-Backed SQLite for Extension Storage

**What:** Origin Private File System (OPFS) + SQLite WebAssembly provides a real relational database in the browser with synchronous I/O, replacing IndexedDB's callback-heavy API.

**When to use:** When extension needs to store structured data (thousands of URLs), perform queries (filter by date range), or export data in batch. Significantly faster than IndexedDB for heavy I/O.

**Trade-offs:**
- **Pro:** Real SQL queries, ACID guarantees, efficient batch operations
- **Pro:** 10-100x faster than IndexedDB for large datasets
- **Con:** Requires WebAssembly (adds ~1MB to extension bundle)
- **Con:** OPFS API is synchronous (must run in Web Worker or service worker)

**Example:**
```javascript
// storage/sqlite-wasm.js
import SQLite from 'wa-sqlite';

// Initialize SQLite with OPFS backend
const db = await SQLite.open('browsing_history.db', {
  vfs: 'opfs' // Origin Private File System
});

// Create table with efficient indexing
await db.exec(`
  CREATE TABLE IF NOT EXISTS browsing_history (
    id INTEGER PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT,
    domain TEXT,
    timestamp INTEGER NOT NULL,
    duration INTEGER DEFAULT 0
  );
  CREATE INDEX idx_timestamp ON browsing_history(timestamp);
  CREATE INDEX idx_domain ON browsing_history(domain);
`);
```

### Pattern 3: LLM-Guided Semantic Clustering (LiSA/PRISM)

**What:** Use LLM to generate candidate topic keywords for each browsing item, then cluster items by semantic similarity in topic space rather than raw text. State-of-the-art approach from 2025-2026 research.

**When to use:** When grouping browsing history by topic (e.g., "4 RL papers today"). More accurate than traditional keyword extraction or TF-IDF.

**Trade-offs:**
- **Pro:** Higher semantic precision — groups conceptually related items even with different terminology
- **Pro:** Human-readable topic labels generated by LLM
- **Con:** Requires LLM API call per document (can batch in practice)
- **Con:** More expensive than traditional clustering (offset by better results)

**Example:**
```javascript
// processor/curate.js
async function clusterByTopic(browsingItems, llmProvider) {
  // Step 1: LLM generates topic keyword for each item
  const topicKeywords = await Promise.all(
    browsingItems.map(item => 
      llmProvider.complete({
        prompt: `Given this webpage title and URL, generate a 2-3 word topic keyword:
                 Title: ${item.title}
                 URL: ${item.url}
                 Topic:`,
        maxTokens: 10
      })
    )
  );
  
  // Step 2: Embed topic keywords (not full text)
  const embeddings = await llmProvider.embed(topicKeywords);
  
  // Step 3: Cluster by semantic similarity in topic space
  const clusters = hdbscan(embeddings, { minClusterSize: 2 });
  
  // Step 4: LLM generates human-readable label per cluster
  const clusterLabels = await Promise.all(
    clusters.map(cluster => 
      llmProvider.complete({
        prompt: `Summarize this topic cluster in 3-5 words:
                 ${cluster.items.map(i => i.topic).join(', ')}`,
        maxTokens: 10
      })
    )
  );
  
  return { clusters, labels: clusterLabels };
}
```

### Pattern 4: launchd Agent for End-of-Day Batch Processing

**What:** macOS launchd agent (not daemon) runs as user agent with access to filesystem and can trigger batch jobs at scheduled times using StartCalendarInterval.

**When to use:** Scheduled tasks on macOS that need user-level permissions (reading/writing to Obsidian vault in ~/Documents). launchd is more reliable than cron for modern macOS.

**Trade-offs:**
- **Pro:** Native macOS service management — survives reboots, logs to system
- **Pro:** Timer coalescing for energy efficiency (10.9+)
- **Pro:** Can specify multiple time intervals (e.g., 9 PM and 11 PM)
- **Con:** macOS-only (not portable to Linux/Windows)
- **Con:** XML plist syntax is verbose

**Example:**
```xml
<!-- scheduler/com.gcg.secondbrain.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" 
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.gcg.secondbrain</string>
  
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/ggiannon/second-brain-capture/processor/export-browsing-data.js</string>
  </array>
  
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>21</integer>  <!-- 9 PM -->
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  
  <key>StandardOutPath</key>
  <string>/tmp/secondbrain.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/secondbrain.err</string>
</dict>
</plist>
```

### Pattern 5: Wikilink Matcher via Vault Indexing

**What:** Pre-index existing vault notes (titles, aliases, headings) and match curated browsing topics against the index to auto-generate [[wikilinks]].

**When to use:** When integrating external data (browsing history) into an existing knowledge graph (Obsidian vault). Bridges new information with existing structure.

**Trade-offs:**
- **Pro:** Automatically connects new discoveries to existing knowledge
- **Pro:** Lightweight — only needs note titles and aliases, not full content
- **Con:** False positives if topic keywords are too generic ("research", "analysis")
- **Con:** Requires vault indexing (can be slow for large vaults)

**Example:**
```javascript
// processor/generate-markdown.js
async function matchWikilinks(topicKeyword, vaultIndex) {
  // Fuzzy match against vault note titles
  const matches = vaultIndex.filter(note => {
    const similarity = stringSimilarity(topicKeyword.toLowerCase(), note.title.toLowerCase());
    return similarity > 0.7; // 70% similarity threshold
  });
  
  if (matches.length === 1) {
    // High confidence — single match
    return `[[${matches[0].title}]]`;
  } else if (matches.length > 1) {
    // Ambiguous — return most similar
    matches.sort((a, b) => b.similarity - a.similarity);
    return `[[${matches[0].title}]]`; // Could flag ambiguity
  }
  
  return topicKeyword; // No match — plain text
}

// Build vault index (run once at startup)
function buildVaultIndex(vaultPath) {
  const notes = glob.sync(`${vaultPath}/**/*.md`);
  return notes.map(notePath => {
    const content = fs.readFileSync(notePath, 'utf8');
    const title = path.basename(notePath, '.md');
    
    // Extract aliases from frontmatter
    const frontmatter = parseFrontmatter(content);
    const aliases = frontmatter?.aliases || [];
    
    return { title, aliases, path: notePath };
  });
}
```

## Data Flow

### Capture Flow (Real-Time)

```
User browses webpage
    ↓
chrome.history.onVisited event fires
    ↓
Service worker wakes up
    ↓
Check blocklist (Gmail, search, banking)
    ↓
If not blocked → Extract metadata (URL, title, domain, timestamp)
    ↓
Write to OPFS-backed SQLite
    ↓
Service worker terminates
```

### Curation Flow (End-of-Day Batch)

```
launchd triggers at 9 PM
    ↓
Exporter script reads SQLite DB from extension storage
    ↓
Export to JSON: [{ url, title, domain, timestamp }, ...]
    ↓
LLM Curator receives JSON
    ↓
Step 1: Generate topic keywords per item (LLM)
    ↓
Step 2: Cluster items by topic similarity (HDBSCAN)
    ↓
Step 3: Detect unread items (duration < 30 seconds)
    ↓
Step 4: Rank highlights (cluster size, topic novelty)
    ↓
Markdown Generator receives curated data
    ↓
Step 5: Match topics to vault notes (wikilink matcher)
    ↓
Step 6: Generate Obsidian markdown (template-based)
    ↓
Write to vault: second-brain/daily/2026-04-09.md
    ↓
Email Digest (optional): gws CLI → Gmail API
```

### State Management

```
Extension Storage (OPFS + SQLite)
    ↓ (daily export)
JSON export → /tmp/browsing-2026-04-09.json
    ↓ (curation)
Curated JSON → /tmp/curated-2026-04-09.json
    ↓ (markdown generation)
Obsidian Markdown → ~/Documents/second-brain/daily/2026-04-09.md
    ↓ (cleanup — optional)
Archive old JSON exports after 7 days
```

### Key Data Flows

1. **Passive capture:** Browser extension monitors `chrome.history.onVisited` events, filters against blocklist, writes metadata to local SQLite. No user action required. Service worker terminates after each write.

2. **Batch curation:** End-of-day script reads accumulated data from extension storage, calls LLM API to cluster by topic and identify highlights, generates Obsidian markdown with wikilinks, writes to vault. Runs once per day via launchd.

3. **Wikilink generation:** Curation script maintains in-memory index of existing vault note titles/aliases, matches curated topics via fuzzy string similarity, inserts `[[wikilinks]]` when confidence > 70%.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-100 URLs/day | Current architecture is sufficient. SQLite handles this easily. LLM API calls < $0.10/day. |
| 100-1000 URLs/day | Batch LLM API calls (10-20 items per prompt) to reduce latency and cost. Consider local LLM (Ollama) for topic extraction. |
| 1000+ URLs/day | This is a red flag — indicates aggressive browsing or blocklist misconfiguration. Revisit blocklist to filter noise. If legitimate, implement sampling (curate top 100 items by duration) rather than processing all. |

### Scaling Priorities

1. **First bottleneck: LLM API cost/latency**
   - **Symptom:** Curation takes > 2 minutes or costs > $1/day
   - **Fix:** Batch prompts (process 10-20 items per API call instead of 1:1), switch to local LLM (Ollama with Llama 3.1 8B) for topic extraction, reserve Claude API for final summarization only

2. **Second bottleneck: Extension storage size**
   - **Symptom:** SQLite DB grows > 100MB, OPFS quota warnings
   - **Fix:** Implement retention policy (keep only last 30 days in extension DB), export to vault is permanent archive, add VACUUM job to launchd agent weekly

3. **Third bottleneck: Vault indexing for wikilink matching**
   - **Symptom:** Wikilink matching takes > 10 seconds on large vaults (1000+ notes)
   - **Fix:** Cache vault index as JSON, rebuild only when vault modified (watch filesystem), use vector embeddings instead of fuzzy string matching for semantic similarity

## Anti-Patterns

### Anti-Pattern 1: Persistent Background Page (MV2 mindset)

**What people do:** Try to maintain long-running state in service worker, assume it stays alive between events.

**Why it's wrong:** MV3 service workers terminate aggressively (after ~30 seconds of inactivity). State stored in memory will be lost. Leads to data loss and unexpected behavior.

**Do this instead:** Treat service worker as stateless. Persist all state to `chrome.storage.local` or OPFS-backed SQLite immediately. On wakeup, reconstruct state from storage. Embrace event-driven architecture.

### Anti-Pattern 2: Real-Time LLM Curation During Browsing

**What people do:** Call LLM API every time user visits a page to immediately classify or summarize.

**Why it's wrong:** Adds latency to browsing (200-500ms API call per page), expensive ($10-50/month for heavy browsing), drains battery, violates "non-intrusive" requirement.

**Do this instead:** Batch processing at end of day. Extension only captures metadata (URL, title, timestamp) — no API calls. LLM runs once per day on accumulated data when user isn't actively browsing.

### Anti-Pattern 3: Full Page Content Archival

**What people do:** Use browser extension to scrape full page HTML/text and store locally or send to LLM for deep analysis.

**Why it's wrong:** Massive storage requirements (100MB+/day), privacy issues (captures sensitive content from banking, email), performance impact (heavy DOM traversal), violates project constraint ("metadata only").

**Do this instead:** Store only URL, title, domain, timestamp. LLM works from these signals plus browsing patterns (duration, clustering). If user needs full content later, they can visit the URL — this is a lightweight capture system, not a web archival tool.

### Anti-Pattern 4: Allowlist Instead of Blocklist

**What people do:** Configure system to only capture explicitly allowed domains.

**Why it's wrong:** High maintenance overhead (must manually add every new research site), defeats "passive capture" goal (user has to think about what to allow), misses serendipitous discoveries (random blog posts, HN links).

**Do this instead:** Default blocklist for known noise (Gmail, Google Search, banking, social media feeds). Capture everything else. User can add to blocklist over time if specific domains are too noisy. Low-friction model matches project goal.

### Anti-Pattern 5: Tag-Based Categorization

**What people do:** Ask LLM to generate tags (`#machinelearning`, `#research`) for categorization.

**Why it's wrong:** Creates parallel taxonomy to existing vault structure (wikilinks), requires manual tag management, doesn't leverage existing knowledge graph, conflicts with "wikilinks over tags" key decision.

**Do this instead:** LLM identifies topics, wikilink matcher finds existing vault notes that match those topics, generates `[[wikilinks]]` to existing structure. If no match, leave as plain text — user can manually create note later if topic recurs.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Chrome History API** | `chrome.history.onVisited` event listener | MV3 service worker wakes on each visit. Permission: `"history"` in manifest. |
| **Comet Browser** | Same as Chrome (Chromium-based) | Fully compatible with Chrome Web Store extensions. Extensions must be reinstalled (data doesn't transfer from Chrome). |
| **Claude API** | HTTPS POST to `/v1/messages` endpoint | Default LLM provider. API key in `config/llm-config.json`. Rate limit: 50 requests/minute. |
| **Ollama (local LLM)** | HTTP localhost:11434 API | Fallback for privacy. Run `ollama serve` before batch processing. Recommended model: Llama 3.1 8B. |
| **Gmail API (via gws CLI)** | Shell exec: `gws gmail users messages send` | Installed globally. Auth via OAuth (stored in system keyring). Requires `gmail.send` scope. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Extension ↔ Batch Processor** | Filesystem (OPFS SQLite DB exported to JSON) | Extension writes to OPFS, processor reads via SQLite CLI or direct file access. One-way data flow. |
| **Batch Processor ↔ LLM Provider** | HTTPS API (Claude) or HTTP localhost (Ollama) | Swappable via config. Processor abstracts provider behind interface: `{ complete(), embed() }`. |
| **Markdown Generator ↔ Obsidian Vault** | Direct filesystem writes (Markdown files) | Generator writes to `vaultPath/daily/YYYY-MM-DD.md`. No Obsidian API — just standard files. |
| **Wikilink Matcher ↔ Vault Index** | In-memory JSON index | Built on startup from `glob(vaultPath/**/*.md)`. Cached to `/tmp/vault-index.json`. Rebuild if vault modified. |
| **Email Digest ↔ Gmail** | gws CLI subprocess | Shell exec with stdin (email body). Returns exit code 0 on success. Error handling: log and skip (non-critical). |

## Build Order Recommendations

Based on component dependencies, suggested implementation sequence:

### Phase 1: Core Capture (Weeks 1-2)
**Build:** Browser extension (service worker + content script + OPFS storage)
**Validation:** Extension logs URLs to local SQLite, viewable in `chrome://extensions` debug console
**Why first:** Foundation for all other components. Must work reliably before batch processing makes sense.

### Phase 2: Export Pipeline (Week 3)
**Build:** Batch exporter script (reads extension DB, outputs JSON)
**Validation:** Can manually trigger export and see JSON file with captured URLs
**Why second:** Bridges extension storage to processing layer. Enables testing curation logic with real data.

### Phase 3: Basic Markdown Generation (Week 4)
**Build:** Markdown generator (template-based, no LLM yet)
**Validation:** Daily note created in vault with chronological URL list
**Why third:** Establishes vault integration. Provides immediate value (raw log) even before AI curation works.

### Phase 4: LLM Curation (Weeks 5-6)
**Build:** Topic clustering, unread detection, highlight ranking
**Validation:** Curated summary section appears at top of daily note
**Why fourth:** Most complex component. Requires LLM provider setup, prompt engineering, clustering tuning.

### Phase 5: Wikilink Matching (Week 7)
**Build:** Vault indexer + wikilink matcher
**Validation:** Curated items auto-link to existing notes
**Why fifth:** Requires working curation pipeline (Phase 4). Depends on vault already having notes to link to.

### Phase 6: Scheduling (Week 8)
**Build:** launchd agent + cron trigger
**Validation:** Daily note auto-generated at 9 PM without manual trigger
**Why sixth:** Automation layer. Only makes sense once full pipeline is stable.

### Phase 7: Email Digest (Week 9)
**Build:** gws CLI integration + email template
**Validation:** Morning email received with highlights
**Why last:** Optional enhancement. Core value is vault integration, email is nice-to-have.

### Critical Dependencies

```
Extension Storage → Export Pipeline → Markdown Generation
                                    ↓
                              LLM Curation → Wikilink Matching
                                    ↓
                              Scheduling (launchd)
                                    ↓
                              Email Digest (optional)
```

**Parallel work opportunities:**
- While building Extension (Phase 1), can prototype LLM clustering logic with sample data
- While building LLM Curation (Phase 4), can work on Wikilink Matching (Phase 5) in parallel if vault index API is defined

**Testing strategy:**
- Phases 1-3: Unit tests + manual verification
- Phase 4: LLM output validation (does clustering make sense? are topics coherent?)
- Phase 5: Wikilink accuracy testing (false positive rate)
- Phases 6-7: End-to-end integration tests

## Sources

### Browser Extension Architecture (MV3)
- [Building Chrome Extensions in 2026: A Practical Guide with Manifest V3](https://dev.to/ryu0705/building-chrome-extensions-in-2026-a-practical-guide-with-manifest-v3-12h2)
- [Chrome Extension Development: The Complete System Architecture Guide for 2026](https://jinlow.medium.com/chrome-extension-development-the-complete-system-architecture-guide-for-2026-9ae81415f93e)
- [How to Build a Chrome Extension in 2026: AI-First Guide (Manifest V3)](https://www.groovyweb.co/blog/chrome-extension-development-guide-2026)
- [Extensions / Manifest V3 | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)

### Browser History Capture & Storage
- [chrome.history API | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/history)
- [SQLite in the Browser Just Got Real: OPFS Makes LocalStorage Obsolete](https://chyshkala.com/blog/sqlite-in-the-browser-just-got-real-opfs-makes-localstorage-obsolete)
- [Offline-first frontend apps in 2025: IndexedDB and SQLite in the browser](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [SQLite Wasm in the browser backed by the Origin Private File System](https://developer.chrome.com/blog/sqlite-wasm-in-the-browser-backed-by-the-origin-private-file-system)
- [The Current State Of SQLite Persistence On The Web: November 2025 Update](https://www.powersync.com/blog/sqlite-persistence-on-the-web)

### AI Content Curation & Topic Clustering
- [LLM-Guided Semantic-Aware Clustering for Topic Modeling (LiSA)](https://aclanthology.org/2025.acl-long.902/)
- [PRISM: LLM-Guided Semantic Clustering for High-Precision Topics](https://arxiv.org/html/2604.03180v1)
- [LLM Embeddings: Superior Document Clustering with Scikit-learn](https://www.cognitivetoday.com/2026/03/llm-embeddings-document-clustering/)
- [AI Architecture in 2026: The Stack That Actually Works](https://dev.to/richard_cohen_301490c120b/ai-architecture-in-2026-the-stack-that-actually-works-5h7k)
- [6 Patterns That Turned My Pipeline from Chaotic to Production-Grade — Agentic Workflows](https://medium.com/@wasowski.jarek/building-ai-workflows-neither-programming-nor-prompt-engineering-cdd45d2d314a)

### Wikilink Generation & Knowledge Graphs
- [llm-wiki-agent: Personal knowledge base that builds and maintains itself](https://github.com/SamurAIGPT/llm-wiki-agent)
- [AutoKG: Efficient Automated Knowledge Graph Generation for Large Language Models](https://github.com/wispcarey/AutoKG)
- [Generating Knowledge Graphs with Wikipedia](https://towardsdatascience.com/generating-knowledge-graphs-with-wikipedia-ec17030a40f6/)

### Obsidian Vault Automation
- [TurboVault: Markdown and OFM SDK w/ MCP server](https://github.com/Epistates/turbovault)
- [Obsidian Graph: Semantic knowledge graph navigation using AI](https://github.com/drewburchfield/obsidian-graph)
- [Set up an Obsidian Vault for Claude Code Automation Workflows](https://www.geeky-gadgets.com/obsidian-vault-claude-workflow/)
- [Automating Your Obsidian Workspace](https://www.thoughtasylum.com/2021/09/12/automating-your-obsidian-workspace/)

### macOS launchd Scheduling
- [A launchd Tutorial](https://www.launchd.info/)
- [Creating Launch Daemons and Agents | Apple Developer](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
- [Running software automatically using launchd](https://eclecticlight.co/2021/09/13/running-software-automatically-using-launchd/)
- [Script management with launchd in Terminal on Mac](https://support.apple.com/guide/terminal/script-management-with-launchd-apdc6c1077b-5d5d-4d35-9c19-60f2397b2369/mac)

### Comet Browser Extension Support
- [Perplexity Comet vs Chrome: Which Do You Need? (2026)](https://www.superchargebrowser.com/library/perplexity-comet-vs-chrome-extensions/)
- [Extensions - Comet Browser Help Center](https://comet-help.perplexity.ai/en/articles/11734716-extensions)
- [What is Comet's Browser Engine?](https://comet-help.perplexity.ai/en/articles/11583798-what-is-comet-s-browser-engine)

---
*Architecture research for: Automated browsing capture + AI curation system*
*Researched: 2026-04-09*
