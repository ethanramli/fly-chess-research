# Capture-retention transfer assay

Design contract for the first from-scratch memory-to-choice test. This is a **prerequisite assay**, not the requested end-to-end Monte Carlo puzzle learner and not evidence of broad reasoning. No graph run is authorized by this design alone.

## Question and mechanism

Does one pass of independently verified capture/recapture consequences change the fixed neural preference so the same blocker relation guides choices in disjoint positions, including a changed position where the correct choice reverses?

The public input is only the board and candidate action encoded by relational cue v3. The teacher independently checks all legal opponent replies. `success` selects the existing PAM02 experimental channel; `failure` selects PPL103; `unknown` produces no event. The simulation then uses its existing local KC/DAN activity and KC-to-MBON efficacy rule. The lasting state is the bounded per-edge gain vector; all graph topology, signs, model weights, mapping, encoder, readout and choice polarity stay fixed. These cell assignments and dynamics remain experimental approximations, not validated natural chess physiology.

The predicted chain is: candidate-relative pieces and rays -> measured KC activity -> eligible local efficacy change during identified teaching activity -> changed fixed MBON12-minus-MBON01 candidate margin. Record KC activity, individual DAN excess, every affected edge gain, and candidate margins at baseline and after each event. A gain change without the predicted held-out margin change is a failed link, not learning success.

## Frozen data use

Use the independently audited `capture-retention-transfer-v2` package without modification: one replay of both candidates from each of its eight training panels (16 experiences total; eight successes and eight failures). Preserve JSONL order in every condition. Validation (four panels) is diagnostic only; it cannot select among doses because the dose is fixed at one replay. Final (eight panels) remains untouched until all conditions, source audits and report code are frozen.

The final set contains a predeclared counterfactual pair: `te-01` and `te-05` differ by moving one white pawn from b4 to d7. On `te-01`, a2a4 is safe and e2e6 is recapturable; on `te-05`, those outcomes reverse. Thus the preferred candidate must switch when that pawn changes which slider ray is blocked. `te-05` also tests a diagonal bishop relation absent from training. This is a controlled relational transfer case within a small symbolic task, not an arbitrary-position chess test.

## Conditions and initialization

For each predeclared model seed 47, 53, 59, 61 and 67, instantiate the released sparse graph and model from scratch. Initialize every permitted memory gain to 1.0; do not load any previously trained checkpoint. Compute the rest reference before cue presentation. Clone this exact initial model/memory state into four serial conditions, then replay the same 16 checked experiences once, in the same order:

| Condition | Experience signal | Plastic update |
|---|---|---|
| Informative | Verified success/failure channels | Enabled |
| No-channel | Same checked experiences, no reinforcement channel | Enabled; local activity may still alter memory |
| Shuffled | Balanced channel assignments permuted once by the frozen seed | Enabled |
| Disabled | Correct verified channels | Disabled; gains must remain unchanged |

Publish the shuffled assignment before training. Generate one balanced 8/8 permutation with seed `20261007`, verify it differs from the true labels, and use that exact assignment for every model seed. No-channel is not a no-learning condition: the existing rule may change gains from unreinforced local activity.

## Evaluation and decision rule

At baseline, after the fixed training pass, after a repeat assessment, after reset, and after exact restoration, score only each panel's two declared candidate captures. Use the frozen MBON preference `V = mean(MBON12) - mean(MBON01)` and report the signed margin `V(success) - V(failure)`. Evaluation must not call the teacher for choice, update memory, or expose certificates/labels to the encoder. Report accuracy and margins separately; no fitted decoder or post-feedback polarity change.

Primary transfer gate: the informative condition has positive mean final margin and exceeds **each** control in paired final margins, with a one-sided 95% two-way cluster-bootstrap lower bound above zero (resample model seeds and final panels; 10,000 replicates with bootstrap seed `20261008`). It must choose the successful candidate on at least six of eight final panels in at least four of five seeds, and select a2a4 on `te-01` then e2e6 on `te-05` in at least four of five seeds. On that pair, the role-scrambled input must reduce correct-pair accuracy relative to intact cues in at least four of five seeds; otherwise the cue's claimed relation binding is unsupported. Report the nearest-cue baseline; if it meets or exceeds the neural condition's final accuracy and counterfactual-pair pass rate, do not attribute the result to neural transfer. Publish every seed-by-panel result; do not select a favorable seed. The exact same trained snapshot must reproduce choices on repeat, reset must recover its baseline rankings, and restoration must recover its trained rankings. Failure of any gate is a failed assay.

