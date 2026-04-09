---
phase: 1
slug: browser-extension-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | CAPT-01 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAPT-02 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAPT-03 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAPT-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAPT-05 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` — install test framework
- [ ] `vitest.config.ts` — configure for TypeScript + WXT
- [ ] `tests/blocklist.test.ts` — stubs for CAPT-04, CAPT-05
- [ ] `tests/capture.test.ts` — stubs for CAPT-01, CAPT-02
- [ ] `tests/history-fallback.test.ts` — stubs for CAPT-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Extension loads in Chrome | CAPT-01 | Requires real browser | Load unpacked extension, visit a page, verify capture in chrome.storage |
| Extension loads in Comet | CAPT-02 | Requires Comet browser | Load unpacked extension in Comet, visit a page, verify capture |
| Popup UI renders correctly | CAPT-01 | Visual verification | Click extension icon, verify dashboard layout matches UI-SPEC |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
