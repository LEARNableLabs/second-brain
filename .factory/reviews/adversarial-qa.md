# Adversarial QA — Pino Structured Logging (H3)

**Date:** 2026-08-19
**Project type:** CLI (TypeScript monorepo)
**Hypothesis:** H3 — Add Pino structured logging to pipeline and shared modules

---

## Smoke Test

**Status:** PASS

**Command:** `npm test`

**Output:**
```
extension:  Test Files  7 passed (7)  |  Tests  83 passed (83)
pipeline:   Test Files 10 passed (10) |  Tests  78 passed (78)
shared:     Test Files  2 passed (2)  |  Tests   5 passed (5)
Total: 19 test files, 166 tests passed, 0 failures
```

All 166 tests pass. Pino log output appears in test stderr (structured JSON) without interfering with test assertions.

---

## Feature Tests

### Criterion 1: Logger creates valid JSON output

**Status:** VERIFIED

**Command:**
```bash
npx tsx -e "
import { createModuleLogger } from '@second-brain/shared/logger';
const logger = createModuleLogger('test:json-parse');
logger.info({ key: 'value', nested: { a: 1 } }, 'json parse test');
" 2>&1 | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('VALID JSON: module=' + d.module + ' msg=' + d.msg + ' time=' + d.time)"
```

**Output:**
```
VALID JSON: module=test:json-parse msg=json parse test time=2026-08-19T20:16:11.897Z
```

**Evidence:** Output is valid JSON with required fields: `level`, `time` (ISO 8601), `pid`, `hostname`, `module`, `msg`. JSON.parse succeeds without error. ISO timestamps confirmed (not epoch ms).

---

### Criterion 2: LOG_LEVEL env var works

**Status:** VERIFIED

**Command:**
```bash
LOG_LEVEL=error npx tsx -e "
import { createModuleLogger } from '@second-brain/shared/logger';
const logger = createModuleLogger('test:filtering');
logger.info('THIS SHOULD NOT APPEAR');
logger.warn('THIS SHOULD NOT APPEAR EITHER');
logger.error('ONLY THIS SHOULD APPEAR');
"
```

**Output:**
```json
{"level":50,"time":"2026-08-19T20:16:08.845Z","pid":70719,"hostname":"ggiannon-mac","module":"test:filtering","msg":"ONLY THIS SHOULD APPEAR"}
```

**Evidence:** Only the error-level message appeared. Info (level 30) and warn (level 40) were correctly filtered out. Also verified with LOG_LEVEL=warn — only warn and error appeared. Default (unset) correctly defaults to 'info' per `shared/src/logger.ts:3`.

---

### Criterion 3: RequestId is included in pipeline CLI commands

**Status:** VERIFIED

**Command:**
```bash
npx tsx -e "
import { createRequestLogger } from '@second-brain/shared/logger';
import crypto from 'crypto';
const requestId = crypto.randomUUID();
const logger = createRequestLogger('cmd:export', requestId);
logger.info({ requestId }, 'export command started');
logger.info({ processed: 42 }, 'processing captures');
logger.error({ err: new Error('simulated failure') }, 'export failed');
"
```

**Output:**
```json
{"level":30,...,"module":"cmd:export","requestId":"e4ca9616-...","traceContext":"e4ca9616-...","msg":"export command started"}
{"level":30,...,"module":"cmd:export","requestId":"e4ca9616-...","traceContext":"e4ca9616-...","processed":42,"msg":"processing captures"}
{"level":50,...,"module":"cmd:export","requestId":"e4ca9616-...","traceContext":"e4ca9616-...","err":{"type":"Error","message":"simulated failure","stack":"..."},"msg":"export failed"}
```

**Evidence:** All log lines include `requestId` and `traceContext` fields from the child logger context. Same UUID is consistent across all log entries for a single invocation. Verified `createRequestLogger` is used in `pipeline/src/commands/export.ts:24` and `pipeline/src/commands/generate.ts:20`.

**Minor finding:** `requestId` key appears twice in the raw JSON string on the first log line — once from the child logger context and once from the explicit `{ requestId }` in the `.info()` call at `export.ts:25` / `generate.ts:22`. JSON.parse silently deduplicates (takes last value, both identical), so functionally harmless. Consider removing the explicit `{ requestId }` from log calls since it's already in the child context.

---

### Criterion 4: Logging doesn't break existing tests (166 pass)

**Status:** VERIFIED

