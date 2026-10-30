# 2026-10-30: training cannot resume from a mid-event checkpoint (found by the D8 recovery witness)

## What was tried

The predeclared D8 recovery witness (ledger L105; `.codebase/scripts/puzzle-learning/lichess-stage1-pending-recovery-witness-v1.mjs`) was run for full-r15 replica r1, informative lineage, block index 7. Output (partial, kept as evidence): `runs/stage1-full-r15-recovery-witness-v1-r1/`.

- The uninterrupted replay of block 7 reproduced training exactly: chainHash, receiptCount 21 and the final block digest equal the saved checkpoint. So the witness rebuilds the learner correctly.
- The injected interruption after the pending publication of receipt k=2 (the first `frame`, a neural update) produced checkpoint-000006, with a pending receipt and a non-null `session.pending`. This is a mid-event state.
- The resume pre-step copied from the registered training path then threw `AssertionError: Expected values to be strictly equal`, with the session's pending event as the actual value.

## Diagnosis (traced in code)

`lichess-curriculum-block-v2.mjs` (stage resume): `block.restore(saved.block)` restores the interrupted block's latest checkpoint (`blockResumeCheckpoint` in matrix v2 takes the newest `checkpoint-NNNNNN` of the block, usually mid-event). Then `runLichessCurriculumBlock` calls `block.session.accountSelectionPresentations(plan.planSha256, plan.selectionPresentations)` unconditionally (line 90). `stockfish-value-session.mjs:57` asserts `this.pending === null` before its "already accounted" early return. So every hard interruption inside an event (most checkpoints are inside events) leaves a lineage that the registered pipeline refuses to resume.

- **Fails safe:** the assertion fires before any assessment or learning, so no state is corrupted.
- **Not caught before** because the verified recoveries (cooperative pause, r8/r13 babysit tests) stop at block boundaries, where `pending` is null. The block-runner unit tests exercise interruption below this stage layer.
- **Evidence impact:** none of the r14/r15 training lineages were resumed mid-event (r15 never resumed; a mid-event resume would have crashed, not produced results). But the registered system does not have the D8 property "recovery immediately after a published pending update" at the stage level, and evaluator v4 reports that subcheck true by copying the replay flag (review W03). Any Stage 1 acceptance claim must disclose this.

## Fix (new versions only; r15's pinned v2 files are unchanged)

The selection accounting is already inside every block checkpoint, because it runs before the block's first save, and `runCurriculumBlock` restores the checkpoint anyway. So a resume must not redo it: block v3 calls it only when not resuming. Matrix v3 imports block v3; runner v6 imports matrix v3. The witness is rerun for r1 with the fixed resume order into a new directory. That tests whether the block-level recovery itself is exactly-once (memory not double-updated).

## Addendum 2026-10-30 12:16: fix verified

Block v3 regression test 1/1: a mid-event resume through v3 matches the uninterrupted run, and v2 throws. The witness, rerun with the v3 resume order, gives `pendingReceiptExactlyOnce: true` on r1, r2 and r3 (each reproduces training exactly). Report: [recovery witness](../../../archive/early-development/research/reports/stage1-full-r15-recovery-witness-2026-10-30/README.md).
