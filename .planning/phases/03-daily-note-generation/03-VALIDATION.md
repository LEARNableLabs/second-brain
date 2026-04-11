---
phase: 3
slug: daily-note-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `pipeline/vitest.config.ts` |
| **Quick run command** | `npm run test --workspace=pipeline` |
| **Full suite command** | `npm run test --workspace=pipeline` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test --workspace=pipeline`
- **After every plan wave:** Run `npm run test --workspace=pipeline`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | NOTE-01 | — | N/A | unit | `npm run test --workspace=pipeline` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | NOTE-02 | — | N/A | unit | `npm run test --workspace=pipeline` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | NOTE-03 | — | N/A | unit | `npm run test --workspace=pipeline` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | STOR-04 | — | N/A | unit | `npm run test --workspace=pipeline` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | STOR-05 | — | N/A | unit | `npm run test --workspace=pipeline` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | STOR-06 | — | N/A | unit | `npm run test --workspace=pipeline` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `pipeline/src/commands/__tests__/generate.test.ts` — stubs for NOTE-01, NOTE-02, NOTE-03
- [ ] `pipeline/src/generators/__tests__/markdown.test.ts` — stubs for markdown generation
- [ ] `pipeline/src/generators/__tests__/meta-fetcher.test.ts` — stubs for meta description fetching
- [ ] `pipeline/src/git/__tests__/auto-commit.test.ts` — stubs for STOR-06

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Obsidian renders note correctly | NOTE-01 | Requires Obsidian app open | Open generated .md file in Obsidian, verify frontmatter and sections render |
| Atomic write during Obsidian edit | STOR-04 | Requires concurrent file access | Edit note in Obsidian while running `second-brain generate`, verify no corruption |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