**Command:**
```bash
npm test
```

**Output:**
```
extension:  7 test files,  83 tests passed
pipeline:  10 test files,  78 tests passed
shared:     2 test files,   5 tests passed
Total: 19 files, 166 tests passed, 0 failures
```

**Evidence:** All 166 tests pass across all three workspaces. Pino JSON logs appear in stderr during test runs (visible in output) but do not affect any test assertions.

---

### Criterion 5: Error serialization works

**Status:** VERIFIED

**Command:**
```bash
node -e "
const pino = require('pino');
const logger = pino({ level: 'info', timestamp: pino.stdTimeFunctions.isoTime });
const child = logger.child({ module: 'test:error' });
const err = new Error('test error from adversarial tester');
child.error({ err }, 'caught an error');
"
```

**Output:**
```json
{"level":50,"time":"2026-08-19T20:15:44.749Z","pid":70558,"hostname":"ggiannon-mac","module":"test:error","err":{"type":"Error","message":"test error from adversarial tester","stack":"Error: test error from adversarial tester\n    at [eval]:7:13\n    at ..."},"msg":"caught an error"}
```

**Evidence:** Error object serialized with `type`, `message`, and full `stack` trace. Also confirmed in test output where real errors (ZodError, Network error) are properly serialized with their complete stack traces by Pino's built-in error serializer.

---

### Criterion 6: Browser logger doesn't import Node.js pino

**Status:** VERIFIED

**Command:**
```bash
grep -rn "import.*pino\|require.*pino" extension/ --include="*.ts"
```

**Output:**
```
(no output — zero matches)
```

**Evidence:** No file in `extension/` imports or requires `pino`. The browser logger at `extension/components/logger.ts` uses a pure `console.*` wrapper implementing the same `createModuleLogger(name)` API signature. It defines its own `Logger` interface and wraps `console.log/warn/error/debug` with a `[module]` prefix. No Node.js dependencies — safe for Chrome extension runtime.

---

## Edge Cases Tested

| Edge Case | Result |
|---|---|
| Child logger inherits module context | VERIFIED — `module` field present in all child output |
| LOG_LEVEL defaults to 'info' when unset | VERIFIED — info-level output appears without LOG_LEVEL set |
| ISO timestamp format (not epoch ms) | VERIFIED — `time` field is ISO 8601 string |
| pino-pretty in devDependencies (not prod) | VERIFIED — `pipeline/package.json` lists it under devDependencies |
| pino in shared + pipeline dependencies | VERIFIED — both `shared/package.json` and `pipeline/package.json` include `pino: ^10.3.1` |
| Shared logger exported correctly | VERIFIED — `shared/package.json` exports `./logger` path mapping to `./src/logger.ts` |

---

## Acceptance Criteria Summary

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Logger creates valid JSON output | VERIFIED |
| 2 | LOG_LEVEL env var works | VERIFIED |
| 3 | RequestId included in pipeline CLI commands | VERIFIED |
| 4 | Logging doesn't break existing tests (166 pass) | VERIFIED |
| 5 | Error serialization with stack trace | VERIFIED |
| 6 | Browser logger doesn't import Node.js pino | VERIFIED |

---

## Issues Found

### Minor: Duplicate `requestId` key in raw JSON (non-blocking)

- **Location:** `pipeline/src/commands/export.ts:25`, `pipeline/src/commands/generate.ts:22`
- **Issue:** Both commands pass `{ requestId }` explicitly in the `.info()` call, but `requestId` is already set in the child logger context via `createRequestLogger`. Produces raw JSON with duplicate `requestId` keys.
- **Impact:** Functionally harmless — JSON.parse takes last value, both values are identical. But technically non-conformant per RFC 8259 (names SHOULD be unique).
- **Fix:** Remove the explicit `{ requestId }` from the `.info()` calls since it's already in the child context.

---

## Adversarial Verdict: **PASS**

All 6 acceptance criteria VERIFIED with command output evidence. The Pino structured logging implementation is correct and well-integrated:
- `shared/src/logger.ts` exports `createModuleLogger` and `createRequestLogger` backed by Pino
- JSON output is valid and parseable with ISO timestamps
- LOG_LEVEL env var correctly filters log levels
- Request tracing via requestId/traceContext works across log entries
- Error serialization includes full stack traces (type, message, stack)
- Browser extension uses a separate console-based logger with no pino dependency
- All 166 existing tests continue to pass without interference
