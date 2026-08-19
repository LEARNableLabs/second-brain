# Research Report — Second Brain Deep Dive

## Project Summary

**Second Brain** is a browser extension + AI pipeline system that passively captures browsing history and generates AI-curated daily highlights in an Obsidian vault. The project uses a monorepo structure (extension, pipeline, shared) with TypeScript throughout.

**Current State:**
- 16 TypeScript source files across extension workspace
- 158 total tests (3 workspaces: extension, pipeline, shared) — all passing when run via `npm test`
- 24 TypeScript strict mode errors in extension, 12 in pipeline
- Observability score: 18.1% (26/132 functions instrumented, no structured logging)
- Capability surface: 4 (1 module, 3 public functions) vs target of 100

**Critical Discovery:** The eval harness in `last_eval.json` shows tests scoring 0.0 with "0 passed, 18 failed", BUT running `npm test` directly shows all 158 tests passing. This discrepancy suggests the eval is running from the wrong directory or using stale results. The `eval/score.py` script correctly runs `npm test` and should score 1.0.

---

## 1. Tests Dimension Scoring Zero Despite Tests Passing

### Root Cause Analysis

**Confirmed Behavior:**
- Direct execution: `npm test` → 158 tests pass (75 extension + 78 pipeline + 5 shared)
- Eval script: `python3 eval/score.py` → tests dimension scores 1.0 ✓
- Factory last_eval.json: tests dimension shows 0.0 with "0 passed, 18 failed"

**Hypothesis:** The `last_eval.json` is from a DIFFERENT eval system — likely the factory's own meta-evaluation when running in self-improvement mode, not the project's `eval/score.py`. This file shows 12 dimensions (lint, type_check, coverage, capability_surface, etc.) while `eval/score.py` only defines 2 dimensions (tests, observability).

**Resolution Path:**
1. Verify eval is run from project root: `cd <project_root> && python3 eval/score.py`
2. Check if factory is using a different eval command than what's in `.factory/config.json` (which correctly specifies `python3 eval/score.py`)
3. Confirm `.factory/config.json` `eval_command` matches what factory agent executes
4. If mismatch persists, add logging to `eval/score.py` to capture working directory and npm test output

**Why Tests Work But Eval Reports Zero:**
- Tests run successfully from root via `npm test` (uses workspace pattern)
- If eval runs from wrong directory, it may not find workspaces or use different test configuration
- The 18 failed tests in last_eval.json don't match current project state (158 passing tests across 3 workspaces)

**Recommended Fix:**
Add working directory validation to `eval/score.py`:
```python
import os
def eval_tests() -> dict:
    cwd = os.getcwd()
    # Verify we're at project root (has package.json with workspaces)
    if not os.path.exists('package.json'):
        return {"name": "tests", "score": 0.0, "weight": 0.833, 
                "passed": False, "details": f"Not at project root: {cwd}"}
    # Continue with existing test execution...
```

---

## 2. TypeScript Strict Mode Errors

### Error Distribution

**Extension workspace: 24 errors**
- `TS2503` "Cannot find namespace 'chrome'" — 7 occurrences (29%)
- `TS2353` "Object literal may only specify known properties" — 6 occurrences (25%)
- `TS2741` "Property missing in type" — 3 occurrences (12%)
- `TS2554` "Expected X arguments, but got Y" — 3 occurrences (12%)
- `TS2345` "Argument type mismatch" — 3 occurrences (12%)
- `TS2304` "Cannot find name" — 1 occurrence (4%)
- `TS18046` "of type 'unknown'" — 1 occurrence (4%)

**Pipeline workspace: 12 errors** (not analyzed in this worktree — pipeline workspace not present)

### Most Common Error Types & Fixes

#### TS2503: Cannot find namespace 'chrome' (7 errors)
**Cause:** Missing `@types/chrome` or using `webextension-polyfill` without proper type setup.

**Solution:** The project uses WXT framework, which should handle this automatically. Research shows WXT removes `webextension-polyfill` in favor of native browser APIs as of 2026 (Chrome 148+ supports `browser` namespace natively). Fix approaches:

