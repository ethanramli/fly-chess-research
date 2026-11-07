# Pre-launch code review of memory v7 (2026-11-05)

Same reviewer and session. Prompt: `peer-review-v7-code-prompt.txt`.

**LAUNCH AFTER REQUIRED FIXES.**

K3 still centres over **all legal moves**; scoring uses the separate capture set. Calibration remains practice-only. Data hashes match, selected games have zero overlap with games 1–600, and exclusions leave **567 positions**.

1. **Auditor cannot consume the actual registration/output.** [auditor:832](../../../.codebase/scripts/neural-learning/audit-engineered-memory-test-v7.mjs:832) reads `paths.v6Positions`; registration supplies `positionsV6`. [auditor:421](../../../.codebase/scripts/neural-learning/audit-engineered-memory-test-v7.mjs:421) expects `allLegalExpectedTotal`/`pieceValueExpectedTotal`; the worker writes `allLegalScores`/`pieceValue`. **Fix:** align these names and add an integration test using actual worker output. The synthetic fixture currently reproduces the auditor’s incompatible layout.

2. **Permutation seed differs from the frozen specification.** [task-v7:32](../../../.codebase/src/neural-learning/engineered-memory-task-v7.mjs:32) uses `seed ^ 0x7ca7`. Applying `permuteKnownValues` as specified also introduces its internal `^ 0x5eed`. **Fix:** apply that helper to the known-capture subset with the specified transformed seed; independently reproduce the resulting permutation in the auditor. Update the reference test. Quiet/unknown placement is otherwise correct.

3. **Practice certificates are copied, not rechecked.** [runner:304](../../../.codebase/scripts/neural-learning/run-engineered-memory-test-v7.mjs:304) checks source identities and move coverage; [auditor:583](../../../.codebase/scripts/neural-learning/audit-engineered-memory-test-v7.mjs:583) explicitly verifies proofs only for test moves. **Fix:** recheck saved practice proofs against replayed histories before memory construction and independently during audit; verify each ledger slot’s value and certificate hash against that checked certificate. Byte identity does not replace verification.

4. **Production certification is permanently unpinned.** [auditor:50](../../../.codebase/scripts/neural-learning/audit-engineered-memory-test-v7.mjs:50) leaves `NEW_PINS = null`, making `pinned:false` inevitable. **Fix:** populate the registered data digests and require both `pass:true` and `pinned:true` for full-run acceptance.

Re-pin after fixes. **Once v6-r3 is terminal**, require the specified five-position dry run and independent audit before launching. No v7 dry-run artifact was present; this was static review only. The five-hour guard and full-store all-legal diagnostic remain runtime risks, not evidence of learner failure.