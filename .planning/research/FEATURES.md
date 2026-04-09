# Feature Research

**Domain:** Automated Browsing Capture & AI Curation for Knowledge Management
**Researched:** 2026-04-09
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Automatic browsing capture | Core premise — passive logging without user intervention | MEDIUM | Browser extension + history API integration (Manifest V3 constraints apply) |
| Daily notes generation | Standard pattern in knowledge management — users expect one file per day | LOW | Core Obsidian pattern, well-established workflow |
| Customizable blocklist | Privacy control — users need to exclude banking, email, sensitive sites | LOW | Domain-based filtering with sensible defaults (social media, search engines) |
| Manual sync/trigger | Fallback when automation fails — users expect control | LOW | CLI command or manual script execution |
| URL + title + timestamp | Minimum metadata to make captures useful for recall | LOW | Standard browser history API data |
| Search/filter capability | Finding past visits without scrolling through raw logs | MEDIUM | Depends on volume — Obsidian native search may suffice for metadata-only |
| Mobile-readable format | Users check notes on phones; broken mobile = unusable | LOW | Obsidian markdown renders on mobile; test on iOS/Android |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI topic clustering | Surfaces "you looked at 4 RL papers today" instead of raw chronological list | MEDIUM | Semantic analysis of titles/domains; requires LLM |
| Smart unread queue | Identifies tabs opened briefly but not read (< 30 sec dwell time) | HIGH | Requires dwell time tracking via extension, not just history API |
| Auto-linking to vault notes | Creates [[wikilinks]] when AI detects topic matches existing notes | HIGH | Requires vault indexing + semantic matching; high value for existing Obsidian users |
| Swappable LLM providers | Privacy flexibility — cloud (Claude API) or local (Ollama) | MEDIUM | Abstraction layer for LLM calls; critical for privacy-conscious users |
| Email digest with highlights | Proactive delivery — summary lands in inbox each morning | LOW | Uses existing `gws` CLI for Gmail integration |
| Curated "executive summary" | AI-generated 3-5 bullet points at top of daily note, not raw dumps | LOW | Prompt engineering; adds immediate value on page load |
| Contextual priority scoring | AI ranks which items deserve attention vs background noise | MEDIUM | Requires understanding user's vault topics + behavioral patterns |
| Cross-browser support | Works with Chrome AND Comet (less common browser) | MEDIUM | Multiple extension builds or browser history file parsing |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full page archival | "I want content, not just URLs" | Storage explosion, slow processing, copyright/privacy issues, complex JS rendering | Metadata-only + link to original source; use dedicated archival tools (Archive.org) if needed |
| Real-time curation | "Show me insights as I browse" | Interrupts focus, high compute cost, generates noise on incomplete browsing sessions | End-of-day batch processing matches review workflow (next morning digest) |
| Manual bookmarking/selection | "Let me choose what to capture" | Defeats passive capture premise, adds friction, users forget to bookmark | Capture everything, filter with smart blocklist + AI curation |
| Tag-based categorization | "I want tags like #research #work" | Creates parallel taxonomy to existing vault structure, tag maintenance burden | Use [[wikilinks]] to existing notes instead; leverage vault's existing organization |
| Browser-based UI for review | "Show curated list in extension popup" | Limited screen space, doesn't integrate with knowledge workflow | Obsidian is the interface; browser extension is invisible capture layer |
| Shared/social features | "Let teams see each other's browsing" | Privacy nightmare, changes user behavior (browsing becomes performative), scope creep | Single-user tool; export curated notes if sharing needed |
| Multi-device sync of captures | "Capture from phone + desktop" | Desktop-only scoping already established; mobile browsers have limited extension APIs | macOS-only scope prevents feature creep; mobile views curated results in Obsidian |

## Feature Dependencies

```
Daily notes generation
    └──requires──> Browser data capture
                       └──requires──> Browser extension OR history file access

AI curation
    └──requires──> Daily notes with metadata
    └──requires──> LLM provider configuration

Auto-linking to vault
    └──requires──> AI curation
    └──requires──> Vault indexing

Email digest
    └──enhances──> AI curation
                (delivers same content via email)

Unread queue detection
    └──requires──> Dwell time tracking
                       └──requires──> Browser extension (cannot use history API alone)

Topic clustering
    └──enhances──> AI curation
                (groups related items, doesn't replace base curation)

Swappable LLM providers
    └──required by──> AI curation
                (abstraction must exist before curation features)
```

### Dependency Notes

