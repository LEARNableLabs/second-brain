# Second Brain

## What This Is

An automated knowledge capture system that passively logs everything you browse during the day, then uses AI to curate a daily highlights page in your Obsidian vault. It turns forgotten tabs and half-read papers into an organized, actionable reading list — so your browsing history becomes your external memory.

## Core Value

Every page you visit is captured and intelligently surfaced — you never lose track of what caught your attention.

## Requirements

### Validated

- [x] Browser extension captures URLs, titles, and metadata from Chrome and Comet — Validated in Phase 1
- [x] Browser history export as fallback when extension isn't running — Validated in Phase 1
- [x] Smart default blocklist filters out noisy sites — Validated in Phase 1
- [x] Users can customize the blocklist/allowlist via config file — Validated in Phase 1
- [x] Browsing data is logged to a daily resource page in the vault — Validated in Phase 3
- [x] Daily resource page has a raw chronological timeline log with timestamps — Validated in Phase 3
- [x] New items appended incrementally each processing cycle (hourly) — Validated in Phase 3 (via regeneration)
- [x] Only metadata + URLs + AI summaries stored in vault — Validated in Phase 3

### Active

- [x] AI fetches and processes full page content for deep analysis (arxiv papers, blog posts, articles) — Validated in Phase 4
- [x] AI generates a curated summary section at the top of the daily page (rolling, regenerated each run) — Validated in Phase 5
- [x] AI clusters related items by topic (e.g. "you looked at 4 RL papers today") — Validated in Phase 5
- [x] Curated items auto-link to existing vault notes via [[wikilinks]] when topics match — Validated in Phase 5
- [x] LLM provider is swappable (Claude API default, local LLM option) — Validated in Phase 5
- [x] Processing runs hourly via launchd, with end-of-day final consolidation pass — Validated in Phase 6
- [x] Morning email digest with highlights sent via Gmail — Validated in Phase 7
- [x] Claude Code skill to capture AI conversation topics/summaries to daily page — Validated in Phase 7

### Out of Scope

- Full page content archival — content is fetched for processing but NOT stored
- Manual bookmarking or selection — the system is fully passive
- Mobile browser capture — desktop only (Chrome/Comet)
- Tag-based categorization — using wikilinks to existing notes instead
- Multi-tool AI capture (ChatGPT, Gemini, Codex) — v2, start with Claude Code skill only
- Unread queue detection — requires dwell time tracking, HIGH complexity, defer to v2

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
- **Storage**: Metadata + AI summaries only — full content fetched for processing but not stored
- **Privacy**: LLM provider must be swappable so user can run locally if desired
- **Vault format**: All output must be valid Obsidian Markdown with [[wikilinks]]
- **Non-intrusive**: Fully passive capture — no user action required during browsing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser extension + history export fallback | Extension for real-time capture, history export as backup when extension isn't running | — Pending |
| Blocklist by default (not allowlist) | User wants everything captured except known noise — lower friction than curating an allowlist | — Pending |
| Process content, store only summaries | Full page content fetched for AI analysis but discarded after — vault stays lean, summaries are substantive | — Pending |
| Wikilinks over tags for categorization | Leverages existing vault structure rather than creating a parallel tag taxonomy | — Pending |
| Hourly incremental + EOD consolidation | Hourly runs process new URLs and append; each run regenerates top summary; EOD does final pass + email digest | — Pending |
| Append + live summary pattern | New items appended each cycle AND top summary regenerated — best UX, manageable token cost (summary-of-summaries) | — Pending |
| Claude Code skill for AI conversations | Capture conversation topics from Claude Code sessions into daily page — start with one tool, expand later | — Pending |
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
*Last updated: 2026-04-14 after Phase 7 completion — all v1.0 phases complete*
