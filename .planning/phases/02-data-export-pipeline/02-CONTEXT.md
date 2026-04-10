# Phase 2: Data Export Pipeline - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Bridge the browser extension's chrome.storage.local data to a local SQLite database for batch processing. A Node.js CLI (`second-brain export`) triggers the export via Chrome Native Messaging, pulling captured browsing data into a SQLite database at `~/.second-brain/data.db`. The pipeline tracks processing status per URL, deduplicates across time, and validates data with schema versioning. Manual captures (source: 'manual') are preserved with their priority signal for downstream AI curation.

</domain>

<decisions>
## Implementation Decisions

### Data Bridge Mechanism
- **D-01:** Data moves from extension to SQLite via Chrome Native Messaging Host. The CLI sends a request to the extension, extension responds with current captures, CLI writes to SQLite. Chrome manages the host process lifecycle.
- **D-02:** Export is CLI-pull on demand — user runs `second-brain export` (or launchd triggers it hourly in Phase 6). Extension does NOT push data on its own.
- **D-03:** Extension retains captures in chrome.storage for 7 days after export, then clears. Provides a safety buffer for re-export if SQLite write fails.

### Manual Capture Integration
- **D-04:** Manual capture is triggered via a "Save this page" button in the extension popup UI, placed above the existing "Skip this site" button.
- **D-05:** Manual captures use the existing `CaptureEntry.source` enum, extended from `['live', 'backfill']` to `['live', 'backfill', 'manual']`. No new fields needed.
- **D-06:** If a URL was already auto-captured today as 'live' and the user manually saves it, the existing entry's source is upgraded to 'manual'. Maintains D-05 deduplication (one entry per URL per day).
- **D-07:** Manual capture implementation will be inserted as Phase 1.1 — a separate phase before Phase 2 with its own tests and verification. Phase 2 assumes manual captures already exist in the data model.

### CLI & Invocation
- **D-08:** CLI is named `second-brain` with subcommands. Phase 2 implements `second-brain export`. Future phases add: `generate` (Phase 3), `curate` (Phase 5), `status` (any time).
- **D-09:** Default output is summary stats: count of exported URLs (new vs existing), manual save count, source browsers, database path, schema version. Not verbose per-URL logs.
- **D-10:** SQLite database lives at `~/.second-brain/data.db`. Config at `~/.second-brain/config.json`. Logs at `~/.second-brain/logs/`. Dedicated dot-directory in home, not inside the vault.

### Project Structure
- **D-11:** Monorepo with `extension/`, `pipeline/`, and `shared/` as siblings at project root. Each has its own `package.json`. Shared types (CaptureEntry, Zod schemas) live in `shared/` and are imported by both.
- **D-12:** npm workspaces links the three packages. Root `package.json` with `"workspaces": ["extension", "pipeline", "shared"]`. Shared package referenced as `@second-brain/shared` dependency.

### Claude's Discretion
- SQLite table structure and column types (as long as they support the status tracking pipeline: captured → content fetched → curated → written to vault)
- Schema versioning mechanism (migration files, version column, or pragma)
- Native messaging host manifest format and registration script
- Error handling strategy for network/storage failures during export
- CLI framework choice (commander, yargs, or plain Node.js)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Storage — STOR-01, STOR-02, STOR-03 define SQLite, status tracking, and deduplication requirements
- `.planning/REQUIREMENTS.md` §Daily Note — NOTE-04 defines on-demand CLI trigger requirement

### Prior Phase Context
- `.planning/phases/01-browser-extension-foundation/01-CONTEXT.md` — Phase 1 decisions on storage format, Zod validation, deduplication, and service worker constraints
- `extension/components/types.ts` — Current CaptureEntry schema, StorageState schema, constants (source of truth for data model)
- `extension/components/storage.ts` — Current chrome.storage wrapper with save/load/dedup logic

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/ROADMAP.md` — Phase 2 success criteria and dependency chain

### Chrome Native Messaging
- Chrome Native Messaging documentation: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `extension/components/types.ts` — CaptureEntrySchema and StorageStateSchema with Zod validation. Will be moved to `shared/` and extended with `source: 'manual'` (after Phase 1.1).
- `extension/components/storage.ts` — `loadStorage()`, `saveCapture()`, `getToday()` patterns. The CLI side will need analogous SQLite helpers.
- `extension/components/blocklist.ts` — Domain matching logic (125 lines). Not directly reused in pipeline but informs how blocklist bypass works for manual captures.

### Established Patterns
- **Zod for validation** — All data crossing boundaries is validated with Zod schemas. Pipeline must continue this pattern for SQLite reads/writes.
- **Day-based keying** — Captures stored as `Record<string, CaptureEntry[]>` keyed by `YYYY-MM-DD`. Pipeline must map this to SQLite rows with date column.
- **TypeScript strict mode** — All code compiled with strict tsconfig. Pipeline must match.

### Integration Points
- Extension's `chrome.runtime.sendNativeMessage()` → Pipeline's native messaging host
- Extension's `chrome.storage.local` captures → Native host reads and responds with capture data
- Pipeline writes to `~/.second-brain/data.db` → Phase 3 reads from this DB to generate daily notes

</code_context>

<specifics>
## Specific Ideas

- CLI output format example provided and approved:
  ```
  Exported 23 captures (18 new, 5 existing)
    ⭐ 2 manual saves
    Source: Chrome + Comet
    Database: ~/.second-brain/data.db
    Schema: v1
  ```
- The `second-brain` CLI is designed to grow: each future phase adds a subcommand rather than a separate tool

</specifics>

<deferred>
## Deferred Ideas

### Phase 1.1: Manual Capture (to be inserted)
- Add "Save this page" button to extension popup
- Extend CaptureEntry.source enum to include 'manual'
- Upgrade existing 'live' entries to 'manual' on manual save
- Bypass blocklist for manual captures
- **Must be completed before Phase 2 begins** — Phase 2 assumes manual captures exist in the data model

</deferred>

---

*Phase: 02-data-export-pipeline*
*Context gathered: 2026-04-10*
