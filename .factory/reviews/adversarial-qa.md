# Adversarial QA Report — Cycle 2 (H1 + H2 + H4)

- **timestamp:** 2026-08-19T15:50:00Z
- **project type:** CLI / Browser Extension (monorepo)
- **scope:** Vitest workspace isolation (H1), TypeScript strict mode fixes (H2), manual capture features (H4)

---

## Smoke Test

**Command:** `npm test`
**Status:** PASS

```
extension: 7 test files, 83 tests passed
pipeline: 10 test files, 78 tests passed
shared: 2 test files, 5 tests passed
Total: 19 files, 166 tests passed, 0 failed
```

---

## Acceptance Criteria

### AC-1: `npx vitest run` from root passes all 166 tests

**Status:** VERIFIED

**Command:**
```bash
npx vitest run
```

**Output:**
```
 Test Files  19 passed (19)
      Tests  166 passed (166)
   Start at  15:49:23
   Duration  2.71s
```

**Evidence:** Root `vitest.config.ts` uses `projects: ['extension', 'pipeline', 'shared']` to properly isolate workspaces. Each workspace runs with its own vitest config (extension uses jsdom + Chrome API mocks via `tests/setup.ts`, pipeline uses node environment). No test failures. The `projects` approach in vitest v4 is equivalent to `vitest.workspace.ts` — both achieve workspace isolation.

---

### AC-2: `npx tsc --noEmit` in all workspaces shows 0 errors

**Status:** VERIFIED

**Commands and outputs:**
```bash
cd extension && npx tsc --noEmit
# EXIT: 0 (no output = no errors)

cd pipeline && npx tsc --noEmit
# EXIT: 0 (no output = no errors)

cd shared && npx tsc --noEmit
# EXIT: 0 (no output = no errors)
```

**Evidence:** All three workspaces compile cleanly under strict mode. Builder fixes:
- Extension: Added `@types/chrome` as devDependency (fixes 33 "Cannot find namespace 'chrome'" errors)
- Extension: Added `wxt-shims.d.ts` declaring `defineBackground` global
- Extension: Fixed mock type casts in test setup
- Pipeline: Added `modules.d.ts` declaring `write-file-atomic` and `chrome-native-messaging` modules
- Pipeline: Updated `tsconfig.json` to include type declarations

---

### AC-3: `npm test` passes

**Status:** VERIFIED

**Command:**
```bash
npm test
```

**Output:**
```
> extension@1.0.0 test → vitest run
  Test Files  7 passed (7)
       Tests  83 passed (83)

> pipeline@0.1.0 test → vitest run
  Test Files  10 passed (10)
       Tests  78 passed (78)

> @second-brain/shared@0.1.0 test → vitest run
  Test Files  2 passed (2)
       Tests  5 passed (5)
```

**Evidence:** `npm test` runs `npm run test --workspaces --if-present`, which invokes `vitest run` in each workspace independently. All pass with exit code 0.

---

### AC-4: No regressions in extension functionality

**Status:** VERIFIED

**Evidence:**

1. **All pre-existing tests pass unchanged:**
   - `background.test.ts` — page load, tab activation, tab removal, install, startup, export handlers
   - `blocklist.test.ts` — domain matching and pattern handling
   - `dwell-tracker.test.ts` — 5s dwell threshold, cancel tracking, blocklist check
   - `history-backfill.test.ts` — gap detection, backfill logic
   - `popup.test.ts` — time formatting, module exports
   - `storage.test.ts` — save/load, dedup, manual capture

2. **New manual capture features (H4) verified:**
   - Context menu: `handleContextMenuClick` in `background.ts:195-210`, 4 tests pass
   - Keyboard shortcut: `handleCommand` in `background.ts:215-222`, 4 tests pass
   - Manifest declares `Cmd+Shift+S` / `Ctrl+Shift+S` in `wxt.config.ts:19-27`
   - `contextMenus` permission added to manifest at `wxt.config.ts:9`

3. **Eval score improvement confirmed:**
   ```bash
   python3 eval/score.py
   # tests: 1.0 (was 0.0)
   # Factory precheck gate is now unblocked
   ```

---

## Edge Case Tests

| Edge Case | Test | Result |
|---|---|---|
| Non-http URL via context menu (`chrome://`) | `ignores non-http URLs` | VERIFIED — silently dropped |
| No active tab for keyboard shortcut | `does nothing when no active tab exists` | VERIFIED — returns false |
| Non-http active tab for shortcut (`chrome://settings`) | `does nothing when active tab has no http URL` | VERIFIED — returns false |
| Unrelated keyboard command | `ignores unrelated commands` | VERIFIED — returns immediately |
| Right-click on link (link URL vs page URL) | `captures the link URL when right-clicking a link` | VERIFIED — linkUrl takes priority |
| Manual capture on blocked domain | `captures on blocked domains (bypasses blocklist)` | VERIFIED — saves with source=manual |
| Duplicate capture upgrade (live → manual) | `storage.test.ts` dedup tests | VERIFIED — upgrades source, no duplicate |

---

## Observations (non-blocking)

1. **Context menu creation location:** `contextMenus.create()` is called at service worker init (`background.ts:272`) rather than inside `onInstalled` as the strategy recommended. This can produce a harmless "duplicate ID" console error on SW restart. Not a regression (same pattern as cycle 1), and Chrome handles the duplicate silently — the context menu still works.

---

## Adversarial Verdict: **PASS**

All 4 acceptance criteria verified with command output evidence:
- 166/166 tests pass via `npx vitest run` from project root
- 0 TypeScript errors across all 3 workspaces
- `npm test` passes cleanly
- No regressions in existing extension functionality
- Eval `tests` dimension moved from 0.0 to 1.0, unblocking the factory precheck gate
