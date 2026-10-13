# MBON choice decoder: computational association prerequisite passed

2026-10-06. Status: completed candidate experiment; all frozen computational gates pass. The researcher explicitly proposed replacing the GF choice interface first, preserving current input/plasticity/dynamics and testing action-specific reversal before reconnecting verified puzzle feedback. This replaces the output **in a new condition**, not in old frozen experiments or the record-only puzzle player.

Completed [raw report, independent audits and recovery diagnostics](../../../research/reports/mbon-choice-v1-2026-10-06/README.md): strict acquisition/reversal choices and ranking switches 6/6; phase effects above both controls 6/6 with sign p=0.015625; causal persistence/reset/restoration and all fixed-state/control gates pass. All 384 local updates audit, and a two-event acquisition-boundary resume matches exactly. Old-action-unique MBON12 mean efficacy recovers and old-action V rises in 6/6. Same-seed GF diagnostics remain weaker: acquisition 4/6, reversal 3/6. Forty-eight tests pass. This clears this condition's computational choice prerequisite, not biological, puzzle or transfer acceptance. Peak full-run RSS 112.78 MiB, elapsed 299.197 seconds, CPU 163.469 seconds, duty 0.5. An audit-side heap failure was fixed by streaming checkpoint comparison, with raw failure/source preserved.

The [frozen protocol](../../../research/data/mbon-choice-v1/protocol.json) uses new encoder seeds 12011, 12037, 12049, 12071, 12101 and 12143. The graph initialization, eight-update kernel, board/action encoder, two actions, stimulation amplitudes, four acquisition/twelve reversal exposures and 870-edge local efficacy rule match the failed GF condition. Same board/actions with fresh projections is not unfamiliar-position transfer. No whole-model adaptation is added.

The new [readout](../../../.codebase/src/lowram/mbon-readout.mjs) is exactly:

`V(s,a) = mean(MBON12 | s,a) - mean(MBON01 | s,a)`

`M = V(s,A) - V(s,B)`.

Each candidate is presented separately without reinforcement or plasticity. Prefer larger V, with exact ties choosing A for deterministic operation. A tie fails the strict acceptance margin. Coefficients +1/-1 and polarity are fixed; no calibration, fitted decoder or clipping affects MBON choice. Frozen GF calibration/rates remain diagnostic fields only, with no role in choice or acceptance.

[Aso et al. 2014](https://elifesciences.org/articles/04580) motivates a learned-preference output from MBON populations. The exact subtraction, candidate presentation and chess interpretation remain engineered rather than an established biological downstream action circuit. Direct article/PMC pages returned browser challenges; the [primary abstract on PubMed](https://pubmed.ncbi.nlm.nih.gov/25535794/), accessed 2026-10-06, supports that broad motivation. [McCurdy et al. 2021](https://www.nature.com/articles/s41467-021-21388-w), abstract and introduction accessed 2026-10-06, describes a punishment-omission relay linking increased approach-MBON activity to reward DAN activity and reduced avoidance-MBON response. This motivates a separate omission experiment; it does not establish that the current rate model reproduces that relay.

Counterbalanced experimental punishment labels deliberately are not chess consequence labels. Informative direct pulses reach identified PPL103 cells; absent has no external pulse, shuffled has independently permuted phase-wise pulse-count-matched feedback, and disabled gets informative pulses without plasticity. Measured local activity drives the same persistent gains; the teacher computes no parameter deltas. Unknown puzzle outcomes are not consumed because no puzzle-verifier integration occurs in this assay.

All six informative seeds must have correct strict acquired and reversed margins and cross the ranking boundary between phases. Each target-signed improvement must exceed the unchanged numerical tolerance 1e-7. Both acquisition and reversal effects must exceed absent/shuffled controls under one-sided sign tests p<0.05. Exact persistence/reset/restoration, disabled invariance, matched pulse counts and fixed graph/nonplastic hashes are also required. All seven gates must pass; changing rates or a favorable average cannot override failure.

Per-trial efficacy means are recorded for each MBON type and A-only/B-only/shared/neither directly stimulated KC category. These test the researcher's predicted recovery sequence without assuming it from a final choice: does previously punished action-specific efficacy recover, does its V rise, and does M cross the boundary? Membership does not classify every recurrently activated KC. Recovery is a mechanistic observation, not an outcome-fitted gate. Trials also retain measured responses, local factors, update counts and gain hashes; per-event checkpoints allow an independent recurrence audit.

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-mbon-choice.mjs --out research/reports/mbon-choice-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-mbon-choice.mjs --run research/reports/mbon-choice-v1-2026-10-06 --out research/reports/mbon-choice-v1-2026-10-06/audit.json
```

Use new output paths; `--resume STATE_JSON --max-trials N` resumes an exactly pinned state to a new directory. Heap 256, serial sparse execution, 768 MiB RSS/256 MiB free-memory guards and compute/rest pacing remain. Efficacy persistence is software persistence, not biological retention. No delayed eligibility, natural sensory/reward pathway or added anatomical edge is introduced.

If acceptance fails, preserve it. The researcher's next controlled comparisons are identical saved-memory replay at 8/16/32/64 updates, action-distinct cues matched for stimulation count/amplitude during retraining, and a separately specified relay perturbation. They are proposed, not performed here. Relay perturbation must declare its exact intervention and cannot change graph wiring silently. Presenting a previously punished cue without external punishment is a distinct omission-only condition, not assumed equivalent to reversal while the competitor is punished.

Only after the choice prerequisite passes should a justified short-timed verified-consequence learning round be connected. Long-delayed credit needs separately validated traces/time and checkpoints; broader adaptation and held-out/counterfactual reasoning remain unfinished even if this computational gate passes.
