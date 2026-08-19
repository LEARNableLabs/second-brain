# Code Review — Manual Capture Features

**Commit:** `0b0d01b feat: add manual capture features — context menu, keyboard shortcut`
**Hypothesis:** H1 — Add manual capture features: popup button, context menu, keyboard shortcut
**Files changed:** 4 (extension/entrypoints/background.ts, extension/tests/manual-capture.test.ts, extension/tests/setup.ts, extension/wxt.config.ts)

---

## 7-Category Checklist

### 1. Correctness — PASS

- `captureActiveTab()` correctly queries for the active tab, validates URL scheme (http/https only), extracts hostname via `new URL()`, and delegates to `saveManualCapture`. Handles empty query results (`tabs[0]` undefined) via optional chaining.
- `handleContextMenuClick()` correctly prioritizes `info.linkUrl` over `info.pageUrl` for the target URL. Sets title to empty string for link clicks (no title available for the link target) and falls back to `tab?.title` for page clicks.
- `handleCommand()` guards on the exact command name `'save-current-page'` matching the manifest key in `wxt.config.ts`.
- `saveManualCapture` (pre-existing in `storage.ts:73`) handles dedup correctly: upgrades existing entries to `source: 'manual'` and creates new entries with Zod validation.
- Context menu registration uses correct `contexts: ['page', 'link']` and the `contextMenus` permission is added to the manifest.
- Keyboard shortcut manifest config correctly specifies platform-specific keys (`Command+Shift+S` for mac, `Ctrl+Shift+S` default).

### 2. Security — PASS

- URL scheme validation (`startsWith('http://')` / `startsWith('https://')`) prevents capture of `chrome://`, `file://`, and extension protocol URLs — consistent with existing T-01-05 mitigation.
- No hardcoded secrets, API keys, or credentials.
- URL parsing uses `new URL()` (safe, throws on invalid input; caught by try/catch wrappers).
- No user input flows into file paths, shell commands, or eval.

### 3. Edge Cases — PASS

- Non-http URLs filtered in both `captureActiveTab` and `handleContextMenuClick`.
- Empty tab query result handled: `tabs[0]` is undefined → `tab?.url` is falsy → returns false.
- Missing tab title: `tab.title || ''` fallback in `captureActiveTab`; `(info.linkUrl ? '' : tab?.title) || ''` in context menu handler.
- Unrecognized commands: `handleCommand` returns early for anything other than `'save-current-page'`.
- Missing `tab` parameter in context menu (can be undefined when right-clicking outside a tab context): handled via optional parameter and `tab?.title`.
- All async handlers have try/catch with `console.error` logging, consistent with existing error handling pattern in the file.

### 4. Missing Tests — PASS

8 new tests in `extension/tests/manual-capture.test.ts`:

| Test | What it covers |
|---|---|
| Context menu: page URL capture | Happy path — right-click page, captures URL with title |
| Context menu: link URL capture | linkUrl prioritized over pageUrl, title set to empty |
| Context menu: non-http URL | chrome:// URL filtered, no storage write |
| Context menu: blocked domain bypass | Blocklist bypass confirmed (gmail.com captured as manual) |
| Keyboard shortcut: save-current-page | Happy path — active tab captured with correct source |
| Keyboard shortcut: unrelated command | Guard clause — wrong command name, no query/storage call |
| Keyboard shortcut: non-http tab | chrome://settings filtered, no storage write |
| Keyboard shortcut: no active tab | Empty query result, no storage write |

`captureActiveTab` (private) is tested indirectly via `handleCommand`. All new public functions have test coverage.

### 5. Style & Consistency — PASS

- Naming: camelCase functions, kebab-case IDs (`save-to-second-brain`, `save-current-page`) — consistent with project.
- Error handling: try/catch + `console.error` pattern matches all existing handlers in background.ts.
- Import organization: new import (`saveManualCapture`) added to existing import line — clean.
- JSDoc comments on all exported functions, matching existing style.
- No dead code or unused imports.
- Test file mock setup follows the same pattern as existing tests with `vi.fn()` and `globalThis` chrome API mocking.

### 6. Scope Compliance — PASS

**Spec fidelity: 3/3 criteria met**

| Issue | Feature | Status |
|---|---|---|
| #6 | Popup button | Pre-existing — `popup/main.ts:186-201` already wires a save button to `saveManualCapture`. No changes needed. Builder correctly identified this. |
| #7 | Context menu | Implemented — permission added, menu created, handler registered and tested |
| #8 | Keyboard shortcut | Implemented — manifest command config, handler registered and tested |

- No scope creep: changes are limited to the extension directory, no unrelated modifications.
- No scope shrinkage: all three features are addressed.
- Hypothesis stated "All three features reuse the existing capture/storage pipeline — no new data flow, just new entry points." ✓ Confirmed — all three entry points call `saveManualCapture` from storage.ts.

### 7. Guardrail Compliance — PASS

- **File length:** All files under 500 lines (max: background.ts at 305 lines).
- **Scope:** All 4 modified files are within `extension/` — declared scope.
- **Fixed surfaces:** No `eval/score.py` or `.factory/` content files modified in the source diff.
- **No new dependencies added.**

---

## Issues Found

| # | Severity | Category | File:Line | Description |
|---|---|---|---|---|
| 1 | minor | correctness | extension/entrypoints/background.ts:271 | `browser.contextMenus.create()` is called inside `defineBackground()` without awaiting or catching the returned promise. On service worker restart (after first install), the menu item already exists, and `create()` with a duplicate ID will set `chrome.runtime.lastError`. Via webextension-polyfill this becomes an unhandled promise rejection. Not a crash — Chrome ignores the duplicate and the menu works — but produces console noise. Standard fix: call `create()` inside `runtime.onInstalled` listener or prefix with `browser.contextMenus.removeAll()`. |

---

## Plan Completion

| Deliverable | Status |
|---|---|
| Popup button (#6) | ✓ Pre-existing, verified wired to `saveManualCapture` |
| Context menu (#7) | ✓ Fully implemented and tested |
| Keyboard shortcut (#8) | ✓ Fully implemented and tested |
| Tests | ✓ 8 new tests, all covering real behavior (no stubs) |

No stubbed deliverables. All methods contain real implementations with correct logic.

---

## Overall Result: **CLEAN**

No critical or important issues. One minor issue (uncaught promise on duplicate context menu creation) that does not affect functionality. All 7 categories pass. Spec fidelity 3/3. Proceed to adversarial testing.
