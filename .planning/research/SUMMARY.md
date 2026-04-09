# Project Research Summary

**Project:** Second Brain - Automated Browsing Capture & AI Curation
**Domain:** Personal knowledge management automation
**Researched:** 2026-04-09
**Confidence:** HIGH

## Executive Summary

This project builds a privacy-first browsing capture and AI curation system that passively logs URLs during daily browsing, then generates intelligent daily summaries integrated into an Obsidian vault. The recommended approach uses a Chrome extension (WXT framework) for passive capture, SQLite OPFS storage in the browser, and Node.js batch processing with swappable LLM providers (Claude API or local Ollama) for end-of-day curation. All processing happens locally or with explicit user control over cloud vs local AI.

The architecture follows event-driven Chrome Manifest V3 patterns with service workers, uses launchd for macOS scheduling (not cron), and generates Obsidian-compatible markdown with automated wikilink matching to existing vault notes. This approach prioritizes non-intrusive passive capture over real-time analysis, batch processing over continuous monitoring, and metadata-only storage over full-page archival to maximize privacy and minimize performance impact.

Critical risks include Chrome Web Store rejection for excessive permissions (mitigated by minimal permissions from the start), service worker context confusion (MV3 requires stateless design), vault file corruption from concurrent writes (requires atomic write patterns), and AI hallucination in topic clustering (mitigated by confidence thresholds and RAG validation against existing vault notes). Token costs can spiral without prompt caching and aggressive pre-filtering. All pitfalls are addressable through careful phase planning and upfront architectural decisions.

## Key Findings

### Recommended Stack

The technology stack prioritizes TypeScript across the entire codebase (extension + backend), WXT as the extension framework for superior developer experience with hot module reloading, and better-sqlite3 with OPFS for high-performance local storage. The swappable LLM provider architecture (Anthropic SDK + Ollama client) enables privacy flexibility while native messaging is explicitly avoided in favor of direct OPFS file access from Node.js batch scripts.

**Core technologies:**
- **TypeScript + Node.js**: Unified type system across extension and backend, best ecosystem for file operations and native tooling on macOS
- **WXT (v0.20)**: Market-leading Manifest V3 framework with Vite-based HMR, 43% smaller bundles than alternatives, framework-agnostic
- **better-sqlite3 + OPFS**: Real SQL in browser with 10-100x better performance than IndexedDB, synchronous API, ACID guarantees for metadata storage
- **Anthropic SDK + Ollama**: Swappable provider pattern allows Claude API (default quality) or local models (privacy option) without vendor lock-in
- **launchd**: macOS-native scheduling that runs missed jobs on wake (critical for laptops), better permissions integration than cron
- **Vitest v4**: Browser mode enables testing extension code in real Chrome/Chromium, 5x faster than Jest with TypeScript support out of the box

### Expected Features

