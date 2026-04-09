# Requirements: Second Brain

**Defined:** 2026-04-09
**Core Value:** Every page you visit is captured and intelligently surfaced — you never lose track of what caught your attention.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Capture

- [x] **CAPT-01**: Browser extension passively captures URL, title, domain, and timestamp from Chrome
- [ ] **CAPT-02**: Browser extension passively captures URL, title, domain, and timestamp from Comet browser
- [ ] **CAPT-03**: Browser history export pulls browsing data as fallback when extension isn't running
- [ ] **CAPT-04**: Smart default blocklist filters Gmail, Google Search, banking, and social media domains
- [ ] **CAPT-05**: User can customize blocklist/allowlist via editable config file

### Daily Note

- [ ] **NOTE-01**: System creates one Obsidian-compatible .md file per day in the vault
- [ ] **NOTE-02**: Daily note contains a raw chronological timeline log with timestamps at the bottom
- [ ] **NOTE-03**: New items are appended incrementally each processing cycle (hourly)
- [ ] **NOTE-04**: User can trigger daily note generation on-demand via CLI command

### Content Processing

- [ ] **PROC-01**: System fetches full page content at processing time for captured URLs (articles, papers, blog posts)
- [ ] **PROC-02**: System uses domain-aware extraction (e.g. arxiv API for papers, article extractors for blogs, OpenGraph for general pages)
- [ ] **PROC-03**: Fetched content is used for AI analysis then discarded — only metadata + AI summaries stored
- [ ] **PROC-04**: Processing runs incrementally every hour via launchd, handling only new captures since last run

### AI Curation

- [ ] **CURE-01**: AI generates a curated executive summary at the top of the daily note
- [ ] **CURE-02**: Executive summary is regenerated each hourly cycle with all data so far (append + live summary pattern)
- [ ] **CURE-03**: AI clusters related items by topic (e.g. "you looked at 4 RL papers today")
- [ ] **CURE-04**: AI summaries are substantive — based on full page content, not just titles
- [ ] **CURE-05**: End-of-day final consolidation pass produces polished summary for the complete day
- [ ] **CURE-06**: Curated items auto-link to existing vault notes via [[wikilinks]] when topics match

### Storage

- [ ] **STOR-01**: Local SQLite database serves as processing layer — source of truth for all captured data
- [ ] **STOR-02**: Database tracks processing status per URL (captured → content fetched → curated → written to vault)
- [ ] **STOR-03**: Database deduplicates URLs visited multiple times (one entry per unique URL per day)
- [ ] **STOR-04**: Daily notes can be regenerated from the database if vault files are corrupted or deleted
- [ ] **STOR-05**: Output location is configurable — user chooses between inside Obsidian vault (default) or standalone folder
- [ ] **STOR-06**: Output folder is git-tracked — each processing cycle auto-commits the final .md files (only markdown, no DB or temp files)

### Infrastructure

- [ ] **INFR-01**: LLM provider is swappable between Claude API (default) and local Ollama
- [ ] **INFR-02**: Hourly processing scheduled via macOS launchd (handles sleep/wake correctly)
- [ ] **INFR-03**: All output is valid Obsidian Markdown with proper [[wikilinks]] and frontmatter

### Delivery

- [ ] **DELV-01**: Morning email digest with highlights sent via Gmail/gws CLI
- [ ] **DELV-02**: Email contains the curated summary (same content as daily note top section)

### AI Conversation Capture

- [ ] **CONV-01**: Claude Code skill captures conversation topics and summaries to the daily resource page
- [ ] **CONV-02**: Captured AI conversation data is included in the daily note alongside browsing data

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
| CAPT-02 | Phase 1 | Pending |
| CAPT-03 | Phase 1 | Pending |
| CAPT-04 | Phase 1 | Pending |
| CAPT-05 | Phase 1 | Pending |
| NOTE-01 | Phase 3 | Pending |
| NOTE-02 | Phase 3 | Pending |
| NOTE-03 | Phase 3 | Pending |
| NOTE-04 | Phase 2 | Pending |
| PROC-01 | Phase 4 | Pending |
| PROC-02 | Phase 4 | Pending |
| PROC-03 | Phase 4 | Pending |
| PROC-04 | Phase 4 | Pending |
| CURE-01 | Phase 5 | Pending |
| CURE-02 | Phase 5 | Pending |
| CURE-03 | Phase 5 | Pending |
| CURE-04 | Phase 5 | Pending |
| CURE-05 | Phase 5 | Pending |
| CURE-06 | Phase 5 | Pending |
| STOR-01 | Phase 2 | Pending |
| STOR-02 | Phase 2 | Pending |
| STOR-03 | Phase 2 | Pending |
| STOR-04 | Phase 3 | Pending |
| STOR-05 | Phase 3 | Pending |
| STOR-06 | Phase 3 | Pending |
| INFR-01 | Phase 5 | Pending |
| INFR-02 | Phase 6 | Pending |
| INFR-03 | Phase 6 | Pending |
| DELV-01 | Phase 7 | Pending |
| DELV-02 | Phase 7 | Pending |
| CONV-01 | Phase 7 | Pending |
| CONV-02 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after roadmap creation*
