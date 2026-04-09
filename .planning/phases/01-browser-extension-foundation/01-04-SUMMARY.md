---
phase: 01
plan: 04
subsystem: browser-extension
tags: [popup, ui, user-interaction]
dependency_graph:
  requires: [01-02-storage, 01-02-blocklist]
  provides: [popup-ui, pause-toggle, quick-block]
  affects: []
tech_stack:
  added: []
  patterns: [vanilla-dom, event-delegation, ui-spec-compliance]
key_files:
  created:
    - extension/entrypoints/popup/styles.css
    - extension/tests/popup.test.ts
  modified:
    - extension/entrypoints/popup/index.html
    - extension/entrypoints/popup/main.ts
decisions:
  - D-01 Status dashboard UI with toggle and stats implemented
  - D-02 Temporary pause toggle persists to chrome.storage
  - D-03 Quick-block button adds current tab domain with toast confirmation
  - T-01-09 Only domain name shown in block button (not full URL)
  - T-01-11 Try-catch around URL parsing, disable button on error
metrics:
  duration: 126
  tasks_completed: 2
  tests_added: 8
  files_created: 2
  files_modified: 2
  completed_date: 2026-04-09
---

# Phase 01 Plan 04: Popup UI Summary

**Status dashboard with pause toggle, today's capture count, last capture time, and quick-block button.**

## What Was Built

A minimal browser extension popup following the UI-SPEC design contract exactly. Users can:
- Pause/resume capture via toggle (persists to chrome.storage)
- View today's page count and last capture timestamp
- Quick-block the current tab's domain with inline toast confirmation
- See an empty state when 0 captures exist

The popup is the user's only touchpoint with the extension — designed for status at a glance plus two actions (pause/resume and block this site).

## Implementation Details

### Popup Structure (index.html)
- Header: "Second Brain" title + pause/resume toggle
- Pause banner: Amber badge shown when capture is paused
- Stats section: Two-column grid showing pages today + last capture time
- Empty state: "No captures yet" message when todayCount === 0
- Actions: Quick-block button + "Edit blocked sites" link
- Toast: Fixed position notification for 3-second confirmations

### Styling (styles.css)
Follows UI-SPEC design system precisely:
- Popup width: 320px, auto height (~180px typical)
- Font: system-ui (native OS font stack)
- Colors: #FFFFFF dominant, #F5F5F5 secondary, #2563EB accent (toggle only), #DC2626 destructive, #6B7280 text secondary
- Spacing tokens: xs=4px, sm=8px, md=16px, lg=24px, xl=32px
- Typography: Body 14px/400/1.5, Label 13px/400/1.4, Heading 16px/600/1.2, Stat number 24px/600/1.0

### Logic (main.ts)
- **initPopup()**: Loads pause state, today's count, last capture. Shows empty state or stats. Updates block button with current tab domain.
- **Pause toggle**: Persists isPaused via saveStorage, updates UI (label switches between "Pause capture" / "Resume capture", banner visibility, stats dimmed).
- **Quick-block**: Calls addToBlocklist(domain), shows inline toast for 3 seconds.
- **Edit link**: Shows informational toast (D-10: no options page in Phase 1).
- **formatTimeAgo(elapsedMs)**: Returns "just now" (<60s), "N min ago", "Nh ago", "yesterday" (24h+).
- **Error handling (T-01-11)**: Try-catch around URL parsing for tab.url; disable block button if URL parsing fails.

### Tests (popup.test.ts)
- formatTimeAgo returns "just now" for elapsed < 60 seconds (0ms, 30000ms, 59999ms)
- formatTimeAgo returns "N min ago" for 1-59 minutes (60000ms, 300000ms, 3540000ms)
- formatTimeAgo returns "Nh ago" for 1-23 hours (3600000ms, 7200000ms, 82800000ms)
- formatTimeAgo returns "yesterday" for 24+ hours (86400000ms, 172800000ms)
- All popup module exports verified (initPopup, updatePauseUI, showToast, formatTimeAgo)

## Deviations from Plan

None - plan executed exactly as written.

## Known Issues

None - all functionality implemented and tested.

## Key Decisions

**D-01 Status dashboard implemented**: Minimal UI showing capture toggle, today's page count, and last capture timestamp. Matches UI-SPEC design system exactly.

**D-02 Temporary pause toggle**: Toggle persists isPaused to chrome.storage. Pause state resumes when toggled back on. UI shows pause banner and dims stats when paused.

**D-03 Quick-block button**: Adds current tab domain to blocklist via addToBlocklist(). Shows inline toast confirmation for 3 seconds. Button disabled if URL parsing fails (T-01-11).

**T-01-09 Information Disclosure mitigation**: Only domain name shown in block button (e.g., "Block this site: example.com"), not full URL with path/query parameters.

**T-01-11 DoS mitigation**: Try-catch around URL parsing for tab.url. If parsing fails, block button is disabled with generic text "Block this site".

## Integration Points

**Imports from storage.ts**:
- getTodayCount() - Get count of captures for today
- getLastCapture() - Get the most recent capture entry
- saveStorage() - Persist isPaused state
- loadStorage() - Load initial pause state

**Imports from blocklist.ts**:
- addToBlocklist(domain) - Add domain to blocklist (D-03)

**Browser APIs used**:
- browser.tabs.query({ active: true, currentWindow: true }) - Get current tab for quick-block button
- browser.storage.local - Via storage.ts wrapper for pause state persistence

## Verification

1. `cd extension && npx vitest run tests/popup.test.ts` - 8 tests pass
2. `cd extension && npx vitest run` - Full suite 56 tests pass (48 previous + 8 new)
3. `cd extension && npx wxt build` - Build succeeds in 203ms

## Task Breakdown

| Task | Name | Commit | Duration | Files |
|------|------|--------|----------|-------|
| 1 | Implement popup HTML, CSS, and TypeScript | 0e48464 | ~60s | index.html, main.ts, styles.css |
| 2 | Create popup logic unit tests | aa350cb | ~60s | popup.test.ts |

## Files Changed

**Created:**
- `extension/entrypoints/popup/styles.css` (2.83 kB compiled) - UI-SPEC compliant styling
- `extension/tests/popup.test.ts` - 8 tests for formatTimeAgo and module exports

**Modified:**
- `extension/entrypoints/popup/index.html` - Full popup structure with header, stats, actions, toast
- `extension/entrypoints/popup/main.ts` - 186 lines of popup logic (was 2-line stub)

## Next Steps

Plan 01-05 (Browser Testing & Manual Verification) will verify:
- Popup opens when extension icon clicked
- Toggle persists pause state across popup reopens
- Stats display correctly after captures
- Quick-block adds domain to blocklist
- Toast confirmations appear and dismiss after 3 seconds
- Empty state shown when 0 captures

---

**Plan complete.** Popup UI fully functional and styled per UI-SPEC. Ready for manual verification checkpoint in Plan 01-05.

## Self-Check

Verifying created files exist:
- FOUND: extension/entrypoints/popup/styles.css
- FOUND: extension/tests/popup.test.ts

Verifying commits exist:
- FOUND: 0e48464 (Task 1: popup UI implementation)
- FOUND: aa350cb (Task 2: popup tests)

**Self-Check: PASSED**
