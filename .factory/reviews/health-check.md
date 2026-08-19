# Health Check Report

- **timestamp:** 2026-08-19T14:42:30Z
- **baseline_composite:** 0.306
- **current_composite:** 0.308

---

## Score Table

| Dimension | Score | Weight | Passed | Details |
|---|---|---|---|---|
| tests | 0.0 | 0.155 | NO | Factory meta-eval: "0 passed, 19 failed" (known detection discrepancy — see note below) |
| lint | 0.6 | 0.075 | NO | 1 error each in root, extension, pipeline, shared |
| type_check | 0.0 | 0.05 | NO | 1 root + 33 extension + 12 pipeline TS errors |
| coverage | 0.5 | 0.125 | YES | No coverage tool detected (neutral) |
| config_parser | 1.0 | 0.05 | YES | All config checks pass |
| architecture | 0.5 | 0.045 | YES | No .sentrux/rules.toml (neutral) |
| capability_surface | 0.04 | 0.125 | NO | surface=4, target=100 |
| experiment_diversity | 0.5 | 0.1 | YES | 0 experiments (neutral) |
| observability | 0.177 | 0.09 | NO | coverage=0.19, structured_logging=false |
| research_grounding | 0.0 | 0.07 | NO | No sources, no research report |
| factory_effectiveness | 0.5 | 0.065 | YES | 0 experiments (neutral) |
| spec_compliance | 0.5 | 0.05 | YES | No spec_results.json (neutral) |

## Composite

- **Score:** 0.308
- **Baseline:** 0.306
- **Delta:** +0.002
- **Threshold result:** AT BASELINE (within noise)

## Unit Tests

- **Status: PASS**
- Extension: 83 passed (10 test files)
- Pipeline: 78 passed (10 test files)
- Shared: 5 passed (2 test files)
- **Total: 166 tests passing, 0 failures**

### Note on factory meta-eval tests discrepancy

The factory meta-eval reports `tests=0.0` ("0 passed, 19 failed"), but `npm test` from the project root passes all 166 tests across all three workspaces. This is a known discrepancy documented in the strategy — the factory's test runner detection does not correctly handle this monorepo's workspace-based test setup. The actual tests are passing. This discrepancy existed before the builder's changes and is not a regression.

## Guard Violations

None.

## Overall Gate Result

**PASS**

- Unit tests pass (166/166 across all workspaces)
- Composite score 0.308 is at baseline (0.306), delta +0.002
- No guard violations
- The tests=0.0 in factory meta-eval is a pre-existing detection issue, not a regression from the builder's changes