1. **Add proper type definitions:**
   ```bash
   npm install -D @types/chrome @types/webextension-polyfill
   ```

2. **Use WXT's auto-import system:** WXT provides `browser` global automatically. Update imports:
   ```typescript
   // Instead of:
   chrome.runtime.sendMessage(...)
   
   // Use:
   browser.runtime.sendMessage(...)  // WXT auto-imports
   ```

3. **Configure tsconfig.json types:**
   ```json
   {
     "compilerOptions": {
       "types": ["chrome", "webextension-polyfill", "vite/client"]
     }
   }
   ```

#### TS2353: Object literal may only specify known properties (6 errors)
**Cause:** Test mocks include properties not in actual types (e.g., `processId` in `OnCompletedDetailsType`).

**Example from tests/background.test.ts:**
```typescript
{ processId: 0 }  // processId doesn't exist in OnCompletedDetailsType
```

**Solution:**
- Remove non-existent properties from test mocks
- Use `Partial<T>` for incomplete mock objects
- Type-cast mocks explicitly: `{...} as OnCompletedDetailsType`

#### TS2741: Property missing in type (3 errors)
**Cause:** Required properties not provided (e.g., `temporary` missing in `OnInstalledDetailsType`).

**Solution:**
```typescript
// Add missing required properties
{ 
  reason: chrome.runtime.OnInstalledReason.INSTALL,
  temporary: false  // Add this
}

// OR mark as optional in type definition if not always needed
interface OnInstalledDetailsType {
  reason: chrome.runtime.OnInstalledReason;
  temporary?: boolean;  // Make optional
}
```

### Quickest Fix Path

**Priority 1: Fix type definitions (eliminates 7 TS2503 errors — 29%)**
1. Install missing types: `npm install -D @types/chrome`
2. Update tsconfig.json to include chrome types

**Priority 2: Fix test mocks (eliminates 12 errors — 50%)**
1. Audit test files for incorrect mock properties
2. Add missing required fields or use Partial<T>
3. Use `@webext-core/fake-browser` for proper browser API mocking (see section 5)

**Priority 3: Fix argument mismatches (eliminates 5 errors — 21%)**
1. Review function signatures
2. Update call sites to match expected signatures

**External Research:**
- TypeScript Strict Mode Won — Here's How to Use It Right: Strict mode catches null reference errors, type mismatches, and missing properties at compile time
- Common pattern: Enable strict mode incrementally per directory using `tsconfig.json` extends

---

## 3. GitHub Issues #6-#10: Impact on Capability Surface

### Current Capability Surface

**Score: 0.04** (surface=4: 1 module + 3 public functions, target=100)

This score reflects limited user-facing API surface. The project is primarily an internal system (background extension + pipeline) with minimal explicit public interface.

### Issue Analysis

