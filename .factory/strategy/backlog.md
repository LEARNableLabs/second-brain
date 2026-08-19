## Backlog

### FIX (Highest Priority)
- **Fix factory meta-eval tests dimension:** The factory meta-eval reports "0 passed, 18 failed" while `npm test` passes 166 tests. This is a monorepo workspace detection issue. No experiment can pass the precheck gate until this is fixed. Investigate how `factory eval` runs tests vs how `eval/score.py` runs them — the project eval/score.py correctly scores 1.0, but `factory eval` scores 0.0 for the tests dimension. **Growth dimension:** factory_effectiveness

### EXPLOIT
- **Fix 37 TypeScript strict mode errors:** 33 in extension (mostly TS2503 missing @types/chrome and TS2353 wrong mock properties), 12 in pipeline, 1 root. Fix with: `npm install -D @types/chrome`, fix test mock types with Partial<T>, fix function signature mismatches. Would bring type_check from 0.0 to ~1.0.

### EXPLORE (Growth)
- **Add Pino structured logging (H2 from cycle 1):** Install Pino in pipeline and shared, create shared logger module, instrument 47 uninstrumented functions across 10 files. Expected: observability 0.181 → 0.55+. **Growth dimension:** observability
- **Re-attempt manual capture features (H1 from cycle 1):** Context menu, keyboard shortcut code is already on the branch (commit 0b0d01b). Once tests dimension is fixed, this should pass precheck. **Growth dimension:** capability_surface
- **Dashboard view modes (#9, #10):** High-complexity UI features — defer until core pipeline is validated on real data.
