# Overlapping chess-cue association: failed choice gates

2026-10-05. Frozen new-seed engineering experiment. Not verified chess feedback or a learned chess checkpoint.

Six new encoder seeds, four matched conditions and 384 presentations test the candidate's two GF choice outputs using actual board/action descriptions and the unchanged naive input-domain calibration. All 384 local-update checkpoints pass the independent consistency audit. Reset/restoration, persistence, disabled invariance, pulse matching and wiring/nonplastic hashes hold. **Overall acceptance fails: acquisition and reversal choice gates fail.** The nonzero runner exit records that failed acceptance, not an interrupted or uncompleted run.

| Condition | Acquired choice correct | Reversed choice correct |
|---|---:|---:|
| Informative | 3/6 | 3/6 |
| Absent | 3/6 | 3/6 |
| Pulse-count-matched shuffled | 3/6 | 3/6 |
| Disabled plasticity | 3/6 | 3/6 |

None of the six informative seeds changes its decoded choice from baseline in either phase. Five reversal margins improve above absent/shuffled controls and one ties (one-sided sign p=0.03125); positive response changes are insufficient because the required new choices did not occur. Acquisition effects are four positive, one negative, one tied. The positive control-comparison gate does not override the failed acquisition/reversal gates.

The descriptive [diagnostic](diagnostic.json) retains cue overlap and alternate readouts without replacing acceptance. Informative unclipped GF diagnostic choices remain only 3/6 in each phase. MBON diagnostic choices are 6/6 acquisition and 5/6 reversal; that does not validate the requested GF interface or rescue overall acceptance. Both clipped scores saturate at one in one informative acquisition case and two reversal cases. Saturation alone cannot explain every failure. Cues share 12 stimulated cells out of unions of 21–22 (Jaccard approximately 0.55–0.57); overlap's causal contribution has not been isolated.

Feedback contingencies intentionally counterbalance and reverse independent of chess truth. Sometimes the mating action receives experimental punishment. This is a cue-association prerequisite experiment, not a teacher giving chess rewards. No consequence verifier, Monte Carlo search, delayed chess credit or unfamiliar-position transfer runs. Six encoder seeds do not constitute six disjoint chess families. Do not use these memories as chess weights.

Artifacts: `report.json` preserves raw signals, choices, local observations, memory and frozen gates; atomic `checkpoint-NNNNN/state.json` files preserve every completed event. `audit.json` independently reconstructs public cue projections, fixed GF calculations, all 384 local recurrences and all seven gates. `replay-audit.json` compares exact active memory/schedule/probes/local state after a two-event resume across acquisition/reversal (publication counter differs). It is a specific prefix replay, not a full rerun. Executable source snapshots are in `sources/`.

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-chess-cue-learning.mjs --out research/reports/chess-cue-association-v1-2026-10-05 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-chess-cue-learning.mjs --run research/reports/chess-cue-association-v1-2026-10-05 --out research/reports/chess-cue-association-v1-2026-10-05/audit.json
node --max-old-space-size=256 .codebase/scripts/diagnose-chess-cue-learning.mjs --run research/reports/chess-cue-association-v1-2026-10-05 --out research/reports/chess-cue-association-v1-2026-10-05/diagnostic.json
node --max-old-space-size=256 .codebase/scripts/validate-chess-cue-learning.mjs --out research/reports/chess-cue-association-prefix-replay-2026-10-05 --cpu-duty 0.5 --max-trials 2 --resume research/reports/chess-cue-association-v1-2026-10-05/checkpoint-00006/state.json
npm test
```

Use new output paths to repeat. Full run: 672 forward evaluations, peak RSS 97.23046875 MiB, elapsed 450.5534347 seconds, CPU 254.688 seconds, duty 0.5. Prefix invocation: peak RSS 95.296875 MiB, elapsed 3.4261324 seconds, CPU 2.219 seconds. Workloads differ; no speedup/resource improvement is claimed. All 46 existing tests pass. The first sandboxed test invocation hit Windows subprocess `spawn EPERM`; the approved outside-sandbox retry passed all tests. The full experiment's audit/failed gates provide the relevant new evidence, not the unit-test count.

Next work must isolate cue interference, persistent GF preference bias and nonlinear readout behavior while checking supported neural predictions. Do not retune this protocol, add unsupported negative updates, silently switch to the MBON diagnostic or scale a failed learner. The biological interfaces, whole-model adaptation, verified puzzle learning and reasoning/transfer objective remain outstanding.