- **Daily notes require browser capture:** Cannot generate daily summaries without captured browsing data. Browser extension provides real-time capture; history file parsing is fallback.
- **AI curation requires daily notes:** Metadata must be collected and structured before AI can analyze patterns.
- **Auto-linking requires vault indexing:** Must know what notes exist in vault to create [[wikilinks]]. Requires scanning vault structure on first run + incremental updates.
- **Unread queue requires extension:** Browser history API doesn't track dwell time (only visit time). Extension must inject timing listeners. HIGH complexity, defer to v2.
- **LLM abstraction must be first:** All AI features depend on swappable provider interface. Build abstraction before specific curation features.
- **Email digest enhances curation:** Takes same AI-generated summary, formats as email, sends via `gws`. Low cost addition after curation works.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Browser extension (Chrome)** — Captures URL + title + timestamp from active browsing, writes to daily note
- [ ] **Smart default blocklist** — Filters out Gmail, Google Search, social media, banking by domain pattern (prevents noise)
- [ ] **Daily note generation** — Creates one .md file per day in vault with raw chronological log
- [ ] **Basic AI curation** — Generates 3-5 bullet executive summary at top of daily note using Claude API
- [ ] **End-of-day automation** — Cron/launchd job runs curation at 11pm, results ready next morning
- [ ] **Swappable LLM config** — Environment variable toggles between Claude API and local Ollama endpoint

**Rationale:** This is the minimum to validate "passive capture + AI curation = useful second brain." Real-time capture, basic filtering, AI summary, automated delivery. No fancy features yet.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Topic clustering** — If users engage with summaries, add "you looked at 4 papers on X" grouping (trigger: users open daily notes regularly)
- [ ] **Auto-linking to vault notes** — If users have large existing vaults, connect captures to existing knowledge (trigger: request from power users with 500+ notes)
- [ ] **Email digest** — If users prefer email over opening Obsidian (trigger: feedback requesting email delivery)
- [ ] **Customizable blocklist UI** — If default blocklist is too broad/narrow (trigger: users manually editing blocklist config file)
- [ ] **Comet browser support** — Add second browser once Chrome version is stable (trigger: v1 works reliably for 2 weeks)
- [ ] **Historical import** — Backfill last 30 days of browsing history on first run (trigger: users want context before starting)

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Unread queue detection** — HIGH complexity (requires dwell time tracking extension logic); defer until core curation proves valuable
- [ ] **Contextual priority scoring** — Requires understanding user's vault structure + behavioral patterns; needs data from v1 usage
- [ ] **Multi-week trend analysis** — "You've been researching X for 2 weeks" requires longitudinal data collection
- [ ] **Page content extraction** — Only add if users request ability to search page text (vs just titles); storage/performance implications
- [ ] **Firefox/Safari extensions** — Manifest differences; only worth effort if user base grows beyond initial user
- [ ] **Team/shared vault mode** — Scope change; requires privacy model redesign

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Browser capture (Chrome) | HIGH | MEDIUM | P1 |
| Daily note generation | HIGH | LOW | P1 |
| Basic AI curation | HIGH | MEDIUM | P1 |
| Smart blocklist defaults | HIGH | LOW | P1 |
| End-of-day automation | HIGH | LOW | P1 |
| Swappable LLM providers | HIGH | MEDIUM | P1 |
| Topic clustering | MEDIUM | MEDIUM | P2 |
| Email digest | MEDIUM | LOW | P2 |
| Auto-linking to vault | HIGH | HIGH | P2 |
| Customizable blocklist UI | MEDIUM | LOW | P2 |
| Comet browser support | MEDIUM | MEDIUM | P2 |
| Historical import | MEDIUM | LOW | P2 |
| Unread queue detection | MEDIUM | HIGH | P3 |
| Priority scoring | LOW | HIGH | P3 |
| Multi-week trends | LOW | MEDIUM | P3 |
| Page content extraction | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — core value proposition
- P2: Should have, add when possible — enhances value, validates feature-market fit
- P3: Nice to have, future consideration — requires v1/v2 data to build correctly

## Competitor Feature Analysis

| Feature | Browser History Extensions (TraceMind, Better History) | Read-Later Apps (Readwise Reader, Instapaper) | Knowledge Management (Obsidian Browser History Plugin) | Our Approach |
|---------|--------------|--------------|--------------|-------------|
| **Capture method** | Query Chrome history API manually | Manual bookmarking/save button | Periodic sync from browser DB file | Browser extension for real-time capture + history fallback |
| **Content storage** | URL + title + metadata | Full page archival (reader view) | URL + title + timestamp | Metadata-only (URL + title + timestamp + domain) |
| **Organization** | Search/filter by date, domain, tags | Folders or tags | Chronological daily notes | AI-generated topic clustering + executive summary |
| **AI features** | Semantic search (TraceMind 2026) | Auto-summarization, GPT chat with highlights | None (raw data dump) | AI curation (clustering, summary, auto-linking to vault) |
| **Privacy model** | Cloud-based (search indexes sent to server) | Cloud storage required | Local-only | Swappable: Cloud (Claude API) OR local (Ollama) |
| **Integration** | Standalone browser extension UI | Web app + browser extension | Creates Obsidian notes, no curation | Deep Obsidian integration (wikilinks, daily notes pattern, vault auto-linking) |
| **Automation** | Manual search when needed | Manual "read later" saving | Scheduled sync, manual trigger | Fully passive capture + automated end-of-day curation |
| **Unread queue** | Not addressed | Core feature (reading list management) | Not addressed | Planned for v2 (requires dwell time tracking) |
| **Email delivery** | Not offered | Some offer newsletter-style digests | Not offered | Email digest as v1.x enhancement via `gws` CLI |

