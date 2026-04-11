# Phase 3: Daily Note Generation - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform captured browsing data from the SQLite database into Obsidian-compatible daily markdown files. Each day gets one `.md` file with a Highlights placeholder (for Phase 5 AI curation) and a browsing log grouped by domain. The `second-brain generate` CLI command reads from `~/.second-brain/data.db`, fetches lightweight meta descriptions for each URL, renders the note, writes it atomically, and auto-commits to a dedicated git repo in the output folder.

</domain>

<decisions>
## Implementation Decisions

### Note Layout & Structure
- **D-01:** Each daily note has two main sections: a `## Highlights` placeholder at top (populated by AI curation in Phase 5) and a `## Browsing Log` below with URLs grouped by domain using `### domain.com` subheadings
- **D-02:** YAML frontmatter includes rich metadata: `date`, `captures` count, `manual` count, top domains list, and source browsers (Chrome/Comet). Enables Obsidian Dataview queries from day one
- **D-03:** Timestamp display in the note is Claude's discretion — timestamps are already stored in the database and available for Phase 5 AI processing regardless of display choice

### Timeline Entry Format
- **D-04:** Each URL entry uses a two-line format: title as clickable markdown link with URL shown inline after an em dash, then an indented description line below. Example: `- [Title](url) — domain.com/path\n  Description text`
- **D-05:** Descriptions come from a lightweight meta fetch — a quick HTTP request grabs the `<meta name="description">` tag for each URL. Phase 4 content processing will enrich these later
- **D-06:** Subtle source markers distinguish entry types: star prefix (`⭐`) for manual saves, `*(from history)*` suffix for backfilled entries. Regular live captures have no marker
- **D-07:** URLs grouped under `### domain.com` subheadings within the Browsing Log section

### Incremental Update Strategy
- **D-08:** Update strategy is Claude's discretion (regenerate from DB vs true append). Database is source of truth — the note can always be rebuilt
- **D-09:** Atomic writes via temp-file-then-rename pattern. Write to a temp file in the same directory, then `fs.rename()` over the original. Obsidian detects the filesystem change and reloads

### Git Auto-Commit Behavior
- **D-10:** Output folder is initialized as its own separate git repo, independent from the second-brain project repo. Keeps note version history clean and separate from code history
- **D-11:** Commit timing and message format are Claude's discretion — balance between audit trail and git noise
- **D-12:** Only `.md` files are tracked. Database, temp files, and logs are `.gitignore`d

### CLI Integration
- **D-13:** CLI command is `second-brain generate` — follows the subcommand pattern established in Phase 2 (D-08). Future phases add `curate` (Phase 5), `status` (any time)
- **D-14:** Output location is configurable via `~/.second-brain/config.json` — defaults to inside the Obsidian vault, can be set to a standalone folder (STOR-05)

### Claude's Discretion
- Timestamp display format in the note (D-03)
- Incremental update strategy — regenerate vs append (D-08)
- Git commit timing and message format (D-11)
- Meta description fetch timeout and fallback behavior when URLs are unreachable
- Domain grouping order (alphabetical, by count, or by first-visit time)
- Handling of entries where meta description fetch fails (show title only, or domain as fallback)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Daily Note — NOTE-01, NOTE-02, NOTE-03 define note creation, timeline, and incremental update requirements
- `.planning/REQUIREMENTS.md` §Storage — STOR-04, STOR-05, STOR-06 define regeneration, configurable output, and git tracking requirements

### Prior Phase Context
- `.planning/phases/02-data-export-pipeline/02-CONTEXT.md` — Phase 2 decisions on CLI naming (`second-brain`), data location (`~/.second-brain/`), monorepo structure, and SQLite schema
- `.planning/phases/01-browser-extension-foundation/01-CONTEXT.md` — Phase 1 decisions on capture format, backfill marking, and source types

### Existing Code (source of truth)
- `pipeline/src/db/operations.ts` — `getByDate()`, `getByStatus()`, `updateStatus()` functions for reading captures from SQLite
- `pipeline/src/db/connection.ts` — Database connection setup and path resolution
- `pipeline/src/index.ts` — Commander CLI setup (add `generate` subcommand here)
- `shared/src/types.ts` — `CaptureEntry` schema with `source: 'live' | 'backfill' | 'manual'`, `ProcessingStatus` type

### Project Context
- `.planning/ROADMAP.md` — Phase 3 success criteria (8 items) and dependency on Phase 2
- `.planning/STATE.md` — Current project state and accumulated decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipeline/src/db/operations.ts` — `getByDate(db, date)` returns `CaptureRow[]` sorted by timestamp ASC. Direct input for note generation
- `pipeline/src/db/operations.ts` — `updateStatus(db, url, date, newStatus)` to mark URLs as `'written'` after note generation
- `pipeline/src/index.ts` — Commander CLI already set up with `second-brain export`. Add `generate` subcommand following the same pattern
- `shared/src/types.ts` — `CaptureEntry` and `ProcessingStatus` types shared across extension and pipeline

### Established Patterns
- **Commander CLI** — Subcommand pattern with options. `export` command shows the structure to follow
- **Zod validation** — All data crossing boundaries validated with Zod schemas
- **better-sqlite3** — Synchronous SQLite access, transaction support
- **TypeScript strict mode** — All pipeline code compiled with strict tsconfig
- **Day-based keying** — Captures stored with `YYYY-MM-DD` date column in SQLite

### Integration Points
- Phase 2 writes captures to `~/.second-brain/data.db` → Phase 3 reads via `getByDate()`
- Phase 3 writes `.md` files to configured output folder → Phase 5 will regenerate the Highlights section
- Phase 3 updates capture status to `'written'` → Phase 4 reads `'captured'` status entries for content processing
- `~/.second-brain/config.json` — shared config location (Phase 2 D-10)

</code_context>

<specifics>
## Specific Ideas

- Entry format example (approved):
  ```
  ### arxiv.org
  - [Understanding GRPO](https://arxiv.org/abs/2402.1234) — arxiv.org/abs/2402.1234
    Group Relative Policy Optimization for reasoning model training
  - ⭐ [Scaling Laws Revisited](https://arxiv.org/abs/2403.5678) — arxiv.org/abs/2403.5678
    Empirical analysis of compute-optimal scaling
  ```
- Frontmatter enables Dataview queries (e.g., `TABLE captures FROM "daily"` in Obsidian)
- The `second-brain` CLI grows with each phase: `export` (Phase 2) → `generate` (Phase 3) → `curate` (Phase 5)

</specifics>

<deferred>
## Deferred Ideas

- **History import feature** — Import full browser history to create a preliminary database of past browsing. Would allow generating daily notes for dates before the extension was installed. Could be a standalone `second-brain import` subcommand. (User suggested during discussion)
- **Claude Code skill** — Second Brain as a Claude Code skill for capturing AI conversation topics. Already scoped as Phase 7 (CONV-01, CONV-02)

</deferred>

---

*Phase: 03-daily-note-generation*
*Context gathered: 2026-04-10*
