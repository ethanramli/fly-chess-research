# Validation-only Stage 1 king-relocation candidates v4

2026-10-23. Bounded follow-up to the v3 elapsed-limit failure. **Candidate construction only; not a training package or Stage 1 authorization.**

## Evidence

- `report.json` and `manifest.json`: 1,277 one-piece king-relocation counterfactual flips across 69 of 192 eligible validation roots; 19,045 king-square mutations and 15,214 checked captures. The producer completed in 589.0 seconds with 162.3 MiB peak RSS.
- Producer receipt: `runs/python-actions/20261023T061157-e89378d5`.
- Independent replay: [audit v5](../../reports/babysit-stage1-validation-v3-capture-counterfactual-audit-v5-2026-10-23.json), receipt `runs/python-actions/20261023T062205-7034517f`. It replayed every reported candidate and source-row binding; `passed:true`.
- Report SHA256: `9f1354cc79b3c6aeabd52b4c572784852e819a0791831b2b424a3b7cf317ddd5`.
- Source manifest SHA256: `f67d505405942a2de9648d7ccc7d5468e538e144278cd401ccfdce4080c0913c`; lesson SHA256: `ea76fe1144fd4814c3f15707f404a48348f3cc578f16320bd52e6483e0b63644`; lesson-audit SHA256: `b616ddeca62cc2ab0e9a4f4121bf15367e26f7edaad8be6713f67397d8f60977`.

## Limits and conclusion

A read-only pass through the existing Stage 1 stratum classifier found 348 absent-to-open and 159 open-to-absent transitions. It found no classified blocked-defender or pinned-apparent-defender transitions. The other 770 candidates involve a capture-check state that the classifier marks unknown. Thus king relocation did not supply the missing pin stratum among classifiable candidates; this does not prove that no such synthetic position can be constructed by another method.

The audit grouped candidates into proposed signatures, 44 of which recur across multiple validation games. It explicitly leaves semantic family diversity, train/validation family disjointness, neural teaching eligibility and graph launch false. The modified positions have synthetic history; the original Lichess PGN is provenance only. `finalSplitInspected:false`, `neuralEventsDelivered:0`. No training, Stockfish, graph or G0 run occurred. The frozen four-stratum Stage 1 gate remains unmet.
