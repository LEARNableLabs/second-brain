---
phase: 3
slug: daily-note-generation
status: draft
nyquist_compliant: true
wave_0_complete: true
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

## Wave 0 Compliance

All three plans use `type: tdd` with `tdd="true"` tasks. The TDD RED phase inherently satisfies Wave 0: tests are written BEFORE implementation code. Each task's `<behavior>` block defines test expectations, and the RED phase creates the test file as the first step. No separate Wave 0 stub tasks are needed because TDD plans create tests as part of their execution cycle.

- Plan 03-01 (Task 1, TDD): Creates `pipeline/tests/generators/markdown.test.ts` in RED phase before implementing `markdown.ts` and `frontmatter.ts`
- Plan 03-02 (Task 1, TDD): Creates `pipeline/tests/config/reader.test.ts` in RED phase before implementing `reader.ts` and `writer.ts`
- Plan 03-02 (Task 2, TDD): Creates `pipeline/tests/git/auto-commit.test.ts` in RED phase before implementing `auto-commit.ts`
- Plan 03-03 (Task 1, TDD): Creates `pipeline/tests/generators/meta-fetcher.test.ts` in RED phase before implementing `meta-fetcher.ts`
- Plan 03-03 (Task 2, TDD): Creates `pipeline/tests/commands/generate.test.ts` in RED phase before implementing `generate.ts`

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-----------|--------|
| 03-01-01 | 01 | 1 | NOTE-01, NOTE-02, STOR-04 | T-03-01, T-03-02 | Escape markdown, safe YAML | unit | `npm run test --workspace=pipeline` | `pipeline/tests/generators/markdown.test.ts` | TDD |
| 03-02-01 | 02 | 1 | STOR-05 | T-03-03, T-03-05 | Path validation, atomic write | unit | `npm run test --workspace=pipeline` | `pipeline/tests/config/reader.test.ts` | TDD |
| 03-02-02 | 02 | 1 | STOR-06 | T-03-04 | Library API, no shell injection | integration | `npm run test --workspace=pipeline` | `pipeline/tests/git/auto-commit.test.ts` | TDD |
| 03-03-01 | 03 | 2 | NOTE-03 | T-03-06, T-03-08 | Timeout, no credentials | unit | `npm run test --workspace=pipeline` | `pipeline/tests/generators/meta-fetcher.test.ts` | TDD |
| 03-03-02 | 03 | 2 | NOTE-03, STOR-04, STOR-05, STOR-06 | T-03-07 | Date validation | integration | `npm run test --workspace=pipeline` | `pipeline/tests/commands/generate.test.ts` | TDD |

*Status: TDD = test written in RED phase before implementation*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Obsidian renders note correctly | NOTE-01 | Requires Obsidian app open | Open generated .md file in Obsidian, verify frontmatter and sections render |
| Atomic write during Obsidian edit | STOR-04 | Requires concurrent file access | Edit note in Obsidian while running `second-brain generate`, verify no corruption |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — N/A, TDD plans create tests in RED phase
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
