## Episodic Memory (Task-Relevant)

============================================================
  Results for: "# Interaction Study —   Analyzed 3 conversation log(s), 9 relevant messages.  ## User Messages (3)"
  Wing: project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851
============================================================

  [1] project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 / experiments
      Source: current.md
      Match:  cosine_sim=0.218  bm25=3.927

      ## Strategy — 2026-08-19
      
      ### Design Space
      | Dimension | Score | Notes |
      |---|---|---|
      | Features | 1 | Core pipeline built (phases 1-7), but no manual capture features yet |
      | Bug fixes | 2 | Eval harness fixed (commit ad150ad), some TS errors remain |
      | Instrumentation | 1 | 18.1% observability, no structured logging, no tracing |
      | Flow changes | 3 | Monorepo pipeline architecture is solid (extension → pipeline → vault) |
      | New agents | 0 | No factory experiments yet |
      | Prompt engineering | 2 | AI curation prompts exist but untested/unoptimized |
      | Eval improvements | 2 | Project eval works (tests + observability), factory meta-eval has discrepancy |
      | Knowledge management | 0 | No vault sources, no archive, no cross-project patterns |
      | Infrastructure | 3 | LaunchD automation, cron scheduling already implemented |
      | Operational execution | 1 | No end-to-end validation on real browsing data |
      | Self-evolution | 0 | First factory cycle — no experiments yet |
      
      **Underserved:** Instrumentation (1), Features (1), Knowledge management (0)
      
      ### Observations
      - Current composite score: 0.306 (factory meta-eval, 12 dimensions)
      - Project eval score: 0.848 (tests=1.0 @ 83.3%, observability=0.091 @ 16.7%)
      - Weakest eval dimensions: tests=0.0 (meta-eval discrepancy — npm test passes 158 tests but factory sees "0 passed, 18 failed"), type_check=0.0 (37 TS errors), capability_surface=0.04 (surface=4, target=100), observability=0.181
      - Last experiments: none (first factory cycle)
      - Pattern: The project has a solid pipeline (7 phases complete, all features built) but lacks user-facing interaction points beyond passive capture. The extension has no manual capture UI — users can't override the skiplist. Observability is critically low with no structured logging and 47/132 functions uninstrumented.
      - Factory meta-eval tests=0.0 vs project eval tests=1.0: The factory's meta-evaluator appears to be running tests differently than `npm test` from project root. This is a known discrepancy flagged by the Researcher — worth investigating but not blocking growth work.
      - 6 open GitHub issues: #6-#8 are low-cost manual capture enhancements, #9-#10 are high-cost dashboard features (deferred), #11 is already resolved.
      
      ### Hypotheses
      
      #### H1: Add manual capture features — popup button, context menu, keyboard shortcut
      - **Category:** EXPLORE
      - **New:** Addresses open issues #6, #7, #8
      - **Growth dimension:** capability_surface
      - **What:** Implement three manual capture features in the browser extension, bundled as one PR:
        1. **Popup button** (#6): Add a "Capture this page" button to the extension popup that saves the current page immediately, bypassing the skiplist. Wire it to the existing capture logic in the background script.
        2. **Context menu** (#7): Register a "Save to Second Brain" context menu item via `chrome.contextMenus.create()` in the background script. Handle `onClicked` to capture the target page/link URL.
        3. **Keyboard shortcut** (#8): Define `Cmd+Shift+S` in the extension manifest via `chrome.commands` API. Handle the command in the background script to capture the active tab.
        All three features reuse the existing capture/storage pipeline — no new data flow, just new entry points.
      - **Why:** capability_surface is at 0.04 (4/100 target) — the lowest growth dimension. These three features add user-facing interaction points with minimal implementation risk (each uses a well-documented Chrome extension API). The Researcher confirmed these are low-cost, high-impact: capability_surface jumps from 4→12 (+200%). The CEO's review explicitly prioritized this.
      - **Expected impact:** capability_surface 0.04 → 0.12 (+200%), factory_effectiveness improves when first experiment is kept
      - **Priority:** high
      
      #### H2: Add Pino structured logging to pipeline and shared modules
      - **Category:** EXPLORE
      - **New:** Targets observability growth
      - **Growth dimension:** observability
      - **What:** Install Pino structured logging and instrument the pipeline's critical paths:
        1. **Install deps:** `pino` (production), `pino-pretty` (dev) in pipeline and shared workspaces.
        2. **Create shared logger:** Add `shared/src/logger.ts` exporting `createModuleLogger(name)` that returns a Pino child logger with module context. Configure JSON output by default, ISO timestamps, and `LOG_LEVEL` env var support.
        3. **Instrument 10 highest-priority uninstrumented files** (47 functions total): `pipeline/src/db/operations.ts` (7 fns), `extension/components/storage.ts` (13 fns), `pipeline/src/ai/provider.ts` (4 fns), `pipeline/src/ai/curate.ts` (3 fns), `pipeline/src/ai/vault-scanner.ts` (4 fns), `pipeline/src/db/connection.ts` (4 fns), `pipeline/src/db/content-operations.ts` (4 fns), `pipeline/src/db/migrate.ts` (2 fns), `pipeline/src/generators/writer.ts` (2 fns), `extension/components/history-backfill.ts` (4 fns).
        4. **Log at boundaries:** function entry with key params, error catches with context, and key decision points (e.g., AI provider selection, migration execution, content extraction strategy).
        5. **Add request ID tracing:** Generate a unique `requestId` per pipeline invocation in the CLI entry point, pass via Pino child logger context.
      - **Why:** Observability is at 0.181 — well below the 0.5 priority threshold. The factory cannot learn from production behavior without structured logs. Pino is the right choice: 5-8x faster than Winston, minimal bundle size, JSON by default, native OpenTelemetry support for future tracing. The Researcher confirmed Pino as the standard for Node.js/TypeScript projects. The CEO's review explicitly prioritized this.
      - **Expected impact:** observability 0.181 → 0.55+ (structured=yes adds 25%, coverage 20%→55% adds another 15%, tracing=yes adds 10%)
      - **Priority:** high
      
      ### Anti-patterns to Avoid
      - **Don't fix the factory meta-eval tests discrepancy in these hypotheses:** The tests=0.0 in factory meta-eval is a meta-evaluation issue, not a project code issue. npm test passes 158 tests. Mixing meta-eval debugging with feature work would bloat scope.
      - **Don't bundle dashboard features (#9, #10) with manual capture:** Issues #9-#10 are high-complexity UI work (card layouts, email integration). They have different risk profiles and would bloat the PR. Keep them separate for a future cycle.
      - **Don't use Winston for logging:** Research shows Pino is 5-8x faster with smaller bundle — Winston is overkill for this use case.
      - **Don't add console.log wrappers as "structured logging":** The eval checks for actual structured logging libraries (pino, winston, structlog). Console.log wrappers won't move the score.
      - **Don't create a separate logging package:** Use the existing `shared` workspace to host the logger module — no new package needed.
      
      ### New Backlog Items
      - Fix factory meta-eval tests discrepancy: investigate why factory meta-eval reports "0 passed, 18 failed" when npm test passes 158 tests — likely a working directory or test runner detection issue in the factory's eval system
      - Fix 37 TypeScript strict mode errors (24 extension, 12 pipeline, 1 root): install @types/chrome, fix test mock types with Partial<T> or @webext-core/fake-browser, fix function signature mismatches — would bring type_check from 0.0 to 1.0
      - Dashboard view modes (#9, #10): high-complexity features requiring new UI layer — defer until core capture pipeline is validated on real data

  --------------------------------------------------------
  [2] project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 / reviews
      Source: adversarial-qa.md
      Match:  cosine_sim=0.216  bm25=0.289

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

  --------------------------------------------------------
  [3] project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 / reviews
      Source: code-review.md
      Match:  cosine_sim=0.174  bm25=0.339

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

  --------------------------------------------------------
  [4] project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 / decisions
      Source: verdict.json
      Match:  cosine_sim=0.199  bm25=0.0

      {
        "id": 1,
        "timestamp": "2026-08-19 14:46:24.985448",
        "hypothesis": "Add manual capture features \u2014 popup button, context menu, keyboard shortcut (issues #6, #7, #8)",
        "change_summary": "",
        "issue_number": null,
        "pr_number": 12,
        "score_before": null,
        "score_after": null,
        "delta": null,
        "verdict": "revert",
        "cost_usd": 3.7178692500000006,
        "notes": "[OVERRIDDEN by finalize gate] precheck failed: score_direction. ceo:keep score_delta=+0.002 composite=0.308 baseline=0.306 tests_pass=166/166 guard_violations=0 qa_clean=true precheck_halted=threshold_below_0.5_preexisting capability_surface_added=context_menu+keyboard_shortcut+popup_button",
        "research_citations": []
      }

  --------------------------------------------------------



## Past QA Findings

============================================================
  Results for: "code review issues findings"
  Wing: project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851
  Room: reviews
============================================================

  [1] project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 / reviews
      Source: code-review.md
      Match:  cosine_sim=0.143  bm25=2.923

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

  --------------------------------------------------------
  [2] project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 / reviews
      Source: adversarial-qa.md
      Match:  cosine_sim=0.271  bm25=0.871

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

  --------------------------------------------------------
  [3] project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 / reviews
      Source: health-check.md
      Match:  cosine_sim=0.334  bm25=0.0

      # Health Check Report
      
      - **timestamp:** 2026-08-19T14:42:30Z
      - **baseline_composite:** 0.306
      - **current_composite:** 0.308
      
      ---
      
      ## Score Table
      
      | Dimension | Score | Weight | Passed | Details |
      |---|---|---|---|---|
      | tests | 0.0 | 0.155 | NO | Factory meta-eval: "0 passed, 19 failed" (known detection discrepancy — see note below) |
      | lint | 0.6 | 0.075 | NO | 1 error each in root, extension, pipeline, shared |
      | type_check | 0.0 | 0.05 | NO | 1 root + 33 extension + 12 pipeline TS errors |
      | coverage | 0.5 | 0.125 | YES | No coverage tool detected (neutral) |
      | config_parser | 1.0 | 0.05 | YES | All config checks pass |
      | architecture | 0.5 | 0.045 | YES | No .sentrux/rules.toml (neutral) |
      | capability_surface | 0.04 | 0.125 | NO | surface=4, target=100 |
      | experiment_diversity | 0.5 | 0.1 | YES | 0 experiments (neutral) |
      | observability | 0.177 | 0.09 | NO | coverage=0.19, structured_logging=false |
      | research_grounding | 0.0 | 0.07 | NO | No sources, no research report |
      | factory_effectiveness | 0.5 | 0.065 | YES | 0 experiments (neutral) |
      | spec_compliance | 0.5 | 0.05 | YES | No spec_results.json (neutral) |
      
      ## Composite
      
      - **Score:** 0.308
      - **Baseline:** 0.306
      - **Delta:** +0.002
      - **Threshold result:** AT BASELINE (within noise)
      
      ## Unit Tests
      
      - **Status: PASS**
      - Extension: 83 passed (10 test files)
      - Pipeline: 78 passed (10 test files)
      - Shared: 5 passed (2 test files)
      - **Total: 166 tests passing, 0 failures**
      
      ### Note on factory meta-eval tests discrepancy
      
      The factory meta-eval reports `tests=0.0` ("0 passed, 19 failed"), but `npm test` from the project root passes all 166 tests across all three workspaces. This is a known discrepancy documented in the strategy — the factory's test runner detection does not correctly handle this monorepo's workspace-based test setup. The actual tests are passing. This discrepancy existed before the builder's changes and is not a regression.
      
      ## Guard Violations
      
      None.
      
      ## Overall Gate Result
      
      **PASS**
      
      - Unit tests pass (166/166 across all workspaces)
      - Composite score 0.308 is at baseline (0.306), delta +0.002
      - No guard violations
      - The tests=0.0 in factory meta-eval is a pre-existing detection issue, not a regression from the builder's changes

  --------------------------------------------------------



## Design Rationale

============================================================
  Results for: "decision rationale tradeoff"
  Wing: project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851
  Room: decisions
============================================================

  [1] project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 / decisions
      Source: verdict.json
      Match:  cosine_sim=0.049  bm25=0.0

      {
        "id": 1,
        "timestamp": "2026-08-19 14:46:24.985448",
        "hypothesis": "Add manual capture features \u2014 popup button, context menu, keyboard shortcut (issues #6, #7, #8)",
        "change_summary": "",
        "issue_number": null,
        "pr_number": 12,
        "score_before": null,
        "score_after": null,
        "delta": null,
        "verdict": "revert",
        "cost_usd": 3.7178692500000006,
        "notes": "[OVERRIDDEN by finalize gate] precheck failed: score_direction. ceo:keep score_delta=+0.002 composite=0.308 baseline=0.306 tests_pass=166/166 guard_violations=0 qa_clean=true precheck_halted=threshold_below_0.5_preexisting capability_surface_added=context_menu+keyboard_shortcut+popup_button",
        "research_citations": []
      }

  --------------------------------------------------------



## Anti-Patterns & Past Failures

  No results found for: "failed reverted broken"


## Knowledge Graph Facts
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 has_hypothesis H1: Add manual capture features — popup button, context menu, keyboard shortcut
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 has_hypothesis H2: Add Pino structured logging to pipeline and shared modules
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't fix the factory meta-eval tests discrepancy in these hypotheses:** The tests=0.0 in factory meta-eval is a meta-evaluation issue, not a project code issue. npm test passes 158 tests. Mixing meta-eval debugging with feature work would bloat scope.
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't bundle dashboard features (#9, #10) with manual capture:** Issues #9-#10 are high-complexity UI work (card layouts, email integration). They have different risk profiles and would bloat the PR. Keep them separate for a future cycle.
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't use Winston for logging:** Research shows Pino is 5-8x faster with smaller bundle — Winston is overkill for this use case.
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't add console.log wrappers as "structured logging":** The eval checks for actual structured logging libraries (pino, winston, structlog). Console.log wrappers won't move the score.
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't create a separate logging package:** Use the existing `shared` workspace to host the logger module — no new package needed.
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 design_session 2026-08-19T18:47:38Z: 
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 current_strategy Strategy — 2026-08-19
/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 eval_score 0.0

## Timeline
2026-08-19: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 has_hypothesis H1: Add manual capture features — popup button, context menu, keyboard shortcut
2026-08-19: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 has_hypothesis H2: Add Pino structured logging to pipeline and shared modules
2026-08-19: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't fix the factory meta-eval tests discrepancy in these hypotheses:** The tests=0.0 in factory meta-eval is a meta-evaluation issue, not a project code issue. npm test passes 158 tests. Mixing meta-eval debugging with feature work would bloat scope.
2026-08-19: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't bundle dashboard features (#9, #10) with manual capture:** Issues #9-#10 are high-complexity UI work (card layouts, email integration). They have different risk profiles and would bloat the PR. Keep them separate for a future cycle.
2026-08-19: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't use Winston for logging:** Research shows Pino is 5-8x faster with smaller bundle — Winston is overkill for this use case.
2026-08-19: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't add console.log wrappers as "structured logging":** The eval checks for actual structured logging libraries (pino, winston, structlog). Console.log wrappers won't move the score.
2026-08-19: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 rejected_approach **Don't create a separate logging package:** Use the existing `shared` workspace to host the logger module — no new package needed.
2026-08-19: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 design_session 2026-08-19T18:47:38Z: 
2026-08-19T00:00:00Z: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 current_strategy Strategy — 2026-08-19
2026-08-19T00:00:00Z: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 eval_score 0.0

## Experiment Outcomes

============================================================
  Results for: "experiment verdict keep revert"
  Wing: project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851
  Room: experiments
============================================================

  [1] project:/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851 / experiments
      Source: current.md
      Match:  cosine_sim=0.2  bm25=0.575

      ## Strategy — 2026-08-19
      
      ### Design Space
      | Dimension | Score | Notes |
      |---|---|---|
      | Features | 1 | Core pipeline built (phases 1-7), but no manual capture features yet |
      | Bug fixes | 2 | Eval harness fixed (commit ad150ad), some TS errors remain |
      | Instrumentation | 1 | 18.1% observability, no structured logging, no tracing |
      | Flow changes | 3 | Monorepo pipeline architecture is solid (extension → pipeline → vault) |
      | New agents | 0 | No factory experiments yet |
      | Prompt engineering | 2 | AI curation prompts exist but untested/unoptimized |
      | Eval improvements | 2 | Project eval works (tests + observability), factory meta-eval has discrepancy |
      | Knowledge management | 0 | No vault sources, no archive, no cross-project patterns |
      | Infrastructure | 3 | LaunchD automation, cron scheduling already implemented |
      | Operational execution | 1 | No end-to-end validation on real browsing data |
      | Self-evolution | 0 | First factory cycle — no experiments yet |
      
      **Underserved:** Instrumentation (1), Features (1), Knowledge management (0)
      
      ### Observations
      - Current composite score: 0.306 (factory meta-eval, 12 dimensions)
      - Project eval score: 0.848 (tests=1.0 @ 83.3%, observability=0.091 @ 16.7%)
      - Weakest eval dimensions: tests=0.0 (meta-eval discrepancy — npm test passes 158 tests but factory sees "0 passed, 18 failed"), type_check=0.0 (37 TS errors), capability_surface=0.04 (surface=4, target=100), observability=0.181
      - Last experiments: none (first factory cycle)
      - Pattern: The project has a solid pipeline (7 phases complete, all features built) but lacks user-facing interaction points beyond passive capture. The extension has no manual capture UI — users can't override the skiplist. Observability is critically low with no structured logging and 47/132 functions uninstrumented.
      - Factory meta-eval tests=0.0 vs project eval tests=1.0: The factory's meta-evaluator appears to be running tests differently than `npm test` from project root. This is a known discrepancy flagged by the Researcher — worth investigating but not blocking growth work.
      - 6 open GitHub issues: #6-#8 are low-cost manual capture enhancements, #9-#10 are high-cost dashboard features (deferred), #11 is already resolved.
      
      ### Hypotheses
      
      #### H1: Add manual capture features — popup button, context menu, keyboard shortcut
      - **Category:** EXPLORE
      - **New:** Addresses open issues #6, #7, #8
      - **Growth dimension:** capability_surface
      - **What:** Implement three manual capture features in the browser extension, bundled as one PR:
        1. **Popup button** (#6): Add a "Capture this page" button to the extension popup that saves the current page immediately, bypassing the skiplist. Wire it to the existing capture logic in the background script.
        2. **Context menu** (#7): Register a "Save to Second Brain" context menu item via `chrome.contextMenus.create()` in the background script. Handle `onClicked` to capture the target page/link URL.
        3. **Keyboard shortcut** (#8): Define `Cmd+Shift+S` in the extension manifest via `chrome.commands` API. Handle the command in the background script to capture the active tab.
        All three features reuse the existing capture/storage pipeline — no new data flow, just new entry points.
      - **Why:** capability_surface is at 0.04 (4/100 target) — the lowest growth dimension. These three features add user-facing interaction points with minimal implementation risk (each uses a well-documented Chrome extension API). The Researcher confirmed these are low-cost, high-impact: capability_surface jumps from 4→12 (+200%). The CEO's review explicitly prioritized this.
      - **Expected impact:** capability_surface 0.04 → 0.12 (+200%), factory_effectiveness improves when first experiment is kept
      - **Priority:** high
      
      #### H2: Add Pino structured logging to pipeline and shared modules
      - **Category:** EXPLORE
      - **New:** Targets observability growth
      - **Growth dimension:** observability
      - **What:** Install Pino structured logging and instrument the pipeline's critical paths:
        1. **Install deps:** `pino` (production), `pino-pretty` (dev) in pipeline and shared workspaces.
        2. **Create shared logger:** Add `shared/src/logger.ts` exporting `createModuleLogger(name)` that returns a Pino child logger with module context. Configure JSON output by default, ISO timestamps, and `LOG_LEVEL` env var support.
        3. **Instrument 10 highest-priority uninstrumented files** (47 functions total): `pipeline/src/db/operations.ts` (7 fns), `extension/components/storage.ts` (13 fns), `pipeline/src/ai/provider.ts` (4 fns), `pipeline/src/ai/curate.ts` (3 fns), `pipeline/src/ai/vault-scanner.ts` (4 fns), `pipeline/src/db/connection.ts` (4 fns), `pipeline/src/db/content-operations.ts` (4 fns), `pipeline/src/db/migrate.ts` (2 fns), `pipeline/src/generators/writer.ts` (2 fns), `extension/components/history-backfill.ts` (4 fns).
        4. **Log at boundaries:** function entry with key params, error catches with context, and key decision points (e.g., AI provider selection, migration execution, content extraction strategy).
        5. **Add request ID tracing:** Generate a unique `requestId` per pipeline invocation in the CLI entry point, pass via Pino child logger context.
      - **Why:** Observability is at 0.181 — well below the 0.5 priority threshold. The factory cannot learn from production behavior without structured logs. Pino is the right choice: 5-8x faster than Winston, minimal bundle size, JSON by default, native OpenTelemetry support for future tracing. The Researcher confirmed Pino as the standard for Node.js/TypeScript projects. The CEO's review explicitly prioritized this.
      - **Expected impact:** observability 0.181 → 0.55+ (structured=yes adds 25%, coverage 20%→55% adds another 15%, tracing=yes adds 10%)
      - **Priority:** high
      
      ### Anti-patterns to Avoid
      - **Don't fix the factory meta-eval tests discrepancy in these hypotheses:** The tests=0.0 in factory meta-eval is a meta-evaluation issue, not a project code issue. npm test passes 158 tests. Mixing meta-eval debugging with feature work would bloat scope.
      - **Don't bundle dashboard features (#9, #10) with manual capture:** Issues #9-#10 are high-complexity UI work (card layouts, email integration). They have different risk profiles and would bloat the PR. Keep them separate for a future cycle.
      - **Don't use Winston for logging:** Research shows Pino is 5-8x faster with smaller bundle — Winston is overkill for this use case.
      - **Don't add console.log wrappers as "structured logging":** The eval checks for actual structured logging libraries (pino, winston, structlog). Console.log wrappers won't move the score.
      - **Don't create a separate logging package:** Use the existing `shared` workspace to host the logger module — no new package needed.
      
      ### New Backlog Items
      - Fix factory meta-eval tests discrepancy: investigate why factory meta-eval reports "0 passed, 18 failed" when npm test passes 158 tests — likely a working directory or test runner detection issue in the factory's eval system
      - Fix 37 TypeScript strict mode errors (24 extension, 12 pipeline, 1 root): install @types/chrome, fix test mock types with Partial<T> or @webext-core/fake-browser, fix function signature mismatches — would bring type_check from 0.0 to 1.0
      - Dashboard view modes (#9, #10): high-complexity features requiring new UI layer — defer until core capture pipeline is validated on real data

  --------------------------------------------------------

