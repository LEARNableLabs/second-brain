# Phase 4: Content Processing - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Fetch and process full page content for captured URLs to enable substantive AI summaries in Phase 5. A `second-brain fetch` CLI subcommand reads URLs with status `written` from the SQLite database, applies domain-aware content extraction (arxiv API for papers, Readability-style for articles, enhanced meta for general pages), stores extracted text temporarily in a SQLite content table, and marks entries as `content_fetched`. Content is stored only until Phase 5 AI processing completes, then discarded — vault stores only metadata + AI summaries.

</domain>

<decisions>
## Implementation Decisions

### Content Extraction Strategy
- **D-01:** Domain-aware extraction with a strategy pattern. Each URL is routed to the appropriate extractor based on domain:
  - `arxiv.org` → arxiv API (structured abstract, authors, categories)
  - General articles/blogs → Readability-style extraction (article body text, stripped of nav/ads/boilerplate)
  - Everything else → Enhanced meta fetcher (OG tags + first N paragraphs of body text)
- **D-02:** Extraction strategy is extensible — new domain handlers can be added without modifying the router. Plugin-style pattern where each handler declares which domains it handles.
- **D-03:** The existing `meta-fetcher.ts` (Phase 3) remains unchanged for daily note generation. Phase 4 adds a separate, deeper content extraction layer that runs after notes are generated.

### Extracted Content Format
- **D-04:** Extracted content stored as a structured object: `{ title, body, contentType, wordCount, extractedAt }`. The `contentType` discriminator (`'article' | 'paper' | 'general'`) tells Phase 5 AI how to process each item.
- **D-05:** Body text is plain text (HTML stripped), truncated to a reasonable limit to control downstream token costs. Exact limit is Claude's discretion.

### Content Persistence
- **D-06:** Extracted content stored in a separate SQLite `content` table, joined to `captures` by URL + date. Keeps the captures table lean while content is in transit.
- **D-07:** Content is ephemeral — after Phase 5 AI curation processes it, the content rows are deleted. This satisfies PROC-03 (fetched content used for analysis then discarded).
- **D-08:** If content already exists for a URL+date (re-run scenario), the existing content is overwritten with fresh fetch.

### Processing Pipeline
- **D-09:** Phase 4 processes entries with status `written` (after Phase 3 has generated the daily note). Status transitions: `written → content_fetched`. Phase 5 then reads `content_fetched` entries.
- **D-10:** Processing is incremental — only handles URLs not yet at `content_fetched` status. Running `second-brain fetch` multiple times in a day is safe (idempotent for already-processed URLs).

### Error Handling
- **D-11:** Failed fetches record error info in the content table (URL, error message, timestamp). These entries are skipped during Phase 5 AI curation.
- **D-12:** On next run, previously-failed URLs are retried (content table error entries are overwritten on re-fetch attempt).

### CLI Integration
- **D-13:** CLI command is `second-brain fetch` — follows the subcommand pattern. Pipeline is: `export` → `generate` → `fetch` → `curate` (Phase 5).
- **D-14:** Supports `--date YYYY-MM-DD` flag (default: today) and `--dry` flag (show what would be fetched without fetching).

### Claude's Discretion
- Body text truncation limit (balance between content quality and token costs)
- Concurrency level for parallel fetches (how many URLs to fetch simultaneously)
- Rate limiting strategy per domain (avoid hammering same server)
- Readability library choice (mozilla/readability, @extractus/article-extractor, or similar)
- Arxiv API response parsing details
- User-Agent string for content fetching
- Timeout per fetch request

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Content Processing — PROC-01 (fetch full content), PROC-02 (domain-aware extraction), PROC-03 (content discarded after AI analysis), PROC-04 (incremental processing)

### Prior Phase Context
- `.planning/phases/03-daily-note-generation/03-CONTEXT.md` — Phase 3 decisions on meta fetcher, note layout, CLI naming, status pipeline
- `.planning/phases/02-data-export-pipeline/02-CONTEXT.md` — Phase 2 decisions on SQLite schema, CLI structure, monorepo layout

### Existing Code (source of truth)
- `pipeline/src/generators/meta-fetcher.ts` — Existing lightweight meta fetcher (cheerio-based). Phase 4 adds deeper extraction alongside this
- `pipeline/src/db/operations.ts` — `getByStatus()`, `updateStatus()` functions for reading/updating capture status
- `pipeline/src/db/connection.ts` — Database connection and path resolution
- `pipeline/src/commands/generate.ts` — Phase 3 generate command pattern to follow for the new fetch command
- `pipeline/src/config/reader.ts` — Config loading pattern
- `shared/src/types.ts` — `ProcessingStatus` type with `content_fetched` status already defined

### Project Context
- `.planning/ROADMAP.md` — Phase 4 success criteria (4 items) and dependency on Phase 3
- `.planning/PROJECT.md` — Core constraint: "Storage: Metadata + AI summaries only — full content fetched for processing but not stored"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipeline/src/generators/meta-fetcher.ts` — `fetchMetaDescription()` pattern (cheerio + fetch + timeout). Can inform the general-page extractor implementation
- `pipeline/src/db/operations.ts` — `getByStatus(db, 'written')` returns entries ready for content processing. `updateStatus()` marks them as `content_fetched`
- `pipeline/src/commands/generate.ts` — Command pattern with db lifecycle, config loading, dry-run support. Follow this structure for the fetch command
- `pipeline/src/config/reader.ts` — Zod-validated config with `loadConfig()` and `getOutputDir()`

### Established Patterns
- **Commander CLI** — Subcommand pattern with options (--date, --dry)
- **Zod validation** — All data crossing boundaries validated
- **better-sqlite3** — Synchronous SQLite, transaction support
- **cheerio** — Already a dependency for HTML parsing
- **Promise.allSettled** — Used in meta-fetcher for parallel fetches with individual error handling

### Integration Points
- Phase 3 marks captures as `written` → Phase 4 reads `written` status entries
- Phase 4 stores content in new `content` table → Phase 5 reads content for AI analysis
- Phase 4 marks captures as `content_fetched` → Phase 5 reads `content_fetched` entries
- After Phase 5 processes content, content table rows are deleted (PROC-03)

</code_context>

<specifics>
## Specific Ideas

- Arxiv extraction should pull structured data: title, authors, abstract, categories, published date. This gives Phase 5 AI rich context for paper clustering
- Readability extraction should preserve paragraph structure (double newline separated) for better AI comprehension
- The `second-brain` CLI pipeline now becomes: `export` → `generate` → `fetch` → `curate` (Phase 5)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-content-processing*
*Context gathered: 2026-04-14*
