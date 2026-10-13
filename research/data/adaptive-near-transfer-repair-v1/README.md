# Adaptive near-transfer repair v1

Frozen 2026-10-07, Asia/Jakarta. This is a warm-start continuation: it begins from the independently audited informative memory that repaired the smothered development fixture, then targets the previously inspected queen d5 / rook f8 position where the certified move ranked second but lost to a failing move.

The informative condition adaptively pairs its current verified failure with the pinned verified success `d5g8`, up to four pairs. Absent, seeded-shuffled and disabled-plasticity conditions begin from the exact same learned memory and replay the exact informative experiences. All legal moves remain available. The support-shifted delayed puzzle is measured separately as an already inspected development counterfactual. It is not a final test.

This tests whether additional verified feedback can move one promising same-motif ranking shift across the choice boundary. It is not an independent acquisition seed, a disjoint-family test, or proof of reasoning. The five related positions have already been inspected and remain development data.

The protocol pins 25 inputs, 31 source files, graph/annotation/mapping identities, prerequisite audits, warm-start checkpoint provenance and snapshot digest, resolved `chess.js` dependency, teacher/evaluation settings, and resource guards. Heap256 MiB, CPU duty0.5, RSS768 MiB and free memory256 MiB are required. The bounded teacher root shortlist must retain the pinned positive move. Atomic checkpoints, receipts and condition reports plus independent certificate/recurrence auditing are required.

Preflight (no graph inference):

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-near-transfer-repair.mjs --preflight --cpu-duty 0.5
```

Run only after checking that no other graph experiment is active:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-near-transfer-repair.mjs --out research/reports/adaptive-near-transfer-repair-v1-run-2026-10-07 --cpu-duty 0.5
```

Audit after the invocation is terminal:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-near-transfer-repair.mjs --run research/reports/adaptive-near-transfer-repair-v1-run-2026-10-07
```

The [protocol](protocol.json), source archive and [result directory](../../reports/adaptive-near-transfer-repair-v1-run-2026-10-07/README.md) preserve the frozen experiment and its outcome.
