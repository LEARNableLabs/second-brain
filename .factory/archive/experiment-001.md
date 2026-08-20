---
tags: [factory, experiment, second-brain]
project: second-brain
experiment_id: 001
verdict: revert
score_delta: +0.002
date: 2026-08-19
source: factory-archivist
---

# Experiment #001: Add manual capture features

## Result
**REVERT** — Score improved from 0.306 to 0.308 (+0.002), all tests pass (166/166), zero QA violations. Force-reverted by precheck gate because composite score 0.308 < threshold 0.5. This is a pre-existing condition, not a regression.

## What Changed
Implemented three manual capture entry points for the browser extension to address GitHub issues #6, #7, #8:

1. **Context menu** — Right-click "Save to Second Brain" on any page or link, captures via `saveManualCapture` bypassing the blocklist
2. **Keyboard shortcut** — `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows) to capture the active tab
3. **Popup button** — Already existed; confirmed fully wired to capture flow

Changes: 4 files, 59 lines added to `background.ts`, 182-line test suite, 8 new tests all passing.

## What We Learned
**Critical blocker identified:** The factory's meta-eval `tests` dimension is broken for this monorepo. It reports "0 passed, 19 failed" while `npm test` shows 166 tests passing. This pre-existing gap makes the composite score 0.308 (below 0.5 threshold) despite strong code quality. No experiment can pass precheck until this is fixed — it is the #1 priority for the next cycle.

The code quality itself was excellent: all QA agents passed (health_checker, code_reviewer, adversarial_tester), no style/security/correctness issues, tests included and passing.

## Links
- **PR:** #12 (feat: add manual capture features — context menu, keyboard shortcut)
- **Issues addressed:** #6 (popup button), #7 (context menu), #8 (keyboard shortcut)
- **Hypothesis:** H1 from strategy
- **Factory event log:** Event 001 in events.jsonl
