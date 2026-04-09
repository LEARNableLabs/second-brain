# Phase 1: Browser Extension Foundation - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a browser extension that passively captures browsing activity (URL, title, domain, timestamp) from Chrome and Comet browsers. The extension is an invisible capture layer with a minimal status popup. It stores captured data in chrome.storage and provides a history-based fallback for gaps when the extension wasn't running. A configurable blocklist filters out noisy domains.

</domain>

<decisions>
## Implementation Decisions

### Extension Popup UI
- **D-01:** Popup shows a status dashboard — capture on/off toggle, count of pages captured today, last capture timestamp
- **D-02:** The on/off toggle is a temporary pause — capture resumes when toggled back on or on browser restart (not a full disable)
- **D-03:** Popup includes a "block this site" quick-action button that adds the current tab's domain to the blocklist with one click

### Capture Behavior
- **D-04:** Capture uses a dwell threshold — a page is only captured if the user stays on it for at least 5 seconds. Filters out redirects, accidental clicks, and quick bounces
- **D-05:** URLs are deduplicated per day — revisiting the same URL multiple times in a day produces one entry (first visit timestamp kept)
- **D-06:** Service worker must persist capture state in chrome.storage (not in-memory variables) since MV3 service workers terminate after 30 seconds idle

### Blocklist
- **D-07:** Blocklist matching uses domain + subdomains — blocking "google.com" also blocks mail.google.com, docs.google.com, etc.
- **D-08:** Default blocklist ships with four categories: Google services (Gmail, Search, Docs, Drive, Calendar, Maps), Banking & finance (common banks, PayPal, Venmo), Social media (Twitter/X, Reddit, Facebook, Instagram, LinkedIn, YouTube), Auth & internal (SSO, login portals, localhost, chrome:// pages)
- **D-09:** Users edit the blocklist via a JSON config file (blocklist.json). The popup's quick-block button also writes to this file
- **D-10:** No extension options page for blocklist management in Phase 1 — JSON file is the interface for power users

### History Fallback
- **D-11:** Extension auto-detects gaps on startup by comparing last captured timestamp against browser history, then silently backfills missing entries
- **D-12:** Backfilled entries are visually marked in the daily note (e.g., italic or "(from history)" suffix) to distinguish from live captures

### Claude's Discretion
- **D-13:** Background tab handling — when user opens multiple tabs at once (e.g., from search results), Claude decides whether to capture immediately or wait for dwell threshold on focus
- **D-14:** History backfill lookback window — Claude decides how far back to scan when a gap is detected (balancing completeness vs performance)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Extension Framework & Architecture
- `.planning/research/STACK.md` — WXT framework setup, native messaging, extension permissions, full dependency list
- `.planning/research/ARCHITECTURE.md` — Extension architecture patterns and component structure
- `.planning/research/PITFALLS.md` — Service worker context confusion (Pitfall 1), Chrome Web Store rejection (Pitfall 3), privacy concerns (Pitfall 4)

### Requirements
- `.planning/REQUIREMENTS.md` §Capture — CAPT-01 through CAPT-05 define the capture requirements for this phase

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions on blocklist-by-default and passive capture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing extension code — this is a greenfield phase
- Obsidian vault exists at project root with `.obsidian/` configuration (do not modify)

### Established Patterns
- No application code patterns yet — this phase establishes the first codebase conventions
- TypeScript + Node.js stack decided in research (see STACK.md)

### Integration Points
- Extension will store data in chrome.storage.local — Phase 2 (Data Export Pipeline) will read from this
- Blocklist JSON file will be read by the extension and later by the processing pipeline
- Native messaging host (Phase 2) will bridge extension storage to local SQLite database

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants a clean, minimal status dashboard (not a feature-rich popup). JSON config file for power-user blocklist editing aligns with the vault's text-file-first philosophy.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-browser-extension-foundation*
*Context gathered: 2026-04-09*
