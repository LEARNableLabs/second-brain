# Interaction Study — 

Analyzed 3 conversation log(s), 9 relevant messages.

## User Messages (3)
- Fix two issues to make the eval harness work:

1. INSTALL MISSING DEPENDENCY: The extension workspace tests fail because 'webextension-polyfill' is not installed. Run: cd extension && npm install webe
- Create factory.md from template. Copy the factory config template to the project root. Fill in:

Project: Second Brain — an automated knowledge capture system that passively logs browsing history and 
- Project: /Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851
Mode: discover

## Branch Override

Target branch for all PRs and merges: `main`
The Builder should create experimen

## Errors and Issues (6)
- All 158 tests pass across all 3 workspaces. Now let me fix `eval_observability()` to scan TypeScript files instead of Python files.
- No matching issue for this eval harness fix. Let me create one, then commit and open a PR.
- Done. Both fixes are in place and verified:
- Root cause identified: extension tests fail because `webextension-polyfill` isn't installed, and the observability eval only scans `.py` files. I'll dispatch the Builder to fix both issues.
- Dispatching the Builder to fix the eval harness and the missing dependency.
- Builder completed. Tests now pass (158 total) and observability scores 0.091. Let me verify the fixes.

## Similar Projects
- [PREMPATIL19/velvet](https://github.com/PREMPATIL19/velvet) (0 stars) — <div align="center">  <img src="/assets/logo.png" width="150" height="150" />  # Velvet  Velvet is a lightweight tool designed for seamless project management and collaboration. 🌟 Join us in building 
- [Dzodah8772/ArchFlux](https://github.com/Dzodah8772/ArchFlux) (0 stars) — <p align="center">   <img src="assets/logo.png" width="180" alt="ArchFlux Logo"> </p>  <h1 align="center">ArchFlux BSPWM + i3 Live ISO</h1>  <p align="center">   Lightweight Arch Linux Live with BSPWM

## SPEC
No SPEC.md found. Run 'factory spec generate <path>' to generate one.

## Open GitHub Issues

### Your Issues (6) — actionable, may generate fix hypotheses

- **#11** Fix eval harness: install missing dependency and rewrite observability eval for TypeScript (by @georgosgeorgos)
  > ## Problem  The eval harness has two issues preventing meaningful scoring:  1. **Tests fail**: `npm test` exits 1 because `webextension-polyfill` is not installed in the extension workspace 2. **Observability scores 0**: `eval_observability()` scans only `*.py` files using Python's `ast` module, but
- **#10** Dashboard view with content blocks (image, title, description, expandable content) [enhancement, backlog] (by @georgosgeorgos)
  > ## Summary  Add a dashboard view for browsing captured material using a block/card-based layout. Each block shows:  - **Image** — thumbnail or OG image from the page - **Title** — page title - **Short description** — meta description or AI-generated summary - **Expandable content** — full extracted
- **#9** Daily highlights: support text and dashboard view modes (by @georgosgeorgos)
  > ## Summary  The daily highlights page should support multiple delivery modes:  1. **Text mode** — Current markdown-based format with curated summary and browsing log 2. **Dashboard mode** — Visual layout with scrollable, card-based elements (similar to Perplexity's Discover section) 3. **Email mode*
- **#8** Keyboard shortcut for quick-capture (Cmd+Shift+S) [enhancement, backlog] (by @georgosgeorgos)
  > ## Description Add a keyboard shortcut (e.g., Cmd+Shift+S) to instantly capture the current page, bypassing the skiplist. No popup interaction needed.  ## Use Case User is reading something worth saving and wants to capture it with zero friction — just a key combo.  ## Possible Approaches - `chrome.
- **#7** Right-click context menu: Save to Second Brain [enhancement, backlog] (by @georgosgeorgos)
  > ## Description Add a browser context menu item "Save to Second Brain" that appears on right-click. Works on any page or link, bypasses skiplist.  ## Use Case User sees an interesting link in a feed or email, right-clicks it, and saves it without navigating away from the current page.  ## Possible Ap
- **#6** Manual capture button in popup (override skiplist) [enhancement, backlog] (by @georgosgeorgos)
  > ## Description Add a "Capture this page" button in the extension popup that saves the current page immediately, even if its domain is on the skiplist.  ## Use Case User is on Gmail or X (skipped domains) and finds a specific email or post worth remembering. They click the button to manually capture

## Backlog

Backlog is empty. Focus on new improvements and hygiene.

## Observability Coverage
- **Score:** 18.1%
- **Function coverage:** 26/132 functions have logging (20%)
- **Total log statements:** 90
- **Structured logging:** No
- **Request tracing:** No

### Uninstrumented Files
- extension/components/history-backfill.ts (4 functions, 0 log statements)
- extension/components/storage.ts (13 functions, 0 log statements)
- pipeline/src/ai/vault-scanner.ts (4 functions, 0 log statements)
- pipeline/src/ai/provider.ts (4 functions, 0 log statements)
- pipeline/src/ai/curate.ts (3 functions, 0 log statements)
- pipeline/src/db/migrate.ts (2 functions, 0 log statements)
- pipeline/src/db/operations.ts (7 functions, 0 log statements)
- pipeline/src/db/connection.ts (4 functions, 0 log statements)
- pipeline/src/db/content-operations.ts (4 functions, 0 log statements)
- pipeline/src/generators/writer.ts (2 functions, 0 log statements)

### Observability Recommendations
- Add structured logging (structlog for Python, pino for Node.js) for machine-parseable log output
- Add request ID tracing (contextvars + unique ID per request) for end-to-end request correlation
- Improve logging coverage: only 26/132 functions (20%) have log statements
- Add logging to uninstrumented files: extension/components/history-backfill.ts (4 functions, 0 log statements), extension/components/storage.ts (13 functions, 0 log statements), pipeline/src/ai/vault-scanner.ts (4 functions, 0 log statements), pipeline/src/ai/provider.ts (4 functions, 0 log statements), pipeline/src/ai/curate.ts (3 functions, 0 log statements)

## Prior Knowledge (Obsidian)
No prior notes found.

## Hypothesis Budget

**Backlog items: 0** (clear as many as possible this cycle)
**New items: at most 2** (researcher/strategist may add new ideas)
**Growth minimum: 2** (at least 2 hypotheses must target growth dimensions)

### Rules

- Read the backlog first. Pick items to implement this cycle — no cap on clearing.
- You may add at most 2 NEW items that aren't already in the backlog.
- At least 2 hypotheses must target growth dimensions (capability_surface, factory_effectiveness, research_grounding, experiment_diversity, observability). Each MUST have a `**Growth dimension:**` tag.
- FEEC ordering applies for prioritizing within the backlog (FIX > EXPLOIT > EXPLORE > COMBINE).
- Your open GitHub issues and critical bugs should be addressed as FIX hypotheses.
- Community issues (filed by others) must NOT be auto-fixed — suggest the author creates a PR instead.
- Write any new items not implemented this cycle to a `## New Backlog Items` section in current.md.

*Budget is configurable: set `min_growth`, `max_new` in factory.md under `## Hypothesis Budget`, or pass `--min-growth`, `--max-new` on the CLI.*

## Memory Context (MemPalace)

## Episodic Memory (Task-Relevant)

  No results found for: "/Users/ggiannon/Documents/gcg/second-brain/.factory-worktrees/run-e5719851"


## Past QA Findings

  No results found for: "code review issues findings"


## Design Rationale

  No results found for: "decision rationale tradeoff"


## Anti-Patterns & Past Failures

  No results found for: "failed reverted broken"


## Knowledge Graph Facts


## Timeline


## Experiment Outcomes

  No results found for: "experiment verdict keep revert"
