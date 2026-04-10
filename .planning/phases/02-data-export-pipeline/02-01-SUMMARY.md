---
phase: 02-data-export-pipeline
plan: 01
subsystem: data-pipeline
tags: [monorepo, sqlite, database, migrations, types]
dependency_graph:
  requires: [extension/components/types.ts]
  provides: [@second-brain/shared, pipeline/src/db/*]
  affects: [extension, pipeline]
tech_stack:
  added: [npm-workspaces, better-sqlite3, zod]
  patterns: [monorepo, tdd, migrations, parameterized-queries]
key_files:
  created:
    - package.json
    - shared/src/types.ts
    - shared/src/schemas.ts
    - pipeline/src/db/connection.ts
    - pipeline/src/db/migrate.ts
    - pipeline/src/db/migrations/001_initial.sql
    - pipeline/src/db/operations.ts
    - .gitignore
  modified: []
decisions:
  - "Types duplicated in extension and shared - shared is source of truth for pipeline, extension unchanged until WXT bundler integration tested"
  - "Path traversal validation added to SECOND_BRAIN_DATA_DIR - only allows home or temp directories (security requirement)"
  - "SQLite WAL mode enabled for concurrent read safety during processing pipeline"
metrics:
  duration_seconds: 217
  tasks_completed: 2
  tests_added: 17
  tests_passing: 17
  commits: 6
  completed_at: "2026-04-10T17:11:47Z"
---

# Phase 02 Plan 01: Monorepo Workspace and SQLite Database Layer

**One-liner:** npm workspaces linking extension/pipeline/shared + SQLite database with WAL mode, schema migrations, deduplication, and status tracking

## What Was Built

Established the monorepo foundation and core database layer for the data export pipeline:

1. **Monorepo structure**: npm workspaces linking `extension`, `pipeline`, and `shared` packages from root
2. **Shared types package**: `@second-brain/shared` with `CaptureEntry` type and `ProcessingStatus` enum (captured → content_fetched → curated → written)
3. **SQLite database layer**: Connection management with WAL mode, schema versioning, migration system
4. **Database schema**: `captures` table with UNIQUE(url, date) constraint, status/source CHECK constraints, indexes on date/status/domain
5. **Database operations**: `saveCaptures` with ON CONFLICT DO NOTHING deduplication, `updateStatus`, `getByStatus`, `getCaptureStats`
6. **Test infrastructure**: 17 passing tests (5 shared types, 12 database layer)
7. **Security**: Parameterized queries for SQL injection prevention, path traversal validation for SECOND_BRAIN_DATA_DIR

## Tasks Completed

### Task 1: Create monorepo workspace with shared types package (TDD)

**RED Phase** (commit d493ac4):
- Created root `package.json` with workspaces: ["extension", "pipeline", "shared"]
- Created `shared/package.json` with exports for types and schemas
- Created test files with 5 failing tests
- Verified tests fail as expected

**GREEN Phase** (commit a958321):
- Implemented `shared/src/types.ts`: CaptureEntry type, ProcessingStatus enum, PROCESSING_STATUSES constant
- Implemented `shared/src/schemas.ts`: ExportResponseSchema, re-exported CaptureEntrySchema
- All 5 tests passing
- Verified workspace linkage: `npm ls @second-brain/shared --workspace=pipeline` shows linked package

**Files created:**
- `package.json` - Root workspace config
- `shared/package.json`, `shared/tsconfig.json`, `shared/vitest.config.ts`
- `shared/src/types.ts`, `shared/src/schemas.ts`
- `shared/tests/types.test.ts`, `shared/tests/schemas.test.ts`
- `pipeline/package.json`, `pipeline/tsconfig.json`, `pipeline/vitest.config.ts`, `pipeline/tests/setup.ts`

### Task 2: SQLite database layer with migrations, operations, and tests (TDD)

**RED Phase** (commit d162b08):
- Created test files with 11 failing tests covering connection, migrations, operations, constraints
- Verified tests fail as expected

**GREEN Phase** (commit 10e7dda):
- Implemented `pipeline/src/db/connection.ts`: getDatabase() with WAL mode, closeDatabase(), getDatabasePath()
- Implemented `pipeline/src/db/migrate.ts`: Schema version tracking, idempotent migration application
- Implemented `pipeline/src/db/migrations/001_initial.sql`: captures table with constraints and indexes
- Implemented `pipeline/src/db/operations.ts`: saveCaptures, updateStatus, getByStatus, getByDate, getCaptureStats
- All 11 tests passing

**Security Fix** (commit 9f5ca6f):
- Added path traversal validation for SECOND_BRAIN_DATA_DIR (mitigates T-02-02)
- Validates env var resolves to home or temp directory
- Added test for path traversal rejection
- 12 tests now passing

**Cleanup** (commit 41a2027):
- Added `.gitignore` for node_modules, build outputs, runtime files
- Committed `package-lock.json` for reproducible builds

**Files created:**
- `pipeline/src/db/connection.ts` - Database connection with WAL mode and env override
- `pipeline/src/db/migrate.ts` - Migration system with version tracking
- `pipeline/src/db/migrations/001_initial.sql` - Initial schema with constraints
- `pipeline/src/db/operations.ts` - CRUD operations with deduplication
- `pipeline/tests/db/connection.test.ts` - 5 connection tests
- `pipeline/tests/db/operations.test.ts` - 7 operations tests
- `.gitignore` - Project ignores

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Security] Path traversal validation for SECOND_BRAIN_DATA_DIR**
- **Found during:** Task 2 verification
- **Issue:** Threat model T-02-02 requires path validation, but initial implementation accepted any env var value
- **Fix:** Added validation in `getDataDir()` to ensure resolved path is under user's home or temp directory
- **Files modified:** `pipeline/src/db/connection.ts`, `pipeline/tests/db/connection.test.ts`
- **Commit:** 9f5ca6f

**2. [Rule 3 - Missing Infrastructure] .gitignore and package-lock.json**
- **Found during:** Post-execution file check
- **Issue:** No .gitignore to exclude node_modules and runtime files; package-lock.json untracked
- **Fix:** Created .gitignore with standard patterns, committed package-lock.json
- **Files created:** `.gitignore`, tracked `package-lock.json`
- **Commit:** 41a2027

## Verification Results

### Automated Tests

```bash
$ npm test
# extension workspace: 48 tests passing (unchanged)
# pipeline workspace: 12 tests passing
# shared workspace: 5 tests passing
```

### Workspace Linkage

```bash
$ npm ls @second-brain/shared --workspace=pipeline
second-brain@ /Users/ggiannon/Documents/gcg/second-brain
└─┬ pipeline@0.1.0 -> ./pipeline
  └── @second-brain/shared@0.1.0 -> ./shared
```

### Database Schema

```sql
-- UNIQUE(url, date) constraint enforces STOR-03 deduplication
-- CHECK constraints enforce valid status and source enums
-- WAL mode enabled for concurrent reads
-- PRAGMA user_version = 1 tracks schema version
```

### Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-02-01 | Parameterized queries via better-sqlite3 prepared statements | ✅ Implemented |
| T-02-02 | Path traversal validation for SECOND_BRAIN_DATA_DIR | ✅ Implemented |
| T-02-03 | Database at ~/.second-brain/data.db with user-only permissions | ✅ Accepted (OS default) |

## Requirements Satisfied

- ✅ **STOR-01**: SQLite database created at ~/.second-brain/data.db with WAL mode
- ✅ **STOR-02**: Status column tracks pipeline: captured → content_fetched → curated → written
- ✅ **STOR-03**: UNIQUE(url, date) constraint with ON CONFLICT DO NOTHING for deduplication

## Known Stubs

None - all functionality implemented and tested.

## Threat Flags

None - no new security surface beyond what was modeled in plan.

## Self-Check: PASSED

### Files Created (Verified)

```bash
✅ /Users/ggiannon/Documents/gcg/second-brain/package.json
✅ /Users/ggiannon/Documents/gcg/second-brain/shared/package.json
✅ /Users/ggiannon/Documents/gcg/second-brain/shared/src/types.ts
✅ /Users/ggiannon/Documents/gcg/second-brain/shared/src/schemas.ts
✅ /Users/ggiannon/Documents/gcg/second-brain/pipeline/package.json
✅ /Users/ggiannon/Documents/gcg/second-brain/pipeline/src/db/connection.ts
✅ /Users/ggiannon/Documents/gcg/second-brain/pipeline/src/db/migrate.ts
✅ /Users/ggiannon/Documents/gcg/second-brain/pipeline/src/db/migrations/001_initial.sql
✅ /Users/ggiannon/Documents/gcg/second-brain/pipeline/src/db/operations.ts
✅ /Users/ggiannon/Documents/gcg/second-brain/.gitignore
```

### Commits Exist (Verified)

```bash
✅ d493ac4 - test(02-01): add failing tests for shared types package
✅ a958321 - feat(02-01): implement shared types and schemas
✅ d162b08 - test(02-01): add failing tests for SQLite database layer
✅ 10e7dda - feat(02-01): implement SQLite database layer with migrations
✅ 9f5ca6f - fix(02-01): add path traversal validation for SECOND_BRAIN_DATA_DIR
✅ 41a2027 - chore(02-01): add .gitignore and lock file
```

## Next Steps

**For Plan 02-02 (Native Messaging Host):**
- Use `@second-brain/shared` types for export response validation
- Database operations available via `pipeline/src/db/operations.ts`
- Export captured data from extension storage to SQLite via native messaging

**Integration Notes:**
- Extension still uses local `extension/components/types.ts` - migration to `@second-brain/shared` deferred until WXT bundler integration tested
- Both type definitions are identical (CaptureEntry, source enum)
- Pipeline code exclusively uses `@second-brain/shared`
