# Requirements: Second Brain

**Defined:** 2026-04-09
**Core Value:** Every page you visit is captured and intelligently surfaced — you never lose track of what caught your attention.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Capture

- [x] **CAPT-01**: Browser extension passively captures URL, title, domain, and timestamp from Chrome
- [x] **CAPT-02**: Browser extension passively captures URL, title, domain, and timestamp from Comet browser
- [x] **CAPT-03**: Browser history export pulls browsing data as fallback when extension isn't running
- [x] **CAPT-04**: Smart default blocklist filters Gmail, Google Search, banking, and social media domains
- [x] **CAPT-05**: User can customize blocklist/allowlist via editable config file

### Daily Note

- [x] **NOTE-01**: System creates one Obsidian-compatible .md file per day in the vault
- [x] **NOTE-02**: Daily note contains a raw chronological timeline log with timestamps at the bottom
- [x] **NOTE-03**: New items are appended incrementally each processing cycle (hourly)
- [x] **NOTE-04**: User can trigger daily note generation on-demand via CLI command

### Content Processing

- [x] **PROC-01**: System fetches full page content at processing time for captured URLs (articles, papers, blog posts)
- [x] **PROC-02**: System uses domain-aware extraction (e.g. arxiv API for papers, article extractors for blogs, OpenGraph for general pages)
- [x] **PROC-03**: Fetched content is used for AI analysis then discarded — only metadata + AI summaries stored
- [x] **PROC-04**: Processing runs incrementally every hour via launchd, handling only new captures since last run

### AI Curation

- [x] **CURE-01**: AI generates a curated executive summary at the top of the daily note
- [x] **CURE-02**: Executive summary is regenerated each hourly cycle with all data so far (append + live summary pattern)
- [x] **CURE-03**: AI clusters related items by topic (e.g. "you looked at 4 RL papers today")
- [x] **CURE-04**: AI summaries are substantive — based on full page content, not just titles
- [x] **CURE-05**: End-of-day final consolidation pass produces polished summary for the complete day
- [x] **CURE-06**: Curated items auto-link to existing vault notes via [[wikilinks]] when topics match

### Storage

- [x] **STOR-01**: Local SQLite database serves as processing layer — source of truth for all captured data
- [x] **STOR-02**: Database tracks processing status per URL (captured → content fetched → curated → written to vault)
- [x] **STOR-03**: Database deduplicates URLs visited multiple times (one entry per unique URL per day)
- [x] **STOR-04**: Daily notes can be regenerated from the database if vault files are corrupted or deleted
- [x] **STOR-05**: Output location is configurable — user chooses between inside Obsidian vault (default) or standalone folder
- [x] **STOR-06**: Output folder is git-tracked — each processing cycle auto-commits the final .md files (only markdown, no DB or temp files)

### Infrastructure

- [x] **INFR-01**: LLM provider is swappable between Claude API (default) and local Ollama
- [x] **INFR-02**: Hourly processing scheduled via macOS launchd (handles sleep/wake correctly)
- [x] **INFR-03**: All output is valid Obsidian Markdown with proper [[wikilinks]] and frontmatter

### Delivery

- [x] **DELV-01**: Morning email digest with highlights sent via Gmail/gws CLI
- [x] **DELV-02**: Email contains the curated summary (same content as daily note top section)

### AI Conversation Capture

- [x] **CONV-01**: Claude Code skill captures conversation topics and summaries to the daily resource page
- [x] **CONV-02**: Captured AI conversation data is included in the daily note alongside browsing data

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Unread Detection

- **UNRD-01**: System detects items opened but not spent time on (requires dwell time tracking in extension)
- **UNRD-02**: Unread queue surfaced as separate section in daily note

### Multi-Tool AI Capture

- **MTAI-01**: Capture conversation topics from ChatGPT sessions
- **MTAI-02**: Capture conversation topics from Gemini sessions
- **MTAI-03**: Capture conversation topics from Codex sessions

### Advanced Curation

- **ADVC-01**: Contextual priority scoring — AI ranks items by relevance to user's vault topics
- **ADVC-02**: Multi-week trend analysis ("you've been researching X for 2 weeks")
- **ADVC-03**: Historical import — backfill last 30 days of browsing history on first run

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full page content archival | Content is fetched for processing but NOT stored — vault stays lean |
| Manual bookmarking/selection | Defeats the passive capture premise — system captures everything automatically |
| Mobile browser capture | Desktop only (Chrome/Comet) — mobile adds complexity without validating core concept |
| Tag-based categorization | Using [[wikilinks]] to existing notes instead — avoids parallel taxonomy |
| Real-time in-browser curation | Interrupts focus; hourly batch processing is frequent enough |
| Browser-based UI for review | Obsidian is the interface; extension is invisible capture layer |
| Shared/social features | Privacy nightmare; single-user tool by design |
| Firefox/Safari extensions | Different manifest systems; only worth effort if concept validates |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAPT-01 | Phase 1 | Complete |
| CAPT-02 | Phase 1 | Complete |
| CAPT-03 | Phase 1 | Complete |
| CAPT-04 | Phase 1 | Complete |
| CAPT-05 | Phase 1 | Complete |
| NOTE-01 | Phase 3 | Complete |
| NOTE-02 | Phase 3 | Complete |
| NOTE-03 | Phase 3 | Complete |
| NOTE-04 | Phase 2 | Complete |
| PROC-01 | Phase 4 | Complete |
| PROC-02 | Phase 4 | Complete |
| PROC-03 | Phase 4 | Complete |
| PROC-04 | Phase 4 | Complete |
| CURE-01 | Phase 5 | Complete |
| CURE-02 | Phase 5 | Complete |
| CURE-03 | Phase 5 | Complete |
| CURE-04 | Phase 5 | Complete |
| CURE-05 | Phase 5 | Complete |
| CURE-06 | Phase 5 | Complete |
| STOR-01 | Phase 2 | Complete |
| STOR-02 | Phase 2 | Complete |
| STOR-03 | Phase 2 | Complete |
| STOR-04 | Phase 3 | Complete |
| STOR-05 | Phase 3 | Complete |
| STOR-06 | Phase 3 | Complete |
| INFR-01 | Phase 5 | Complete |
| INFR-02 | Phase 6 | Complete |
| INFR-03 | Phase 6 | Complete |
| DELV-01 | Phase 7 | Complete |
| DELV-02 | Phase 7 | Complete |
| CONV-01 | Phase 7 | Complete |
| CONV-02 | Phase 7 | Complete |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-14 — all v1 requirements complete*
