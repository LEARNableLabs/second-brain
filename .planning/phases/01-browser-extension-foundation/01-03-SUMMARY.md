---
phase: 01-browser-extension-foundation
plan: 03
subsystem: browser-extension
tags: [capture-engine, service-worker, dwell-threshold, event-driven]
dependency_graph:
  requires:
    - 01-02 (type contracts, storage module, blocklist module)
  provides:
    - dwell-tracker with chrome.storage persistence
    - background service worker with event-driven capture
    - webNavigation.onCompleted handler for page loads
    - tabs.onActivated handler for focused tab tracking
    - tabs.onRemoved handler for cleanup
    - runtime.onInstalled handler for initialization
    - runtime.onStartup handler for pause reset
  affects:
    - extension/components/dwell-tracker.ts
    - extension/entrypoints/background.ts
    - extension/tests/dwell-tracker.test.ts
    - extension/tests/background.test.ts
tech_stack:
  added:
    - Service worker event-driven architecture (MV3)
    - chrome.webNavigation API for page load detection
    - chrome.tabs API for tab state management
    - chrome.runtime API for lifecycle events
  patterns:
    - Event-driven service worker (MV3 requirement)
    - Dwell threshold filtering (5-second delay before capture)
    - chrome.storage persistence (service worker state management)
    - Focused tab tracking (D-13: background tabs not captured until focus)
    - Blocklist validation at capture time (T-01-07 mitigation)
key_files:
  created:
    - extension/tests/dwell-tracker.test.ts (13 tests)
    - extension/tests/background.test.ts (8 tests)
  modified:
    - extension/components/dwell-tracker.ts (replaced stub with full implementation)
    - extension/entrypoints/background.ts (replaced stub with event handlers)
decisions:
  - D-13 implemented: Track dwell only for focused tabs (handleTabActivated catches background tabs on focus)
  - setTimeout acceptable for 5s delays (~5% failure rate acceptable, chrome.alarms has 1-minute minimum)
  - Blocklist re-checked at capture time (not just at startTracking) to prevent capture of newly-blocked URLs during dwell period
metrics:
  duration_seconds: 371
  completed_at: "2026-04-09T20:48:27Z"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 21
  tests_passing: 48
  files_created: 2
  files_modified: 2
  commits: 2
---

# Phase 01 Plan 03: Capture Engine Summary

**One-liner:** Event-driven service worker capturing URLs after 5-second dwell threshold with chrome.storage persistence and focused-tab-only tracking.

## What Was Built

### Dwell Tracker (Task 1)

Implemented full dwell threshold logic in `extension/components/dwell-tracker.ts`:

- **startTracking**: Stores dwell record in chrome.storage.local with url, title, tabId, startTime. Cancels previous tracking for same tabId before starting new. Schedules checkDwell after 5000ms using setTimeout.
- **cancelTracking**: Removes dwell record for given tabId from chrome.storage.local.
- **checkDwell**: Validates elapsed time >= 5000ms, checks blocklist, calls saveCapture with source 'live', cleans up dwell record.

**Key implementation details:**

- All state persisted to chrome.storage.local (D-06: service worker terminates after 30s idle)
- Blocklist re-checked at capture time (T-01-07: prevent capture of URLs added to blocklist during dwell period)
- Invalid URLs handled gracefully with try-catch
- setTimeout acceptable for 5s delays (~5% failure rate, chrome.alarms has 1-minute minimum in Chrome stable)

**Tests:** 13 tests in `extension/tests/dwell-tracker.test.ts`, all passing.

### Background Service Worker (Task 2)

Implemented event-driven capture engine in `extension/entrypoints/background.ts`:

**Event handlers (all exported for testing):**

1. **handlePageLoad** (webNavigation.onCompleted):
   - Filters frameId !== 0 (main frame only)
   - Filters non-http URLs: chrome://, about://, extension:// (T-01-05: Information Disclosure mitigation)
   - Checks isPaused state from chrome.storage
   - Checks blocklist before tracking
   - **D-13 implementation**: Only tracks active tabs (background tabs skipped until handleTabActivated catches them on focus)
   - Gets tab title via chrome.tabs.get
   - Calls startTracking for qualifying pages

