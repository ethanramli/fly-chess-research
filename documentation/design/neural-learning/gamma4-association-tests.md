# Gamma4 association and reversal tests: V1 and V2 failed

Protocol frozen before the first run, 2026-09-30. [Machine-readable specification](../../../archive/early-development/research/data/association-validation-v1/protocol.json). The existing plasticity equation and its rates are unchanged. This experiment may fail; failures are retained and do not trigger automatic rate or trial-count tuning.

## Discussion takeaway, 2026-09-30

2026-10-05 diagnostic addendum: [reproducible observational analysis](../../../archive/early-development/research/reports/reversal-diagnostic-2026-10-05/README.md) decomposes reversal response changes and records each adjacent trial response. All contingent seeds show slight further old-cue depression rather than aggregate recovery; three V2 margins remain below the fixed decoder threshold. Counts alone do not explain success: one seed succeeds and another fails with three new-target rewards. This is post-hoc diagnosis, not a gate change or mechanism validation. Both original failures remain preserved; the exposure-controlled mechanism comparison is still proposed.

The researcher requested that the learning result and its limits be documented. The supported claim is basic association in the simplified simulation: with both options sampled, feedback strengthened rewarded preference in 6/6 V2 runs; memory erasure removed the changes and restoration recovered them, while nonlearning controls stayed fixed. Four runs already chose the initial target before training, so this represents two corrected choices and four strengthened preferences.

The complete acceptance test failed because only 3/6 runs chose the new target after reward reversal. The next research checkpoint is to explain incomplete revision of an old association when it stops earning reward, distinguish inadequate experience from missing dynamics, and specify an evidence-based experiment. No new forgetting, punishment or reward-omission mechanism has been selected or authorized by this documentation request. Reliable adaptation, biological validation and chess transfer remain unresolved; the puzzle receiver still records feedback without learning.

## Claim and task

Test whether experiences followed by informative stimulation produce a persistent change in a fixed software choice policy reading the full graph's gamma4 MBON activity. This extends the prior [timing experiment](gamma4-plasticity.md) to a switch in the rewarded option with the cue-to-feedback timing held constant.

Each seed draws two disjoint synthetic 52-KC cue ensembles. A fixed decoder prefers the cue with lower MBON response. Training uses 50% uniform exploration and 50% that preference; evaluation uses preference alone. The teacher sees the committed choice and supplies a stimulation pulse only when it matches the rewarded cue. Trial outcomes never enter the choice decoder or network input. Diagnostic evaluation of both candidates does not register learning eligibility; only the selected cue does.

Six cue seeds are specified in advance: 1, 17, 47, 89, 131, 211. Initial target is A for alternating seeds and B for the others, counterbalancing cue identity. Each condition starts from the same naive memory. Four acquisition trials reward the initial target; twelve reversal trials reward the other target. Cue-before-PAM delay remains 0.5 model units in both phases. There is no backward pairing, injected negative reward, invented punishment cell or optimizer.

