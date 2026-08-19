# Adversarial QA Report

- **timestamp:** 2026-08-19T14:45:00Z
- **hypothesis:** H1 — Add manual capture features (context menu, keyboard shortcut)
- **project type:** Browser Extension (Chrome MV3, WXT framework)

---

## Smoke Test

**Command:** `npm test`
**Result:** PASS

```
extension: 7 test files, 83 tests passed
pipeline: 10 test files, 78 tests passed
shared: 2 test files, 5 tests passed
Total: 166 tests passed, 0 failed
```

---

## TypeScript Regression Check

**Command:** `npx tsc --noEmit -p extension/tsconfig.json 2>&1 | grep -c "error TS"`
**Result:** PASS — No new TS errors

- Before builder's commit: 33 TS errors (pre-existing, `@types/chrome` not installed)
- After builder's commit: 33 TS errors (identical set)
- **Verdict:** Builder introduced zero new type errors.

---

## Feature Tests

### Acceptance Criterion 1: Context Menu — "Save to Second Brain" on right-click

**Status:** VERIFIED

**Evidence — test suite:**
```
$ npx vitest run tests/manual-capture.test.ts --reporter=verbose

 ✓ context menu capture > captures the page URL when right-clicking the page (2ms)
 ✓ context menu capture > captures the link URL when right-clicking a link (0ms)
 ✓ context menu capture > ignores non-http URLs (0ms)
 ✓ context menu capture > captures on blocked domains (bypasses blocklist) (0ms)

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

**Evidence — code inspection:**

| Check | File:Line | Result |
|---|---|---|
| `contextMenus` permission in manifest | `wxt.config.ts:9` | PRESENT |
| Context menu created with correct ID | `background.ts:272` | `id: 'save-to-second-brain'` |
| Contexts include `page` and `link` | `background.ts:274` | `contexts: ['page', 'link']` |
| Click handler registered | `background.ts:276` | `onClicked.addListener(handleContextMenuClick)` |
| Handler uses `saveManualCapture` | `background.ts:205` | Calls `saveManualCapture(targetUrl, title, url.hostname)` |
| linkUrl takes priority over pageUrl | `background.ts:199` | `info.linkUrl \|\| info.pageUrl` |
| Non-http URLs filtered | `background.ts:200-201` | Checks `startsWith('http://')` and `startsWith('https://')` |
| Error handling present | `background.ts:206-208` | try/catch wrapping |

### Acceptance Criterion 2: Keyboard Shortcut — Cmd+Shift+S to capture active tab

**Status:** VERIFIED

**Evidence — test suite:**
```
 ✓ keyboard shortcut capture > captures active tab on save-current-page command (0ms)
 ✓ keyboard shortcut capture > ignores unrelated commands (0ms)
 ✓ keyboard shortcut capture > does nothing when active tab has no http URL (0ms)
 ✓ keyboard shortcut capture > does nothing when no active tab exists (0ms)
```

**Evidence — code inspection:**

| Check | File:Line | Result |
|---|---|---|
| Command defined in manifest | `wxt.config.ts:19-27` | `'save-current-page'` with `Command+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows) |
| Command handler registered | `background.ts:279` | `browser.commands.onCommand.addListener(handleCommand)` |
| Handler only responds to correct command | `background.ts:215` | `if (command !== 'save-current-page') return;` |
| Uses shared `captureActiveTab()` | `background.ts:217` | Calls `captureActiveTab()` |
| `captureActiveTab()` uses `saveManualCapture` | `background.ts:188` | Bypasses blocklist correctly |
| Non-http URLs filtered | `background.ts:184` | Checks `startsWith('http://')` and `startsWith('https://')` |
| No-tab edge case handled | `background.ts:183-185` | Returns false if `tabs[0]` is undefined or has no URL |
| Error handling present | `background.ts:218-220` | try/catch wrapping |

### Acceptance Criterion 3: Popup Button (#6) — already existed

**Status:** VERIFIED (pre-existing)

**Evidence — code inspection:**
```
$ grep -n "saveManualCapture" extension/entrypoints/popup/main.ts
2:import { ... saveManualCapture } from '../../components/storage';
193:        await saveManualCapture(url, title, domain);
```

Builder correctly identified the popup button already existed and was wired to `saveManualCapture`. No changes needed.

### Acceptance Criterion 4: All manual captures bypass blocklist

**Status:** VERIFIED

**Evidence — test suite:**
```
 ✓ context menu capture > captures on blocked domains (bypasses blocklist)
```

**Evidence — storage test:**
```
 ✓ saveManualCapture > saves manual capture on blocked domain (bypasses blocklist)
```

