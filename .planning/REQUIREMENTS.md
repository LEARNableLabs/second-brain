# Requirements: Second Brain

**Defined:** 2026-04-09
**Core Value:** Every page you visit is captured and intelligently surfaced — you never lose track of what caught your attention.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Capture

- [ ] **CAPT-01**: Browser extension passively captures URL, title, domain, and timestamp from Chrome
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
| CAPT-01 | — | Pending |
| CAPT-02 | — | Pending |
| CAPT-03 | — | Pending |
| CAPT-04 | — | Pending |
| CAPT-05 | — | Pending |
| NOTE-01 | — | Pending |
| NOTE-02 | — | Pending |
| NOTE-03 | — | Pending |
| NOTE-04 | — | Pending |
| PROC-01 | — | Pending |
| PROC-02 | — | Pending |
| PROC-03 | — | Pending |
| PROC-04 | — | Pending |
| CURE-01 | — | Pending |
| CURE-02 | — | Pending |
| CURE-03 | — | Pending |
| CURE-04 | — | Pending |
| CURE-05 | — | Pending |
| CURE-06 | — | Pending |
| INFR-01 | — | Pending |
| INFR-02 | — | Pending |
| INFR-03 | — | Pending |
| DELV-01 | — | Pending |
| DELV-02 | — | Pending |
| CONV-01 | — | Pending |
| CONV-02 | — | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 0
- Unmapped: 26 ⚠️

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after initial definition*