This first contract evaluates unaided candidate preference only. The current Monte Carlo search accepts forced-mate tasks, not `capture-retention`; its leaf value is explicitly neutral. Therefore a pass supports only narrow learned transfer. A later, separately frozen integration must route bounded neural search through verified consequence feedback and show improvement under the same fixed search budget as controls before any puzzle-reasoning claim.

## Execution and freeze checklist

Before implementation can be frozen, the runner must pin SHA-256 identities for the graph, annotation table, mapping/root IDs, cue and feedback modules, learner/readout, all runner/auditor sources, dataset protocol/files, resolved dependency entrypoint/package, initial scratch memory, model seed list and analysis code. Independently recheck all 40 certificates and split/cue audits. The role-ablation diagnostic must keep action/task terms unchanged and swap the `around-target:` and `around-origin:` namespaces on every board-piece relation token, then hash/project with the same cue seed and KC budget. Its [static preflight](../../../archive/early-development/research/reports/capture-retention-role-ablation-preflight-2026-10-07/README.md) confirms 14 stimulated cells, total current 21, no duplicate token sets, and changed stimulation sets on all 16 final cues. The [nearest-cue baseline](../../../archive/early-development/research/reports/capture-retention-nearest-cue-baseline-2026-10-07/README.md) correctly predicts 75% of final candidate outcomes but chooses the panel winner only 4/8 times and fails the specified counterfactual pair. Neither diagnostic may use final performance to alter the encoder. If any audit reveals label leakage, ambiguous relation binding or a reused final cue, repair the data/interface in a new version before training.

Run graph work serially with `node --max-old-space-size=256`, `--cpu-duty 0.5`, RSS at most 768 MiB and at least 256 MiB free memory. Check resource guards between setup allocations. Save the memory and pending receipt atomically before acknowledging every event; pin seeds and replay order; independently verify recurrence, unchanged fixed-state hashes, reset/restoration certificates and final metrics. Preserve all failures. The final file stays unavailable to training, checkpoint choice and encoder tuning.

The v2 family, cue audit and source archive are inputs to this design, not proof of any neural link. See [the task interface](capture-retention-task.md), [data package](../../../archive/early-development/research/data/capture-retention-transfer-v2/README.md), and [independent data audit](../../../archive/early-development/research/reports/capture-retention-transfer-audit-v1-2026-10-07/README.md).

## Frozen execution result (2026-10-07)

The executable v3 protocol and runner completed all 20 seed-condition runs; see the [audited report](../../../archive/early-development/research/reports/capture-retention-assay-v3-2026-10-07/README.md). Informative feedback scored 5/8 final panels for each declared seed, tied every control, and failed the pawn-relocation counterfactual in all seeds. Its mean final margin was positive, but paired margins were below all three controls. The registered transfer gates failed; no learned transfer is established.

A post-run audit found the five seeds were functionally identical: the seeded input/head arrays do not affect this direct-stimulation, MBON-activity readout. Cross-seed bootstrap claims therefore cannot be interpreted as independent initialization evidence. Before another neural run, define and validate behaviorally distinct replication while preserving matched controls. The remaining missing link is still a consequence-sensitive change in held-out action ranking. This assay does not include Monte Carlo search and cannot establish the full reasoning objective.

A second post-run check found a simpler explanation for the 5/8 accuracy: the scratch baseline already chose `a2a4` on all eight final panels in every run, and training changed none of those choices. The 5/8 reflects a fixed action preference, not acquisition. Role scrambling changes the action preferences but does not produce the required counterfactual switch. Preserve this failure as the clearest current evidence that the fixed MBON preference does not yet use the changed blocker relation to rank these candidate actions.

On the counterfactual pair, the intact MBON score prefers `a2a4` over `e2e6` in both positions. The success-minus-failure margins are `+0.007583` on `te-01` and `-0.006381` on `te-05`, so the underlying action gap favors `a2a4` in both. The verified outcome flips, but the candidate ordering does not. This localizes the observed failure to how relational cue activity reaches or is used by the fixed action readout; it does not identify which synapses or neural computation cause it.
