---
phase: 01-browser-extension-foundation
plan: 02
subsystem: browser-extension
tags: [types, contracts, storage, blocklist, testing]
dependency_graph:
  requires: [01-01]
  provides: [type-contracts, storage-api, blocklist-api, test-scaffolds]
  affects: [01-03, 01-04, 01-05]
tech_stack:
  added: [zod, jsdom]
  patterns: [zod-validation, chrome-storage-wrapper, domain-matching, test-mocking]
key_files:
  created:
    - extension/components/types.ts
    - extension/components/storage.ts
    - extension/components/blocklist.ts
    - extension/components/dwell-tracker.ts
    - extension/components/history-backfill.ts
    - extension/public/blocklist.json
    - extension/tests/blocklist.test.ts
    - extension/tests/storage.test.ts
    - extension/tests/dwell-tracker.test.ts
    - extension/tests/history-backfill.test.ts
    - extension/tests/setup.ts
  modified:
    - extension/vitest.config.ts
    - extension/package.json
decisions:
  - "Use Zod for runtime validation of chrome.storage data (mitigates T-01-02, T-01-03)"
  - "D-07 subdomain matching: isBlocked checks exact match + .endsWith('.domain')"
  - "D-05 deduplication: saveCapture checks existing URLs before storing"
  - "D-13 focused tab tracking: stub documents intent to track only focused tabs"
  - "D-14 lookback window: 7-day max backfill period for performance"
  - "Test setup mocks chrome/browser globals to allow webextension-polyfill loading"
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_created: 11
  files_modified: 2
  tests_added: 34
  lines_added: 1324
  commits: 2
  completed_date: "2026-04-09"
---

# Phase 01 Plan 02: Type Contracts & Storage Modules Summary

**One-liner:** TypeScript interface contracts, chrome.storage wrapper with Zod validation, blocklist with subdomain matching, stubs for dwell-tracker and history-backfill, default blocklist with 4 categories, and 34 passing tests.

## What Was Built

All shared TypeScript type contracts and storage modules for the browser extension. This plan establishes the contracts that Plans 03, 04, and 05 implement against.

### Type Contracts (extension/components/types.ts)
- `CaptureEntrySchema` and `CaptureEntry` type: url, title, domain, timestamp, source (live/backfill)
- `StorageStateSchema` and `StorageState` type: isPaused, blocklist, captures, lastCaptureTimestamp, dwellTimestamps
- `BlocklistConfigSchema` and `BlocklistConfig` type: google, banking, social, auth, custom categories
- `DwellRecord` interface: url, title, tabId, startTime
- Constants: `DWELL_THRESHOLD_MS` (5000), `BACKFILL_MAX_LOOKBACK_DAYS` (7), `BACKFILL_MAX_RESULTS` (1000), `TODAY_KEY_FORMAT`

### Storage Module (extension/components/storage.ts)
- `loadStorage()`: Loads chrome.storage with Zod validation (mitigates T-01-02)
- `saveStorage()`: Updates chrome.storage fields
- `getToday()`: Returns today's date key in YYYY-MM-DD format
- `saveCapture()`: Implements D-05 URL deduplication per day
- `getTodayCount()`: Returns count of captures for today
- `getLastCapture()`: Returns most recent capture entry

### Blocklist Module (extension/components/blocklist.ts)
- `isBlocked()`: Implements D-07 subdomain matching (exact + .endsWith('.domain'))
- `loadDefaultBlocklist()`: Loads blocklist.json with Zod validation (mitigates T-01-03)
- `flattenBlocklist()`: Merges all categories into flat array
- `loadBlocklist()`: Loads from chrome.storage, falls back to defaults
- `addToBlocklist()`: Implements D-03 quick-block functionality
- `removeFromBlocklist()`: Removes domain from blocklist

### Dwell Tracker Stub (extension/components/dwell-tracker.ts)
- `startTracking()`: Stub for D-04 5-second threshold
- `cancelTracking()`: Stub for cleanup when user navigates away
- `checkDwell()`: Stub for threshold verification
- Documents D-13 decision: Track dwell only for focused tabs

### History Backfill Stub (extension/components/history-backfill.ts)
- `detectGap()`: Stub for D-11 gap detection on startup
- `backfillHistory()`: Stub for chrome.history backfill
- Documents D-14 decision: 7-day max lookback window

### Default Blocklist (extension/public/blocklist.json)
- Google: google.com, gmail.com, drive.google.com, docs.google.com, calendar.google.com, maps.google.com
- Banking: bankofamerica.com, chase.com, wellsfargo.com, citibank.com, paypal.com, venmo.com
- Social: twitter.com, x.com, reddit.com, facebook.com, instagram.com, linkedin.com, youtube.com
- Auth: localhost, login.microsoftonline.com, accounts.google.com, auth0.com, okta.com
- Custom: empty array (user-editable)

### Test Scaffolds (extension/tests/)
- `blocklist.test.ts`: 10 tests for isBlocked (subdomain matching, case insensitivity) and flattenBlocklist
- `storage.test.ts`: 11 tests for Zod schema validation (CaptureEntry, StorageState, BlocklistConfig)
- `dwell-tracker.test.ts`: 7 tests for constants and stub function exports
- `history-backfill.test.ts`: 6 tests for constants and stub function exports
- `setup.ts`: Mocks chrome/browser APIs for webextension-polyfill
- Updated `vitest.config.ts`: Added setupFiles reference

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing jsdom dependency**
- **Found during:** Task 2 test execution
- **Issue:** vitest.config.ts specified `environment: 'jsdom'` but jsdom package was not installed, causing "Cannot find package 'jsdom'" error
- **Fix:** Installed jsdom via `npm install -D jsdom`
- **Files modified:** extension/package.json, extension/package-lock.json
- **Commit:** a7c3d4b (Task 2)

