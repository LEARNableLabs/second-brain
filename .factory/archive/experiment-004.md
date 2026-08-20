---
tags: [factory, experiment, second-brain]
project: second-brain
experiment_id: 4
verdict: keep
score_delta: +0.0184
date: 2026-08-19
source: factory-archivist
---

# Experiment #4: Manual Capture Features (Context Menu + Keyboard Shortcut)

## Result
**KEEP** — Composite score improved from 0.5865 to 0.6049 (+0.0184). Re-attempt of Cycle 1 manual capture features, now successful with architecture fix.

Key dimension improvements:
- `experiment_diversity`: 0.5 → 0.686 (+0.186)
- `factory_effectiveness`: 0.5 → 0.525 (+0.025)

All tests pass (166/166), zero QA violations, 2 QA iterations to resolve contextMenus placement.

## What Changed
Re-implemented manual capture features from Cycle 1 (Experiment #1) that had failed due to incorrect contextMenus API usage:

1. **Context Menu Integration** — Registered `contextMenus.onClicked` listener in background service worker, triggered on page selection
2. **Keyboard Shortcut** — Bound Ctrl+Shift+K to manual capture command in manifest v3 format
3. **Architecture Fix** — Moved `contextMenus.create()` call from content script into `onInstalled` listener in background service worker (correct API surface per MV3)
4. **Structured Logging** — Added logging to manual capture handlers for observability

## What We Learned
**Manifest v3 context menu registration requires API calls in the background service worker during extension lifecycle hooks, not in content scripts.** The Cycle 1 failure was due to incorrect API placement, not a faulty hypothesis. Once the architecture was corrected, manual capture became a reliable feature.

The factory's two QA iterations caught the misplaced contextMenus.create() call and guided the redirect. This validates the health_checker → code_reviewer → adversarial_tester cycle as a robust quality gate for catching integration bugs.

## Quality Gates
- Health check: **PASS**
- Code review: **PROCEED**
- Adversarial testing: **PASS**

## Links
- **PR:** #12 (feat: add manual capture features — includes vitest + logging fixes)
- **Hypothesis:** H4 (manual capture features: context menu + keyboard shortcut)
- **Related:** Cycle 1 Experiment #1 (reverted due to architecture issue; now resolved)
- **Factory event log:** Event 004 in events.jsonl