The [Handler et al. primary study](https://pubmed.ncbi.nlm.nih.gov/31230716/) supports the timing-sensitive plasticity motivation. It does not establish this software decoder, exploration schedule, reduced equation or ordinary contingency-reversal performance. Direct stimulation, the restart-per-pulse approximation and persistent no-decay gains retain the limitations in the mechanism note. These are independent draws of synthetic cues within one connectome, not independently sampled flies.

## Controls and causal checks

- Contingent: pulse only after a correct committed choice.
- No feedback: identical cue pool, trial count and exploration draws; no pulse.
- Shuffled feedback: permute the contingent run's actual delivered pulse sequence separately within each phase. Pulse counts exactly match the contingent condition; assignment no longer depends on this run's choice. With short sequences the permutation may contain accidental informative pairings; record them rather than assuming they cannot occur.
- Plasticity disabled: correct-choice pulses still run through the network, with efficacy and trace updates disabled.

Probe baseline, acquisition, retention, reversal, memory erasure and restoration. Probes cannot modify learning traces or gains. Retention advances model time by 60 units; because gains have no forgetting process this tests stored state, not biological memory lifetime. Memory erasure must recover the baseline responses. Loading the saved learned state must recover the final responses. Graph and nonplastic parameter hashes must stay unchanged.

The frozen acceptance gates require: positive acquisition effects across seeds and correct final acquisition choices; positive adaptation to the reversed contingency and correct final reversed choices; a reversal effect greater than the matched shuffled-feedback effect; exact persistence/restoration; erasure of the change after memory reset; unchanged no-feedback/disabled controls; matched shuffled pulse counts; preserved wiring. Effect is a target-signed neural response margin, not an invented neural probability. Exact one-sided sign tests across seeds use alpha 0.05 and report ties. Every gate must pass; no single p-value substitutes for controls or causality. The small seed panel gives a bounded implementation experiment, not a population estimate or independent biological prediction.

Train/validation/test chess data are not used here. New cue seeds test repeatability of the conditioning mechanism, not transfer of a learned association to an unrelated cue or novel chess position.

## Implementation and commands

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-learning.mjs `
  --out runs/association-validation-001 --cpu-duty 0.5
```

`--max-trials N` intentionally stops after N additional training trials. Resume from a published `checkpoint-XXXXX/state.json` into a new directory, preserving the protocol and duty. Checkpoints contain the active phase/trial cursor, gains/traces, committed choices and feedback, probe results and completed conditions. Publishing each checkpoint directory by rename makes complete trial state visible atomically. A interrupted trial is replayed from the previous checkpoint; no partial feedback event is published.

The identity pins graph, annotation, protocol, mapping and source hashes. The runner loads one sparse graph and model and processes conditions serially. RSS/free-memory guards and duty pacing match the existing experiment requirements. Raw condition histories and every checkpoint are retained, including failed gates. `report.json` separates this invocation's resource measurements from any prior invocation used for resume.

At most two small response vectors are cached within a condition. Reuse requires an exact match of every eligible gain under a fixed invariant-checked model, stimulus and deterministic reset-per-pulse kernel; learning traces do not enter the forward kernel. This avoids recomputing identical controls while preserving the measured full-graph response. A gain change invalidates both responses. This is a computational equivalence assumption of the existing pulse model, not a faster biological simulation claim.

## Results

V1 completed: [raw report](../../../archive/early-development/research/reports/association-validation-v1-2026-09-30/report.json), [independent audit](../../../archive/early-development/research/reports/association-validation-v1-2026-09-30/audit.json). The overall acceptance gate **failed**. Acquisition succeeded in 3/6 seeds; seeds 1, 17 and 47 received zero acquisition reward. Their unchanged response is compatible with missing rewarded experience rather than an observed failure to store a rewarded experience. Reversal, informative-feedback comparison, persistence, memory reset/restoration, controls and wiring gates passed. This result is preserved, not overwritten by the follow-up.

V1 measured 139.90 MiB peak RSS, 325.68 elapsed seconds and 171.84 CPU seconds in its final resumed invocation (two initial trials were performed in the documented prefix). Acquisition sign test: 3 positive, 3 tied, p=0.125. Reversal: 6 positive, p=0.015625. Reversal advantage over shuffled feedback: 5 positive, 1 tied, p=0.03125. Final reversed-choice accuracy alone was misleading: even unchanged controls chose the new target in 5/6 seeds because they often retained an initially incorrect preference. The target-signed **change** in response and causal controls are needed alongside accuracy.

The audit found no inconsistencies in decoded choices, teacher labels, delivered stimulation, matched pulse counts or memory ablations. An interrupted two-trial prefix reproduced the uninterrupted scientific state exactly, excluding the checkpoint publication counter.

## Prospectively specified opportunity-control follow-up

[V2 protocol](../../../archive/early-development/research/data/association-validation-v2/protocol.json) was specified after V1 completed and before V2 ran. It uses six **new** seeds (503, 947, 1601, 2357, 3511, 5003). Each phase first samples A and B once in seed-dependent order; subsequent training trials use the same free-choice rule and exploration rate. This sampling order never consults the rewarded target. Frozen probes remain fully greedy, with no sampling overrides. Trial counts, plasticity, stimulation, delay and acceptance thresholds are unchanged. Both controls and shuffled feedback receive the same sampling protocol.

This changes experience coverage and narrows the claim to learning given balanced initial sampling. It cannot rescue V1's original acceptance result or establish that autonomous exploration is adequate. Keeping new seeds and the failed first report avoids selecting successful V1 seeds or rerunning them until acceptance. V2 is a follow-up computational experiment, not a final untouched biological or chess test set.

Run the same runner with `--protocol research/data/association-validation-v2/protocol.json`. Exact V1 source bytes matching its hashes are archived in its report's `sources/` directory before the runner's sampling extension; future reports can be archived with `.codebase/scripts/archive-learning-sources.mjs REPORT_JSON`.

## Observed V2 result and accepted scope

[Raw report](../../../archive/early-development/research/reports/association-validation-v2-2026-09-30/report.json), [independent audit](../../../archive/early-development/research/reports/association-validation-v2-2026-09-30/audit.json). The overall acceptance gate **failed** because final reversal choices were correct in only 3/6 seeds.

| Condition | Initial target chosen before training | Initial target chosen after acquisition | New target chosen after reversal |
|---|---:|---:|---:|
| Contingent feedback | 4/6 | 6/6 | 3/6 |
| No feedback | 4/6 | 4/6 | 2/6 |
| Matched shuffled feedback | 4/6 | 4/6 | 2/6 |
| Plasticity disabled | 4/6 | 4/6 | 2/6 |

Contingent acquisition strengthened the rewarded cue's response preference in all six seeds. Four already preferred the correct cue before training; two changed their choice. This distinction matters: six correct final choices do not mean six initially wrong choices were corrected. Acquisition effects ranged from 0.01298 to 0.01919 response units. All six moved toward the new target during reversal, and all six had a larger reversal effect than the matched shuffled-feedback condition (each sign test p=0.015625). But seeds 1601, 3511 and 5003 **still selected the old target**, so a positive response change did not establish adequate adaptation.

Retention and JSON memory restoration reproduced responses exactly. Memory erasure restored the naive responses exactly in every condition. No-feedback and disabled-plasticity conditions preserved their initial gains and responses. All fixed graph/nonplastic hashes held. The independent audit passed its raw-record checks: choices, teacher outcomes, exploration, actual stimulation, feedback counts, probes and causal ablations were consistent. The software tests passed 29/29.

V2 measured 138.45 MiB peak process RSS, 239.51 elapsed seconds and 136.03 CPU seconds, with the full 134,209-neuron graph. No comparison speedup is claimed. Source archives, protocol hashes and exact commands accompany both reports. V1 and V2 completed 768 training trials across 48 conditions; all original records, including failed gates, are retained.

The supported conclusion is **basic feedback-dependent association in this specified simulation**, using a fixed engineered choice decoder and experimental stimulation. Reversal remains unreliable at the frozen budget, so the full learning validation gate is outstanding. Sign tests here describe synthetic cue replicates and assumptions of this software experiment; they are not estimates across animals. V2 was a prospectively frozen follow-up after inspecting V1, so neither panel establishes an independently predicted biological result or chess transfer.

Next diagnostic: inspect why the old learned response remains preferable in the failed reversals, tracking how many rewarding experiences each option receives and how efficacy responds to reward omission. The rule has no explicit learned expectation or omission-driven recovery process; that is an implementation fact, **not proof that adding a generic negative update is the biologically correct fix**. Any mechanism change needs primary evidence and a new frozen comparison. Do not increase the budget or alter thresholds retrospectively to relabel these runs as successful.

The raw failed cases support this diagnostic: seeds 1601, 3511 and 5003 each received three acquisition rewards but only three, two and two rewards for the new target, respectively. Their old cue's response stayed near its acquired low level: 0.06134→0.06119, 0.06047→0.06035 and 0.06607→0.06596. It did not recover toward its naive level when that cue stopped earning stimulation. These observations establish persistence of the old response at this budget; they do not uniquely distinguish insufficient new experience, cue bias, cross-activation and missing omission-sensitive dynamics.