The MVP focuses on passive capture, smart blocklist filtering, basic AI curation with topic clustering, and end-of-day automation. Advanced features like unread queue detection (requires dwell time tracking), auto-linking to vault notes, and email digests are deferred to v1.x after core validation. Anti-features include full-page archival (storage explosion, privacy issues), real-time curation (interrupts focus, high cost), and tag-based categorization (conflicts with Obsidian's wikilink paradigm).

**Must have (table stakes):**
- Automatic browsing capture — passive logging without manual intervention
- Daily note generation — one markdown file per day matching Obsidian conventions
- Smart default blocklist — filters Gmail, search engines, banking, social media by domain
- Basic AI curation — 3-5 bullet executive summary with topic clustering
- End-of-day automation — launchd triggers processing at consistent time
- Swappable LLM config — environment variable toggles between Claude API and local Ollama

**Should have (competitive differentiation):**
- Topic clustering — "you looked at 4 RL papers" instead of raw chronological dump
- Auto-linking to vault notes — generates [[wikilinks]] when AI detects matches to existing notes
- Email digest — morning delivery via gws CLI and Gmail API
- Customizable blocklist UI — settings interface instead of manual JSON editing
- Comet browser support — second Chromium-based browser once Chrome version stabilizes

**Defer (v2+):**
- Unread queue detection — requires complex dwell time tracking extension logic, HIGH implementation cost
- Contextual priority scoring — needs understanding of vault structure and behavioral patterns from v1 usage data
- Multi-week trend analysis — requires longitudinal data collection
- Page content extraction — only add if users request full-text search capability (storage/performance implications)

### Architecture Approach

The system uses a five-layer architecture: browser extension layer (service worker + content script + OPFS storage), local storage layer (SQLite for browsing metadata buffer), batch processing layer (launchd → exporter → LLM curator → markdown generator), Obsidian vault layer (daily notes + wikilink matcher), and optional email layer (gws CLI → Gmail API). Data flows one-way from extension to vault with no feedback loops during capture. The extension is stateless following MV3 service worker patterns, terminating after each event. End-of-day batch processing reads accumulated data, performs LLM-guided semantic clustering, matches topics to existing vault notes for wikilink generation, and writes atomic markdown files.

**Major components:**
1. **Browser Extension** — Service worker monitors chrome.history.onVisited events, applies blocklist filtering, writes URL+title+timestamp to OPFS-backed SQLite
2. **Batch Processor** — Node.js scripts triggered by launchd export SQLite data to JSON, call LLM API for topic clustering and summarization, generate Obsidian markdown
3. **Wikilink Matcher** — Indexes vault note titles and aliases, fuzzy-matches curated topics against index (>70% similarity threshold), auto-generates [[links]]
4. **LLM Curator** — Implements swappable provider interface (Claude/Ollama), performs semantic clustering using LLM-guided keyword extraction (LiSA pattern), ranks highlights
5. **File Generator** — Template-based markdown generation with YAML frontmatter, atomic write pattern (temp file → verify → rename) to prevent corruption during Obsidian sync

### Critical Pitfalls

**1. Service Worker Context Confusion (MV3)** — Manifest V3 service workers terminate after 30 seconds idle and have no DOM access. Developers migrating from MV2 background pages write code assuming persistent state and window/document APIs. Prevention: Design as stateless service worker from the start, persist all state to chrome.storage.local or OPFS immediately, test service worker lifecycle with forced termination. Phase to address: Phase 1 (Extension foundation).

**2. Vault Corruption from Concurrent Writes** — Multiple processes writing to vault simultaneously (automation script + Obsidian auto-save + iCloud sync) causes file corruption with null bytes, duplicate content, or partial writes. Prevention: Never write to `.obsidian/` directory, use atomic write pattern (write to temp → verify → rename), check for file locks with lsof before writing, write to dated files instead of appending to currently-open notes. Phase to address: Phase 2 (File writing foundation).

**3. Chrome Web Store Rejection for Excessive Permissions** — 40% of rejections stem from permission issues. Requesting broad permissions like `<all_urls>` or `tabs` during prototyping without narrowing scope before submission triggers rejection. Prevention: Use minimal permissions (`history` only, not `<all_urls>`), document permission usage in code comments, provide detailed privacy policy, include screenshots demonstrating feature usage. Phase to address: Phase 1 (Extension foundation — validate permission list before first submission).

**4. AI Hallucination in Clustering** — LLMs hallucinate in 9.2% of cases on average, with higher rates for complex reasoning tasks (33-51% for o3 on factual benchmarks). Clustering based on sparse signals (URL+title only) can invent topic relationships that don't exist. Prevention: Explicit prompts to express uncertainty rather than guess, RAG verification against existing vault wikilinks, confidence thresholds (>70%), multi-model validation, human-in-loop edit UI. Phase to address: Phase 3 (AI curation).

**5. LLM Token Costs Spiral** — Daily curation can cost $2-5/user/day instead of $0.10-0.30 without optimization. RAG pipelines pass unnecessary context, no prompt caching, no input filtering, no batching. Prevention: Apply blocklist BEFORE LLM (50-70% input reduction), use Anthropic prompt caching for vault wikilinks (90% cost reduction), truncate titles/domains, batch all URLs in single daily API call, use Claude Haiku for clustering and Sonnet only for final summary. Phase to address: Phase 3 (AI curation).

## Implications for Roadmap

Based on research, suggested 7-phase structure following critical dependency chain:

### Phase 1: Browser Extension Foundation
**Rationale:** Foundation for all components. Must capture data reliably before batch processing makes sense. MV3 service worker patterns are non-negotiable and require upfront architectural decisions that are expensive to retrofit.
**Delivers:** Chrome extension that passively captures URL+title+timestamp to OPFS-backed SQLite, implements smart default blocklist (Gmail, search, banking), survives service worker termination/restart cycles.
**Addresses:** Automatic browsing capture (table stakes), customizable blocklist (table stakes), minimal permissions design.
**Avoids:** Service worker context confusion (Pitfall #1 — design stateless from start), Chrome Web Store rejection (Pitfall #3 — minimal permissions, privacy policy URL in manifest, no `<all_urls>`), privacy backlash (explicit onboarding before permission prompt).
**Stack:** WXT v0.20, TypeScript, webextension-polyfill, better-sqlite3 WASM with OPFS backend.
**Research Flag:** Standard patterns — WXT documentation is comprehensive, MV3 patterns well-established. Skip research-phase.

### Phase 2: Data Export Pipeline
**Rationale:** Bridges extension storage to processing layer. Cannot develop batch processing scripts without ability to read captured data. Schema versioning must be implemented upfront (retrofitting is near impossible).
**Delivers:** Node.js exporter script that reads OPFS SQLite database from extension storage, exports to versioned JSON format (includes `schema_version: 1`), validates export structure with Zod schemas.
**Addresses:** Manual sync/trigger (table stakes — user can run export script manually as fallback).
**Avoids:** Schema breaking changes (Pitfall #10 — version JSON exports from day 1, build migration library, test backwards compatibility).
**Stack:** Node.js, better-sqlite3, Zod for runtime validation, fs-extra for file operations.
**Research Flag:** Standard patterns — JSON export is straightforward. Skip research-phase.

### Phase 3: Basic Markdown Generation
**Rationale:** Establishes vault integration early. Provides immediate value (raw chronological log) even before AI curation works. Atomic write patterns must be implemented before automation to prevent corruption.
**Delivers:** Template-based markdown generator that creates daily notes in vault with chronological URL list, YAML frontmatter, atomic write pattern (temp file → verify → rename), file lock detection.
**Addresses:** Daily note generation (table stakes), mobile-readable format (table stakes — Obsidian markdown renders on mobile).
**Avoids:** Vault corruption (Pitfall #2 — atomic writes, never touch `.obsidian/` directory, check for Obsidian file locks), iCloud/OneDrive sync conflicts (write to dated files not currently-open notes).
**Stack:** fs-extra, gray-matter for frontmatter parsing, Obsidian markdown conventions.
**Research Flag:** Standard patterns — Markdown generation is well-documented. Skip research-phase.

### Phase 4: LLM Curation with Cost Optimization
**Rationale:** Most complex component requiring LLM provider setup, prompt engineering, clustering tuning, and cost optimization. Implementing prompt caching and blocklist pre-filtering upfront prevents expensive retrofitting. Swappable provider architecture must exist before specific curation features.
**Delivers:** LLM curator implementing swappable provider interface (Claude/Ollama), semantic topic clustering using LLM-guided keyword extraction (LiSA pattern), 3-5 bullet executive summary, confidence thresholding (>70%), Anthropic prompt caching for vault context (90% cost reduction), aggressive blocklist pre-filtering.
**Addresses:** Basic AI curation (table stakes MVP feature), swappable LLM config (table stakes for privacy flexibility), topic clustering (competitive differentiator).
**Avoids:** AI hallucination (Pitfall #4 — confidence thresholds, explicit uncertainty prompts, RAG validation), token cost spiral (Pitfall #5 — prompt caching, blocklist pre-filtering, batching, Haiku for clustering + Sonnet for summary only).
**Stack:** Anthropic SDK (prompt caching API), Ollama client, Zod for LLM response validation, HDBSCAN for clustering.
**Research Flag:** NEEDS RESEARCH — LLM prompt engineering for clustering, hallucination mitigation strategies, cost optimization patterns. Recommend `/gsd-research-phase` for prompt design and clustering validation.

### Phase 5: Wikilink Matching
**Rationale:** Requires working curation pipeline (Phase 4) to have topics to match. Depends on vault already having notes to link to. Disambiguation logic must prioritize precision over recall to avoid false positive links that erode trust.
**Delivers:** Vault indexer that scans existing notes for titles/aliases on startup, fuzzy string matcher with >70% similarity threshold, context-aware disambiguation (uses surrounding URLs not just single title), confidence-based auto-linking (>85% for ambiguous terms), user override capability.
**Addresses:** Auto-linking to vault notes (competitive differentiator — high value for existing Obsidian users).
**Avoids:** Wikilink false positives (Pitfall #9 — high precision threshold >85%, blocklist for ambiguous terms like "America"/"York", prefer recently-modified notes).
**Stack:** Fuzzy string matching library, vault indexing with file system watchers, gray-matter for alias extraction.
**Research Flag:** Standard patterns — Fuzzy matching is well-documented. Skip research-phase, but allocate time for tuning similarity thresholds.

### Phase 6: macOS Scheduling Automation
**Rationale:** Automation layer only makes sense once full pipeline (capture → export → curate → generate) is stable. launchd configuration is finicky and requires Full Disk Access permissions. Must test with real sleep scenarios.
**Delivers:** launchd agent configuration (not daemon) with StartCalendarInterval for 9 PM daily trigger, Full Disk Access permission grant instructions, logging to ~/Library/Logs/ with explicit error messages, recovery behavior on Mac wake from sleep.
**Addresses:** End-of-day automation (table stakes MVP — curation runs without manual trigger).
**Avoids:** Scheduling unreliability (Pitfall #7 — use launchd not cron, grant Full Disk Access, test sleep scenarios, UTC scheduling to avoid DST complexity).
**Stack:** launchd plist configuration, Node.js entry point script.
**Research Flag:** Standard patterns — launchd is well-documented. Skip research-phase but test thoroughly on fresh Mac.

### Phase 7: Email Digest (Optional Enhancement)
**Rationale:** Optional nice-to-have after core vault integration works. gws CLI is already installed and handles OAuth via system keyring. Low implementation cost but not critical for core value proposition.
**Delivers:** Email formatter that converts markdown summary to HTML, gws CLI integration for Gmail API sends, exponential backoff for 429 rate limit errors, Obsidian URI links in email body for vault deep-linking.
**Addresses:** Email digest with highlights (competitive differentiator — proactive delivery for users who prefer email over opening Obsidian).
**Avoids:** Gmail rate limiting (Pitfall #8 — exponential backoff on 429 errors, one email per day pattern well under limits).
**Stack:** gws CLI (already installed), HTML email templating, exponential backoff implementation.
**Research Flag:** Standard patterns — Gmail API via gws is documented. Skip research-phase.

### Phase Ordering Rationale

**Dependency chain:** Extension storage → Export pipeline → Markdown generation forms the foundation. LLM curation cannot happen without structured export format. Wikilink matching requires curation to generate topics. Scheduling requires stable end-to-end pipeline. Email digest is purely additive enhancement.

**Pitfall mitigation order:** Service worker architecture (Phase 1) and vault corruption prevention (Phase 3) must be correct from the start — retrofitting is expensive and risky. Token cost optimization (Phase 4) is much easier to build in than add later. Schema versioning (Phase 2) is impossible to retrofit once users have unversioned data.

**Value delivery:** Phases 1-3 deliver functional browsing log (chronological dump in vault) even without AI. Phase 4 adds intelligence (curation/clustering). Phase 5 adds vault integration depth (wikilinks). Phases 6-7 reduce friction (automation + alternative delivery).

**Parallel work opportunities:** While building Extension (Phase 1), can prototype LLM clustering logic with sample data in parallel. While building Markdown generation (Phase 3), can define wikilink matcher API for Phase 5.

**Testing strategy:** Phases 1-3 require unit tests + manual verification. Phase 4 needs LLM output validation (coherent topics? reasonable clusters?). Phase 5 needs wikilink accuracy testing (false positive rate). Phase 6-7 need end-to-end integration tests with real macOS sleep scenarios.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 4 (LLM Curation):** Complex prompt engineering for clustering accuracy, hallucination mitigation strategies not fully specified, need to validate LiSA pattern implementation details. Recommend `/gsd-research-phase` for prompt design, confidence threshold tuning, and cost optimization validation.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Extension):** WXT framework documentation is comprehensive, MV3 patterns well-established in 2026, OPFS+SQLite integration documented with examples.
- **Phase 2 (Export):** JSON export is straightforward Node.js file operations, schema versioning pattern is standard.
- **Phase 3 (Markdown):** Obsidian markdown format well-defined, atomic write patterns documented, gray-matter library battle-tested.
- **Phase 5 (Wikilinks):** Fuzzy string matching libraries mature, vault indexing is basic file system operations.
- **Phase 6 (Scheduling):** launchd documented in Apple developer docs, macOS scheduling patterns established.
- **Phase 7 (Email):** gws CLI already installed with documented Gmail API integration, exponential backoff is standard pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All recommended technologies verified with 2026 documentation, actively maintained, version compatibility confirmed. WXT is market leader, better-sqlite3 is battle-tested, Anthropic SDK is official. No deprecated tech. |
| Features | **MEDIUM-HIGH** | Table stakes features validated against competitor analysis (TraceMind, Readwise Reader, Obsidian plugins). Differentiators derived from competitor gaps. MVP scope is reasonable based on dependency analysis. Anti-features validated by examining failed approaches in similar products. |
| Architecture | **HIGH** | MV3 patterns documented in official Chrome docs, OPFS+SQLite validated in 2026 browser compatibility data, LLM-guided clustering (LiSA) from peer-reviewed ACL 2025 paper, launchd is macOS standard since 10.4. Build order follows clear dependency graph with no circular dependencies. |
| Pitfalls | **HIGH** | All critical pitfalls sourced from official documentation (Chrome MV3 migration guide, Gmail API quota limits), 2026 industry research (AI hallucination rates, privacy enforcement trends), and community post-mortems (Obsidian sync conflicts, Trust Wallet breach). Recovery strategies verified against real-world incident reports. |

**Overall confidence: HIGH**

All recommendations based on current (2026) documentation, verified versions, established best practices. No speculative technology choices. Architecture follows proven patterns (event-driven MV3, batch processing, RAG validation). Pitfalls are well-documented with clear prevention strategies tied to specific phases.

### Gaps to Address

**LLM prompt engineering for clustering:** While LiSA/PRISM patterns are documented at research level, production prompts for topic extraction from sparse signals (URL+title only) need tuning during Phase 4 implementation. Plan for iterative prompt testing with sample browsing data.

**Wikilink disambiguation threshold tuning:** Similarity threshold (70% for fuzzy matching, 85% for ambiguous terms) is initial recommendation but needs validation against real vault structure during Phase 5. Plan for A/B testing with sample matches before full automation.

**OPFS quota limits:** Browser OPFS storage quotas vary (typically ~60% of available disk space) but edge cases (low disk space, shared devices) unclear. Plan for quota monitoring and graceful degradation (warn user when approaching limits) during Phase 1 implementation.

**Chrome History API pagination behavior:** Documentation shows history API returns max 100 items per query but pagination behavior with large datasets (>10k history items) not fully tested. Plan for pagination testing during Phase 1 with simulated large history databases.

**launchd behavior during macOS updates:** macOS system updates sometimes disable LaunchAgents temporarily. Document expected behavior and recovery process (re-enable with launchctl load) in Phase 6 user documentation.

## Sources

### Primary Sources (HIGH confidence)

**Browser Extension & Chrome APIs:**
- [Chrome Extensions - What's New (2026)](https://developer.chrome.com/docs/extensions/whats-new)
- [Building Chrome Extensions in 2026: Manifest V3 Guide](https://dev.to/ryu0705/building-chrome-extensions-in-2026-a-practical-guide-with-manifest-v3-12h2)
- [Chrome Extension Development: Complete System Architecture Guide for 2026](https://jinlow.medium.com/chrome-extension-development-the-complete-system-architecture-guide-for-2026-9ae81415f93e)
- [Chrome Native Messaging Documentation](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [chrome.history API Reference](https://developer.chrome.com/docs/extensions/reference/api/history)

**Storage & Database:**
- [SQLite Wasm in Browser with OPFS](https://developer.chrome.com/blog/sqlite-wasm-in-the-browser-backed-by-the-origin-private-file-system)
- [SQLite Persistence on the Web: November 2025 Update](https://www.powersync.com/blog/sqlite-persistence-on-the-web)
- [better-sqlite3 npm package](https://www.npmjs.com/package/better-sqlite3)
- [Understanding Better-SQLite3: Fastest SQLite Library for Node.js](https://dev.to/lovestaco/understanding-better-sqlite3-the-fastest-sqlite-library-for-nodejs-4n8)

**AI & LLM Integration:**
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Claude API Documentation](https://platform.claude.com/docs/en/api/client-sdks)
- [Ollama Integration Documentation](https://docs.ollama.com/integrations/claude-code)
- [LLM-Guided Semantic-Aware Clustering (LiSA) - ACL 2025](https://aclanthology.org/2025.acl-long.902/)
- [PRISM: LLM-Guided Semantic Clustering](https://arxiv.org/html/2604.03180v1)

**macOS Automation:**
- [Apple Developer: Creating Launch Daemons and Agents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
- [Scheduling Jobs with launchd](https://blog.serghei.pl/posts/scheduling-recurring-tasks-on-macos-using-launchd/)
- [A launchd Tutorial](https://www.launchd.info/)

**Obsidian Integration:**
- [gray-matter npm package](https://www.npmjs.com/package/gray-matter)
- [Obsidian Skills by kepano](https://github.com/kepano/obsidian-skills)
- [TurboVault: Markdown SDK w/ MCP server](https://github.com/Epistates/turbovault)

**Testing:**
- [Vitest in 2026: Testing Framework Deep Dive](https://dev.to/ottoaria/vitest-in-2026-the-testing-framework-that-makes-you-actually-want-to-write-tests-kap)
- [Vitest 4.0 Browser Mode Release](https://www.infoq.com/news/2025/12/vitest-4-browser-mode/)

### Secondary Sources (MEDIUM-HIGH confidence)

**Feature Research:**
- [Best Browser History Extensions for Chrome 2026](https://tracemind.app/blog/best-browser-history-extensions-2026)
- [Best Read-Later Apps in 2026: Complete Comparison](https://www.readless.app/blog/best-read-later-apps-comparison)
- [Readwise Reader Review: AI-Powered Reading Tool](https://tutorialswithai.com/tools/readwise-reader/)
- [Knowledge Management in 2026: Trends & Best Practice](https://www.vable.com/blog/knowledge-management-in-2026-trends-technology-best-practice)

**Privacy & Security:**
- [Why Local LLM is Ultimate Privacy Power Move in 2026](https://medium.com/@neurominimal/why-your-local-llm-is-the-ultimate-privacy-power-move-in-2026-8287859e1d06)
- [Browser Extension Security: Defending Against Excessive Permissions](https://www.island.io/browser-extension-security/browser-extension-security-defending-against-excessive-permissions)
- [Privacy Enforcement Surging 2026](https://trustarc.com/resource/privacy-enforcement-surging-2026/)

**Pitfalls & Best Practices:**
- [AI Hallucination Rates and Benchmarks 2026](https://suprmind.ai/hub/ai-hallucination-rates-and-benchmarks/)
- [LLM Token Cost Optimization 2026](https://redis.io/blog/llm-token-optimization-speed-up-apps/)
- [Chrome Extension Rejection Reasons](https://www.extensionradar.com/blog/chrome-extension-rejected)
- [Clean Obsidian Vault: Handling Sync Conflicts](https://www.ganesshkumar.com/articles/2026-02-04-clean-obsidian-vault/)

**Comet Browser:**
- [Perplexity Comet vs Chrome: Which Do You Need? (2026)](https://www.superchargebrowser.com/library/perplexity-comet-vs-chrome-extensions/)
- [Comet Browser Extensions Help](https://comet-help.perplexity.ai/en/articles/11734716-extensions)

### Research Outputs

All detailed findings available in:
- `.planning/research/STACK.md` — Full technology stack analysis with alternatives considered
- `.planning/research/FEATURES.md` — Complete feature landscape including MVP definition and prioritization matrix
- `.planning/research/ARCHITECTURE.md` — Detailed system architecture with patterns, data flows, and build order
- `.planning/research/PITFALLS.md` — 10 critical pitfalls with prevention strategies and phase mapping

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
