# Positive-puzzle memory probe: nearly common candidate offsets

2026-10-06, prepared while the frozen positive-puzzle pilot is still running. Do not launch a second full graph concurrently. The probe requires a terminal complete pilot plus passing independent record/pending-receipt audit before graph load. It does not alter that experiment, select a checkpoint for performance, change gates or introduce a biological mechanism.

## Question and frozen interventions

The [recorded local diagnostic](../../../archive/early-development/research/reports/positive-puzzle-ranking-local-diagnostic-2026-10-06/README.md) finds only one active/changed PAM02-associated edge out of 84 during the first verified Qh7# success replay, plus endogenous PPL103 changes. Final scores after four events cannot isolate that first event's contribution.

[Probe](../../../.codebase/scripts/probe-positive-puzzle-memory.mjs) independently assesses all legal moves under six specified memory states: the fixture's original pre-teaching memory, the complete first-event memory, first-event PAM02 gains with other gains restored to their original values, first-event PPL103 gains with other gains restored, final memory and final memory restored again. These are artificial computational memory interventions, not learning trials or modeled physiological silencing. Existing topology, signs, neuron identities, readout, encoder and nonplastic parameters remain unchanged. No calculated update or new feedback is supplied.

Predictions to distinguish: the first positive event may improve Qh7#'s relative preference but later teaching erase it; its effect may be shared across unrelated candidates; or its contribution may fail to change ranking even before later feedback. A PAM-only gain restoration isolates the stored contribution under this model, not the biological necessity of PAM circuitry. No direction or threshold is fitted after outcomes.

## Validation and resource boundaries

Pin pilot report/audit/receipt/mapping/source hashes and verify all original inputs/sources. Require the source receipt's independently verified success/PAM02 channel and exact before-memory binding. Verify root IDs on the full released sparse graph. Assessments freeze adaptation and preserve task/history; baseline/final/restored assessments must reproduce the original records exactly. Archive all six gain arrays and root rankings, not only winning choices. No held-out family participates in this diagnostic.

Six all-legal sweeps on the 26-move KQK training fixture require 156 neural presentations, bounded at 192 per invocation. The runner uses atomic per-intervention checkpoints, resumability, 768 MiB RSS/256 MiB free memory guards and CPU duty 0.5. Preserve interruption files and resume into a new directory from the last published intervention; incomplete checkpoints are unacknowledged.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-positive-puzzle-memory.mjs --run research/reports/positive-puzzle-pipeline-v1-2026-10-06 --out research/reports/positive-puzzle-memory-probe-2026-10-06 --cpu-duty 0.5
```

At preparation, syntax checking passes; the probe has not run. An independent evidence audit must check intervention gain masks, pinned receipts, complete legal sets, score arithmetic and original-score restoration after execution. Auditing recorded computations does not independently validate full-graph inference or biological dynamics.

The outcome can guide a separately frozen representation/coverage test using training evidence. Neither replay nor familiar repair establishes the original objective's learned strategic evaluation, richer consequence use, unfamiliar/counterfactual reasoning or broader adaptation.

2026-10-06 preparation update: independent probe auditor .codebase/scripts/audit-positive-puzzle-memory.mjs is prepared and syntax checked. It imports no learning/inference/encoder implementation; reconstructs gain masks from pinned source receipts, checks all legal sets and score arithmetic, and requires original baseline/final/restored score equality. Reports target rank/margin without a fitted threshold. Neither probe nor audit has executed; wait for terminal pilot and passing original prefix audit before graph replay.

## 2026-10-06 completion: positive-puzzle memory contribution probe
Read-only full-graph probe is terminal; independent auditor passes six saved-memory interventions and 156 legal-candidate records, exact baseline/final/restored reproduction. Isolated one-edge PAM02 change raises Qh7 score by 0.0004179924726 but improves its margin over Qf5 by only 0.0000000107102; all 26 candidate offsets are nearly common (0.0004178909585 to 0.0004180357791), so choice stays Qf5. Complete first-event/PPL-only states worsen the target margin. Final memory exposes failed Qb3. This supports investigating action-specific eligibility/representation without ruling out coverage; no unique biological cause or validated repair is established. Report SHA-256 496e80a914ba49db835ed1c5033a73caf9f0614419b6423b8f30411de755ff74. Resources: 101.0859375 MiB RSS, 109.4277453 s elapsed, 49.719 s CPU, 156 presentations. Raw evidence: research/reports/positive-puzzle-memory-probe-2026-10-06/README.md. This supersedes probe pending statements. Original useful chess learning and unfamiliar reasoning remain unproved.