**Key differentiators vs competitors:**
1. **Fully passive** — No manual bookmarking (vs read-later apps), no manual search (vs history extensions)
2. **AI-first curation** — Topic clustering and auto-linking (vs raw dumps from Obsidian plugin)
3. **Privacy flexibility** — Local LLM option (vs cloud-only TraceMind/Readwise)
4. **Obsidian-native** — Lives in existing knowledge workflow, not separate app (vs Readwise web app)
5. **Batch processing** — End-of-day review matches knowledge work patterns (vs real-time interruptions)

## Sources

### Browser History & Tab Management
- [Best Browser History Extensions for Chrome, Firefox & Edge (2026)](https://tracemind.app/blog/best-browser-history-extensions-2026)
- [Best Chrome Tab Organizer Extensions in 2026](https://www.bookmarkify.io/blog/chrome-tab-organizer)
- [Browser History Plugin for Obsidian](https://www.obsidianstats.com/plugins/browser-history)

### Read-Later & Knowledge Management
- [10 Best Read-Later Apps in 2026: Complete Comparison Guide](https://www.readless.app/blog/best-read-later-apps-comparison)
- [Readwise Reader Review: AI-Powered Reading & Research Tool](https://tutorialswithai.com/tools/readwise-reader/)
- [My 2025 Note-Taking System: Obsidian, Readwise, and AI](https://www.stefanimhoff.de/note-taking-obsidian-readwise-ai/)
- [3 AI Knowledge Management Tools for 2026](https://medium.com/illumination/3-ai-knowledge-management-tools-for-2026-d111b3e63811)

### AI Browsing & Web Clipping
- [Top 15 Agentic AI Chrome Extensions](https://www.datacamp.com/blog/top-agentic-ai-chrome-extensions)
- [The Best Web Clippers in 2026: Capture the Web Without Losing Context](https://blog.pixiebrix.com/blog/the-best-web-clippers-in-2026-capture-the-web-without-losing-context)
- [Obsidian Web Clipper Features](https://www.dsebastien.net/supercharge-your-knowledge-capture-workflow-with-the-obsidian-web-clipper/)

### Topic Clustering & Curation
- [AI Tools for Topic Clustering: The 2026 SEO Master List](https://www.clickrank.ai/best-ai-tools-for-topic-clustering/)
- [Knowledge Management in 2026: Trends, Technology & Best Practice](https://www.vable.com/blog/knowledge-management-in-2026-trends-technology-best-practice)
- [Batch Processing vs Real-Time Processing: Which One Does Your Data Actually Need?](https://medium.com/towards-data-engineering/batch-processing-vs-real-time-processing-which-one-does-your-data-actually-need-20f60172068f)

### Privacy & Local LLMs
- [Why Your Local LLM is the Ultimate Privacy Power Move in 2026](https://medium.com/@neurominimal/why-your-local-llm-is-the-ultimate-privacy-power-move-in-2026-8287859e1d06)
- [Guide to Local LLMs in 2026: Privacy, Tools & Hardware](https://www.sitepoint.com/definitive-guide-local-llms-2026-privacy-tools-hardware/)
- [How to Build a Local LLM Knowledge Base With Obsidian (2026)](https://www.modemguides.com/blogs/ai-infrastructure/local-llm-knowledge-base-obsidian-setup-guide)

### Technical Constraints
- [Building Chrome Extensions in 2026: A Practical Guide with Manifest V3](https://dev.to/ryu0705/building-chrome-extensions-in-2026-a-practical-guide-with-manifest-v3-12h2)
- [Chrome History API Documentation](https://developer.chrome.com/docs/extensions/reference/api/history)
- [Building a personal archive of the web](https://alexwlchan.net/2025/personal-archive-of-the-web/)

### Email Digest & Automation
- [8 Best Email Digest Services in 2026: Complete Comparison Guide](https://www.readless.app/blog/best-email-digest-services-2026)
- [How to Create an Automated Email Briefing in 2026: 9 Proven Steps](https://www.readless.app/blog/automated-email-briefing-guide)

### Obsidian Automation
- [Obsidian Daily Notes for Task Management (2026 Guide)](https://taskforge.md/blog/obsidian-daily-notes/)
- [Top Obsidian Plugins in 2026: The Essential List for Power Users](https://www.obsibrain.com/blog/top-obsidian-plugins-in-2026-the-essential-list-for-power-users)
- [Obsidian CLI (New in 2026)](https://help.obsidian.md/plugins/daily-notes)

---
*Feature research for: Automated Browsing Capture & AI Curation for Knowledge Management*
*Researched: 2026-04-09*
