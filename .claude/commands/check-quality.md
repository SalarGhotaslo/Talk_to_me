Run all quality gates locally and report results.

Look up the commands for this project in the Commands table in CLAUDE.md, then run each gate and report pass/fail:

1. Typecheck — must be zero errors
2. Lint — must be zero errors
3. Tests with coverage — all 4 metrics must be ≥ 80%
4. Build — must succeed

Report each gate as ✅ passed or ❌ failed with the error output.
If any gate fails, stop and fix before proceeding.
