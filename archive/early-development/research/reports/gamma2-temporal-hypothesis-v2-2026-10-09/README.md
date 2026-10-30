# Temporal plasticity hypothesis: direction and specificity pass; puzzle choice fails

2026-10-09. Training was explicitly authorized solely to check the hypothesis. This is one fixed-seed, two-lesson mechanism pilot, not a solved plasticity problem or trained chess model.

The informative condition depressed directly stimulated mapped gains after verified Qe6 failure (mean change -0.0215678) and potentiated them after verified Qh7 success (+0.0101386). Fully swapped feedback reversed both directions (+0.0100565 and -0.0215255). Disabled plasticity changed no persistent state. The absent condition retains endogenous local activity and therefore is not required to have exactly zero change.

| Condition | Change in Qh7-minus-Qe6 score margin | Final all-legal choice |
|---|---:|---|
| Informative | +0.0003000074 | Qg8, verified failure |
| Fully swapped | -0.0003044936 | Qg8, verified failure |
| Absent feedback | +0.0000001732 | Qg8, verified failure |
| Disabled plasticity | 0 | Qg8, verified failure |

Both predefined local direction and pair-margin specificity gates pass. Useful all-legal acquisition fails. No retention, coexistence, two-direction contingency reversal, disjoint transfer or biological validation was measured. A pair margin cannot substitute for the correct move beating every alternative.

The mechanism uses explicitly modeled local KC credit and two dopamine-response components with bounded engineering gains on 122 existing positive gamma-KC-to-MBON12 edges. It preserves topology, signs and all nonplastic parameters. Labels select external stimulus timing, not synaptic deltas. No pretrained weights, external chess search or permanent weight freezing is used. The receptor/compartment mask, time calibration, normalization, neural reset between lessons and read-only measurement intervention remain approximations.

The separate auditor authenticates archived source and receipt hashes, independently rechecks certificates and plan reconstruction, verifies disabled-state isolation and replays all 152 local updates from saved rates. Since explicit fixed-reference arrays were omitted, it reconstructs one pinned unstimulated model reference after training ends and authenticates the memory identity. Numeric replay shares the declared integrator; it does not independently validate that integrator's mathematics or biology. Neural ranking arithmetic is checked against stored readout arrays; the auditor does not replay all trained graph responses.

Observed training peak RSS: 189.45 MiB; elapsed time: 330.41 s. Heap 256 MiB, CPU duty 0.5, RSS ceiling 768 MiB and free-memory floor 256 MiB. Pacing is not an OS CPU cap. No live interruption recovery was exercised; mechanical session-prefix recovery tests passed, and the complete software suite passed 214/214.

Exact commands:

```powershell
node --max-old-space-size=256 research/reports/plasticity-timing-candidate-2026-10-09/run-temporal-hypothesis.mjs --protocol research/data/gamma2-temporal-hypothesis-v2/protocol.json --cpu-duty 0.5 --out runs/gamma2-temporal-hypothesis-v2
node --max-old-space-size=256 research/reports/plasticity-timing-candidate-2026-10-09/audit-temporal-hypothesis.mjs runs/gamma2-temporal-hypothesis-v2 --cpu-duty 0.5
```

[Protocol](../../data/gamma2-temporal-hypothesis-v2/protocol.json), [raw result](../../../runs/gamma2-temporal-hypothesis-v2/result.json), [audit](../../../runs/gamma2-temporal-hypothesis-v2/audit.json), [preserved auditor](../../../runs/gamma2-temporal-hypothesis-v2/auditor.mjs), [candidate development and source evidence](../plasticity-timing-candidate-2026-10-09/README.md).

The initial v1 launch failed before teaching because readMBON received means rather than population arrays. Its protocol and failed run/source snapshots are preserved. V2 corrects that interface only; an assertion verified all scientific settings and gates unchanged. Checkpoint filename reuse and a reversed draft readout sign were also corrected before launch. The reference-recording omission was discovered during v2 and documented before auditing. Neither the hypothesis nor gates were tuned to these results.

Next question: can this same mechanism retain one learned association while another is taught and reverse both directions under independently certified changed consequences? Those tests must be registered separately and preserve these results. Useful acquisition and unfamiliar/counterfactual transfer remain required before claiming the full objective achieved.
