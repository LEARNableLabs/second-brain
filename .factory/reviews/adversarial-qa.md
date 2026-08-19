# Adversarial QA — H4 Manual Capture Features

**Date:** 2026-08-19
**Project type:** Browser Extension (Chrome MV3 via WXT)
**Test scope:** H4 — context menu, keyboard shortcut, edge cases, test suite, logger usage

---

## Smoke Test

**Command:** `npm test`
**Result:** PASS — 19 test files, 166 tests, all passing (83 extension + 78 pipeline + 5 shared)

---

## Acceptance Criteria Verification

### 1. Context menu registration — contextMenus.create called in onInstalled listener

**Status:** NOT_VERIFIED

**Evidence:**

```bash
$ grep -n "contextMenus.create\|onInstalled\|defineBackground" extension/entrypoints/background.ts
268:export default defineBackground(() => {
275:  browser.runtime.onInstalled.addListener(handleInstall);
279:  browser.contextMenus.create({
```

`contextMenus.create` is at line 279 inside `defineBackground()` at the top level — it is NOT inside the `handleInstall` function (the `onInstalled` listener at lines 132–157). The `handleInstall` function only handles blocklist initialization and history backfill.

The H4 strategy explicitly states: *"Move creation to `runtime.onInstalled` listener to avoid duplicate ID error on service worker restart (addressing the minor code review finding from cycle 1)."*

**Impact:** On every service worker restart (which happens frequently in MV3 after 30s idle), `defineBackground()` re-executes and calls `contextMenus.create` with the same ID `save-to-second-brain`. Chrome may throw a duplicate ID error or silently replace the item. The fix is to move `contextMenus.create` inside `handleInstall`.

---

### 2. Context menu click handler — calls saveManualCapture with correct URL for page and link contexts

**Status:** VERIFIED

**Evidence:**

```bash
$ npx vitest run extension/tests/manual-capture.test.ts
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

Code inspection confirms:
- `handleContextMenuClick` (line 198–214) uses `info.linkUrl || info.pageUrl` — link URL takes priority.
- For page context: `saveManualCapture(targetUrl, tab?.title || '', url.hostname)` — correct.
- For link context: title is `''` (empty) since the link has no tab title — correct.
- Tests verify page URL capture (line 68), link URL capture (line 84), and blocklist bypass (line 111).

---

### 3. Keyboard shortcut — commands defined in wxt.config.ts, handler captures active tab

**Status:** VERIFIED

**Evidence:**

```bash
$ grep -n "commands\|save-current-page" extension/wxt.config.ts
19:    commands: {
20:      'save-current-page': {
```

`wxt.config.ts` defines the `save-current-page` command with `Ctrl+Shift+S` (default) and `Command+Shift+S` (mac).

`handleCommand` (line 219–229) checks `command !== 'save-current-page'`, then calls `captureActiveTab()` which queries the active tab and calls `saveManualCapture`. Tests verify capture on correct command (line 145) and no-op on wrong command (line 159).

---

### 4. Edge cases — non-http URLs rejected, missing tab URL handled, wrong command ignored

**Status:** VERIFIED

**Evidence:**

All 8 manual-capture tests pass. Specific edge case coverage:

| Edge case | Code location | Test location | Result |
|---|---|---|---|
| Non-http URL (context menu) | background.ts:203–205 | manual-capture.test.ts:100–109 | PASS |
| Non-http URL (keyboard shortcut) | background.ts:188 | manual-capture.test.ts:166–174 | PASS |
| Missing tab / no active tab | background.ts:187–189 | manual-capture.test.ts:176–182 | PASS |
| Wrong command ignored | background.ts:220 | manual-capture.test.ts:159–164 | PASS |

---

### 5. All 166+ tests pass

**Status:** VERIFIED

**Evidence:**

```bash
$ npm test
extension:  Test Files  7 passed (7)  |  Tests  83 passed (83)
pipeline:   Test Files 10 passed (10) |  Tests  78 passed (78)
shared:     Test Files  2 passed (2)  |  Tests   5 passed (5)
Total: 19 files, 166 tests — all passing
```

---

### 6. Logger is used (createModuleLogger in background.ts)

**Status:** VERIFIED

**Evidence:**

```bash
$ grep -n "createModuleLogger" extension/entrypoints/background.ts
7:import { createModuleLogger } from '../components/logger';
10:const logger = createModuleLogger('background');

$ grep -n "logger\." extension/entrypoints/background.ts
210:    logger.info({ url: targetUrl, source: 'context-menu' }, 'manual capture saved');
212:    logger.error({ error: String(error) }, 'error in handleContextMenuClick');
224:      logger.info({ source: 'keyboard-shortcut' }, 'manual capture saved');
227:    logger.error({ error: String(error) }, 'error in handleCommand');
```

Logger is imported, instantiated, and used in both manual capture handlers (context menu and keyboard shortcut) with structured context objects.

---

## Summary

| # | Criterion | Status |
|---|---|---|
| 1 | Context menu in onInstalled listener | NOT_VERIFIED |
| 2 | Context menu click handler | VERIFIED |
| 3 | Keyboard shortcut | VERIFIED |
| 4 | Edge cases | VERIFIED |
| 5 | All 166 tests pass | VERIFIED |
| 6 | Logger usage | VERIFIED |

---

## Adversarial Verdict: FAIL

**Reason:** Criterion 1 is not met. `contextMenus.create` is called inside `defineBackground()` at the top level (line 279), not inside the `onInstalled` listener as required by the H4 strategy. This was explicitly called out as a fix for the cycle 1 code review finding (duplicate ID error on service worker restart). The fix is straightforward: move `contextMenus.create` inside `handleInstall`.

All other criteria (2–6) pass cleanly with evidence.
