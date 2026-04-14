# Phase 4: Content Processing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 04-content-processing
**Areas discussed:** Content Extraction Strategy, Extracted Content Format, Content Persistence, Error Handling & Retries
**Mode:** --auto (all decisions auto-selected)

---

## Content Extraction Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Domain-aware with strategy pattern | Route URLs to specialized extractors (arxiv API, Readability, enhanced meta) | ✓ |
| Single universal extractor | Use one extraction method for all URLs (simpler but less effective for papers) | |
| LLM-based extraction | Use AI to extract and structure content (more flexible but higher cost/latency) | |

**User's choice:** [auto] Domain-aware with strategy pattern (recommended default)
**Notes:** Arxiv papers need API-level extraction for structured metadata. Blog articles need boilerplate removal. General pages can use enhanced OG/meta approach.

---

## Extracted Content Format

| Option | Description | Selected |
|--------|-------------|----------|
| Structured with type discrimination | `{ title, body, contentType, wordCount, extractedAt }` with contentType discriminator | ✓ |
| Plain text blob | Store raw extracted text without structure | |
| JSON-LD structured data | Use schema.org structured data when available | |

**User's choice:** [auto] Structured with type discrimination (recommended default)
**Notes:** contentType discriminator lets Phase 5 AI apply different processing strategies per content type.

---

## Content Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite content table with cleanup | Separate table, content deleted after AI curation | ✓ |
| Temp files on disk | Write content to temp directory, clean up after | |
| In-memory only (Phase 4+5 coupled) | Content never persisted, Phases 4 and 5 must run together | |

**User's choice:** [auto] SQLite content table with cleanup (recommended default)
**Notes:** Decouples Phase 4 and 5 execution. Content persists between runs. Cleanup after curation satisfies PROC-03.

---

## Error Handling & Retries

| Option | Description | Selected |
|--------|-------------|----------|
| Error tracking with skip-and-retry | Record errors in DB, skip in curation, retry on next run | ✓ |
| Fail fast | Stop processing on first error | |
| Silent skip | Ignore errors, no tracking | |

**User's choice:** [auto] Error tracking with skip-and-retry (recommended default)
**Notes:** Most resilient approach. Failed URLs don't block successful ones. Next run retries failures.

---

## Claude's Discretion

- Body text truncation limit
- Fetch concurrency and rate limiting
- Readability library choice
- Arxiv API parsing details
- User-Agent string
- Fetch timeout

## Deferred Ideas

None
