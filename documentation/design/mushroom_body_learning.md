# Mapped gamma4 conditioning prototype

Implemented 2026-09-30. This is a **reduced, stimulation-based plasticity experiment**, not a faithful biochemical fly simulation, natural reward pathway, trained chess policy, or demonstrated behavioral learning. The puzzle receiver and browser player remain unchanged.

Later validation addendum: [controlled choice experiments](association_validation.md) now add an engineered decoder, ordinary reward-contingency reversal and causal memory ablations. Basic association checks pass on the balanced follow-up, but final reversal choices succeed in only 3/6 seeds and both full acceptance protocols fail. Earlier statements below about the absence of action selection refer to this original timing-only experiment. Biological validation and chess learning remain outstanding.

## Evidence and mapping

An Exa-assisted focused review covered two workstreams: experimental learning mechanisms and anatomical identities. The implementation draws on these primary sources, rather than a generic global reward update:

- [Handler et al., Cell 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC9012144/): in the mushroom-body gamma4 compartment, the relative timing of Kenyon-cell (KC) and dopaminergic-neuron (DAN) activation can reverse the direction of KC-to-MBON plasticity. Cue-before-DAN pairing depresses the response; the reverse order can potentiate it. Opposing dopamine-receptor pathways support timing sensitivity. The experiment below reproduces that qualitative ordering, not the receptor biochemistry or a published fitted equation.
- [Cohn, Morantte and Ruta, Cell 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4732734/): dopamine modulation and KC coactivation have compartment-specific effects. This motivates restricting the candidate mechanism to one compartment, not applying it to every graph edge.
- [Li et al., eLife 2020](https://elifesciences.org/articles/62576): mushroom-body circuit anatomy and type nomenclature. Anatomical connectivity alone does not specify learning dynamics.
- [FlyWire annotation release](https://github.com/flyconnectome/flywire_annotations/tree/ebd66db2596fcc39c6950fb54ea3efa00f7fe8a0), associated with [Schlegel et al., Nature 2024](https://doi.org/10.1038/s41586-024-07686-5): the pinned neuron table supplies exact root IDs, hemisphere, cell class, hemibrain type and transmitter annotations.
- [FlyBase anatomy ontology](https://github.com/FlyBase/drosophila-anatomy-developmental-ontology/blob/master/fbbt.obo): FBbt:00111020 identifies PAM08 as PAM-gamma4; FBbt:00111004 identifies MBON05 as MBON-gamma4>gamma1gamma2 and specifies **contralateral dendrites**. Inspected release: 2026-07-09; SHA-256 `53061c601703c5f80c59f2930c615feab8b0d5beeadd95030720b7075b625d19`.

The mapper streams the annotation TSV, joins root IDs as strings from `BigInt64Array` (never rounded JS Numbers), and selects right-side gamma KCs and PAM08 neurons plus the **left-soma MBON05** receiving right-compartment inputs. A first same-soma-side selection found zero KC-to-MBON edges and was rejected before running; the ontology explained the mismatch. No indices or connections were invented to repair it.

The released sparse graph contains 1,056 qualifying KC-to-MBON connections from 1,056 KCs, 22 right PAM08 neurons, and one target MBON05, root `720575940621164720`. Only existing positive-sign KC-to-MBON edges are eligible; this mapping excluded zero negative edges. This is a subset of gamma4 circuitry, not all dopamine neurons or compartments. Soma annotations plus existing edges support the selection; they do not reconstruct subcellular release sites or receptor expression.

Graph SHA-256: `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`.

Annotation SHA-256: `30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6`. The runner downloads the pinned table only if absent, verifies its hash and does not put the complete upstream table into Git. The raw mapping report retains source attribution and both curated and predicted transmitter fields. Those fields can disagree; **no graph signs are rewritten**. In particular, the selected MBON's curated glutamate annotation differs from its acetylcholine prediction. The diagnostic reads its activity, not its downstream motor effect.

## What changes, and what does not

`Gamma4Memory` holds a positive efficacy gain for each eligible KC-to-MBON edge, a local KC activity trace and a compartment DAN trace. Each edge's effective magnitude is its initial magnitude multiplied by its gain. Neuron IDs, edges, anatomical synapse counts, signs, other connection magnitudes, biases, leaks, sensory projections and readout parameters remain fixed. Their combined hash is checked after every protocol event. No backpropagation, gradient target, Adam step or search feedback is used.

For KC signal `c`, dopamine signal `d`, decayed KC trace `e` and DAN trace `q`, the phenomenological update is:

```text
gain += eta * [c*q*(maxGain-gain) - d*(e+c)*(gain-minGain)]
gain = clamp(gain, minGain, maxGain)
e = max(e, c); q = max(q, d)
```

Traces decay exponentially between pulses. Defaults: eta 0.25, tau 1, gain bounds 0.2–1.8. **This equation, its rates, bounds and time units are engineering assumptions, not fitted biological measurements.** A simultaneous cue/DAN pulse takes the depression branch. The experiment uses separated pulses.

Full sparse-graph propagation uses the existing eight-step leaky-rate kernel, with direct current injected into mapped KC or PAM08 populations. Its rate dynamics restart from rest each pulse; only the plasticity traces and efficacy gains carry between pulses. This quasi-steady pulse approximation is not a continuous physiological simulation. Anatomical magnitudes use the existing row-normalized initialization; no pretrained weights are loaded.

Cue pulses provide measured excess KC activity relative to initial resting activity. PAM stimulation provides measured excess PAM activity. Signals are normalized by injected current. A crucial explicit simplification: **only experimental PAM stimulation gates dopamine in this prototype**; recurrent endogenous dopamine release and natural sugar/sensory reward pathways are not modeled. KC eligibility is sampled during cue pulses, not background activity. Thus this is closer to a reduced direct-stimulation experiment than to teaching a natural fly through its senses. Connecting a chess reward scalar to this gate would not, by itself, solve that missing biological interface.

## Protocol and interpretation

The seeded synthetic cues A and B each directly stimulate 52 distinct KCs (5% of the eligible pool). They are not odors, board encodings or learned concepts. At seed 47:

1. Read both cue responses before conditioning.
2. Repeat A → PAM stimulation → B four times; adjacent pulses are 0.5 model units apart, trials have a 10-unit pre-trial interval.
3. Probe both cue responses, then advance traces by 60 model units and probe again.
4. Repeat B → PAM stimulation → A four times and probe again.
5. Repeat the entire schedule from naive state without PAM stimulation, and with PAM stimulation but plasticity disabled.

Diagnostic probes do not alter plasticity state: they are non-invasive software measurements, not extinction/relearning trials. The metric is MBON response B minus response A, baseline-corrected for acquisition/reversal gates. Gamma4's relationship to avoidance motivates the sign, but **this is a neural-response contrast, not a behavioral choice or a probability**. Temporal pairing reversal is not an ordinary reward-contingency reversal after an action. No action selection is implemented here.

Retention tests software persistence: gains have no implemented forgetting process, so unchanged retention is expected by construction. It does not establish a biological memory lifetime. Similarly, passing acquisition/reversal demonstrates the specified rule behaves as designed, not that this rule has been scientifically validated.

## Run, checkpoint and reproduce

```powershell
node --max-old-space-size=256 .codebase/scripts/condition-fly.mjs `
  --out runs/gamma4-001 --cpu-duty 0.5
```

Equivalent: `npm run condition:fly -- --out runs/gamma4-001 --cpu-duty 0.5`.

Use `--max-events 3` for an intentional early stop. Resume into a new directory:

```powershell
node --max-old-space-size=256 .codebase/scripts/condition-fly.mjs `
  --out runs/gamma4-resumed --cpu-duty 0.5 `
  --resume runs/gamma4-001/event-0003/state.json
```

Every completed event atomically publishes a directory containing `state.json`. Checkpoints include gains, traces, model time, observations, event cursor and completed-condition states. The next-event cursor prevents duplicate reinforcement. Graph, annotation, mapping, executable-source hashes, seed, protocol and model settings must match on resume. Different code requires a fresh run rather than silently reinterpreting old memory. Reports and mapping are written separately; unfinished events are rerun from the previous completed checkpoint. Directory rename gives atomic visibility, not a guarantee against every power-loss scenario.

The runner uses the 768 MiB RSS / 256 MiB free-memory soft guard, sparse propagation, serial cues and duty pacing. No dependencies, workers or dense adjacency matrices were added. Runs are bounded at 90 scheduled events. Resource measurements are process-wide through report preparation, not an inference-latency benchmark.

## Observed engineering result

[Full report](../../research/reports/gamma4-conditioning-2026-09-30/report.json), [mapping](../../research/reports/gamma4-conditioning-2026-09-30/mapping.json).

| Condition | Initial B−A | After pairing | After retention interval | After temporal reversal |
|---|---:|---:|---:|---:|
| Paired | −0.000174 | 0.043819 | 0.043819 | −0.021059 |
| No feedback | −0.000174 | −0.000174 | −0.000174 | −0.000174 |
| Plasticity disabled | −0.000174 | −0.000174 | −0.000174 | −0.000174 |

All fixed-state invariants held. Peak RSS was 145.21 MiB; elapsed time 113.11 s; CPU time 67.47 s. These numbers describe this workload only, not a speedup. The first complete protocol run used the stated defaults, without tuning to obtain the response reversal. Only one cue seed has been measured: robustness and biological validity remain untested.

`npm test`: 24/24 passed, including local timing, retention, reversal, no-dopamine and unpaired-timing controls, positive bounds, checkpoint equivalence, invariant parameters, sparse stimulation, exact int64 parsing and contralateral mapping. Existing gradient and puzzle tests still pass.

[Full-graph replay](../../research/reports/gamma4-resume-2026-09-30/report.json) resumed event 3, between the first cue and its PAM pulse, and produced a byte-identical final state. Both final state files have SHA-256 `add9f154ae6421ca8b56763882941b941d3f139ab118a9bd2e91ca7b68b0a07f`. Replay peak RSS was 146.21 MiB, elapsed time 110.37 s and CPU time 65.45 s. This verifies stored eligibility survives restart without double-applying the cue or reinforcement.

## Remaining gate before chess

This implements a candidate local memory mechanism and its controlled software test. It does **not** replace the record-only puzzle receiver. Still needed: justify the board/action-to-neural encoding, natural feedback pathway or explicitly acceptable experimental stimulation interface, action readout and delayed credit assignment; validate ordinary contingency reversal, multi-seed controls and independent biological predictions; then run a puzzle learning round and held-out transfer tests. Latency optimization and scaling remain later milestones.
