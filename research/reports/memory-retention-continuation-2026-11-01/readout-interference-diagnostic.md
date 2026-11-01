# Is the reversal failure stored-memory interference or a readout artifact?

2026-11-01, prospective diagnostic specification. The fixed recovered experiment continues unchanged. Its seed-4102 informative arm loses an old association after reversal; a pooled median pass cannot close the actual goal.

## Competing explanations

1. Shared input contributions make the required margins incompatible. A static direct-input surrogate can check this restricted explanation, not prove full recurrent-network incapacity.
2. Learning erases old contrast although the input/readout could retain both associations. Feasible surrogate margins would keep this explanation open and weaken a blanket claim of insufficient input capacity.
3. The fixed naive resting response creates a readout offset. The current score subtracts the original rest even after plasticity changes the circuit. For a common raw-response shift `delta`, the normalized margin changes by `0.5*delta*(1/n_bad - 1/n_good)`. Unequal naive responses can therefore turn a common offset into a ranking change. No actual later resting responses were saved, so this remains unmeasured.

## First check: static direct-input surrogate

Read saved exact KC stimulation codes and the existing sparse graph; run no neural dynamics or learning. Sum the actual initialized positive KC-to-MBON05/07 magnitudes, averaged across each type's measured cells. Use the parent's row-normalization and Float32 initialization. Treat each KC/compartment efficacy as a bounded variable in [.2,1]. For each image, normalize its incremental direct response by its own naive direct response, matching the algebra of the current relative-response policy.

The normalized margin is `0.5*(r_bad/n_bad - r_good/n_good)`, linear in these bounded gains. Reuse the existing `constrainedBoxBound` instrument to bound reversed A while an old B retains at least .8 of its measured pre-reversal margin. Compare the bound with the original .15 reversal mark. The per-item .8 constraint is an explanatory diagnostic, not a replacement for the frozen median R3 gate.

This surrogate omits recurrent pathways, saturation, tonic-baseline changes and input-dependent KC activity. Its certificate applies only to this surrogate. A compatible result is not a demonstrated learned state; an incompatible result is not a proof about the real graph. Export no fitted gains or learner checkpoint. Report all available informative seeds/items and exact source identities, including incomplete population coverage.

## Next decisive graph check, after the serial experiment finishes

Named blocking question: **Does the lost seed-4102 association remain lost when the same stored memory is read against its current resting response?** This must be answered before choosing a decoder repair versus a storage/input repair.

Use the same frozen development readout, exact saved input codes and the seed-4102 Delay/Rev snapshots. Measure tonic-only response plus both candidates for all four associations, with plasticity off and persistent-state/parameter hashes unchanged. This includes both damaged old associations rather than selecting only the one that changed sign. Exactly 27 graph passes (nine naive calibration and nine per saved phase), eight recurrent steps each, duty .5, at most 180 seconds, RSS 2048 MiB and free memory 256 MiB. This is one bounded diagnostic, not a sequence of untrained runs. Reproduce all eight original phase/item margins to absolute tolerance 1e-10 before interpreting adjusted scores. Keep original and current-rest scoring separate. If the ranking recovers without a memory change, the next informative experiment compares the two fixed readout conditions at matched feedback exposure. If it does not, preserve the failed contrast and test a source-supported storage/input change with informative and matched controls. No new learning condition is selected or launched by this document.

Pre-launch clarification: expanding from two selected pairs to all four adds only twelve passes and prevents a selective explanation of one damaged association. This scope was fixed before any graph data from this diagnostic. It may start only after the source run publishes a complete 24-arm summary and its independent replay audit passes with matching record/summary hashes; early invocation must fail before graph loading or output-directory creation.
