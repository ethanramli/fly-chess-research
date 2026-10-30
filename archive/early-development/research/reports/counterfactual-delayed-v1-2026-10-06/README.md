# Delayed-sacrifice counterfactual probe

This read-only probe uses the audited adaptive-two-valence final memory and compares a delayed-sacrifice fixture with a support-shifted counterfactual. The old `f1f8` sacrifice is independently successful in the original and fails after the supporting king moves; the changed position has a separately verified successful alternative, `h5e8`. The all-legal ranking and 24-candidate/eight-quiet shortlist use one frozen memory snapshot.

The observed choices were `h5h6` (failure) on the original and `h5e8` (success) on the counterfactual; all-legal and focused choices agreed in both rows. This does not pass a transfer gate: the final memory was trained on other familiar fixtures, the original selected move failed, and the pair is a diagnostic engineering fixture rather than a disjoint final family. It shows that a positive alternative can be represented and selected in the changed position, but does not show that feedback taught the delayed concept.

Command:

```powershell
node --max-old-space-size=256 .codebase/scripts/run-paired-delta-probe.mjs --out research/reports/counterfactual-delayed-v1-2026-10-06 --input research/data/counterfactual-delayed-v1/puzzles.jsonl --max-states 2 --max-candidates 24 --quiet-reserve 8 --memory-report research/reports/adaptive-two-valence-original-v2-2026-10-06/report.json --cpu-duty 0.5
```

Raw result: [report.json](report.json). Frozen input: [protocol.json](../../data/counterfactual-delayed-v1/protocol.json) and [puzzles.jsonl](../../data/counterfactual-delayed-v1/puzzles.jsonl).
