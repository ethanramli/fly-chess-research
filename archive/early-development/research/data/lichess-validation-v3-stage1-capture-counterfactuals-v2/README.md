# Validation-only Stage 1 capture counterfactual candidates v2

2026-10-23. Candidate construction from the already audited Lichess validation v3 set. **Not a training package and not a Stage 1 authorization.**

## Contents and evidence

- `report.json`: 822 static capture-consequence flips from 74 source roots, produced by 31,725 one-piece mutations and 21,350 checked captures. Each counterfactual changes board occupancy while preserving the candidate capture.
- `manifest.json`: report hash, counts, sealed-final state and scope.
- Independent replay: [audit v3](../../reports/babysit-stage1-validation-v3-capture-counterfactual-audit-v3-2026-10-23.json). It replays every mutation and certificate and binds each source row to the pinned validation corpus.
- Source inputs: validation manifest SHA256 `f67d505405942a2de9648d7ccc7d5468e538e144278cd401ccfdce4080c0913c`; lessons SHA256 `ea76fe1144fd4814c3f9a4f4121bf15348f3cc578f16320bd52e6483e0b63644`; independent lesson audit SHA256 `b616ddeca62cc2ab0e9a4f4121bf15367e26f7edaad8be6713f67397d8f60977`.

## Limits

The modified board has **synthetic history**; the original Lichess PGN is provenance, not a game history for the changed board. Proposed grouping yields 427 signatures; 50 signatures exactly overlap the audited training v2 candidate set, leaving 377 exact-signature-disjoint validation candidates, 27 recurrent across validation games. A read-only mechanism classification found 328 open-to-absent, 330 absent-to-open, 12 open-to-blocked and no pinned-apparent-defender transitions among the 822 pairs; 152 pairs involved a check state and are unknown for that stratum classifier. The frozen Stage 1 four-stratum quota is therefore not met.

`relationFamilyDisjointnessEstablished`, `eligibleForNeuralTeaching`, and `graphLaunchAuthorized` remain false. Final was not inspected. No learner, Stockfish or connectome process was run. A future synthetic lesson mode needs an explicit board/history contract, all-legal panel binding, disjoint family selection, and complete Stage 1 acceptance data before any neural training.
