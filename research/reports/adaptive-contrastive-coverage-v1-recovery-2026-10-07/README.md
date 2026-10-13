# Adaptive coverage pending-receipt recovery

The main graph run was terminal before this serial resume. Checkpoint00006 contains the already-applied informative c4b5 punishment and pending receipt. Resume with max-events1 completed, producing32 fresh all-legal candidate presentations and no repeated teaching presentation. Exact receipt, memory and one acknowledgment checks pass.

The first verifier attempted byte-level equality of a freshly generated proof and failed on its two measured elapsed times. Preserve audit-first-attempt.log and auditor-before-timing-correction.mjs. Corrected verification requires exact neural assessments and proof contents except proof.bounds.elapsedMs and proof.certificateCheck.elapsedMs, whose values must remain finite/nonnegative. The audit's exactRanking flag refers to this timing-independent comparison. No neural tolerance or changed learning gate was introduced.

Main report/audit: [audited acquisition](../adaptive-contrastive-coverage-v1-2026-10-07/README.md). This prefix is recovery evidence, not a new learning seed. Resources11.2671685s wall,6.75s CPU,110.359375MiB peakRSS. Report/audit preserve hashes.

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-contrastive-coverage.mjs --out research/reports/adaptive-contrastive-coverage-v1-recovery-2026-10-07 --resume research/reports/adaptive-contrastive-coverage-v1-2026-10-07/checkpoint-00006/state.json --cpu-duty 0.5 --max-events 1
```
