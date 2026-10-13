# Counterfactual choice probe

This read-only probe loads the independently audited adaptive-two-valence final memory and evaluates a familiar KQK fixture plus a support-removed counterfactual. It compares the all-legal ranking with the 24-candidate/eight-quiet delta shortlist under one frozen memory snapshot. Each selected move is independently checked with the bounded forced-mate certificate.

The familiar row selects `f7h7` and verifies success. The counterfactual changes the selection to `f7a7` rather than repeating the formerly reviewed `f7g7`; `f7a7` verifies failure for the one-ply mate task. All-legal and focused choices agree in both rows, and three legal moves are omitted in total. The changed position has no declared successful alternative under this task, so this is only input-sensitivity and stale-pattern-rejection evidence. It is not unfamiliar transfer or reasoning.

Command:

```powershell
node --max-old-space-size=256 .codebase/scripts/run-paired-delta-probe.mjs --out research/reports/counterfactual-transfer-v1-2026-10-06 --input research/data/counterfactual-transfer-v1/puzzles.jsonl --max-states 2 --max-candidates 24 --quiet-reserve 8 --memory-report research/reports/adaptive-two-valence-original-v2-2026-10-06/report.json --cpu-duty 0.5
```

Raw result: [report.json](report.json). Frozen input: [protocol.json](../../data/counterfactual-transfer-v1/protocol.json) and [puzzles.jsonl](../../data/counterfactual-transfer-v1/puzzles.jsonl).
