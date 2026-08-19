---
tags: [factory, experiment, second-brain]
project: second-brain
experiment_id: 002
verdict: keep
score_delta: +0.2266
date: 2026-08-19
source: factory-archivist
---

# Experiment #002: Fix vitest workspace isolation + TypeScript strict mode

## Result
**KEEP** — Score improved from 0.308 to 0.5346 (+0.2266). **First successful KEEP verdict.** The factory evaluation is now functional.

Key dimension wins:
- `tests`: 0.0 → 1.0 (meta-eval now correctly detects vitest workspace)
- `type_check`: 0.0 → 0.95 (strict mode violations resolved)

All tests pass (166/166), zero QA violations.

## What Changed
Bundled two complementary fixes that resolved the meta-eval blocker from Experiment #001:

1. **vitest workspace isolation (H1)** — Configured vitest workspaces in `vitest.workspace.ts` so factory test runner correctly detects and counts all 166 tests across root and sub-packages
2. **TypeScript strict mode fixes (H2)** — Enabled `strict: true` in `tsconfig.json` and fixed 19 type violations across the codebase
3. **vitest root devDep (supporting fix)** — Added vitest to root `devDependencies` so factory meta-eval can access workspace configuration

Root cause of Experiment #001 failure: Factory was incorrectly detecting jest as the test runner for the root sub-project instead of vitest, causing the tests dimension to always report 0 passed.

## What We Learned
**The factory's meta-eval depends on correct workspace and build configuration.** Test discovery is sensitive to whether the test runner, TypeScript, and workspace dependencies are properly configured at the project root. Once fixed, the evaluation system begins working reliably, enabling subsequent experiments to pass through precheck gate.

The bundling of H1 + H2 was correct — they were coupled blockers, not independent features. Treating them as a composite hypothesis accelerated the path to a working factory.

## Links
- **PR:** #12 (feat: add manual capture features — includes vitest workspace + strict mode fixes)
- **Issue:** #13 (meta-eval tests dimension detection broken)
- **Hypothesis:** H1 (vitest workspace) + H2 (TypeScript strict mode), bundled
- **Factory event log:** Event 002 in events.jsonl
