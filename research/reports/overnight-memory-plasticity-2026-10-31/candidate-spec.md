# Candidate specification: local-gated-v1

2026-10-31. Fixture candidate only. Actual training still needs the eye test and the researcher's memory-rule approval. Code: [local-gated-memory.mjs](../../../.codebase/src/neural-learning/local-gated-memory.mjs). Assay: [acceptance-plan.md](acceptance-plan.md). This file states what each part is based on. Results are in [loop-log.md](loop-log.md).

## The rule in plain words

1. A Kenyon cell (KC) is eligible only if its own activity is above a threshold. A short trace keeps eligibility alive for a moment after the image.
2. If the compartment's dopamine neuron (DAN) fires above rest while the KC is eligible, the KC-to-MBON gain falls toward 0.2.
3. If the DAN is pushed below rest while the KC is eligible, the gain rises toward 1. It cannot pass 1.
4. If the KC is not eligible, nothing changes, whatever the DAN does.

## Three levels of support, kept apart

| Claim | Level | Support |
|---|---|---|
| Value is approach side minus avoid side | Engineering convention | Existing readout in `readAlphaLobeMBON`; matches the opposing-valence logic in Li et al. 2020 Results: PPL1 "generally convey punishment", PAM "generally convey reward" |
| Active KC + DAN above rest weakens the KC-to-MBON synapse | Measured in several compartments, other protocols | Handler 2019: forward pairing depresses γ4 (also γ2, γ5 reversible), needs DopR1 |
| Active KC + DAN **suppressed** strengthens | **Fitted model, not a measured synaptic result** | Huang 2024, Computational model section: "KC activation coinciding with DAN activation or suppression respectively weakens or strengthens". The fits use 86 spike-rate measurements. I did not read a direct KC-to-MBON weight measurement, or Eq. 5.20 itself |
| Reward suppresses γ2 DAN (PPL103 route) | Measured | Cohn 2015: sucrose "inhibited the γ2 and γ3 DANs". Huang 2024: "sucrose-intake decreased spiking in PPL1-γ1pedc, -γ2α′1, -α′2α2 and -α3" |
| Punishment suppresses γ4 DAN (PAM08 route) | Measured. Added after dev run 1 (addendum v1.3) | Cohn 2015: shock "inhibited the γ4 and γ5 DANs". The first version of this plan wrongly said no evidence existed |
| Inactive KC is untouched by a pulse | **Engineering choice that conflicts with measured results** | Against: Cohn 2015, "robust potentiation induced by activation of DANs alone", odor-independent; also Gkanias's equation and Berry 2012. Partly for: Handler 2019, brief independent episodes "insufficient to overwrite". This choice is what gives the candidate its retention at `q = 0`, so its main strength rests on an unresolved biological question. Real forgetting is left out, so retention here is not biological retention |
| Threshold `theta`, trace `tauE`, `eta`, `gMin`, DAN rest and dip size | Engineering choices [no source] | Manoim gives no kinetics. Handler's windows are in seconds (−1.2 s potentiation, 0 and 0.5 s depression); model time units here are not seconds |
| `gMax = 1` | Engineering choice | Handler's text does not say whether potentiation passes naive level; Berry 2018 "restores". Chosen so as not to claim more |

Rejected alternatives:

1. **Handler's backward-pairing potentiation as the recovery route.** It is the best measured two-way evidence and it is in the right compartments. But it needs dopamine **before** KC activity. Plan section 4 delivers the pulse during the chosen image, which is forward timing. The next image after a pulse would receive backward credit even though that image did not earn the pulse. Using it would attach feedback to the wrong choice.
2. **Passive decay (restart plan section 5, "slow recovery").** It clears floors but erases A with exposure, with no source for the rates. Kept as an untested alternative.
3. **Manoim lateral suppression.** Causal in γ KCs, and the most direct support for protecting neighbours. But no kinetics are given, the activation in the experiment was optogenetic, and within KCg-d this graph has only 177 KC-to-KC synapses at its 5-synapse floor. Not added unless a named failure asks for it.
4. **Above-baseline potentiation (`gMax` above 1).** Would change reachable states, but no read source supports it on this route.

## Six components

### 1. Visual pathway and mapping: **route chosen, physiology missing**

- Inputs and outputs: released KC, MBON and DAN identities. Output: edge mask.
- State: none.
- Evidence: [anatomy/visual-pathway.md](anatomy/visual-pathway.md). Primary route: KCg-d, γ2 (PPL103 to MBON32/35) as approach side, γ4 (PAM08 to MBON05) as avoid side.
- Check: static count, [visual-route-output.json](anatomy/visual-route-output.json).
- Limits: compartment names for most types came from a tool summary of Li et al. 2020, not verbatim text (only MBON14/PPL106 = α3 is verbatim). The figure supplement that lists them was not read. MBON32/35 valence is unknown ("no experimental data yet exists", Li 2020, on atypical MBONs). No mask code exists for this route yet.
- **Exact missing facts:** real-graph resting rates of PPL103 and PAM08; whether γ2 is really the approach side on this route.

### 2. Eligibility and timing: **software passed; timing is not biological**

