# Connectome provenance check: `.cache/full.npz` against FlyWire Codex 783 (2026-10-28)

Researcher question: is our graph the original FlyWire connectome, or something trained? `.cache/full.npz` (SHA-256 4d63295f...abe2) is Carlo Esposito's fly-chess graph artifact (Hugging Face cesp99/fly-chess, revision cad7331; [citation](../../literature/cesp99-retina-2026-10-28/README.md)). We had pinned its hash but never checked its content.

## Method

- **Official tables.** Downloaded from FlyWire Codex snapshot 783 (`https://storage.googleapis.com/flywire-data/codex/data/fafb/783/`) on 2026-10-28T15:12Z into `.cache/flywire-codex-783-verify/`. SHA-256: connections d49dd692..., neurons 6a6b3759..., classification e946b552..., consolidated_cell_types 8aba246d..., column_assignment bdf4ce7f....
- **Checker.** `check.py` is our own implementation (numpy and stdlib only; none of the upstream conversion code is used) of the conversion rules documented upstream:
  - synapses are summed per (pre, post) over neuropils and a pair is kept if it has at least 5 synapses and pre != post;
  - each neuron keeps its neurons.csv transmitter, or otherwise gets the synapse-weighted majority of its pairs' labels, where each pair is labelled by its largest row;
  - the sign is -1 for GABA or glutamate, else +1.
- **Output.** `check-results.json`.

## Result

| Check | Result |
|---|---|
| Content of the file | Raw anatomy only: integer synapse counts 5-2405, signs of plus or minus 1, IDs, classes, positions, retina fields. **No trained weights.** |
| Neurons | 134,209, all FlyWire 783 neurons (of 139,255). Super class matches classification.csv for 134,209/134,209. 134,181 neurons have a kept edge and all are included; 28 isolated descending or motor read-out neurons are kept as documented upstream. |
| Edges | 2,700,513 in both directions: every file edge is a FlyWire pair with at least 5 synapses, and every such pair is in the file |
| Synapse counts | 2,700,513/2,700,513 identical |
| Signs | 2,700,513/2,700,513 follow the file's per-neuron transmitter rule |
| Per-neuron transmitter vs our reimplementation | 134,204/134,209 agree; 5 differ (below) |
| Retina | 5,543/5,543 photoreceptor types match consolidated_cell_types. All 1,402 R7/R8 have an official column, and the eye code maps one-to-one to hemisphere. In all 990 columns, the column's R7/R8 share one board square. |

Note: the Codex connections table already holds only pairs with at least 5 synapses (2,700,513 aggregated pairs, all at or above 5), so the filter matches FlyWire's own release threshold.

**The 5 differences.** All five are unlabelled optic-lobe intrinsic neurons (lamina or medulla) with near-tied transmitter predictions (for example GABA 0.32 against ACh 0.36). The file labels them DA (sign +1); our reimplementation gives GABA or GLUT (sign -1). Together they affect 15 edges. None is in any mushroom-body mapping we use, so they have no effect on the Stage 1 learner. Hypothesis: different tie-breaking when choosing a pair's label. Relevance: these neurons lie on the eye route (input v3 candidate), so record them in any eye-input experiment. The pinned graph is not modified.

## Conclusion

`.cache/full.npz` is the FlyWire Codex 783 connectome at FlyWire's 5-synapse threshold, with neurotransmitter signs, repackaged for simulation. Its connectivity, synapse counts and signs reproduce exactly from the official tables, apart from 5 near-tied optic-lobe transmitter labels. For write-ups: "FlyWire Codex 783 (Dorkenwald et al. 2024; Schlegel et al. 2024), pairs with at least 5 synapses, signs from Eckstein et al. 2024 transmitter predictions, packaged by Esposito (fly-chess); independently re-derived and verified 2026-10-28."
