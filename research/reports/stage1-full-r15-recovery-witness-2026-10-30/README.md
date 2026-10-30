# Stage 1 full-r15 pending-receipt recovery witness (2026-10-30)

This supplies the measurement behind gate D8's "exact pending-receipt recovery", which evaluator v4 copies from the replay flag (review W03). The design was predeclared in ledger L105, before any r15 gate result was seen. It uses training data only.

**Method** (`.codebase/scripts/puzzle-learning/lichess-stage1-pending-recovery-witness-v1.mjs`). For each replica's informative lineage, block index 7 is rebuilt from its stage-start checkpoint with the audit's replay factory. (1) It is replayed uninterrupted; this must reproduce the original training chainHash, receipt count and final block digest, or the witness is invalid. (2) The block is interrupted after the pending publication of receipt k, then resumed. (3) The block is interrupted after receipt k is appended but before acknowledgement, then resumed. k is the first `frame` receipt, a neural update. A pass requires both recoveries to match (1) on chainHash, receipt count, final block digest (which includes memory) and receipt-log bytes. A double-applied update would change the digest.

| Replica | k (kind) | Receipts | (1) reproduces training | (2) after pending | (3) after append | Exactly once | Time, peak RSS |
|---|---|---|---|---|---|---|---|
| r1 | 2 (frame) | 21 | yes | identical | identical | **true** | 109 s, 213 MiB |
| r2 | 2 (frame) | 21 | yes | identical | identical | **true** | 53 s, 215 MiB |
| r3 | 2 (frame) | 21 | yes | identical | identical | **true** | 53 s, 214 MiB |

Raw outputs: `runs/stage1-full-r15-recovery-witness-v1b-{r1,r2,r3}/witness.json`. The first attempt, `runs/stage1-full-r15-recovery-witness-v1-r1/` (partial), is preserved; it found the mid-event resume bug.

## What this does and does not show

- **Shown:** block-level recovery from a published pending update, and from an appended but unacknowledged receipt, is exactly-once on the real r15 learner for every replica.
- **Not true of the registered r15 code:** the stage-level training resume (block v2) cannot resume from a mid-event checkpoint. The selection accounting asserts that no event is pending, so the resume fails safe with an exception ([journal](../../journal/experiments/2026-10-30-mid-event-resume-bug.md), ledger L106). The witness resumes as block v3 does, which skips the redundant accounting. r15 training was never interrupted, so its results do not depend on this path.
- **Therefore:** for r15, D8's recovery subclaim is supported at the block level only. The stage-level property holds only from block v3 onward (synthetic regression test 1/1). Any r15 Stage 1 acceptance must state this.
- One block per replica and one interruption point per kind were tested; this is not exhaustive.
