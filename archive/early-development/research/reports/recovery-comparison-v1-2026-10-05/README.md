# Frozen candidate recovery comparison

2026-10-05. [Raw report](report.json), [independent audit](audit.json), [frozen protocol](../../data/recovery-comparison-v1/protocol.json), [design and limitations](../../../documentation/design/neural-learning/recovery-comparison.md).

All seven frozen gates pass: acquisition, reversal, informative-feedback comparison, software persistence, causal reset, controls and fixed state. The independent audit passes, checking all 384 local update transitions, recorded scores/choices, target schedule, exact shuffled pulse permutations/counts and sign calculations. These are **bounded computational association results**, not biological validation, GF choice, chess reasoning, full-model training or transfer.

| Condition | Initial safe choice before training | Safe after acquisition | New safe after reversal |
|---|---:|---:|---:|
| Informative | 5/6 | 6/6 | 6/6 |
| No external feedback | 5/6 | 5/6 | 1/6 |
| Matched shuffled pulses | 5/6 | 1/6 | 4/6 |
| Plasticity disabled | 5/6 | 5/6 | 1/6 |

Acquisition corrects one initially wrong choice and strengthens five already correct preferences. Reversal changes all six acquired preferences to the newly safe cue. Acquisition effect ranges 0.030172–0.038935 engineered score units; reversal effect ranges 0.066449–0.075994. Reversal advantage over absent and shuffled controls is positive in all six seeds. Each relevant one-sided sign test has six positives, no ties, p=0.015625. These seeds are synthetic cue draws within one connectome, not independent animals.

Absent external stimulation still changes local gains because the candidate reads recurrent DAN responses. Its final choices remain at their baseline pattern; the informative effect must be distinguished from this drift. The disabled condition preserves gains exactly. Naive reset restores every baseline probe, and loading learned efficacy restores every final probe exactly. Repeated probes test software persistence without elapsed physiological time. Every graph/nonplastic hash holds; only permitted efficacy state changes.

This is not a rescue or replacement of gamma4 V1/V2. It uses different cells, masks, cue pools, simultaneous conditioning, readout and controlled exposure. The comparison does not isolate recovery as the sole explanation of its success. Balanced cue presentations are teacher-controlled experience, not autonomous choice exploration. Independent biological dynamics, justified chess/GF interfaces and unfamiliar-position transfer remain outstanding.

Exact commands:

```powershell
node --max-old-space-size=256 .codebase/scripts/compare-recovery.mjs --out research/reports/recovery-comparison-v1-2026-10-05 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-recovery.mjs --run research/reports/recovery-comparison-v1-2026-10-05 --out research/reports/recovery-comparison-v1-2026-10-05/audit.json
node --max-old-space-size=256 .codebase/scripts/compare-recovery.mjs --out research/reports/recovery-prefix-replay-2026-10-05 --cpu-duty 0.5 --max-trials 2 --resume research/reports/recovery-comparison-v1-2026-10-05/checkpoint-00006/state.json
```

Use new directories to repeat. The full run performs 672 serial forward evaluations across 24 conditions and 384 training presentations. Peak process RSS 91.910156 MiB, elapsed 705.006981 seconds, CPU 332.766 seconds through report preparation. This is one workload observation, not a resource improvement. The short prefix replay overlapped part of the main invocation; elapsed time is therefore not a clean exclusive-machine latency benchmark. The graph is the pinned 134,209-neuron release with SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`. Remaining input/module hashes and exact Node options are in the report. Original source bytes are archived under `sources/`.

[Prefix replay](../recovery-prefix-replay-2026-10-05/replay-audit.json): original checkpoint 6 (four completed acquisition presentations) resumes two additional plastic trials and exactly matches the scientific state of original checkpoint 8, excluding the publication counter. This tests interruption at that boundary, not a full uninterrupted replay or every interruption point. All raw trial/checkpoint records are preserved.

`npm test`: 36/36 pass. Audit/code checks and a passing synthetic association gate do not satisfy the puzzle learning/transfer objective. The puzzle feedback receiver still records consequences without neural learning.
