# Pre-launch code review of memory v7, round 2 (2026-11-05)

Prompt: `peer-review-v7-code-round2-prompt.txt`.

**LAUNCH AFTER REQUIRED FIXES.** All four round-one fixes are present: the auditor uses the corrected fields, independently rebuilds the capture permutation, rechecks practice proofs and ledger bindings, and requires pinned data for full-run acceptance.

1. [audit:500](../../../.codebase/scripts/neural-learning/audit-engineered-memory-test-v7.mjs:500) trusts `priorSelections` from the config without checking which files they name or hashing them. The registered list is at [registration:21](../../../python%20actions/engineered-memory-test-v7-step.json:21), and those earlier selection files are absent from `pins`. If the list is empty or replaced, the audit can accept a run without checking game overlap. **Fix:** pin the two expected selection hashes, require exactly those two inputs, hash-check them, and add a test that removes or substitutes one.

After that fix, run the specified five-position dry run and require its independent audit to pass before launch. I did not run tests or simulations.