# Plan 01-05 Summary

**Phase:** 01-browser-extension-foundation
**Plan:** 05 — History Backfill + Browser Verification
**Status:** Complete
**Date:** 2026-04-09

## What Was Built

1. **History Backfill** (`extension/components/history-backfill.ts`)
   - Gap detection: compares lastCaptureTimestamp against current time
   - First-run backfill: loads last 24 hours of browsing history on first install
   - 7-day max lookback window (D-14)
   - Backfilled entries marked with `source: 'backfill'` (D-12)
   - Blocklist applied to backfilled entries
   - URL deduplication per day

2. **Service Worker Integration** (`extension/entrypoints/background.ts`)
   - Backfill runs on every service worker init (covers disable/re-enable, not just onStartup)
   - Wired into defineBackground callback for maximum coverage

3. **Browser Verification** (manual checkpoint)
   - Extension loads and captures in Chrome ✓
   - Popup UI shows correct stats ✓
   - Skip button works ✓
   - Pause/resume toggle works ✓

## Bug Fixes During Verification

- **Backfill on re-enable**: Fixed — backfill now runs in `defineBackground()`, not just `onStartup`
- **First-run backfill**: Fixed — `detectGap()` returns 24h lookback instead of null on first run
- **UTC date bug**: Fixed — `getToday()` now uses local timezone instead of UTC
- **Last capture timestamp**: Fixed — popup reads `lastCaptureTimestamp` from storage instead of last array entry
- **Skip button on chrome:// pages**: Fixed — button hidden on non-http pages
- **Already-skipped domains**: Added — shows "Skipping: domain" in muted style on skiplist domains

## UI Changes

- "Block this site" → "Skip this domain" (user preference)
- "Edit blocked sites" → "Edit skipped sites"
- Green brain icon added
- Test date boundary bug fixed (use noon UTC in tests)

## Key Files

- `extension/components/history-backfill.ts` — full implementation
- `extension/entrypoints/background.ts` — service worker with backfill wiring
- `extension/tests/history-backfill.test.ts` — 14 tests

## Tests

69 total passing across 6 test files. Build at 167KB.

## Deviations

- Multiple bug fixes applied during manual verification (documented above)
- UI copy changed from "block" to "skip" per user feedback
- Icon color changed to green per user preference
