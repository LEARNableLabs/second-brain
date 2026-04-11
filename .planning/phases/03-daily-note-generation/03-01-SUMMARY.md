---
phase: 03-daily-note-generation
plan: 01
subsystem: markdown-generation
tags: [tdd, generators, markdown, yaml, obsidian]
dependency_graph:
  requires: [pipeline/src/db/operations.ts, shared/src/types.ts]
  provides: [generateDailyNote, buildFrontmatter, formatEntry, escapeMarkdown, groupByDomain]
  affects: []
tech_stack:
  added: [gray-matter@4.0.3]
  patterns: [TDD, pure functions, YAML frontmatter serialization]
key_files:
  created:
    - pipeline/src/generators/frontmatter.ts
    - pipeline/src/generators/markdown.ts
    - pipeline/tests/generators/markdown.test.ts
  modified:
    - pipeline/package.json
    - package-lock.json
key_decisions:
  - Use gray-matter for YAML serialization to prevent injection attacks (T-03-02)
  - Escape markdown special characters in titles only, not URLs (T-03-01)
  - Group domains alphabetically for consistent output (idempotency)
  - Two-line entry format with indented description
  - Source markers: star prefix for manual, suffix for backfill, no marker for live
metrics:
  duration_seconds: 136
  tasks_completed: 1
  tests_added: 17
  files_created: 3
  files_modified: 2
  completed_date: "2026-04-11"
---

# Phase 03 Plan 01: Markdown Generation Engine Summary

**One-liner:** TDD implementation of Obsidian markdown generator with YAML frontmatter, domain-grouped browsing log, source markers, and idempotent output.

## What Was Built

Built the core markdown rendering layer that transforms `CaptureRow[]` database records into Obsidian-compatible daily note content. The engine produces valid YAML frontmatter with capture metadata, a Highlights placeholder section for future AI curation, and a domain-grouped Browsing Log with proper entry formatting and source markers.

### Key Components

**`pipeline/src/generators/frontmatter.ts`:**
- `buildFrontmatter(date, entries)` — Constructs frontmatter object with date, capture counts, manual count, top 5 domains, and browser list
- `renderFrontmatter(date, entries)` — Uses gray-matter to safely serialize frontmatter to YAML (prevents injection via special chars)

**`pipeline/src/generators/markdown.ts`:**
- `escapeMarkdown(text)` — Escapes markdown special characters `[]*_()#\`-!+` to prevent link syntax breakage
- `formatEntry(entry, description?)` — Two-line entry format: title link with URL path, then indented description. Adds ⭐ prefix for manual saves, `*(from history)*` suffix for backfill entries
- `groupByDomain(entries)` — Groups entries by domain, sorts domain keys alphabetically for consistent output
- `generateDailyNote(date, entries, descriptions?)` — Orchestrates full note generation: frontmatter + Highlights placeholder + domain-grouped Browsing Log

### Output Format Example

```markdown
---
date: '2026-04-10'
captures: 5
manual: 1
top_domains:
  - example.com
  - arxiv.org
browsers:
  - Chrome
  - Comet
---

## Highlights

*AI-curated summary will appear here after Phase 5*

## Browsing Log

### arxiv.org

- ⭐ [Research Paper](https://arxiv.org/paper1) — arxiv.org/paper1
  Important paper saved manually

- [Another Paper](https://arxiv.org/paper2) — arxiv.org/paper2 *(from history)*
  Backfilled from browser history

### example.com

- [Example Page](https://example.com/page1) — example.com/page1
  A great article

```

## Requirements Satisfied

- **NOTE-01** (Daily Note Format): Generates Obsidian markdown with YAML frontmatter, Highlights section, and Browsing Log
- **NOTE-02** (Frontmatter Metadata): Includes date, capture counts, manual count, top domains, browsers
- **STOR-04** (Idempotency): Same input always produces identical output — critical for regeneration

## Technical Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Use gray-matter for YAML | Prevents YAML injection via special characters in domain names or titles (T-03-02) | Security: Safe frontmatter serialization |
| Escape markdown in titles only | URLs must remain unescaped to work as links (T-03-01) | Correctness: Links render properly |
| Alphabetical domain grouping | Ensures consistent output order for idempotency | UX: Predictable browsing log structure |
| Two-line entry format | Separates metadata from description for readability (D-04) | UX: Clean, scannable entries |
| Star prefix for manual saves | Visual indicator for high-value content (D-06) | UX: Manual saves stand out |
| Optional description parameter | Supports future AI-generated descriptions | Extensibility: Ready for Phase 5 integration |

