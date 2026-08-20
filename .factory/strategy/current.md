## Strategy — 2026-08-19 (Cycle 2)

### Design Space
| Dimension | Score | Notes |
|---|---|---|
| Features | 2 | Manual capture built (cycle 1) but reverted by precheck gate — code proven, needs re-apply |
| Bug fixes | 3 | Eval harness fixed (ad150ad), vitest workspace root cause identified by CEO |
| Instrumentation | 1 | 17.7% observability, no structured logging, no tracing |
| Flow changes | 3 | Monorepo pipeline architecture solid (extension → pipeline → vault) |
| New agents | 0 | No factory experiments kept yet |
| Prompt engineering | 2 | AI curation prompts exist but untested/unoptimized |
| Eval improvements | 3 | Project eval works, factory meta-eval root cause identified and fix specified |
| Knowledge management | 0 | No vault sources, no archive, no cross-project patterns |
| Infrastructure | 3 | LaunchD automation, cron scheduling already implemented |
| Operational execution | 1 | No end-to-end validation on real browsing data |
| Self-evolution | 1 | One experiment attempted, reverted by precheck gate |

**Underserved:** Knowledge management (0), Instrumentation (1), Operational execution (1)

### Observations
- Current composite score: 0.308 (factory meta-eval, 12 dimensions)
- Weakest eval dimensions: tests=0.0 (weight 0.155), type_check=0.0 (weight 0.05), capability_surface=0.04 (weight 0.125), observability=0.177 (weight 0.09), research_grounding=0.0 (weight 0.07)
- Last experiment: #1 (H1 manual capture) — verdict REVERT (precheck gate: tests=0.0 blocks all experiments regardless of code quality)
- Pattern: The factory is stuck at 0.308 because the #1 weighted dimension (tests=0.155) scores 0 due to a monorepo workspace isolation issue. The CEO identified the exact root cause: `npx vitest run` from project root runs all 19 test files in a single context — 9 extension tests fail because they need Chrome API mocks provided by workspace-specific vitest configs. Fix is surgical: create `vitest.workspace.ts` at project root. Until this is fixed, NO experiment can pass precheck, making the factory non-functional.
- TypeScript errors (46 total: 33 extension + 12 pipeline + 1 root) are the second hygiene blocker at type_check=0.0.
- H2 from cycle 1 (Pino structured logging) was never attempted — blocked by H1 precheck failure.
- Backlog has 8 items but 3 are duplicates, leaving 5 unique items. Items 1&6 (meta-eval tests) and 2&7 (TS errors) are duplicates. Items 5&8 (dashboard) are duplicates and should stay deferred.
- Cycle 1 anti-pattern noted: the previous strategy said "don't fix the factory meta-eval tests discrepancy" and deferred it. That was the wrong call — it caused the only experiment to be reverted. Fix infrastructure first, always.

### Hypotheses

#### H1: Create vitest.workspace.ts to fix monorepo test isolation
- **Category:** FIX
- **Backlog item:** Fix factory meta-eval tests dimension / Fix factory meta-eval tests discrepancy (clears backlog items 1 and 6)
- **Growth dimension:** factory_effectiveness
- **Hygiene dimension:** tests
- **What:** Create `vitest.workspace.ts` at the project root that references each workspace's vitest config:
  1. Create `vitest.workspace.ts` at project root defining workspaces: `['extension', 'pipeline', 'shared']` — each workspace already has its own `vitest.config.ts` with proper setup (extension has Chrome API mocks, pipeline has its own environment).
  2. This makes `npx vitest run` from project root properly isolate each workspace, running each with its own config/setup instead of lumping all 19 test files together.
  3. Verify all 166 tests pass via `npx vitest run` from root (the command the factory meta-eval uses).
- **Why:** This is the #1 blocker. The factory is non-functional — every experiment fails precheck because tests=0.0 (weight 0.155). The CEO confirmed the root cause: `npx vitest run` from root finds 19 test files, 9 fail because extension tests need workspace-specific Chrome API mocks. The fix is a single config file. Until this is fixed, no experiment can be kept, making all other hypotheses moot.
- **Expected impact:** tests 0.0 → 1.0 (+0.155 composite), factory_effectiveness improves (factory becomes functional). Composite: 0.308 → ~0.463.
- **Priority:** high

#### H2: Fix 46 TypeScript strict mode errors
- **Category:** FIX
- **Backlog item:** Fix 37 TypeScript strict mode errors (clears backlog items 2 and 7 — actual count is 46: 33 extension + 12 pipeline + 1 root)
- **Hygiene dimension:** type_check
- **What:** Fix all TypeScript errors across the monorepo:
  1. **Extension (33 errors):** Install `@types/chrome` as devDependency (`npm install -D @types/chrome` in extension workspace). This fixes the TS2503 "Cannot find namespace 'chrome'" errors which are the majority. Fix remaining test mock type errors with `Partial<T>` casts or `as unknown as Type` patterns for Chrome API mocks.
  2. **Pipeline (12 errors):** Fix function signature mismatches, missing type annotations, and any `strict: true` violations. These are likely parameter type mismatches and missing null checks.
  3. **Root (1 error):** Fix the single root-level TypeScript error.
  4. Verify with `npx tsc --noEmit` in each workspace — target zero errors.