- Inputs: KC activity above rest, `dt`. Output: trace `e` in [0,1].
- State: `traces` (one per edge), `time`.
- Assumptions: threshold and trace time constant are engineering choices. Model time is abstract.
- Checks: S2, S3, S4 in [local-gated-memory.test.mjs](../../../.codebase/tests/neural-learning/local-gated-memory.test.mjs). Delay changes update size only. Stale trace after the declared gap moves a gain under 1e-3. Shared KCs with nonzero eligibility are **not** protected: a shared KC above threshold gets the full update.
- Limit: `theta` protects only KCs below it. Real graph KC activity may be mostly weak and shared.

### 3. Modulatory signal: **fixture assumption; no graph route**

- Inputs: teacher's reward, punishment or nothing. Output: DAN rates. The teacher never sees gains.
- Trigger and direction: reward raises the γ4-side DAN and lowers the γ2-side DAN. Punishment does the reverse. Reciprocal responses measured by Cohn 2015 as presynaptic calcium; sign of the resulting KC-MBON change from Huang's fitted model.
- Compartment: Cohn's measurements are γ2 to γ5, olfactory context, and do not include visual KCs.
- Limits: the fixture sets the dip directly. In the graph there is no strong direct route between these DAN groups (PAM to PPL1 direct: only PAM09 to PPL101, excitatory, 27 synapses). Cohn reports that activating 58E02 DANs "evoked robust inhibition of the γ2 DAN", so a functional route exists in the fly, and it may or may not exist in the graph model. Otherwise the real test needs a declared negative current. That is an interface assumption. Fast edge signs are unchanged. Rates in `SparseTrainer` cannot go below zero, so a dip needs the DAN to rest above zero.
- **Exact missing fact:** PPL103 and PAM08 resting rates in the real model. If about zero, this rule cannot restore gains on the graph.

### 4. Persistent plasticity: see [loop-log.md](loop-log.md)

- Inputs: eligibility, DAN deviation. Output: gains in [0.2, 1].
- State: `gains`, one per plastic edge.
- Assumptions: no slow state yet. Added only if a named residual failure justifies it.
- Checks: S1, G1 to G6.
- Reachable states: all of [0.2, 1], and nothing above 1. This is the fact the eye test's usable-strength check needs (F04).

### 5. Readout and behavioural assay: **assay valid after one repair**

- Inputs: gains, image. Output: value, softmax choice from the learner's own scores.
- State: none. Fixed readout, never fitted.
- Checks: [validity-v2](validity-v2/validity.json). Both old rules failed as predicted and the positive control passed.
- Limits: no separate retrieval stage. No MBON-to-DAN feedback in the fixture, so F09 is not tested. The surrogate earlier failed to reproduce the real graph's collapse, so the fixture says little about the real graph's dynamics.

### 6. Persistence and audit: **implemented for the candidate; pending-receipt is a contract**

- Implemented: `snapshot` holds gains, traces, time and pulse count. `restore` validates everything before changing anything. Checks S5 to S9 in [memory-assay-local-gated.test.mjs](../../../.codebase/tests/neural-learning/memory-assay-local-gated.test.mjs).
- **Contract only, for implementation once a candidate survives the real-graph test:**
  1. Order on each feedback event: log the unaided ranking, append a pending receipt containing the certificate hash and the memory state hash before the pulse, deliver the pulse, write memory plus receipt atomically, then acknowledge.
  2. Interruption before the append: no event happened. Restart replays the trial from the last published state.
  3. Interruption after the append and before publication: on resume, the pending receipt is recognised. The pulse is applied exactly once, from the saved pre-pulse state, using the same frames. The memory state hash must match the one in the receipt.
  4. Exactly-once: a receipt whose post-state is already published is never reapplied.
  5. Unknown produces no receipt and no event.
  6. Trace and time state are part of memory state. A restart that loses them changes later results, so they must be in the hash.

## Dated result disposition, 2026-10-31 continuation

The original "no slow state yet" description above refers to family 1. The subsequently tested family-2 rule is [local-slow-memory.mjs](../../../.codebase/src/neural-learning/local-slow-memory.mjs), specified in acceptance addendum v1.4. It snapshots/validates slow state as well as fast gains, eligibility, time and pulse count. Both rho settings failed joint acquisition/retention/reversal, and neither is selected.

Family 1 with the reciprocal dip passed 11/28 declared cells, including its disjoint no-background retention/reversal case. It still failed shared-conflict retention and other requirements. No candidate passed every applicable gate, so no held-out selection, sensitivity campaign or real-graph memory test was run.

The [readout-capacity diagnostic](readout-capacity-verified.json) additionally rules out joint G4/G6 in two original required cells for any static readout with the same gain range. SeparateTable's earlier success did not check that architecture. The original validity results remain numeric passes of their limited checks; the assay is insufficient for READY. [Methodology review](methodology-review.md) also identifies missing persisted per-trial scores/certificates. Snapshot round trips are verified software properties, not independent audit of teaching events or evidence of biological retention.

Selected source rechecks confirm some gamma-route names in Li 2020 primary text, without settling atypical MBON valence, subtype crosswalk or relevant resting physiology. No visual receiver mask or suppression pathway was implemented. All six components therefore have explicit, bounded dispositions, with several biological and evidence requirements unresolved. See [the final report](MORNING-REPORT.md).