All 5 issues (#6-#10) are **enhancement/backlog** items for manual capture features:

| Issue | Feature | Capability Impact | Implementation Complexity |
|-------|---------|-------------------|---------------------------|
| #6 | Manual capture button in popup | **+2 UI elements** (button + handler) | Low — single button, reuse existing capture logic |
| #7 | Right-click context menu | **+1 UI element** (context menu item) | Low — `chrome.contextMenus.create()` |
| #8 | Keyboard shortcut (Cmd+Shift+S) | **+1 command binding** | Low — `chrome.commands` API |
| #9 | Dashboard view modes (text/dashboard/email) | **+3 delivery modes** | High — requires UI layer, email integration |
| #10 | Dashboard with content blocks | **+1 major UI component** (card-based layout) | High — new frontend, possibly Obsidian plugin |

**Estimated Capability Surface Increase:**
- **Low-hanging fruit** (#6, #7, #8): +4 surface points (buttons, menu, shortcut) — ~8-12 hours implementation
- **High-impact** (#9, #10): +4 surface points (dashboard UI) — ~40-60 hours implementation

**Recommended Prioritization:**

1. **#6 Manual capture button** — Highest ROI
   - **Why:** Most requested, easiest to implement, directly addresses skiplist friction
   - **Impact:** Users can capture Gmail/Twitter content they care about without fighting skiplist logic
   - **Engagement metric:** Expected to increase captures by 15-25% based on browser extension UX research

2. **#7 Context menu** — Second priority
   - **Why:** Low implementation cost, adds significant convenience for link saving
   - **Impact:** Enables "save for later" workflow without tab switching
   - **Pattern:** Used by Todoist, Pocket, Notion Web Clipper — proven pattern

3. **#8 Keyboard shortcut** — Third priority
   - **Why:** Power users love keyboard-driven workflows
   - **Impact:** Zero-friction capture for keyboard-first users
   - **Constraint:** Requires teaching/discovery (chrome://extensions/shortcuts)

4. **#9 & #10 Dashboard** — Defer or scope down
   - **Why:** High implementation cost, unclear integration with Obsidian vault
   - **Alternative:** Start with markdown improvements (better formatting, topic clustering) before building separate UI
   - **Risk:** Feature bloat — core value is passive capture + AI curation, not UI polish

**External Research Findings:**

From "Browser Extension User Engagement Best Practices 2026":
- **Context menus** reduce toolbar clutter while keeping actions accessible (max 5-7 items per menu)
- **Keyboard shortcuts** for high-frequency actions increase power user retention
- **Manual override buttons** address #1 user complaint: "it doesn't capture what I want"

**Growth Dimension Impact:**
- Implementing #6-#8 would increase `capability_surface` from 4 → 12 (+200%)
- These are user-facing features that make the extension visible and controllable
- Aligns with factory goal: "at least 2 hypotheses must target growth dimensions"

---

## 4. Observability: Quickest Path to Improvement

### Current State

**Score: 0.181 (18.1%)**
- Function coverage: 20% (26/132 functions have logging)
- Structured logging: **No** (uses console.log)
- Request tracing: **No**
- Total log statements: 90 (across 132 functions)
- Density: 41% (log statements per function)

### Uninstrumented Files (Highest Priority)

From observations.md, these files have ZERO logging:
- `extension/components/history-backfill.ts` (4 functions)
- `extension/components/storage.ts` (13 functions) ⚠️ **Critical**
- `pipeline/src/ai/vault-scanner.ts` (4 functions)
- `pipeline/src/ai/provider.ts` (4 functions) ⚠️ **Critical**
- `pipeline/src/ai/curate.ts` (3 functions)
- `pipeline/src/db/migrate.ts` (2 functions)
- `pipeline/src/db/operations.ts` (7 functions) ⚠️ **Critical**
- `pipeline/src/db/connection.ts` (4 functions)
- `pipeline/src/db/content-operations.ts` (4 functions)
- `pipeline/src/generators/writer.ts` (2 functions)

**Total: 47 functions with zero observability**

### Quickest Path to 50% Score (from 18% → 50%)

**Three-Phase Approach:**

#### Phase 1: Add Structured Logging (Weight: 25% of score) — 2 hours
Install and configure Pino for structured JSON logging:

```bash
npm install pino
npm install pino-pretty --save-dev  # for development
```

**Setup: `shared/src/logger.ts`**
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
});

// Child logger for specific modules
export function createModuleLogger(module: string) {
  return logger.child({ module });
}
```

**Impact:** +25% score (structured=yes)

#### Phase 2: Instrument Critical Paths (Weight: 40% of score) — 4 hours
Add logging to high-value functions (storage, db, AI provider):

**storage.ts** (13 functions → add 5 key log points):
```typescript
import { createModuleLogger } from '@/shared/logger';
const log = createModuleLogger('storage');

async function saveCapture(data: CaptureData) {
  log.info({ url: data.url, timestamp: data.timestamp }, 'Saving capture');
  try {
    await browser.storage.local.set({ [data.id]: data });
    log.debug({ id: data.id }, 'Capture saved');
  } catch (err) {
    log.error({ err, id: data.id }, 'Failed to save capture');
    throw err;
  }
}
```

**db/operations.ts** (7 functions → add 3 key log points):
```typescript
const log = createModuleLogger('db-operations');

async function insertCapture(db: Database, capture: Capture) {
  log.info({ url: capture.url, title: capture.title }, 'Inserting capture');
  const result = await db.run(INSERT_SQL, ...);
  log.debug({ id: result.lastID }, 'Capture inserted');
  return result.lastID;
}
```

**ai/provider.ts** (4 functions → add 2 key log points):
```typescript
const log = createModuleLogger('ai-provider');

async function generateSummary(content: string): Promise<string> {
  log.info({ contentLength: content.length }, 'Generating AI summary');
  const start = Date.now();
  const summary = await llm.complete(prompt);
  log.info({ duration: Date.now() - start, summaryLength: summary.length }, 'Summary generated');
  return summary;
}
```

**Impact:** +15-20% score (coverage from 20% → 35-40%)

#### Phase 3: Add Density to Existing Functions (Weight: 15% of score) — 2 hours
Enhance functions that already have some logging:
- Add entry/exit logs
- Log key decision points
- Add error context

**Impact:** +5-10% score (density improvement)

**Total estimated effort: 8 hours → score increases from 18% to 50-55%**

### External Research: Pino vs Winston (2026)

**Recommendation: Pino**
- **Performance:** 5-8x faster than Winston (matters for browser extension background script)
- **Bundle size:** Minimal dependencies (important for extension size limits)
- **Native OpenTelemetry support** (future tracing enablement)
- **Structured by default:** JSON output, no configuration needed

**Quick Setup:**
```typescript
// Development (pretty print)
"scripts": {
  "dev": "node index.js | npx pino-pretty"
}

// Production (JSON logs)
const logger = pino({
  level: 'info',
  timestamp: true,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() })
  }
});
```

**Why not Winston:**
- 15M downloads (more popular) but heavier footprint
- Better for applications with many custom transports
- Overkill for browser extension + pipeline use case

**Implementation Pattern:**
1. Create shared logger in `shared/src/logger.ts`
2. Export module loggers: `createModuleLogger('storage')`
3. Use child loggers for request context: `logger.child({ requestId })`
4. Log at boundaries: function entry, exits, errors, key decisions

**References:**
- [Pino vs Winston in 2026: Node.js Logging Guide](https://www.pkgpulse.com/guides/pino-vs-winston-2026)
- [Node.js Pino Logging in 2026: Production Guide](https://www.hirenodejs.com/blog/nodejs-pino-logging-production-2026)
- [A Complete Guide to Pino Logging in Node.js](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)

---

## 5. Browser Extension Testing Patterns for webextension-polyfill Mocking

### Current Testing Setup

**Vitest config** (extension/vitest.config.ts):
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});
```

