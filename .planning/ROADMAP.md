# Roadmap: Second Brain

**Project:** Automated browsing capture and AI curation system for Obsidian vault
**Core Value:** Every page you visit is captured and intelligently surfaced — you never lose track of what caught your attention
**Granularity:** Standard (5-8 phases, 3-5 plans each)
**Status:** Active

## Phases

- [ ] **Phase 1: Browser Extension Foundation** - Passive capture of URLs, titles, and metadata from Chrome and Comet
- [ ] **Phase 2: Data Export Pipeline** - Bridge extension storage to processing layer with versioned schema
- [ ] **Phase 3: Daily Note Generation** - Create Obsidian-compatible markdown files with chronological timeline
- [ ] **Phase 4: Content Processing** - Fetch and process full page content for AI analysis
- [ ] **Phase 5: AI Curation** - Generate intelligent summaries with topic clustering and wikilink matching
- [ ] **Phase 6: Automation & Infrastructure** - Hourly processing with launchd scheduling and swappable LLM providers
- [ ] **Phase 7: Conversation Capture & Delivery** - Claude Code skill for AI conversations and email digest delivery

## Phase Details

### Phase 1: Browser Extension Foundation
**Goal**: Users can passively capture browsing activity from Chrome and Comet browsers without manual intervention
**Depends on**: Nothing (first phase)
**Requirements**: CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05
**Success Criteria** (what must be TRUE):
  1. User visits a page in Chrome and the URL, title, domain, and timestamp are automatically logged without any clicks
  2. User visits a page in Comet browser and the URL, title, domain, and timestamp are automatically logged
  3. User can view captured browsing data even when the extension wasn't running (fallback to history export)
  4. User browses Gmail, Google Search, or social media and these sites are NOT captured (smart blocklist works)
  5. User can edit a config file to add domains to blocklist or remove domains from blocklist
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold WXT project, define type contracts, create test infrastructure and default blocklist
- [ ] 01-02-PLAN.md — Implement core capture engine (service worker, dwell tracking, blocklist filtering)
- [ ] 01-03-PLAN.md — Implement popup UI (status dashboard, pause toggle, quick-block button)
- [ ] 01-04-PLAN.md — Implement history backfill, wire into startup, verify Chrome and Comet browsers

### Phase 2: Data Export Pipeline
**Goal**: Captured browsing data can be extracted from extension storage into a format suitable for batch processing
**Depends on**: Phase 1
**Requirements**: NOTE-04, STOR-01, STOR-02, STOR-03
**Success Criteria** (what must be TRUE):
  1. User runs a CLI command and captured URLs are exported from extension storage to the local SQLite database
  2. Database tracks processing status per URL (captured → content fetched → curated → written to vault)
  3. URLs visited multiple times in a day are deduplicated to one entry
  4. Exported data includes schema version number (enables future migrations)
  5. Export validates data structure and reports any corruption or missing fields
  6. User can trigger export manually as fallback if automation fails
**Plans**: TBD

### Phase 3: Daily Note Generation
**Goal**: Users can see their browsing activity organized as daily Obsidian-compatible markdown files
**Depends on**: Phase 2
**Requirements**: NOTE-01, NOTE-02, NOTE-03, STOR-04, STOR-05, STOR-06
**Success Criteria** (what must be TRUE):
  1. User opens Obsidian and sees a new markdown file for today's date in the vault
  2. Daily note contains a chronological timeline of visited URLs with timestamps at the bottom
  3. User browses throughout the day and new items appear in the timeline incrementally (appended each processing cycle)
  4. Daily note uses valid Obsidian markdown with proper YAML frontmatter and can be opened without errors
  5. User can open Obsidian while processing runs and the file is not corrupted (atomic writes work)
  6. User can regenerate a daily note from the database if the vault file is corrupted or deleted
  7. User can configure output to go inside an Obsidian vault (default) or to a standalone folder
  8. Each processing cycle auto-commits the final .md files to git in the output folder (only markdown tracked, no DB or temp files)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Content Processing
**Goal**: System can fetch and analyze full page content to enable substantive AI summaries
**Depends on**: Phase 3
**Requirements**: PROC-01, PROC-02, PROC-03, PROC-04
**Success Criteria** (what must be TRUE):
  1. User visits an arxiv paper and the system fetches the full paper content via arxiv API (not just the title)
  2. User visits a blog post and the system extracts article text (not just title/description)
  3. User can verify that vault storage stays small over time (full content is not stored, only metadata)
  4. Processing runs and only handles URLs captured since the last run (incremental processing works)
**Plans**: TBD

### Phase 5: AI Curation
**Goal**: Users receive intelligent summaries with topic clustering and automatic links to existing vault notes
**Depends on**: Phase 4
**Requirements**: CURE-01, CURE-02, CURE-03, CURE-04, CURE-05, CURE-06, INFR-01
**Success Criteria** (what must be TRUE):
  1. User opens daily note and sees a curated executive summary at the top with 3-5 bullet points
  2. Summary includes topic clustering (e.g. "you looked at 4 RL papers today") not just a raw list
  3. Summaries are substantive and based on full page content (not just titles)
  4. User browses multiple times during the day and the summary is regenerated each hourly cycle with cumulative data
  5. End-of-day summary is more polished than hourly incremental summaries (final consolidation pass works)
  6. Summary includes [[wikilinks]] to existing vault notes when AI detects matching topics
  7. User can switch between Claude API and local Ollama in config file without code changes
**Plans**: TBD

### Phase 6: Automation & Infrastructure
**Goal**: System runs automatically every hour without manual triggers and handles sleep/wake cycles correctly
**Depends on**: Phase 5
**Requirements**: INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. User closes laptop at 3 PM and opens it at 5 PM, and missed hourly runs execute automatically on wake
  2. User does nothing and processing runs at the top of every hour without manual intervention
  3. Processing logs are written to a predictable location so user can debug failures
  4. All generated markdown files are valid Obsidian format with proper [[wikilinks]] and frontmatter
**Plans**: TBD

### Phase 7: Conversation Capture & Delivery
**Goal**: Users can capture AI conversation topics and receive morning email digests without opening Obsidian
**Depends on**: Phase 6
**Requirements**: CONV-01, CONV-02, DELV-01, DELV-02
**Success Criteria** (what must be TRUE):
  1. User has a Claude Code conversation and conversation topics/summary appear in the daily note alongside browsing data
  2. Captured AI conversation data is formatted consistently with browsing data (same timeline structure)
  3. User wakes up in the morning and has received an email with yesterday's highlights
  4. Email contains the same curated summary as the top of the daily note
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Browser Extension Foundation | 0/4 | Planning complete | - |
| 2. Data Export Pipeline | 0/? | Not started | - |
| 3. Daily Note Generation | 0/? | Not started | - |
| 4. Content Processing | 0/? | Not started | - |
| 5. AI Curation | 0/? | Not started | - |
| 6. Automation & Infrastructure | 0/? | Not started | - |
| 7. Conversation Capture & Delivery | 0/? | Not started | - |

## Milestones

Current milestone: **v1.0 - Initial Release**
- All phases 1-7 complete
- 100% requirement coverage validated
- System runs hourly with end-of-day consolidation

---
*Roadmap created: 2026-04-09*
*Last updated: 2026-04-09*
