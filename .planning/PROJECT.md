# Second Brain

## What This Is

An automated knowledge capture system that passively logs everything you browse during the day, then uses AI to curate a daily highlights page in your Obsidian vault. It turns forgotten tabs and half-read papers into an organized, actionable reading list — so your browsing history becomes your external memory.

## Core Value

Every page you visit is captured and intelligently surfaced — you never lose track of what caught your attention.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Browser extension captures URLs, titles, and metadata from Chrome and Comet
- [ ] Browsing data is logged to a daily resource page in the vault
- [ ] Smart default blocklist filters out noisy sites (Gmail, Google Search, banking, social media)
- [ ] Users can customize the blocklist/allowlist
- [ ] Daily resource page has a raw chronological timeline log with timestamps
- [ ] AI generates a curated summary section at the top of the daily page
- [ ] AI clusters related items by topic (e.g. "you looked at 4 RL papers today")
- [ ] AI surfaces an unread queue — items opened but not spent time on
- [ ] Curation runs automatically at end of day
- [ ] Curated items auto-link to existing vault notes via [[wikilinks]] when topics match
- [ ] LLM provider is swappable (Claude API default, local LLM option)
- [ ] Morning email digest with highlights sent via Gmail

### Out of Scope

- Full page content extraction/archival — only URLs + metadata captured
- Manual bookmarking or selection — the system is fully passive
- Mobile browser capture — desktop only (Chrome/Comet)
- Real-time curation — batch processing at end of day only
- Tag-based categorization — using wikilinks to existing notes instead

## Context

- This lives inside an existing Obsidian vault (`second-brain`) used for organizing work projects
- The vault already uses [[wikilinks]] for internal links and Obsidian-compatible Markdown
- `gws` CLI is available for Gmail integration (email digest)
- The user browses heavily for research — arxiv papers, technical blogs, articles — and frequently loses track of tabs
- Chrome and Comet are the two browsers in use
- macOS (Darwin) is the target platform
- The system should work with whatever backend language fits best (Python or Node.js)

## Constraints

- **Platform**: macOS only — cron/launchd for scheduling
- **Browsers**: Must support Chrome and Comet browser
- **Storage**: Metadata only (URL, title, domain, timestamp) — no page content archival
- **Privacy**: LLM provider must be swappable so user can run locally if desired
- **Vault format**: All output must be valid Obsidian Markdown with [[wikilinks]]
- **Non-intrusive**: Fully passive capture — no user action required during browsing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser extension + history export fallback | Extension for real-time capture, history export as backup when extension isn't running | — Pending |
| Blocklist by default (not allowlist) | User wants everything captured except known noise — lower friction than curating an allowlist | — Pending |
| URLs + metadata only (no content extraction) | Keeps the system lightweight and fast; AI curation works from titles/domains/patterns | — Pending |
| Wikilinks over tags for categorization | Leverages existing vault structure rather than creating a parallel tag taxonomy | — Pending |
| End-of-day batch curation | Matches user workflow — review happens next morning, not during active browsing | — Pending |
| Swappable LLM provider | Privacy flexibility — Claude API default, but can switch to local Ollama/llama.cpp | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after initialization*