**2. [Rule 3 - Blocking] TypeScript type errors in chrome.storage.local.get() results**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** chrome.storage.local.get() returns `unknown` types, causing TS errors on .length, .filter, etc.
- **Fix:** Added explicit type annotations: `const blocklist: string[] = (result.blocklist as string[]) || []`
- **Files modified:** extension/components/storage.ts, extension/components/blocklist.ts
- **Commit:** 4809347 (Task 1)

**3. [Rule 3 - Blocking] webextension-polyfill load error in tests**
- **Found during:** Task 2 test execution
- **Issue:** webextension-polyfill throws "This script should only be loaded in a browser extension" in test environment
- **Fix:** Created tests/setup.ts to mock chrome/browser globals before polyfill loads
- **Files modified:** extension/tests/setup.ts, extension/vitest.config.ts
- **Commit:** a7c3d4b (Task 2)

## Verification Results

**TypeScript Compilation:**
```bash
cd extension && npx tsc --noEmit
# Exit code: 0 (success)
```

**Test Results:**
```bash
cd extension && npx vitest run
# Test Files: 4 passed (4)
# Tests: 34 passed (34)
# Duration: 518ms
```

**Blocklist Validation:**
```bash
cat extension/public/blocklist.json | jq 'keys'
# Output: ["auth", "banking", "custom", "google", "social"]
# All 4 required categories present + custom field
```

## Requirements Traceability

| Requirement | Status | Evidence |
|-------------|--------|----------|
| CAPT-02 | ✅ Partial | CaptureEntry type defines url, title, domain, timestamp fields |
| CAPT-03 | ✅ Partial | Backfill stub created with 7-day lookback constant |
| CAPT-04 | ✅ Complete | Default blocklist.json with 4 categories, isBlocked() with subdomain matching |
| CAPT-05 | ✅ Partial | addToBlocklist() created, full JSON file editing in Phase 2 |

## Known Stubs

| Stub | File | Reason | Resolution Plan |
|------|------|--------|-----------------|
| startTracking() | components/dwell-tracker.ts | Logs only, no actual tracking | Plan 03: Capture Engine implements full dwell logic |
| cancelTracking() | components/dwell-tracker.ts | Logs only, no cleanup | Plan 03: Capture Engine implements cleanup |
| checkDwell() | components/dwell-tracker.ts | Returns false, no threshold check | Plan 03: Capture Engine implements threshold check |
| detectGap() | components/history-backfill.ts | Returns hasGap: false always | Plan 05: History Backfill implements gap detection |
| backfillHistory() | components/history-backfill.ts | Returns 0, no backfill | Plan 05: History Backfill implements chrome.history integration |

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 4809347 | feat | Define TypeScript contracts, storage/blocklist modules, default blocklist |
| a7c3d4b | test | Add test scaffolds for all modules (34 tests) |

## Next Steps

**For Plan 03 (Capture Engine):**
- Implement dwell-tracker module (replace stubs with real logic)
- Wire up chrome.webNavigation.onCompleted event handler
- Use storage.saveCapture() for deduplication
- Use blocklist.isBlocked() for filtering

**For Plan 04 (Popup UI):**
- Import types from components/types.ts
- Use storage.getTodayCount(), storage.getLastCapture() for dashboard
- Use blocklist.addToBlocklist() for quick-block button

**For Plan 05 (History Backfill):**
- Implement history-backfill module (replace stubs with real logic)
- Use chrome.history.search() with BACKFILL_MAX_LOOKBACK_DAYS
- Mark entries with source: 'backfill'

## Self-Check: PASSED

**Files created verification:**
- ✅ extension/components/types.ts exists
- ✅ extension/components/storage.ts exists
- ✅ extension/components/blocklist.ts exists
- ✅ extension/components/dwell-tracker.ts exists
- ✅ extension/components/history-backfill.ts exists
- ✅ extension/public/blocklist.json exists
- ✅ extension/tests/blocklist.test.ts exists
- ✅ extension/tests/storage.test.ts exists
- ✅ extension/tests/dwell-tracker.test.ts exists
- ✅ extension/tests/history-backfill.test.ts exists
- ✅ extension/tests/setup.ts exists

**Commits verification:**
- ✅ Commit 4809347 exists: `git log --oneline --all | grep 4809347`
- ✅ Commit a7c3d4b exists: `git log --oneline --all | grep a7c3d4b`

**Exports verification:**
- ✅ types.ts exports: CaptureEntrySchema, CaptureEntry, StorageStateSchema, StorageState, BlocklistConfig, BlocklistConfigSchema, DwellRecord, DWELL_THRESHOLD_MS, BACKFILL_MAX_LOOKBACK_DAYS, BACKFILL_MAX_RESULTS
- ✅ storage.ts exports: loadStorage, saveStorage, saveCapture, getToday, getTodayCount, getLastCapture
- ✅ blocklist.ts exports: isBlocked, loadBlocklist, loadDefaultBlocklist, flattenBlocklist, addToBlocklist, removeFromBlocklist
- ✅ dwell-tracker.ts exports: startTracking, cancelTracking, checkDwell
- ✅ history-backfill.ts exports: detectGap, backfillHistory

**Test coverage:**
- ✅ 34 tests pass
- ✅ isBlocked subdomain matching tested
- ✅ Zod schemas validate and reject correctly
- ✅ Constants have correct values
