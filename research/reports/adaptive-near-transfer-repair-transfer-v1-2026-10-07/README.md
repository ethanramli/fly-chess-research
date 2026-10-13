# Sibling evaluation after warm-start repair

The saved memories from the audited warm-start repair were evaluated without feedback on four same-motif positions excluded from that additional training round. These positions were already inspected in the previous development probe; they are not final-test families.

Every condition chooses a certified failure on all four positions. Certified-success ranks:

| Position | Informative | Absent | Shuffled | Disabled |
|---|---:|---:|---:|---:|
| Queen b3, rook e8 | 29 | 24 | 30 | 24 |
| Queen b3, rook f8 | 30 | 27 | 30 | 27 |
| Queen d5, rook e8 | 16 | 16 | 34 | 16 |
| Queen e6, rook f8 | 17 | 17 | 27 | 17 |

The additional informative feedback worsens two sibling success ranks and leaves two unchanged relative to disabled plasticity, which preserves the original acquired memory. This is consistent with interference across these representations; it does not isolate a circuit cause. Repairing the newly trained position did not produce sibling-choice generalization.

The independent [audit](run/audit.json) passes 16 panels, 500 legal candidates and 500 consequence certificates with zero feedback and unchanged panel memories. [Report](run/report.json) and [audited marker](run/AUDITED.json) bind the evidence. The audit checks recorded outputs and certificates, not an independent rerun of neural evocations.

Resources: 350.13 s wall, 174.50 s CPU, 119.29 MiB peak RSS, 500 presentations, heap256/duty0.5. The first auditor retained an undefined correction-workflow variable and failed before publication; [failure note](audit-first-failure.txt), original source archive and separately pinned [corrective audit protocol](../../data/adaptive-near-transfer-repair-transfer-audit-v1/protocol.json) are preserved. Raw scores and original evaluation protocol were unchanged.

[Training result](../adaptive-near-transfer-repair-v2-2026-10-07/README.md) · [Evaluation protocol](../../data/adaptive-near-transfer-repair-transfer-v1/protocol.json).
