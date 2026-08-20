# Health Check Report — Experiment #4 (H4: Manual Capture + Structured Logging in Handlers)

- **timestamp:** 2026-08-19T20:00:00Z
- **baseline_composite:** 0.5865
- **current_composite:** 0.6049

---

## Score Table

| Dimension | Score | Weight | Passed | Baseline | Delta | Notes |
|---|---|---|---|---|---|---|
| tests | **1.0** | 0.155 | YES | 1.0 | 0.0 | 38 tests pass (19+7+10+2), 0 failures |
| lint | 0.6 | 0.075 | NO | 0.6 | 0.0 | 1 error per package (unchanged) |
| type_check | 0.95 | 0.05 | NO | 0.95 | 0.0 | 1 root-level TS error remains |
| coverage | **0.7043** | 0.125 | NO | 0.7023 | **+0.002** | ext 38%, pipeline 85%, shared 100%, root 59% |
| config_parser | 1.0 | 0.05 | YES | 1.0 | 0.0 | Unchanged |
| architecture | 0.5 | 0.045 | YES | 0.5 | 0.0 | Unchanged |
| capability_surface | 0.04 | 0.125 | NO | 0.04 | 0.0 | Unchanged |
| experiment_diversity | **0.6857** | 0.1 | YES | 0.5571 | **+0.1286** | 3 distinct categories in last 4 experiments |
| observability | **0.713** | 0.09 | YES | 0.708 | **+0.005** | Slight improvement from handler logging |
| research_grounding | 0.0 | 0.07 | NO | 0.0 | 0.0 | Unchanged |
| factory_effectiveness | **0.525** | 0.065 | YES | 0.45 | **+0.075** | keep_rate improved to 0.50 (2/4) |
| spec_compliance | 0.5 | 0.05 | YES | 0.5 | 0.0 | Unchanged |

## Composite

- **Score:** 0.6049
- **Baseline:** 0.5865
- **Delta:** +0.0184 (+3.1%)
- **Threshold (0.5):** MET (0.6049 >= 0.5)

## Unit Tests

- **Status: PASS**

| Workspace | Tests Passed | Tests Failed | Status |
|---|---|---|---|
| root (run-e5719851) | 19 | 0 | PASS |
| extension | 7 | 0 | PASS |
| pipeline | 10 | 0 | PASS |
| shared | 2 | 0 | PASS |
| **Total** | **38** | **0** | **ALL PASS** |

## Key Dimension Changes (H4)

| Dimension | Before | After | Delta | Cause |
|---|---|---|---|---|
| experiment_diversity | 0.5571 | 0.6857 | **+0.1286** | 3 distinct categories across last 4 experiments |
| factory_effectiveness | 0.45 | 0.525 | +0.075 | keep_rate improved (2/4 vs 1/3) |
| observability | 0.708 | 0.713 | +0.005 | Marginal gain from handler structured logging |
| coverage | 0.7023 | 0.7043 | +0.002 | Slight coverage increase in extension |

## Guard Violations

None.

## Overall Gate Result

**PASS**

- Unit tests pass: 38/38 across all 4 workspaces, 0 failures
- Composite improved: 0.5865 → 0.6049 (+3.1%), above threshold
- Threshold met: 0.6049 >= 0.5
- Primary improvement: experiment_diversity jumped +0.1286 (3 distinct categories now tracked)
- Secondary: factory_effectiveness recovered +0.075 as keep_rate stabilized
- No regressions in any dimension
- No guard violations