## TDD Cycle

**RED (72s):** Wrote 17 failing tests covering:
- Frontmatter generation with varying capture counts
- Markdown escaping for special characters
- Entry formatting for all source types (live, manual, backfill)
- Domain grouping and alphabetical sorting
- Full note generation with all sections
- Idempotency verification

**GREEN (51s):** Implemented all functions to pass tests:
- Installed gray-matter for YAML serialization
- Built frontmatter generation with metadata extraction
- Implemented markdown escaping with regex
- Created entry formatter with source-specific prefixes/suffixes
- Added domain grouping with alphabetical sort
- Orchestrated full note generation

**REFACTOR (13s):** Minor cleanup:
- Extracted pathname from URL for cleaner display
- Ensured consistent blank line spacing
- Verified idempotency (generateDailyNote called twice produces identical output)

## Test Coverage

17 unit tests covering:
- ✅ Frontmatter with 5 captures across 2 domains
- ✅ Frontmatter with 0 captures
- ✅ YAML frontmatter block structure
- ✅ Markdown special character escaping
- ✅ Normal text unchanged
- ✅ All special characters escaped
- ✅ Live capture formatting
- ✅ Manual capture with star prefix
- ✅ Backfill capture with history suffix
- ✅ Entry without description
- ✅ Title escaping in entries
- ✅ Domain grouping and alphabetical sort
- ✅ Full note structure (frontmatter + Highlights + Browsing Log)
- ✅ Domain subheadings
- ✅ Formatted entries with source markers
- ✅ Idempotency (same input → same output)
- ✅ Empty entries handling

All tests passing: `npm test --workspace=pipeline -- tests/generators/markdown.test.ts`

## Deviations from Plan

None — plan executed exactly as written. TDD cycle followed (RED → GREEN → REFACTOR). All acceptance criteria met.

## Threat Mitigations

**T-03-01 (Tampering - markdown special chars):**
- Implemented `escapeMarkdown()` function
- Escapes `[]*_()#\`-!+` in titles to prevent link syntax breakage
- URLs remain unescaped so links work correctly

**T-03-02 (Tampering - YAML injection):**
- Using gray-matter's `stringify()` for YAML generation
- Never concatenate YAML manually
- Prevents injection via special characters in domain names or titles

## Known Stubs

None — all functions are fully implemented with complete functionality.

## Integration Points

**Consumes:**
- `pipeline/src/db/operations.ts` → `CaptureRow` type
- `shared/src/types.ts` → `ProcessingStatus` type (via CaptureRow)

**Provides:**
- `generateDailyNote()` → Main API for daily note generation
- `buildFrontmatter()` → Frontmatter object construction
- `formatEntry()` → Entry formatting with source markers
- `escapeMarkdown()` → Markdown safety utility
- `groupByDomain()` → Domain grouping utility

**Next Plan Dependencies:**
- Plan 03-02 will integrate `generateDailyNote()` into the daily note writer
- Descriptions parameter ready for Phase 5 AI-generated summaries

## Lessons Learned

1. **gray-matter quote style:** Library outputs single-quoted YAML strings, not double-quoted. Tests adjusted to accept both formats with regex matching.

2. **Pure functions enable easy testing:** All functions are pure (no I/O, no side effects), making TDD smooth. Descriptions passed as optional Map parameter rather than fetching internally.

3. **Idempotency requires deterministic ordering:** Alphabetical domain sorting ensures consistent output. Entries within domains maintain database timestamp order.

4. **Two-line format improves readability:** Separating title/URL from description makes entries scannable. Two-space indentation follows markdown list conventions.

## Next Steps

1. **Plan 03-02:** Implement daily note writer that calls `generateDailyNote()` and saves to vault
2. **Plan 03-03:** Add note regeneration for edits (leverage idempotency)
3. **Phase 5:** Wire AI-generated descriptions into the `descriptions` Map parameter

## Self-Check

### Files Created

```bash
✅ FOUND: pipeline/src/generators/frontmatter.ts
✅ FOUND: pipeline/src/generators/markdown.ts
✅ FOUND: pipeline/tests/generators/markdown.test.ts
```

### Commits Exist

```bash
✅ FOUND: 5b29d09 (feat(03-01): implement markdown generation engine with TDD)
```

### Tests Pass

```bash
✅ PASSED: npm test --workspace=pipeline -- tests/generators/markdown.test.ts
   17 tests passed
```

## Self-Check: PASSED

All files created, commit exists, tests passing. Plan complete.
