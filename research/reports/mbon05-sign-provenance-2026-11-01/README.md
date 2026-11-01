# MBON05 sign provenance, 2026-11-01

**The hemispheric sign difference comes from transmitter-label precedence and fallback, not a measured left/right polarity difference.** The left Codex neuron label is empty, so the original builder resolves it from weighted connection-label predictions as ACH. The right label explicitly says GLUT. The stored graph uses ACH→+1 and GLUT→−1. Curated glutamate annotations are not consulted by that builder path.

## Exact trace

[Static receipt and every affected connection](result.json), reproduced by [trace.py](trace.py), reuse only the original pure aggregation/transmitter/sign functions from the licensed source archive. No upstream code or graph is changed.

1. **Left soma:** root `720575940621164720`, graph index 46203. Codex `neurons.csv.gz` has an empty `nt_type` and score 0.0. The builder aggregates neuropil rows by neuron pair, uses the largest-contributing row's predicted transmitter, then weights those labels by summed synapse count. Its tally is ACH 1669, GLUT 803, DA 332, GABA 222. ACH wins. All 112 outgoing connections are positive in the stored graph.
2. **Right soma:** root `720575940630496374`, index 95882. Its explicit Codex label GLUT is retained without fallback. All 112 outgoing connections are negative. Both root/type joins match MBON05 in the Codex primary-type table and v2.1 annotations. Soma sides must not be confused with the contralateral dendritic receiving sides.
3. **Curated evidence:** both v2.1 rows say `known_nt=glutamate`, source `Aso et al. 2014`. The left row's separate `top_nt=acetylcholine` is a prediction, not the label directly read by the builder. Its prediction/confidence fields are from another annotation product and must not be equated numerically with Codex scores. The reader manifest preserves these differences but does not override graph signs.
4. **Runtime:** `SparseTrainer` normalizes positive magnitudes, multiplies them by `graph.sign` and preserves that multiplier in `setMagnitude`/`refreshSignedMagnitude`. The sparse accumulator consumes the resulting signed array. [Three-node runtime check](check-runtime.mjs), [receipt](runtime-result.json), verifies constructor/update/refresh behavior without calling `forward` or constructing the real graph model. Positive memory gains cannot repair an inherited sign mismatch by themselves.

The result records all 224 outgoing connections, targets, counts, classes and source signs. Both cells contact MBONs and named DAN populations, so the assumption can affect recurrent and teaching routes, not just a scalar readout. These anatomical paths do not establish their response, receptor, teaching effect or impact on learning. The static comparison asserts each aggregated pair and weight matches the actual graph.

## Primary evidence and limits

[Aso et al. 2014 anatomy](https://elifesciences.org/articles/04577), Table 1, Figure 9 legend and Figure 17 text/legend, identifies MBON-05 as MBON-γ4>γ1γ2 in the glutamatergic group. Transmitter assignments are based on terminal immunoreactivity; the within-MB feedforward projections are anatomical evidence. This is cell-type evidence transferred onto annotated FlyWire roots, not measurements in these two reconstructed neurons or a receptor-specific polarity table.

[Shiu et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11446845/), Methods on transmitter predictions/robustness and modelling limitations, explicitly treats inhibitory glutamate as an assumption, acknowledges possible excitation and omits receptor dynamics. Its published LIF model is not this repository's rate implementation. The current source rule reproduces the artifact, but reproduction does not establish biological correctness.

[Aso et al. 2023](https://elifesciences.org/articles/85756), Figure 4 text/legend, supplies physiological inhibition from MBON-α1 to some UpWiNs. That is MBON07, not evidence for every MBON05 target. No receptor-resolved MBON05 output table was established in the sections inspected here. None of these observations selects a chess preference coefficient.

Coverage: targeted source code, exact annotation/data rows and selected paper text/table/figure legends. No figure panels, raw recordings or receptor-expression dataset were independently inspected. This is not an exhaustive search for MBON05 physiology.

## Smallest prospective test, not launched

[Proposed variant](proposed-variant.json) is a concrete unapplied overlay: preserve the parent graph, roots, topology, counts and all other signs; change left MBON05's resolved transmitter ACH→GLUT and its 112 outgoing signs +1→−1. This tests curated type identity **under the baseline inhibitory-glutamate approximation**. It is not a validated universal receptor rule. The original graph remains the reference condition.

The gate-relevant question is whether the selected feedback/memory mechanism's association, retention and reversal conclusions depend on the inherited left-cell fallback. A later paired protocol must pin both graph/model/reader/memory identities, use the same experiences, initialization, pacing and verified teaching, and include informative feedback with its matched absent, shuffled/yoked and disabled-plasticity controls. Record each cell's activity and DAN/MBON route responses, memory state and criterion-specific outcomes. Never choose the sign using held-out chess performance or replace old failures with the new arm. Existing gain/polarity/feedback gates require their own resolution; this proposal changes none.

The existing reader's released-graph manifest cannot silently accept the proposed graph: new hashes and an explicit compatibility declaration are required. No mechanism owned by the separate memory session was edited, no production coefficient chosen and no experiment authorized by this audit. Current graph/sign conventions remain intact.

## Reproduce

Run from the repository root with the existing environment. Existing receipts are refused; preserve them and use a new sibling directory for repeats.

```powershell
& 'C:\Users\ethan\.venv-class\Scripts\python.exe' 'research/reports/mbon05-sign-provenance-2026-11-01/trace.py'
node --max-old-space-size=256 research/reports/mbon05-sign-provenance-2026-11-01/check-runtime.mjs
```

Assertions check source hashes before/after, original-code manifest hashes, root identities, complete pair/weight joins and sign reproduction. No packages were installed. No propagation or core-math change occurred; a full regression was not rerun.

Provenance clarification: the earlier audit established the opposite signs but did not distinguish an empty Codex label resolved by fallback from an explicit neuron label. The exact path above resolves that uncertainty. An early verbose target listing was truncated in tool output; the complete receipt retains all connections and the commands now emit compact summaries.

[Previous graph audit](../neuron-reader-graph-audit-2026-11-01/README.md) · [Reader design](../../../documentation/design/neural-learning/neuron-reader.md) · [Dated journal](../../journal/experiments/2026-11-01-mbon05-sign-provenance.md)
