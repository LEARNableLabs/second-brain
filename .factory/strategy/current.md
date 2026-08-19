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
