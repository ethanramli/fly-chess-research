# 2026-10-10: Independent audit findings and separate checkpoint repair

The independent audit rejects general checkpoint correctness: `loadCheckpoint` changes canonical magnitudes without refreshing signed recurrent weights; both production WASM and the frozen JS oracle reproduce incorrect restored inference. Previous synthetic update/local-memory tests and untrained graph equivalence did not cover disk restoration. Our claim that recopying prevents stale inference after any checkpoint change was too broad. The shared loader is the repair boundary; do not patch each evaluator or alter frozen oracle/audit artifacts.

The performance report also labeled nearest-rank lower-middle p50 as median and its follow-up audit duplicated that convention. Conventional medians need a dated correction from existing raw data; gates remain frozen and original success/failure outcomes are preserved. Dependable tails/cold speed remain unverified, and faster untrained inference is not learning or reasoning.

Inspection mistake: attempted to read `.codebase/tests/runtime/storage.test.mjs` before listing the tree; no such test existed. Inspection then listed actual tests/callers and read the shared storage boundary. No source was changed by that failed read. Add a single disk-round-trip regression, preserve its pre-fix failure, apply one shared refresh after successful validation, then run targeted and full regression. No graph process was active during authoritative preflight.
### Pre-fix reproduction

The new disk round-trip regression fails at the restored signed-weight equality assertion on the first float32/SGD case, reproducing the audited stale-cache defect. Raw TAP/stderr and synthetic checkpoint directory are preserved in the separate repair report. The test stops at its first failure; remaining precision/optimizer combinations have not yet run in this new regression. Apply only the existing `refreshSignedMagnitude` helper after all checkpoint data validation completes, before returning success.
### Targeted repair and statistical recomputation

The one-line shared loader refresh passes the new disk regression across float32/float64 and SGD/Adam, including equal restored parameters, signed weights, trajectories, gradients, optimizer state, next update and fixed wiring. Full npm regression is still running. Recomputed conventional middle-pair medians directly from all 64 historical timing samples and compared with the independent auditor's recomputed.json: every value agrees. WASM passes and zero-reset remains rejected under both conventions. No timing was rerun or gate changed.

Additional reporting inconsistency discovered: the independent audit's zero-reset prose gives 8.098 s JS / 8.660 s candidate, while its own recomputed.json and the original samples give 7.963 s / 8.516 s. The reported 6.94% regression and rejection still agree. Preserve the audit unchanged and publish the raw-supported values in this separate correction; this narrow transcription discrepancy does not discredit the confirmed checkpoint finding.

### Repair completion and limits

Unfiltered loader-free npm test passes 222/222, zero failed, in 82.603 seconds. The verification manifest confirms exactly one production line added at the shared checkpoint load boundary, preserved pre-fix failure, successful targeted test and frozen trainer/helper/raw report/sample hashes. No graph experiment was needed. Reporting correction uses conventional medians and agrees with the auditor machine-readable values; all historical gates/outcomes are retained. Updated report/journal/navigation/current status/decision log. The whole build is not declared generally verified: successful-load restoration is covered synthetically, while historical affected outcomes, all checkpoint failure modes, cross-session/cold/tail performance and scientific claims remain unverified. Independent re-review can assess the separate small repair.


Independent review clarification: the 19.13-40.18% range applies to adopted WASM only. The same correction JSON includes rejected zero-reset, whose per-fixture conventional median deltas are -6.94% to +10.16% and whose black-after-e4 gate still fails. Added a dated note to disambiguate the range; raw evidence and gates are unchanged.