2. **handleTabActivated** (tabs.onActivated):
   - D-13: Track dwell when user focuses a tab
   - Checks isPaused, filters non-http URLs, checks blocklist
   - Calls startTracking for newly focused tab

3. **handleTabRemoved** (tabs.onRemoved):
   - T-01-06 mitigation: Cancel pending dwell tracking to prevent storage leak
   - Calls cancelTracking for closed tab

4. **handleInstall** (runtime.onInstalled):
   - On first install (reason === 'install'), loads default blocklist from blocklist.json
   - Flattens blocklist config (google, banking, social, auth, custom) into single array
   - Saves to chrome.storage.local

5. **handleStartup** (runtime.onStartup):
   - D-02: Reset isPaused to false (pause is temporary, not persistent across browser restarts)

**MV3 compliance:**

- All event listeners registered synchronously inside defineBackground callback
- No DOM access (document, window, chrome.runtime.getBackgroundPage)
- All state reads/writes through chrome.storage.local
- Service worker compatible (terminates after 30s idle, no in-memory state)

**Tests:** 8 tests in `extension/tests/background.test.ts`, all passing.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

All verification steps passed:

- [x] `cd extension && npx vitest run tests/dwell-tracker.test.ts` — 13 tests passing
- [x] `cd extension && npx vitest run tests/background.test.ts` — 8 tests passing
- [x] `cd extension && npx vitest run` — 48 tests passing (no regressions)
- [x] `cd extension && npx wxt build` — project builds successfully (83.68 kB total)

## Success Criteria

All success criteria met:

- [x] Service worker registers all event listeners synchronously inside defineBackground callback
- [x] Page loads trigger dwell tracking after checking pause state and blocklist
- [x] Dwell threshold of 5 seconds implemented with chrome.storage persistence (not in-memory)
- [x] Background tabs only captured on focus (D-13)
- [x] Pause resets on browser startup (D-02)
- [x] Default blocklist initialized on install
- [x] No DOM access (document, window) in service worker
- [x] All tests pass

## Threat Surface Scan

No new threat surface introduced beyond what was documented in the plan's threat model:

- T-01-05 mitigation implemented: chrome://, about://, extension:// URLs filtered before processing
- T-01-06 mitigation implemented: Dwell records cleaned up on tab close to prevent storage leak
- T-01-07 mitigation implemented: Blocklist re-checked at capture time (not just at startTracking)
- T-01-08 accepted: Service worker console.log statements may expose captured URLs in DevTools (acceptable for development)

## Known Stubs

None - all planned functionality fully implemented.

## Key Decisions

**D-13 (Background tab handling) - Implementation chosen:** Track dwell only for focused tabs.

- Rationale: Opening 10 tabs and reading 2 better reflects user intent than capturing all 10
- Implementation: handlePageLoad checks if tab is active in current window; handleTabActivated starts tracking when user focuses a background tab
- Result: Only tabs user actively views are captured after dwell threshold

**setTimeout vs chrome.alarms for 5-second delays:**

- Decision: Use setTimeout (acceptable ~5% failure rate)
- Rationale: chrome.alarms has 1-minute minimum interval in Chrome stable (cannot handle 5-second delays)
- Alternative: Could use chrome.alarms + polling, but complexity not justified for ~5% failure rate
- Documented in code comments (RESEARCH.md Pitfall 4)

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 0f461a0 | test(01-03): add failing tests for dwell-tracker with chrome.storage persistence | extension/components/dwell-tracker.ts, extension/tests/dwell-tracker.test.ts |
| 5fa9ed8 | feat(01-03): implement background service worker with event-driven capture | extension/entrypoints/background.ts, extension/tests/background.test.ts |

## Self-Check: PASSED

**Created files exist:**
- [x] extension/tests/dwell-tracker.test.ts (13 tests)
- [x] extension/tests/background.test.ts (8 tests)

**Modified files exist:**
- [x] extension/components/dwell-tracker.ts (full implementation, no stubs)
- [x] extension/entrypoints/background.ts (event handlers exported and registered)

**Commits exist:**
- [x] 0f461a0 (dwell-tracker tests + implementation)
- [x] 5fa9ed8 (background service worker)

**All tests pass:**
- [x] 48 tests passing (13 dwell-tracker + 8 background + 27 existing)

**Extension builds:**
- [x] `npx wxt build` succeeds (83.68 kB total)
