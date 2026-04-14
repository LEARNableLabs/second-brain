---
phase: 04
slug: content-processing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `pipeline/vitest.config.js` |
| **Quick run command** | `npm test --workspace=pipeline` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace=pipeline`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | PROC-01 | — | N/A | unit | `npm test --workspace=pipeline` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PROC-02 | — | N/A | unit | `npm test --workspace=pipeline` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PROC-03 | — | N/A | unit | `npm test --workspace=pipeline` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PROC-04 | — | N/A | unit | `npm test --workspace=pipeline` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `pipeline/tests/extractors/strategy.test.js` — stubs for PROC-02 (domain routing)
- [ ] `pipeline/tests/extractors/arxiv.test.js` — stubs for PROC-01 (arxiv extraction)
- [ ] `pipeline/tests/extractors/article.test.js` — stubs for PROC-01 (article extraction)
- [ ] `pipeline/tests/commands/fetch.test.js` — stubs for PROC-04 (incremental processing)
- [ ] `pipeline/tests/db/content-operations.test.js` — stubs for PROC-03 (ephemeral storage)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ArXiv API returns real paper data | PROC-01 | External API call | Run `second-brain fetch` with a real arxiv URL in DB, verify content table has abstract |
| Article extractor handles real blog post | PROC-01 | External content fetching | Run `second-brain fetch` with a real blog URL, verify content table has article body |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
