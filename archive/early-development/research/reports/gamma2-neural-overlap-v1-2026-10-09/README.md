# Read-only gamma2 neural overlap diagnostic

2026-10-09. Completed one serial read-only graph run on the historical development board. No feedback stimulation, parameter update, learning-memory construction or training occurred. All 53 forward presentations (one reference plus 26 legal candidates under each of two encoders) completed. The runner verified identical anatomy/all-parameter hashes before and after. [Raw result](result.json), [separate receipt audit](../plasticity-timing-candidate-2026-10-09/neural-overlap-audit.json).

Gate-relevant question and next informative step were recorded before launch in the [candidate report](../plasticity-timing-candidate-2026-10-09/README.md). The next feedback-enabled step is the reviewed gamma2 temporal-learning condition with independently certified consequences and exposure-matched causal controls; it remains unrun under the user's no-training instruction. This diagnostic is not learning progress by itself.

## Result

With the existing conjoined encoder pool, the Qe6/Qh7 diagnostic KC-credit cosine is 0.8064476 and total credit is 0.00021093/0.00068552. With the authenticated gamma2 pool, the cosine is 0.000002786 and total credit is 6.44297/6.44327. Maximum pairwise cosine over all 26 legal candidates is 0.964031 for the existing pool versus 0.375077 for the gamma2 pool. This supports the scoped input-to-plastic-site alignment hypothesis on actual untrained neural trajectories for this board.

Credit here is an independently calculated filter of recorded KC rates, initialized empty for each candidate, using the declared numerical tauKC=0.4, stepDuration=0.1, activity scale 1.5 and the fixed unstimulated-model reference. It is not learned physiological state or evidence of interleaved retention. Distinct high-dimensional response patterns do not prove that their plasticity effects support a useful downstream ranking.

The untrained highest-scoring action changes from g6f6 to f7g8 across pools. Consequently, future learning claims must compare before/after behavior against controls under the same encoder. This report makes no new consequence-certificate or puzzle-solving claim. Historical receipt comparisons used different neural/learning conditions; their values remain preserved and are not interchangeable with this from-scratch panel.

## Execution and checks

Command from repository root:

`node --max-old-space-size=256 research/reports/plasticity-timing-candidate-2026-10-09/measure-neural-overlap.mjs --cpu-duty 0.5 --out research/reports/gamma2-neural-overlap-v1-2026-10-09`

Observed peak RSS 105.27 MiB, elapsed 24.03 seconds. Graph SHA256 is `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`. Full model, encoder, mapping, source hashes, Node version and CPU measurements are in result.json; source snapshots are under sources/. Guards were 768 MiB RSS and 256 MiB minimum free memory; pacing was duty 0.5. These are measurements for this workload only.

Each row has an immutable JSON receipt and an acknowledged-prefix checkpoint. The separate analysis checks receipt/source hashes, final checkpoint agreement, all 120 KC identities/reference values, rate bounds and independently computes overlap summaries. It does not independently rerun parameter hashing; that invariant is reported by the inspected read-only runner. No interrupted invocation or resumption occurred. Latest full project software suite remains 208/208; core math was unchanged in this diagnostic turn.

## Scope correction

Earlier assistant-authored specifications withheld graph execution as well as training. The user explicitly prohibited training; read-only inspection remains within the requested research/fix scope. This bounded, parameter-preserving diagnostic exercises that distinction. No learner training authorization is inferred from the active goal or this run. Actual plasticity, retention, reversal and transfer remain unverified.