**Evidence — code inspection:**
`saveManualCapture()` in `storage.ts:73-111` does NOT call `loadBlocklist()` or `isBlocked()`. It saves directly to storage regardless of domain. This is the correct behavior — the whole point of manual capture is to override the blocklist.

### Acceptance Criterion 5: Captures tagged with `source: 'manual'`

**Status:** VERIFIED

**Evidence — test assertions confirming `source: 'manual'`:**
- `manual-capture.test.ts:80` — context menu page capture
- `manual-capture.test.ts:122` — context menu on blocked domain
- `manual-capture.test.ts:155` — keyboard shortcut capture
- `storage.test.ts:205` — saveManualCapture new entry
- `storage.test.ts:227` — upgrade from live to manual
- `storage.test.ts:245` — upgrade from backfill to manual
- `storage.test.ts:256` — manual on blocked domain

---

## Edge Case Tests

### Edge 1: Non-http URL via context menu (chrome://, about://, javascript:)

**Status:** VERIFIED

Test `context menu capture > ignores non-http URLs` covers `chrome://extensions/`. The code at `background.ts:200-201` filters both `info.linkUrl` and `info.pageUrl` — any URL not starting with `http://` or `https://` is silently dropped.

### Edge 2: No active tab for keyboard shortcut

**Status:** VERIFIED

Test `keyboard shortcut capture > does nothing when no active tab exists` mocks `tabs.query` returning empty array. `captureActiveTab()` at `background.ts:183` safely handles `tabs[0]` being undefined via optional chaining.

### Edge 3: Non-http active tab for keyboard shortcut

**Status:** VERIFIED

Test `keyboard shortcut capture > does nothing when active tab has no http URL` mocks a `chrome://settings` tab. The function returns `false` without attempting to save.

### Edge 4: Unrelated keyboard command

**Status:** VERIFIED

Test `keyboard shortcut capture > ignores unrelated commands` sends `'some-other-command'` — handler returns immediately without querying tabs.

### Edge 5: Right-click on link (link URL vs page URL)

**Status:** VERIFIED

Test `context menu capture > captures the link URL when right-clicking a link` verifies that `info.linkUrl` takes priority over `info.pageUrl`. Title is empty for link URLs (correct — we don't have the linked page's title).

### Edge 6: Duplicate capture upgrade (live → manual)

**Status:** VERIFIED

Test `storage.test.ts:209-228` verifies that if a URL was already captured today as `live`, calling `saveManualCapture` upgrades the source to `manual` without creating a duplicate entry.

### Edge 7: Tab parameter undefined in context menu handler

**Status:** VERIFIED (code inspection)

`handleContextMenuClick` declares `tab?: chrome.tabs.Tab` (optional). Line 204 uses `tab?.title` with optional chaining. If Chrome doesn't provide the tab parameter, the title defaults to `''`.

---

## Observations (non-blocking)

### Context menu creation on service worker restart

The `contextMenus.create()` call at `background.ts:271-275` is in the main `defineBackground` body, which runs on every service worker initialization. Chrome context menus persist across service worker restarts. Calling `create()` with an existing ID produces a "duplicate id" error.

**Impact:** LOW — The context menu still works (the original persists). The error is an uncaught promise rejection that produces console noise but doesn't break functionality. Standard mitigations: call `contextMenus.removeAll()` before `create`, or move creation to `onInstalled`.

**Not counted as a test failure** because the feature works correctly on first install and the error on restart doesn't affect behavior.

---

## Test Coverage Summary

| Feature | Tests | Edge Cases | Blocklist Bypass |
|---|---|---|---|
| Context menu (page) | ✓ | Non-http URLs, undefined tab | ✓ Verified |
| Context menu (link) | ✓ | Link URL priority | ✓ Verified |
| Keyboard shortcut | ✓ | No tab, non-http tab, wrong command | ✓ Verified |
| Manual capture storage | ✓ | Dedup upgrade (live→manual, backfill→manual) | ✓ Verified |
| Popup button | ✓ (pre-existing) | — | ✓ Verified |

---

## Limitations

This is a browser extension project. The tests exercise the handler functions in isolation using mocked Chrome APIs. The following cannot be verified from the CLI:

- Actual context menu appearance in the browser
- Keyboard shortcut registration and conflict detection in the browser
- End-to-end flow with real `chrome.storage.local`
- Visual feedback to the user after capture

These require manual browser testing with the extension loaded unpacked.

---

## Adversarial Verdict: **PASS**

All acceptance criteria are verified with evidence. The implementation is correct, edge cases are covered, and no regressions were introduced (0 new TS errors, all 166 tests pass). The context menu creation pattern observation is non-blocking.
