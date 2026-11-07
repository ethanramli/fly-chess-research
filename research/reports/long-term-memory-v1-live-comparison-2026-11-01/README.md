# long-term-memory v1: live integration comparison

2026-11-01. Researcher instruction: integrate, compare and document. **Status: all six live conditions completed and the separate arithmetic audit passed.** This is one development seed on arbitrary associations, not chess learning or reasoning evidence.

[Prospective protocol](protocol-v1.md) fixes the arbitration, schedule, controls, criterion and scope before execution. The existing [long-term-memory v1 component](../engineered-episodic-memory-2026-11-01/README.md), original graph, physiology approximation and earlier results remain unchanged.

**Correction added 2026-11-03 (peer review problem 4):** during each practice choice, the runner updated the fly's stored memory after scoring the first proposed move and before scoring the second ([runner line 146](../../../.codebase/scripts/neural-learning/compare-long-term-memory-v1.mjs)). So the 96 acquisition choices and 24 reversal choices per condition below were **scored while memory changed**, not from one unchanged memory (except the disabled-learning condition, where no update happens). Read every practice-choice count (for example 23/24 and 95/96) with that label. The phase tests in the table (After acquisition, After delay, After reversal) did keep memory unchanged and are not affected. Results, raw files and the protocol are unchanged. Future choosers must score every move from unchanged memory: [decision](../../../documentation/design/research-goals/restart-plan-revision-2026-11-03.md), [fix report](../overnight-peer-review-2026-11-02/fixes-2026-11-03.md). The audit was also fixed to reject missing answers; rerun on this pilot it still passes with 144 counted answer checks ([result](../overnight-peer-review-2026-11-02/fix-checks/pilot-audit-with-required-answers.json)).

## Results and interpretation

[Comparison chart](results-v1/results.html), [compact metrics](results-v1/metrics.json), [complete raw summary](../../../runs/memory-retention-2026-11-01/long-term-memory-v1-live-pilot-v1/summary.json).

| Condition | After acquisition | After delay | After reversal | Joint pilot criterion |
|---|---:|---:|---:|---|
| Fly + memory, informative | 4/4 | 4/4 | 4/4 | Pass |
| Memory-only readout, informative | 4/4 | 4/4 | 4/4 | Pass |
| Fly-only readout, informative | 4/4 | 4/4 | 4/4 | Pass |
| Combined, absent feedback | 4/4 | 2/4 | 2/4 | Fail |
| Combined, matched-shuffled feedback | 3/4 | 3/4 | 3/4 | Fail |
| Combined, disabled learning | 0/4 | 0/4 | 0/4 | Fail |

Each count is a positive-margin ranking among four associations; ties count as incorrect. Every seed/item/candidate value remains in the raw summary and phase snapshots. The absent system changes neural state under intrinsic dynamics despite no teacher event; its initial four correct rankings must not be presented as informative-feedback acquisition evidence.

During the 24 live reversal choices, Fly+memory and memory-only each choose correctly 23 times; Fly-only chooses correctly 12 times, before eventually ending with all four associations ranked correctly. Acquisition choices are respectively 95/96, 93/96 and 95/96. These are descriptive trajectories on **one** development seed, not a statistically established speed/accuracy advantage. Fixed score scaling, exploration and different chosen-action feedback histories are part of the comparison; do not call it a pure neural learning-rate improvement.

The memory-backed systems' own raw neural scores still prefer the old candidate for reversed item 0 at the final test. Their external records return -1 for that old action and +1 for the new action, so arbitration makes the correct choice. This is a visible external override, **not consolidation of the revised association into neural weights**. Fly-only follows a different action/feedback trajectory and eventually revises its neural ranking correctly.

The combined system therefore works in a genuine live loop, but this pilot establishes **no final-accuracy advantage over either informative baseline and no incremental neural-score benefit over lookup alone**. The earlier seed-4102 loss is not reproduced as a Fly-only final failure under this changed short-delay/score/randomization protocol. Preserve the original failure; do not retroactively relabel it or claim this pilot replicated its exact conditions. No configuration is selected as best and no reasoning claim follows.

## Integration

[Policy module](../../../.codebase/src/neural-learning/memory-backed-policy-v1.mjs): known exact recall has precedence in Fly+memory; otherwise its score comes from a fixed clipped neural value. Memory-only readout returns known recall or zero. Fly-only readout uses the same scaled neural value. No fitted mixing weight or backpropagation is introduced. Record the raw neural value, recalled event, selected score and live action before feedback.

[Live runner](../../../.codebase/scripts/neural-learning/compare-long-term-memory-v1.mjs) starts each arm from a new, identically initialized full sparse graph model. It reuses frozen graph-derived input descriptors for the four seed-4102 fixtures. Every arm makes its own choices and receives verified consequences for those choices. Memory-only still executes an unused shadow graph to match the number of forwards; it is a live-readout ablation, not a perception pipeline independent of the connectome.

The informative three-system comparison is accompanied by combined-system absent, within-block matched-shuffled and disabled-learning controls. All have 120 trials and 553 graph forwards; controls are not a full factorial comparison. The 16-frame noisy pilot delay differs from the old 400-frame experiment. Do not import old retention gates or infer biological time.

## Execution and persistence

[Registered run](../../../python%20actions/long-term-memory-v1-live-pilot-v1-step.json), [live artifacts](../../../runs/memory-retention-2026-11-01/long-term-memory-v1-live-pilot-v1/manifest.json). The graph process is serial and guarded at 2048 MiB RSS, 256 MiB free memory, duty .5, heap 256 MiB and a 5400-second wall ceiling. Do not relaunch it while its owner is live or unknown.

The run completed with exit 0 in 829.15 seconds, using exactly 3318 forwards and 257.91 MiB peak sampled RSS. All input/source pins matched at completion. The completed run is immutable and must not be relaunched or overwritten; it is not a resource-speed comparison with a different workload.

For compact bounded observation use the registration's `run observe` job. It checks process birth identity and current artifacts without restarting work. Trial checkpoints atomically contain both memory states and the pending receipt before acknowledgement. Automatic interrupted-run recovery is **not implemented**; a stopped run must preserve its last publication and receive a separately validated recovery plan. State round-trip checks are not a power-loss or unattended-recovery claim.

## Checks and completed audit

Five focused memory/policy checks pass, including an observed consequence changing the next action and snapshot retry idempotence. [Full regression summary](software-verification-v1.json): 761/767 pass, with exactly the six named historical failures. [Raw UTF-16 test log](software-tests-v1.txt). No complete-suite pass is claimed.

[Separate auditor](../../../.codebase/scripts/neural-learning/audit-long-term-memory-v1-live.mjs), [audit registration](../../../python%20actions/long-term-memory-v1-live-audit-v1-step.json), [passed output](audit-v1.json). After the complete summary was published, it checked all six conditions, 720 trial receipts, 4280 local neural update frames, 144 item evaluations and every phase snapshot, completing in 35.25 seconds with 110.84 MiB peak sampled RSS. It reconstructs local neural memory from logged activity, external entries, scores, random choices, synthetic feedback bindings, matched shuffle, all snapshots and outcomes. Recorded full-graph responses are not independently regenerated. Both implementations are authored in this agent session, so separate arithmetic is not an independent reviewer or experimental replicate.

All per-item tests and online choices are reported, including failures and ties. Matching lookup-only performance means no demonstrated incremental live neural-score benefit on this fixture. Sealed confirmation families remain untouched. No trained Fly version is promoted. A next study should prospectively test multiple development seeds and unfamiliar combinations/counterfactuals with frozen retrieval coverage and matched controls; do not tune this pilot until the desired winner appears.
