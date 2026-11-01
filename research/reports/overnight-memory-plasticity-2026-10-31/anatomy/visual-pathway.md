# Visual pathway: which memory compartments the eyes can reach

2026-10-31. Static read-only count, no simulation. Script: [visual-route.py](visual-route.py). Raw output: [visual-route-output.json](visual-route-output.json). Graph file `.cache/full.npz`, SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`. Annotations: `flywire-annotations-v2.1.0.tsv`, FlyWire consolidated cell types (as in [restart wiring count](../../restart-wiring-2026-10-30/wiring-count-output.txt)).

## What each kind of evidence can say

| Level | Meaning here |
|---|---|
| Verified anatomy | Edge and synapse counts in this graph. All KC-to-MBON visual edges are positive. Edges below 5 synapses are absent from the graph (minimum `syn_count` is 5). |
| Compartment name | Not in the graph. Taken from released type names. Checked against Li et al., eLife 2020 (*The connectome of the adult Drosophila mushroom body provides insights into function*, read to character 118,254 of 536,111). **Verbatim only for MBON14 and PPL106 (α3)**, plus the population statement that PPL1 innervates "the α' lobe, α lobe compartments 2 and 3, and γ lobe compartments 1 and 2". The other names came from a tool's summary of the paper, not verbatim text, and Figure 6 supplement 1 was not read. So they stay **unverified**. No synapse coordinates were used. |
| Receptor evidence | Handler 2019 (DopR1 depression, DopR2 potentiation, γ4 mainly) and Manoim 2022 (mAChR-B in γ KCs). Neither was measured on visual KCs. |
| Physiology | Huang 2024 (voltage imaging of five PPL1 DAN types). Handler 2019 (γ2, γ4, γ5 KC-MBON responses). All olfactory or direct-KC-stimulation protocols. No visual-KC plasticity measurement was found. |
| Missing | Real-graph DAN resting rates, MBON32/MBON35 valence, any graph route for a reward-driven PPL1 dip. |

## Visual KC output (verified anatomy)

| KC type | Cells | Top MBON targets (synapses, share of visual KC output) |
|---|---|---|
| KCg-d | 295 | MBON05 1632 (30%), MBON27 1461 (27%), MBON09 1115 (20%), MBON32 407 (7%), MBON11 391 (7%), MBON01 257 (5%), MBON35 132 (2%) |
| KCab-p | 128 | MBON07 1688 (45%), MBON06 1569 (41%), MBON14 215 (6%), MBON02 123 (3%) |

## Candidate compartments on the eye route

Each row pairs a DAN with an MBON by shared compartment name. "DAN to MBON" is a second, independent anatomical check that the pairing is real in this graph.

| Compartment (by name) | KC | MBON | DAN | DAN to MBON syn | Source for plasticity direction |
|---|---|---|---|---|---|
| γ2 | KCg-d | MBON32, MBON35 | PPL103 (2 cells) | 264, 228 | Handler: γ2 reversible with timing. Huang: PPL1-γ2α′1 spiking rises with shock and falls with sucrose |
| γ4 | KCg-d | MBON05 | PAM08 (46 cells) | 835 | Handler: γ4 forward pairing depresses, backward potentiates, DopR1/DopR2 |
| γ5 | KCg-d | MBON27 | PAM01 (37 cells) | 53 (weak) | Handler: γ5 reversible with timing |
| γ3 | KCg-d | MBON09 | PAM12 (23 cells) | 403 | None read in this run |
| α3 | KCab-p | MBON14 | PPL106 (2 cells) | 465 | Huang: PPL1-α3 falls with sucrose; model strengthening at this module |
| α1 | KCab-p | MBON07 | PAM11 (16 cells) | 1498 | Aso and Rubin 2016 (retention), Ichinose 2015 (long-term memory). No read evidence for two-way change |
| β1 | KCab-p | MBON06 | PAM09, PAM10 | 181, 1050 | None read in this run |

## Decision: primary route for the later real-graph test

**KCg-d, with γ2 (PPL103 to MBON32/MBON35) as the approach side and γ4 (PAM08 to MBON05) as the avoid side.** Reasons:

1. KCg-d is the larger visual KC group (295 against 128).
2. It is the only route where both sides have direct bidirectional-timing evidence (Handler, γ2 and γ4) and the punishment-side DAN has measured reward suppression (Huang, γ2α′1).
3. Manoim's lateral protection is causal in γ KCs and not in αβ KCs, so it can only apply on this route.

Rejected alternative: KCab-p with α3/α1. α3 has dip evidence, but only 6% of KCab-p output, and α1 has no two-way evidence.

## Known weaknesses of this choice

1. **Unbalanced sides.** KCg-d gives MBON05 1632 synapses and MBON32 + MBON35 only 539. A fixed approach-minus-avoid readout may be dominated by the avoid side. Fitting weights would break the no-fitted-readout rule. The real-graph test must report each side separately.
2. **Valence unverified.** Treating γ2 as approach and γ4 as avoid follows the plasticity logic and Handler's result that PAM forward pairing raises attraction. MBON32 and MBON35 valence was not found. A wrong side means the readout sign is wrong for that side.
3. **Dopamine anatomy is thin at this threshold.** Direct DAN-to-KCg-d edges total only 44 synapses (PPL103 29, PAM08 15) because of the 5-synapse floor. The update rule therefore cannot be gated by per-KC DAN wiring here; it must use compartment-level DAN rate, as existing code does.
4. **KC-to-KC anatomy is thin too.** Within KCg-d the graph has only 177 KC-to-KC synapses (0.1 presynaptic KCg-d partners per cell), against Manoim's hemibrain figure of about 190 partners per γ KC. Most lateral KC contacts fall below the floor. So a graph-wired lateral protection is not available on this route, and any mAChR-B term would be an abstraction.
5. **No direct route for the reward dip.** Direct PAM-to-PPL1 edges: only PAM09 to PPL101, excitatory, 27 synapses. Inhibitory MB inputs to PPL103: MBON10 122, MBON30 32, MBON31 17, MBON32 14, MBON05 5. Biological reward suppression of PPL1 may use a sensory route that this model does not carry. So a reward dip on the graph would need a declared negative current on PPL103. It would be an interface assumption and not an emergent signal.
6. **The dip may have no room.** In `SparseTrainer`, `act = z > 0 ? s*tanh(z/s) : 0`, so rates cannot go below zero. If PPL103 rests near 0 in the real model, suppression has no effect and this candidate cannot restore gains. **This is the first thing the real-graph test must measure.**

## Sign rule

Fast KC-to-MBON signs stay positive. DAN modulation here is a separate modulatory quantity, as in existing code. A muscarinic pathway, if ever added, is a modulatory term and never a sign flip of KC-to-KC edges. Transmitter sign says nothing about mAChR-B kinetics, and Manoim reports no kinetics (only a 2 s ACh puff and 30 Hz imaging).

## Dated source-coverage addendum, 2026-10-31 continuation

Selected direct Li2020 primary passages now corroborate MBON32 gamma2 (network-hierarchy text), PPL103 gamma2alpha-prime1 (Figure36/37 legends and body), and some PAM08 subtypes' gamma4 designation. [Saved access](../source-recheck.json). This is narrower than verifying every type/compartment pair or its FlyWire crosswalk; the original unverified rows remain labeled accordingly. Figure6 supplement1 was still not inspected.

Li's atypical-MBON section states the absence of functional/physiological data at publication. This is not a claim that no later physiology exists; a current exhaustive survey was not performed. MBON32/35 output polarity, actual DAN resting rates and the implemented suppression route remain unresolved. The synthetic receiver is not a verified functional implementation of these cells. [Final disposition](../MORNING-REPORT.md).