- **Why:** type_check=0.0 is the second hygiene blocker. Combined with H1, fixing both FIX items brings the composite well above the 0.5 threshold, unblocking the factory for growth experiments. The fix is mechanical — mostly adding a missing type package and adjusting mock types.
- **Expected impact:** type_check 0.0 → ~1.0 (+0.05 composite). Combined with H1: composite ~0.463 → ~0.513 (crosses 0.5 threshold).
- **Priority:** high

#### H3: Add Pino structured logging to pipeline and shared modules
- **Category:** EXPLORE
- **Backlog item:** Add Pino structured logging (H2 from cycle 1)
- **Growth dimension:** observability
- **What:** Install Pino structured logging and instrument the pipeline's critical paths:
  1. **Install deps:** `pino` (production), `pino-pretty` (dev) in pipeline and shared workspaces.
  2. **Create shared logger:** Add `shared/src/logger.ts` exporting `createModuleLogger(name)` that returns a Pino child logger with module context. Configure JSON output by default, ISO timestamps, and `LOG_LEVEL` env var support.
  3. **Instrument 10 highest-priority uninstrumented files** (47 functions total): `pipeline/src/db/operations.ts` (7 fns), `extension/components/storage.ts` (13 fns), `pipeline/src/ai/provider.ts` (4 fns), `pipeline/src/ai/curate.ts` (3 fns), `pipeline/src/ai/vault-scanner.ts` (4 fns), `pipeline/src/db/connection.ts` (4 fns), `pipeline/src/db/content-operations.ts` (4 fns), `pipeline/src/db/migrate.ts` (2 fns), `pipeline/src/generators/writer.ts` (2 fns), `extension/components/history-backfill.ts` (4 fns).
  4. **Log at boundaries:** function entry with key params, error catches with context, and key decision points (e.g., AI provider selection, migration execution, content extraction strategy).
  5. **Add request ID tracing:** Generate a unique `requestId` per pipeline invocation in the CLI entry point, pass via Pino child logger context.
- **Why:** Observability is at 0.177 — well below the 0.5 priority threshold. The factory cannot learn from production behavior without structured logs. Pino is the right choice: 5-8x faster than Winston, minimal bundle size, JSON by default, native OpenTelemetry support for future tracing. This was H2 in cycle 1 but was never attempted because H1 failed precheck first.
- **Expected impact:** observability 0.177 → 0.55+ (structured=yes adds 25%, coverage 20%→55% adds 15%, tracing=yes adds 10%). Composite +0.034.
- **Priority:** high

#### H4: Re-attempt manual capture features (context menu, keyboard shortcut)
- **Category:** EXPLOIT
- **Backlog item:** Re-attempt manual capture features (H1 from cycle 1)
- **Growth dimension:** capability_surface
- **What:** Re-implement the three manual capture features that were built, code-reviewed (CLEAN), and adversarial-tested (PASS) in cycle 1 but reverted by the precheck gate:
  1. **Context menu** (#7): Register a "Save to Second Brain" context menu item via `chrome.contextMenus.create()` in the background script. Handle `onClicked` to capture the target page/link URL. Move creation to `runtime.onInstalled` listener to avoid duplicate ID error on service worker restart (addressing the minor code review finding from cycle 1).
  2. **Keyboard shortcut** (#8): Define `Cmd+Shift+S` / `Ctrl+Shift+S` in the extension manifest via `chrome.commands` API. Handle the command in the background script to capture the active tab.
  3. Both features reuse `saveManualCapture()` from storage.ts — bypasses blocklist, handles dedup upgrades.
  4. Re-use the test patterns from cycle 1 (8 tests covering all edge cases — non-http URLs, no active tab, wrong commands, blocked domains).
- **Why:** This code was fully validated in cycle 1: code review CLEAN, adversarial QA PASS, all 166 tests passing, zero new TS errors. It was reverted solely because the factory's test dimension scored 0 (the vitest workspace bug fixed by H1). With H1 fixing the precheck blocker, this should now pass. capability_surface is at 0.04 — the lowest growth dimension by weight (0.125).
- **Addresses:** #6, #7, #8
- **Expected impact:** capability_surface 0.04 → 0.12 (+0.01 composite). factory_effectiveness improves when second experiment is kept.
- **Priority:** high

### Anti-patterns to Avoid
- **Don't defer infrastructure fixes again:** Cycle 1's strategy said "don't fix the meta-eval tests discrepancy" and prioritized feature work instead. The result: the only experiment was reverted by precheck. Lesson learned — fix the factory's infrastructure first, always.
- **Don't re-implement manual capture from scratch:** The cycle 1 implementation was code-reviewed CLEAN and adversarial-tested PASS. Re-use the same approach, just fix the minor context menu creation issue (move to `onInstalled`).
- **Don't use Winston for logging:** Pino is 5-8x faster with smaller bundle — confirmed by cycle 1 research.
- **Don't add console.log wrappers as "structured logging":** The eval checks for actual structured logging libraries. Console.log wrappers won't move the score.
- **Don't bundle dashboard features (#9, #10) with these hypotheses:** High-complexity UI work with different risk profiles. Keep deferred.
- **Don't create a separate logging package:** Use the existing `shared` workspace to host the logger module.

### New Backlog Items
- Dashboard view modes (#9, #10): high-complexity features requiring new UI layer — defer until core capture pipeline is validated on real data and factory is consistently keeping experiments