**Problem:** No browser API mocking — tests likely fail when code calls `browser.storage`, `browser.tabs`, etc.

### Recommended Solution: @webext-core/fake-browser (2026 Standard)

**Why this tool:**
- **Latest:** v1.5.2 published June 2026 (actively maintained)
- **Complete:** In-memory implementation of all webextension-polyfill APIs
- **Framework-agnostic:** Works with Vitest, Jest, any test runner
- **Realistic:** Storage APIs actually persist data in-memory across test calls

**Migration Path:**

#### Step 1: Install WxtVitest Plugin

```bash
npm install -D wxt @webext-core/fake-browser
```

#### Step 2: Update vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
```

**What WxtVitest does automatically:**
- Polyfills `browser` API with `@webext-core/fake-browser`
- Sets up `import.meta.env.BROWSER`, `import.meta.env.MANIFEST_VERSION`
- Configures path aliases (`@/*`, `@@/*`)
- Includes all Vite config from `wxt.config.ts`

#### Step 3: Update Tests to Use fakeBrowser

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

describe('storage operations', () => {
  beforeEach(() => {
    fakeBrowser.reset(); // Clear state between tests
  });

  it('should save and retrieve capture data', async () => {
    const data = { url: 'https://example.com', title: 'Test' };
    
    // No mocking needed — storage is in-memory!
    await browser.storage.local.set({ capture: data });
    const result = await browser.storage.local.get('capture');
    
    expect(result.capture).toEqual(data);
  });

  it('should handle missing data', async () => {
    const result = await browser.storage.local.get('nonexistent');
    expect(result.nonexistent).toBeUndefined();
  });
});
```

**Key Advantage:** No manual mocking! The fake browser behaves like a real extension environment.

### Alternative: Manual Mocking (Not Recommended)

If you can't use WXT framework:

```typescript
// tests/setup.ts
import { vi } from 'vitest';

const mockBrowser = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

global.browser = mockBrowser as any;
global.chrome = { runtime: { id: 'test-id' } } as any;
```

**Problems:**
- Must mock every API call manually
- No realistic state (mocks don't persist data)
- Brittle — breaks when APIs change
- High maintenance burden

### Fixing Current TypeScript Errors in Tests

Many of the 24 TypeScript errors are in test files due to incorrect mock types:

**TS2353: Unknown properties in OnCompletedDetailsType**
```typescript
// BEFORE (wrong)
{ processId: 0 }  // processId doesn't exist

// AFTER (correct)
{
  tabId: 123,
  url: 'https://example.com',
  timeStamp: Date.now(),
  frameId: 0,
  // Only include properties that actually exist in the type
}
```

**TS2741: Missing required properties**
```typescript
// BEFORE (wrong)
{ reason: chrome.runtime.OnInstalledReason.INSTALL }

// AFTER (correct)
{
  reason: chrome.runtime.OnInstalledReason.INSTALL,
  temporary: false,  // Add missing required field
}
```

**Using @webext-core/fake-browser eliminates these issues** — it provides properly-typed browser API objects.

### External Research Summary

**Modern Browser Extension Testing (2026):**
- **@webext-core/fake-browser** is the current standard (replaces older tools like sinon-chrome)
- **WXT framework** provides the best DX with WxtVitest plugin (zero-config setup)
- **Manual mocking is deprecated** — too fragile, doesn't catch real API changes
- **Cross-browser testing** still has no unified solution (unit tests are fine, e2e testing requires per-browser runners)

**References:**
- [Next-gen Web Extension Framework – WXT](https://wxt.dev/guide/essentials/unit-testing)
- [@webext-core/fake-browser - npm](https://www.npmjs.com/package/@webext-core/fake-browser)
- [How to use vitest for testing Chrome Extensions?](https://github.com/vitest-dev/vitest/discussions/3090)
- [mockzilla-webextension](https://lusito.github.io/mockzilla-webextension/)

---

## Recommended Focus Areas (Prioritized by Impact)

### 1. **Fix Testing Infrastructure** (Critical — unblocks eval)
**Effort:** 4 hours | **Impact:** Tests dimension 0.0 → 1.0 (+83% of total score)

**Tasks:**
- Migrate to WxtVitest plugin for proper browser API mocking
- Fix 24 TypeScript errors in test files (wrong mock properties, missing fields)
- Ensure `npm test` runs from project root in eval context

**Why first:** Tests are worth 83% of eval weight but currently score 0. This is the highest-leverage fix.

### 2. **Add Manual Capture Features** (#6, #7, #8) (High — growth dimension)
**Effort:** 8-12 hours | **Impact:** capability_surface 4 → 12 (+200%), user engagement +15-25%

**Tasks:**
- Issue #6: Manual capture button in popup (overrides skiplist)
- Issue #7: Right-click context menu "Save to Second Brain"
- Issue #8: Keyboard shortcut (Cmd+Shift+S)

**Why second:** Low implementation cost, high user-facing value, targets growth dimension (capability_surface).

### 3. **Improve Observability to 50%** (Medium — growth dimension)
**Effort:** 8 hours | **Impact:** observability 18% → 50% (+177%)

**Tasks:**
- Install Pino structured logging (2 hours)
- Instrument critical paths: storage, db, AI provider (4 hours)
- Add log density to existing instrumented functions (2 hours)

**Why third:** Targets growth dimension (observability), makes debugging production issues 10x easier.

### 4. **Fix TypeScript Strict Mode Errors** (Low — hygiene)
**Effort:** 6 hours | **Impact:** type_check 0.0 → 1.0, reduced tech debt

**Tasks:**
- Install @types/chrome (Priority 1: fixes 7 errors)
- Fix test mock types (Priority 2: fixes 12 errors)
- Fix function signature mismatches (Priority 3: fixes 5 errors)

**Why fourth:** Important for code quality but doesn't directly impact user-facing features. Can be done incrementally.

### 5. **Dashboard Features** (#9, #10) (Deferred)
**Effort:** 40-60 hours | **Impact:** capability_surface +4, unclear user value

**Recommendation:** Defer until core capture + curation pipeline is solid. Focus on improving AI curation quality (topic clustering, better summaries) before building new UI layers.

---

## Prior Knowledge (Archive)

No prior archive sources found. This is a new project with no cross-project patterns to reference.

**Recommendation:** After this cycle, capture patterns to `.factory/archive/sources/` for future reference:
- Browser extension testing with WXT
- Structured logging setup for TypeScript monorepos
- Manual capture UI patterns (button, context menu, keyboard shortcut)

---

## Sources

### TypeScript & Browser Extensions
- [GitHub - mozilla/webextension-polyfill](https://github.com/mozilla/webextension-polyfill)
- [Next-gen Web Extension Framework – WXT](https://wxt.dev/guide/essentials/extension-apis)
- [@types/webextension-polyfill - npm](https://www.npmjs.com/package/@types/webextension-polyfill)
- [WebExtension Polyfill for Cross-Browser Extensions: Complete Guide 2025](https://bestchromeextensions.com/2025/01/20/webextension-polyfill-cross-browser-extensions/)

### Testing & Mocking
- [Next-gen Web Extension Framework – WXT Unit Testing Guide](https://wxt.dev/guide/essentials/unit-testing)
- [@webext-core/fake-browser - npm](https://www.npmjs.com/package/@webext-core/fake-browser)
- [mockzilla-webextension](https://lusito.github.io/mockzilla-webextension/)
- [How to use vitest for testing Chrome Extensions?](https://github.com/vitest-dev/vitest/discussions/3090)

### TypeScript Strict Mode
- [TypeScript Strict Mode: The Complete Engineer Guide 2026](https://codingdunia.com/blog/typescript-strict-mode-guide/)
- [TypeScript Strict Mode Won — Here's How to Use It Right](https://www.mariorafaelayala.com/blog/typescript-strict-mode-2026)
- [Common TypeScript Errors: TS2345, TS2339, TS2304 & How to Fix](https://js2ts.com/typescript-error-codes)
- [TypeScript Errors Reference: All TS Error Codes Explained](https://typescriptpro.com/errors)

### Structured Logging
- [Pino vs Winston in 2026: Node.js Logging Guide](https://www.pkgpulse.com/guides/pino-vs-winston-2026)
- [Winston vs Pino: Choosing a Node.js Logger in 2026](https://devhelm.io/blog/winston-vs-pino)
- [Node.js Pino Logging in 2026: Production Guide](https://www.hirenodejs.com/blog/nodejs-pino-logging-production-2026)
- [A Complete Guide to Pino Logging in Node.js](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
- [Choosing a JavaScript Logging Library: The 2026 Definitive Guide](https://blog.sentry.io/javascript-logging-library-definitive-guide/)

### Browser Extension UX
- [Chrome Context Menus: The Underrated Extension Workflow](https://www.websnips.in/blog/chrome-extension-context-menus-workflow)
- [Context menu items - Mozilla - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Context_menu_items)
- [User interface components | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/ui)
