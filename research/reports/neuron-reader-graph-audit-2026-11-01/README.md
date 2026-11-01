# neuron-reader graph audit, 2026-11-01

**The graph/annotation mapping is the next repair recommendation. Keep the reader passive; no production scoring contract or chess training was enabled.** This bounded fact-check follows the external review supplied by the researcher. It does not accept every literature claim or adopt a new experimental protocol.

## Verified against the actual graph

The [static result](result.json) pins the graph and annotations by SHA-256. The [complete-source check](complete-source-result.json) joins the reviewer's Shiu v783 connectivity table through its accompanying root-ID index, using this project's pinned annotations. It checks exact root pairs and integer weights, rather than relying on equal total edge counts.

1. **Threshold loss confirmed.** The complete table has 62,261 KC→MBON connections carrying 256,719 counted synapses. The graph retains 21,438 connections carrying 169,931 synapses: 34.4% and 66.2%, respectively. Every retained pair and weight agrees exactly. MBON19 retains 8 connections; MBON33 retains 13. These are anatomical counts, not validated functional memory sites or evidence that restoring them improves learning.
2. **The 28-neuron discrepancy is explained.** There are 134,181 edge-incident neurons and 28 isolated nodes. All 28 are designated graph outputs. The cached upstream builder explicitly exempts input/output roles from zero-degree removal (`.cache/upstream/flychess_connectome_graph.py`, steps 3–5). They are not 28 extra connected neurons.
3. **Eyes connectivity passes; identities need repair.** All 5,543 selected inputs have outgoing edges. Selection includes both annotated sides: 2,259 left and 3,284 right. Thirteen selected roots lack an R1-6/R7/R8 label in the pinned annotation; ten instead have L3/L4/L1-3/Mi9/Mi15/Tm5a/Lawf1 labels and three lack a specific type. Full IDs and indices are retained in the result. This establishes a disagreement between the placement and annotation sources; it does not establish which source is wrong. Frozen Eyes sources and data remain unchanged.
4. **Transmitter/sign concerns confirmed, with a distinction.** All 5,177 annotated KCs have acetylcholine in the curated multi-label field; 5,172 have predicted dopamine. All 5,177 nevertheless have positive outgoing graph signs. The existing dual-valence interface selects named PAM02/PPL103 groups, not `top_nt`, so the review's KC-as-DAN warning is not a demonstrated defect in that selector. MBON05's left cell has positive outgoing signs and its right cell negative, despite curated glutamate on both sides. That conflict was preserved in the reader roster, not resolved by it.

## Source checks and interpretation

[Dorkenwald et al., Results and Methods](https://www.nature.com/articles/s41586-024-07558-y) report the same five-synapse threshold and incident graph size, explaining their conservative filter as protection against false positive connections. The global 44.7% postsynaptic attachment rate is not a per-edge correction factor. Restoring every weak edge is therefore an experimental assumption to test in a separately pinned graph, not an automatic repair.

[Shiu et al., neurotransmitter assumptions and modelling limitations](https://pmc.ncbi.nlm.nih.gov/articles/PMC11446845/) explicitly distinguish their assumed inhibitory glutamate sign from possible excitation, omit receptor dynamics/neuromodulation and describe the zero-baseline limitation. Their published simulator is Brian2/LIF using v630; this project uses a different rate implementation and a v783-derived graph. Published model behavior cannot be transferred without testing. [Ichinose et al., Results around Figures 4–5 and Discussion](https://elifesciences.org/articles/10719) support NMDA involvement and a proposed excitatory α1 feedback mechanism, while explicitly leaving direct physiological connectivity unproved in that study. This does not specify a universal glutamate sign or every FlyWire edge's receptor.

**Recommendation:** reconcile the thirteen retina identities and graph provenance first. Design separate threshold/sign sensitivity conditions; retain the original graph. Require causal pathway checks rather than treating direct memory modification of a recorded MBON as necessary or sufficient. Non-chess conditioning is a useful proposed next test, but odor inputs, spectral color drive, timing and compartments must be specified first. Eyes v1 currently renders scalar glyph intensity; it does not define a blue/green physiological stimulus. Passing an engineered conditioning benchmark would not establish chess relations. Expanding recording to all MBONs or fitting an external contrast remains a proposal, not an implemented production reader.

No learning, graph propagation, legacy-source edit, protected memory edit or experiment-gate change occurred. The complete review's behavioral sign table, color studies, retraction statement and wider absence claims were not independently re-reviewed here. Source coverage above is targeted text/sections; no figure panels were visually audited.

## Reproduction and mistakes preserved

Run from the repository root. Existing result files are refused; preserve them and use a new sibling report directory for a repeat.

```powershell
node --max-old-space-size=256 research/reports/neuron-reader-graph-audit-2026-11-01/audit.mjs
& 'C:\Users\ethan\.t3\scratch\2026-10-31-review-this-proposal-critically-against-c96c5e5c\.venv\Scripts\python.exe' 'research/reports/neuron-reader-graph-audit-2026-11-01/check-complete-source.py' --source-dir 'C:\Users\ethan\.t3\scratch\2026-10-31-review-this-proposal-critically-against-c96c5e5c\sources\shiu_model'
```

Both scripts contain assertions. The second uses already-installed pyarrow, streams batches of 65,536 rows and installs nothing. Its environment and complete data currently live outside the repository; hashes are recorded, but reproducing it elsewhere requires those same files and a pyarrow environment. The first reports an RSS snapshot, not measured peak RSS. No core-math change warranted a new full regression run.

- The first exploratory KC query used exact equality on `known_nt` and returned zero acetylcholine labels. Inspection showed comma-separated transmitter/peptide lists; the preserved final audit parses those lists and finds all 5,177. No negative biological conclusion was drawn from the initial zero.
- The first script's comment calling the cached connection table “unthresholded” was mistaken. Its preserved result contains only filtered connections. The separate complete-source check establishes the missing-edge counts and exact retained-set agreement; the first result alone cannot do so.
- A recursive scratch-directory listing unnecessarily traversed a vendored environment and produced excessive output. Follow-up inspection was restricted to `sources/`.
- An environment probe found pyarrow installed but NumPy absent. The complete-source check uses pyarrow and the standard library; no installation or full-table materialization was needed.

[Reader design](../../../documentation/design/neural-learning/neuron-reader.md) · [Previous build and its limits](../neuron-reader-build-2026-10-31/README.md) · [Dated journal](../../journal/experiments/2026-11-01-neuron-reader-graph-audit.md)
