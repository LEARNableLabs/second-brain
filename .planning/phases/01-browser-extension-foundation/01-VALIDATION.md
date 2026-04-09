---
phase: 1
slug: browser-extension-foundation
status: approved
nyquist_compliant: true
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
| **Config file** | extension/vitest.config.ts (created in Plan 01-01) |
| **Quick run command** | `cd extension && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd extension && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd extension && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd extension && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | CAPT-01 | — | N/A | build | `cd extension && npx wxt build` | ❌ W0 | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | CAPT-04 | — | Blocklist filters domains | unit | `cd extension && npx vitest run blocklist` | ❌ W0 | ⬜ pending |
| 01-02-T2 | 01-02 | 2 | CAPT-05 | — | N/A | unit | `cd extension && npx vitest run storage` | ❌ W0 | ⬜ pending |
| 01-03-T1 | 01-03 | 3 | CAPT-01 | — | Dwell threshold filters bounces | unit | `cd extension && npx vitest run dwell` | ❌ W0 | ⬜ pending |
| 01-04-T1 | 01-04 | 3 | CAPT-05 | — | N/A | unit | `cd extension && npx vitest run popup` | ❌ W0 | ⬜ pending |
| 01-05-T1 | 01-05 | 4 | CAPT-03 | — | N/A | unit | `cd extension && npx vitest run history` | ❌ W0 | ⬜ pending |
| 01-05-T3 | 01-05 | 4 | CAPT-02 | — | N/A | manual | Load in Comet browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` — installed via Plan 01-01 (package.json)
- [ ] `vitest.config.ts` — created in Plan 01-01
- [ ] `tests/blocklist.test.ts` — stubs for CAPT-04, CAPT-05 (Plan 01-02)
- [ ] `tests/storage.test.ts` — stubs for CAPT-01 storage (Plan 01-02)
- [ ] `tests/dwell-tracker.test.ts` — stubs for CAPT-01 dwell (Plan 01-02)
- [ ] `tests/history-backfill.test.ts` — stubs for CAPT-03 (Plan 01-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Extension loads in Chrome | CAPT-01 | Requires real browser | Load unpacked extension, visit a page, verify capture in chrome.storage |
| Extension loads in Comet | CAPT-02 | Requires Comet browser | Load unpacked extension in Comet, visit a page, verify capture |
| Popup UI renders correctly | CAPT-01 | Visual verification | Click extension icon, verify dashboard layout matches UI-SPEC |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-09
