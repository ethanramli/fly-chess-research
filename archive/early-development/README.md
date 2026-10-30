# Early development archive

These are the project's old experiments, kept in full. **They are not evidence for the restart.** Under the old input, attack-map tokens did the chess thinking, so these results show association, not reasoning. See the [restart plan](../../documentation/design/research-goals/restart-plan-2026-10-30.md) and the [response report](research/reports/maturity-review-response-2026-10-30/README.md).

You do not need to open this folder to follow the current work.

## What is here

- `research/reports/`: reports and raw results.
- `research/data/`: datasets and protocols, including the old sealed sets. The restart does not use them.
- `research/source-archives/`: frozen source copies.

The history stays where it was: [decision log](../../research/project/decision_log.md), [journal](../../research/journal/README.md), [literature](../../research/literature/source-solution-register.md).

## Replaying an old experiment

Files here are unchanged, because manifests pin their hashes. So some links inside them to folders outside this archive do not work here, and old code still names the old paths. To replay or browse with the original paths, use the tag:

```
git worktree add ../fly-chess-early early-development-final
```

The local folders `runs/` and `research/runs/` are not in git. They stay on the researcher's laptop and were not moved.

## Reports (258)

| Report | Title |
|---|---|
| [adaptive-contrastive-coverage-v1-2026-10-07](research/reports/adaptive-contrastive-coverage-v1-2026-10-07/) | Adaptive contrastive coverage v1 run |
| [adaptive-contrastive-coverage-v1-recovery-2026-10-07](research/reports/adaptive-contrastive-coverage-v1-recovery-2026-10-07/) | Adaptive coverage pending-receipt recovery |
| [adaptive-contrastive-coverage-v2-2026-10-09](research/reports/adaptive-contrastive-coverage-v2-2026-10-09/) | Interrupted run |
| [adaptive-coverage-transfer-diagnostic-2026-10-07](research/reports/adaptive-coverage-transfer-diagnostic-2026-10-07/) | Transfer diagnostic after adaptive acquisition |
| [adaptive-mate-error-v1-2026-10-08](research/reports/adaptive-mate-error-v1-2026-10-08/) | Adaptive current-error experiment |
| [adaptive-near-transfer-margin-v1-2026-10-07](research/reports/adaptive-near-transfer-margin-v1-2026-10-07/) | Near-transfer score-margin diagnostic |
| [adaptive-near-transfer-repair-transfer-v1-2026-10-07](research/reports/adaptive-near-transfer-repair-transfer-v1-2026-10-07/) | Sibling evaluation after warm-start repair |
| [adaptive-near-transfer-repair-v1-2026-10-07](research/reports/adaptive-near-transfer-repair-v1-2026-10-07/) |  |
| [adaptive-near-transfer-repair-v2-2026-10-07](research/reports/adaptive-near-transfer-repair-v2-2026-10-07/) | Audited warm-start puzzle repair |
| [adaptive-near-transfer-v1-2026-10-07](research/reports/adaptive-near-transfer-v1-2026-10-07/) |  |
| [adaptive-near-transfer-v2-2026-10-07](research/reports/adaptive-near-transfer-v2-2026-10-07/) |  |
| [adaptive-near-transfer-v3-2026-10-07](research/reports/adaptive-near-transfer-v3-2026-10-07/) |  |
| [adaptive-near-transfer-v4-2026-10-07](research/reports/adaptive-near-transfer-v4-2026-10-07/) | Adaptive near-transfer v4 |
| [adaptive-review-prefix-2026-10-06](research/reports/adaptive-review-prefix-2026-10-06/) |  |
| [adaptive-review-resumed-2026-10-06](research/reports/adaptive-review-resumed-2026-10-06/) | Adaptive review V1: failed fixture repair |
| [adaptive-review-v1-2026-10-06](research/reports/adaptive-review-v1-2026-10-06/) | Adaptive review V1 interrupted invocation |
| [adaptive-temporal-dose32-2026-10-09](research/reports/adaptive-temporal-dose32-2026-10-09/) |  |
| [adaptive-temporal-loop-2026-10-09](research/reports/adaptive-temporal-loop-2026-10-09/) | Adaptive temporal feedback loop repair |
| [adaptive-two-valence-balanced-preflight-2026-10-06](research/reports/adaptive-two-valence-balanced-preflight-2026-10-06/) |  |
| [adaptive-two-valence-conjoined-balanced-preflight-2026-10-06](research/reports/adaptive-two-valence-conjoined-balanced-preflight-2026-10-06/) |  |
| [adaptive-two-valence-conjoined-preflight-2026-10-06](research/reports/adaptive-two-valence-conjoined-preflight-2026-10-06/) |  |
| [adaptive-two-valence-original-2026-10-06](research/reports/adaptive-two-valence-original-2026-10-06/) |  |
| [adaptive-two-valence-original-final-preflight-2026-10-06](research/reports/adaptive-two-valence-original-final-preflight-2026-10-06/) |  |
| [adaptive-two-valence-original-preflight-2026-10-06](research/reports/adaptive-two-valence-original-preflight-2026-10-06/) |  |
| [adaptive-two-valence-original-v2-2026-10-06](research/reports/adaptive-two-valence-original-v2-2026-10-06/) |  |
| [adaptive-two-valence-original-v2-prefix-2026-10-06](research/reports/adaptive-two-valence-original-v2-prefix-2026-10-06/) |  |
| [alpha-one-mapping-2026-10-25](research/reports/alpha-one-mapping-2026-10-25/) |  |
| [alpha-three-mapping-2026-10-26](research/reports/alpha-three-mapping-2026-10-26/) |  |
| [assessment-cache-v1-2026-10-07](research/reports/assessment-cache-v1-2026-10-07/) |  |
| [assessment-cache-v2-2026-10-07](research/reports/assessment-cache-v2-2026-10-07/) | Frozen-memory assessment cache: matched development benchmark |
| [association-validation-prefix-2026-09-30](research/reports/association-validation-prefix-2026-09-30/) |  |
| [association-validation-prefix-replay-2026-09-30](research/reports/association-validation-prefix-replay-2026-09-30/) |  |
| [association-validation-prefix-resume-2026-09-30](research/reports/association-validation-prefix-resume-2026-09-30/) |  |
| [association-validation-v1-2026-09-30](research/reports/association-validation-v1-2026-09-30/) |  |
| [association-validation-v2-2026-09-30](research/reports/association-validation-v2-2026-09-30/) |  |
| [babysit-recovery-2026-10-22](research/reports/babysit-recovery-2026-10-22/) | Registered seed-3 recovery and supervisor inspection |
| [bidirectional-assay-infrastructure-review-2026-10-08](research/reports/bidirectional-assay-infrastructure-review-2026-10-08/) | Independent review of bidirectional assay infrastructure |
| [bidirectional-assay-repair-2026-10-08](research/reports/bidirectional-assay-repair-2026-10-08/) | Bidirectional assay infrastructure repair |
| [bound-ray-activity-probe-v1-2026-10-07](research/reports/bound-ray-activity-probe-v1-2026-10-07/) | Bound-ray read-only activity screen |
| [bound-ray-feedback-development-completion-2026-10-08](research/reports/bound-ray-feedback-development-completion-2026-10-08/) | Bound-ray development comparison continuation |
| [bound-ray-feedback-development-v1-2026-10-08](research/reports/bound-ray-feedback-development-v1-2026-10-08/) | Bound-ray matched-feedback development run |
| [build-weakness-audit-2026-10-25](research/reports/build-weakness-audit-2026-10-25/) | Build weakness audit (2026-10-25) |
| [cached-root-search-v1-2026-10-07](research/reports/cached-root-search-v1-2026-10-07/) | Cached root search v1: excluded from evidence |
| [cached-root-search-v2-2026-10-07](research/reports/cached-root-search-v2-2026-10-07/) |  |
| [cached-root-search-v3-2026-10-07](research/reports/cached-root-search-v3-2026-10-07/) |  |
| [cached-root-search-v4-2026-10-07](research/reports/cached-root-search-v4-2026-10-07/) | Cached root assessment in an all-legal Monte Carlo search |
| [capture-retention-assay-v3-2026-10-07](research/reports/capture-retention-assay-v3-2026-10-07/) | Capture-retention assay v3 |
| [capture-retention-cue-audit-2026-10-07](research/reports/capture-retention-cue-audit-2026-10-07/) | Capture-retention cue audit |
| [capture-retention-nearest-cue-baseline-2026-10-07](research/reports/capture-retention-nearest-cue-baseline-2026-10-07/) | Capture-retention nearest-cue baseline |
| [capture-retention-role-ablation-preflight-2026-10-07](research/reports/capture-retention-role-ablation-preflight-2026-10-07/) | Capture-retention role-ablation preflight |
| [capture-retention-transfer-audit-v1-2026-10-07](research/reports/capture-retention-transfer-audit-v1-2026-10-07/) | Capture-retention dataset audit |
| [certified-consequence-2026-10-05](research/reports/certified-consequence-2026-10-05/) | Certified consequence feedback |
| [certified-consequence-replay-2026-10-05](research/reports/certified-consequence-replay-2026-10-05/) |  |
| [checkpoint-sync-repair-2026-10-10](research/reports/checkpoint-sync-repair-2026-10-10/) | Checkpoint synchronization repair and statistical correction |
| [chess-cue-association-prefix-replay-2026-10-05](research/reports/chess-cue-association-prefix-replay-2026-10-05/) |  |
| [chess-cue-association-v1-2026-10-05](research/reports/chess-cue-association-v1-2026-10-05/) | Overlapping chess-cue association: failed choice gates |
| [chess-cue-panel-v1-2026-10-05](research/reports/chess-cue-panel-v1-2026-10-05/) | Naive chess/action input panel |
| [chess-cue-tail-replay-2026-10-05](research/reports/chess-cue-tail-replay-2026-10-05/) |  |
| [chess-memory-ablation-prefix-replay-2026-10-05](research/reports/chess-memory-ablation-prefix-replay-2026-10-05/) |  |
| [chess-memory-ablation-v1-2026-10-05](research/reports/chess-memory-ablation-v1-2026-10-05/) | Post-training memory subsets do not rescue GF choice |
| [chess-memory-envelope-prefix-replay-2026-10-06](research/reports/chess-memory-envelope-prefix-replay-2026-10-06/) |  |
| [chess-memory-envelope-v1-2026-10-05](research/reports/chess-memory-envelope-v1-2026-10-05/) | Efficacy-floor profiles do not change GF choices |
| [codebase-weakness-review-2026-10-30](research/reports/codebase-weakness-review-2026-10-30/) | FlyChess codebase weakness review — 2026-10-30 |
| [compartment-input-balanced-2026-10-06](research/reports/compartment-input-balanced-2026-10-06/) |  |
| [compartment-input-balanced-prefix-2026-10-06](research/reports/compartment-input-balanced-prefix-2026-10-06/) |  |
| [compartment-input-conjoined-2026-10-06](research/reports/compartment-input-conjoined-2026-10-06/) | Candidate-conjoined input: association prerequisite passed |
| [compartment-input-conjoined-balanced-2026-10-06](research/reports/compartment-input-conjoined-balanced-2026-10-06/) | 2026-10-06 completion: four-condition input association comparison |
| [compartment-input-conjoined-balanced-prefix-2026-10-06](research/reports/compartment-input-conjoined-balanced-prefix-2026-10-06/) |  |
| [compartment-input-conjoined-prefix-2026-10-06](research/reports/compartment-input-conjoined-prefix-2026-10-06/) |  |
| [compartment-input-original-2026-10-06](research/reports/compartment-input-original-2026-10-06/) | Original relational input: association prerequisite passed |
| [compartment-input-original-prefix-2026-10-06](research/reports/compartment-input-original-prefix-2026-10-06/) |  |
| [compartment-input-preflight-2026-10-06](research/reports/compartment-input-preflight-2026-10-06/) | Four-condition input preflight and independent projection audit |
| [compartment-puzzle-balanced-2026-10-06](research/reports/compartment-puzzle-balanced-2026-10-06/) |  |
| [compartment-puzzle-balanced-prefix-2026-10-06](research/reports/compartment-puzzle-balanced-prefix-2026-10-06/) |  |
| [compartment-puzzle-comparison-2026-10-06](research/reports/compartment-puzzle-comparison-2026-10-06/) |  |
| [compartment-puzzle-conjoined-2026-10-06](research/reports/compartment-puzzle-conjoined-2026-10-06/) |  |
| [compartment-puzzle-conjoined-balanced-2026-10-06](research/reports/compartment-puzzle-conjoined-balanced-2026-10-06/) |  |
| [compartment-puzzle-conjoined-balanced-prefix-2026-10-06](research/reports/compartment-puzzle-conjoined-balanced-prefix-2026-10-06/) |  |
| [compartment-puzzle-conjoined-prefix-2026-10-06](research/reports/compartment-puzzle-conjoined-prefix-2026-10-06/) |  |
| [compartment-puzzle-original-2026-10-06](research/reports/compartment-puzzle-original-2026-10-06/) |  |
| [compartment-puzzle-original-prefix-2026-10-06](research/reports/compartment-puzzle-original-prefix-2026-10-06/) |  |
| [compartment-puzzle-preflight-2026-10-06](research/reports/compartment-puzzle-preflight-2026-10-06/) |  |
| [component-score-effects-v1-2026-10-07](research/reports/component-score-effects-v1-2026-10-07/) | Component score effects |
| [connectome-provenance-check-2026-10-28](research/reports/connectome-provenance-check-2026-10-28/) | Connectome provenance check: `.cache/full.npz` against FlyWire Codex 783 (2026-10-28) |
| [consequence-clips-software-2026-10-06](research/reports/consequence-clips-software-2026-10-06/) | Bounded teacher replay software probe |
| [consequence-review-2026-10-05](research/reports/consequence-review-2026-10-05/) |  |
| [consequence-review-replay-2026-10-05](research/reports/consequence-review-replay-2026-10-05/) |  |
| [consequence-review-v2-2026-10-05](research/reports/consequence-review-v2-2026-10-05/) |  |
| [consequence-value-feasibility-v1-2026-10-10](research/reports/consequence-value-feasibility-v1-2026-10-10/) | Consequence-value readout feasibility |
| [contrastive-feedback-screen-v1-2026-10-07](research/reports/contrastive-feedback-screen-v1-2026-10-07/) | Contrastive feedback screen v1 — audited result |
| [contrastive-feedback-screen-v2-2026-10-07](research/reports/contrastive-feedback-screen-v2-2026-10-07/) | Contrastive feedback screen v2 — audited failure |
| [correction-preservation-v2-2026-10-08](research/reports/correction-preservation-v2-2026-10-08/) | Correction-preservation v2: completed matched screen |
| [counterfactual-delayed-v1-2026-10-06](research/reports/counterfactual-delayed-v1-2026-10-06/) | Delayed-sacrifice counterfactual probe |
| [counterfactual-transfer-v1-2026-10-06](research/reports/counterfactual-transfer-v1-2026-10-06/) | Counterfactual choice probe |
| [curriculum-g0-assay-v1-2026-10-11](research/reports/curriculum-g0-assay-v1-2026-10-11/) | Curriculum G0 graph assay v1 |
| [curriculum-g0-shuffle-control-diagnostic-2026-10-12](research/reports/curriculum-g0-shuffle-control-diagnostic-2026-10-12/) | G0 shuffled-control schedule sensitivity |
| [curriculum-review-2026-10-21](research/reports/curriculum-review-2026-10-21/) | External curriculum review: checked evidence and third prompt |
| [delayed-common-memory-diagnostic-2026-10-08](research/reports/delayed-common-memory-diagnostic-2026-10-08/) | Common frozen-memory contrast: reporting correction |
| [delayed-lesson-integration-prefix-2026-10-08](research/reports/delayed-lesson-integration-prefix-2026-10-08/) |  |
| [delayed-lesson-integration-resumed-2026-10-08](research/reports/delayed-lesson-integration-resumed-2026-10-08/) | Full sparse-graph delayed lesson integration |
| [delayed-mate-choice-v1-2026-10-08](research/reports/delayed-mate-choice-v1-2026-10-08/) | All-legal mate choice screen: no repair |
| [delayed-mate-chosen-error-v1-2026-10-08](research/reports/delayed-mate-chosen-error-v1-2026-10-08/) | Initial chosen-error targeting: partial correction, no mate choice |
| [delayed-transfer-solvability-2026-10-07](research/reports/delayed-transfer-solvability-2026-10-07/) | Delayed-fixture solvability audit |
| [delta-heldout-coverage-v1-2026-10-06](research/reports/delta-heldout-coverage-v1-2026-10-06/) |  |
| [feedback-quality-review-2026-10-08](research/reports/feedback-quality-review-2026-10-08/) | Retrospective feedback-quality evidence |
| [flybench-current-fly-50-2026-10-10](research/reports/flybench-current-fly-50-2026-10-10/) | Current complete-game fly versus Stockfish: 50 games |
| [flybench-software-2026-10-10](research/reports/flybench-software-2026-10-10/) | FlyBench software implementation record |
| [forcing-loop-v4-2026-10-07](research/reports/forcing-loop-v4-2026-10-07/) | Puzzle loop v4: forcing prior comparison |
| [forcing-loop-v4-neural-2026-10-07](research/reports/forcing-loop-v4-neural-2026-10-07/) |  |
| [forcing-loop-v4-prior-2026-10-07](research/reports/forcing-loop-v4-prior-2026-10-07/) |  |
| [forcing-monte-carlo-extra-eval-v1-2026-10-07](research/reports/forcing-monte-carlo-extra-eval-v1-2026-10-07/) |  |
| [forcing-monte-carlo-v1-2026-10-07](research/reports/forcing-monte-carlo-v1-2026-10-07/) | Forcing-candidate Monte Carlo run |
| [forcing-monte-carlo-v2-2026-10-07](research/reports/forcing-monte-carlo-v2-2026-10-07/) | Repeated forcing-mode Monte Carlo run |
| [forcing-monte-carlo-v3-2026-10-07](research/reports/forcing-monte-carlo-v3-2026-10-07/) | Repeated all-legal Monte Carlo comparison |
| [forcing-prior-search-v1-2026-10-07](research/reports/forcing-prior-search-v1-2026-10-07/) |  |
| [forcing-prior-task3-v1-2026-10-07](research/reports/forcing-prior-task3-v1-2026-10-07/) |  |
| [forcing-shortlist-paired-v1-2026-10-07](research/reports/forcing-shortlist-paired-v1-2026-10-07/) | Forcing shortlist paired profile — preliminary |
| [forcing-shortlist-paired-v2-2026-10-07](research/reports/forcing-shortlist-paired-v2-2026-10-07/) | Forcing shortlist paired profile — superseded summary field |
| [forcing-shortlist-paired-v3-2026-10-07](research/reports/forcing-shortlist-paired-v3-2026-10-07/) | Full-graph forcing-shortlist comparison |
| [forward-kernel-benchmark-2026-10-07](research/reports/forward-kernel-benchmark-2026-10-07/) | Sparse forward kernel benchmark |
| [forward-kernel-unroll-probe-2026-10-07](research/reports/forward-kernel-unroll-probe-2026-10-07/) | Sparse forward kernel benchmark |
| [forward-kernel-unroll-v2-2026-10-07](research/reports/forward-kernel-unroll-v2-2026-10-07/) | Sparse forward kernel benchmark |
| [fushiki-literature-review-2026-10-07](research/reports/fushiki-literature-review-2026-10-07/) | Fushiki literature review and saved-receipt diagnostic |
| [g0-checkpoint-pruning-2026-10-24](research/reports/g0-checkpoint-pruning-2026-10-24/) | G0 intermediate-checkpoint pruning (2026-10-24) |
| [gamma2-adaptive-cue10-2026-10-09](research/reports/gamma2-adaptive-cue10-2026-10-09/) | Gamma2 adaptive cue-capacity hypothesis test (registered; not run) |
| [gamma2-adaptive-target-v1-2026-10-09](research/reports/gamma2-adaptive-target-v1-2026-10-09/) | Adaptive current-error feedback: direction and margin pass, choice fails |
| [gamma2-neural-overlap-v1-2026-10-09](research/reports/gamma2-neural-overlap-v1-2026-10-09/) | Read-only gamma2 neural overlap diagnostic |
| [gamma2-relative-readout-2026-10-09](research/reports/gamma2-relative-readout-2026-10-09/) | Baseline-relative readout hypothesis test |
| [gamma2-temporal-hypothesis-v2-2026-10-09](research/reports/gamma2-temporal-hypothesis-v2-2026-10-09/) | Temporal plasticity hypothesis: direction and specificity pass; puzzle choice fails |
| [gamma4-conditioning-2026-09-30](research/reports/gamma4-conditioning-2026-09-30/) |  |
| [gamma4-resume-2026-09-30](research/reports/gamma4-resume-2026-09-30/) |  |
| [gf-memory-prefix-replay-2026-10-05](research/reports/gf-memory-prefix-replay-2026-10-05/) |  |
| [gf-memory-probe-v1-2026-10-05](research/reports/gf-memory-probe-v1-2026-10-05/) | Stored memory reaches GF, but the proposed clipping erases it |
| [incentive-ltm-mapping-2026-10-25](research/reports/incentive-ltm-mapping-2026-10-25/) |  |
| [independent-wasm-audit-2026-10-10](research/reports/independent-wasm-audit-2026-10-10/) | Independent audit of FlyChess WASM adoption |
| [instinct-design-2026-10-05](research/reports/instinct-design-2026-10-05/) |  |
| [learning-forward-phases-2026-10-07](research/reports/learning-forward-phases-2026-10-07/) | Sparse forward phase profile |
| [learning-iteration-profile-2026-10-07](research/reports/learning-iteration-profile-2026-10-07/) | Learning-iteration timing diagnostic |
| [learning-iteration-profile-signed-weights-2026-10-07](research/reports/learning-iteration-profile-signed-weights-2026-10-07/) | Learning-iteration timing diagnostic |
| [licensed-search-comparison-v1-2026-10-07](research/reports/licensed-search-comparison-v1-2026-10-07/) | Licensed search comparison v1 |
| [lichess-foundations-pilot-2026-10-21](research/reports/lichess-foundations-pilot-2026-10-21/) | First Lichess source-to-consequence development fixture |
| [matched-forcing-prior-ablation-2026-10-07](research/reports/matched-forcing-prior-ablation-2026-10-07/) | Matched forcing-prior ablation |
| [mate-conjoined-input-preflight-2026-10-08](research/reports/mate-conjoined-input-preflight-2026-10-08/) |  |
| [mate-conjoined-input-v1-2026-10-08](research/reports/mate-conjoined-input-v1-2026-10-08/) |  |
| [maturity-review-response-2026-10-30](research/reports/maturity-review-response-2026-10-30/) | Response to the research maturity review (2026-10-30) |
| [mbon-choice-prefix-replay-2026-10-06](research/reports/mbon-choice-prefix-replay-2026-10-06/) |  |
| [mbon-choice-v1-2026-10-06](research/reports/mbon-choice-v1-2026-10-06/) | Frozen MBON-choice V1 result |
| [minimal-transfer-input-check-2026-10-07](research/reports/minimal-transfer-input-check-2026-10-07/) | Bounded input check |
| [monte-carlo-neural-profile-2026-10-07](research/reports/monte-carlo-neural-profile-2026-10-07/) | Monte Carlo neural iteration profile — superseded timing |
| [monte-carlo-neural-profile-v2-2026-10-07](research/reports/monte-carlo-neural-profile-v2-2026-10-07/) | Bounded full-graph Monte Carlo profile |
| [monte-carlo-review-software-2026-10-06](research/reports/monte-carlo-review-software-2026-10-06/) | Monte Carlo consequence-review software probe |
| [move-latency-wasm-2026-10-10](research/reports/move-latency-wasm-2026-10-10/) | Exact WebAssembly sparse accumulation |
| [move-latency-zero-reset-2026-10-10](research/reports/move-latency-zero-reset-2026-10-10/) | Zero-reset move-latency candidate |
| [multi-context-stability-recovery-v1-2026-10-07](research/reports/multi-context-stability-recovery-v1-2026-10-07/) |  |
| [multi-context-stability-transfer-v1-2026-10-07](research/reports/multi-context-stability-transfer-v1-2026-10-07/) | Joint-stability sibling assessment |
| [multi-context-stability-v1-2026-10-07](research/reports/multi-context-stability-v1-2026-10-07/) | Multi-context stability experiment |
| [navigation](research/reports/navigation/) | Report navigation |
| [neural-prior-counterfactual-task3-v1-2026-10-07](research/reports/neural-prior-counterfactual-task3-v1-2026-10-07/) |  |
| [neural-prior-smothered-task3-v1-2026-10-07](research/reports/neural-prior-smothered-task3-v1-2026-10-07/) |  |
| [one-feedback-round-timing-2026-10-08](research/reports/one-feedback-round-timing-2026-10-08/) |  |
| [one-feedback-round-timing-v2-2026-10-08](research/reports/one-feedback-round-timing-v2-2026-10-08/) |  |
| [original-puzzle-retention-certificates-v1-2026-10-07](research/reports/original-puzzle-retention-certificates-v1-2026-10-07/) | Original-puzzle retention certificate preparation |
| [original-puzzle-retention-v1-2026-10-07](research/reports/original-puzzle-retention-v1-2026-10-07/) | First-puzzle retention after second-puzzle learning |
| [paired-delta-fixture-correctness-v1-2026-10-06](research/reports/paired-delta-fixture-correctness-v1-2026-10-06/) |  |
| [paired-delta-fixture-learned-v1-2026-10-06](research/reports/paired-delta-fixture-learned-v1-2026-10-06/) |  |
| [paired-delta-full-graph-v1-2026-10-06](research/reports/paired-delta-full-graph-v1-2026-10-06/) |  |
| [paired-delta-full-graph-wide-v1-2026-10-06](research/reports/paired-delta-full-graph-wide-v1-2026-10-06/) |  |
| [parallel-replicas-2026-10-29](research/reports/parallel-replicas-2026-10-29/) |  |
| [pipeline-fixture-audit-2026-10-06](research/reports/pipeline-fixture-audit-2026-10-06/) |  |
| [plasticity-evidence-review-2026-10-10](research/reports/plasticity-evidence-review-2026-10-10/) | Plasticity evidence review |
| [plasticity-timing-candidate-2026-10-09](research/reports/plasticity-timing-candidate-2026-10-09/) | Gamma2 timing candidate: a route around the signed-DAN prerequisite |
| [positive-channel-association-prefix-2026-10-06](research/reports/positive-channel-association-prefix-2026-10-06/) |  |
| [positive-channel-association-resumed-2026-10-06](research/reports/positive-channel-association-resumed-2026-10-06/) | Positive-channel association V1: complete, acceptance failed |
| [positive-channel-association-v1-2026-10-06](research/reports/positive-channel-association-v1-2026-10-06/) |  |
| [positive-channel-association-v2-2026-10-06](research/reports/positive-channel-association-v2-2026-10-06/) | Positive-channel V2: computational prerequisite passed |
| [positive-channel-association-v2-prefix-2026-10-06](research/reports/positive-channel-association-v2-prefix-2026-10-06/) |  |
| [positive-puzzle-memory-probe-2026-10-06](research/reports/positive-puzzle-memory-probe-2026-10-06/) | Positive-puzzle saved-memory probe: complete and independently audited |
| [positive-puzzle-pipeline-prefix-2026-10-06](research/reports/positive-puzzle-pipeline-prefix-2026-10-06/) |  |
| [positive-puzzle-pipeline-v1-2026-10-06](research/reports/positive-puzzle-pipeline-v1-2026-10-06/) | Verified positive-channel puzzle pilot: complete, useful-choice gates failed |
| [positive-puzzle-ranking-diagnostic-2026-10-06](research/reports/positive-puzzle-ranking-diagnostic-2026-10-06/) | Read-only positive-puzzle ranking diagnostic |
| [positive-puzzle-ranking-local-diagnostic-2026-10-06](research/reports/positive-puzzle-ranking-local-diagnostic-2026-10-06/) | Local activity and full-root ranking diagnostic |
| [public-frame-encoding-preflight-2026-10-08](research/reports/public-frame-encoding-preflight-2026-10-08/) | Public frame encoding preflight |
| [punishment-component-probe-v1-2026-10-07](research/reports/punishment-component-probe-v1-2026-10-07/) | Punishment component diagnostic |
| [puzzle-design-baseline-2026-10-05](research/reports/puzzle-design-baseline-2026-10-05/) |  |
| [puzzle-neural-prefix-2026-10-06](research/reports/puzzle-neural-prefix-2026-10-06/) |  |
| [puzzle-neural-v1-2026-10-06](research/reports/puzzle-neural-v1-2026-10-06/) | Verified-consequence neural fixture V1 |
| [puzzle-pipeline-prefix-2026-10-06](research/reports/puzzle-pipeline-prefix-2026-10-06/) |  |
| [puzzle-pipeline-v1-2026-10-06](research/reports/puzzle-pipeline-v1-2026-10-06/) | Puzzle pipeline V1: audited orchestration, no useful acquisition |
| [puzzle-round-2026-09-30](research/reports/puzzle-round-2026-09-30/) |  |
| [puzzle-round-replay-2026-09-30](research/reports/puzzle-round-replay-2026-09-30/) |  |
| [recovery-causal-prefix-2026-10-06](research/reports/recovery-causal-prefix-2026-10-06/) |  |
| [recovery-causal-v1-2026-10-06](research/reports/recovery-causal-v1-2026-10-06/) | Single-event recovery interventions: no task rescue |
| [recovery-comparison-v1-2026-10-05](research/reports/recovery-comparison-v1-2026-10-05/) | Frozen candidate recovery comparison |
| [recovery-prefix-replay-2026-10-05](research/reports/recovery-prefix-replay-2026-10-05/) |  |
| [relational-cue-panel-v1-2026-10-06](research/reports/relational-cue-panel-v1-2026-10-06/) | Relational input panel V1 |
| [relational-cue-prefix-2026-10-06](research/reports/relational-cue-prefix-2026-10-06/) |  |
| [relay-probe-2026-10-05](research/reports/relay-probe-2026-10-05/) | Fixed circuit response probe |
| [relay-probe-prefix-2026-10-05](research/reports/relay-probe-prefix-2026-10-05/) |  |
| [relay-probe-resumed-2026-10-05](research/reports/relay-probe-resumed-2026-10-05/) |  |
| [representation-learning-prefix-2026-10-06](research/reports/representation-learning-prefix-2026-10-06/) |  |
| [representation-learning-v1-2026-10-06](research/reports/representation-learning-v1-2026-10-06/) | Matched representation learning V1: failed full-root choices |
| [research-maturity-review-2026-10-30](research/reports/research-maturity-review-2026-10-30/) | FlyChess research maturity and external-review assessment |
| [retention-cue-overlap-v1-2026-10-07](research/reports/retention-cue-overlap-v1-2026-10-07/) | Retention cue overlap |
| [retention-event-localization-v1-2026-10-07](research/reports/retention-event-localization-v1-2026-10-07/) | Retention event localization |
| [reversal-candidate-2026-10-05](research/reports/reversal-candidate-2026-10-05/) |  |
| [reversal-diagnostic-2026-10-05](research/reports/reversal-diagnostic-2026-10-05/) | Observed reversal diagnosis |
| [selective-credit-prerequisite-v1-2026-10-08](research/reports/selective-credit-prerequisite-v1-2026-10-08/) |  |
| [selective-credit-prerequisite-v2-2026-10-08](research/reports/selective-credit-prerequisite-v2-2026-10-08/) | Selective-credit depression prerequisite: failed |
| [shared-memory-multi-context-coverage-v1-2026-10-07](research/reports/shared-memory-multi-context-coverage-v1-2026-10-07/) | Shared-memory multi-context coverage v1 |
| [smothered-acquisition-preflight-2026-10-07](research/reports/smothered-acquisition-preflight-2026-10-07/) |  |
| [smothered-acquisition-v1-2026-10-07](research/reports/smothered-acquisition-v1-2026-10-07/) |  |
| [smothered-acquisition-v1-resumed-2026-10-07](research/reports/smothered-acquisition-v1-resumed-2026-10-07/) | Smothered acquisition: resumed run and audited result |
| [smothered-mate-preparation-2026-10-07](research/reports/smothered-mate-preparation-2026-10-07/) | Queen-concession training fixture |
| [smothered-positive-eligibility-v1-2026-10-07](research/reports/smothered-positive-eligibility-v1-2026-10-07/) | Smothered positive-channel eligibility probe |
| [smothered-probe-review-2026-10-07](research/reports/smothered-probe-review-2026-10-07/) | Smothered positive-eligibility probe: static review |
| [smothered-training-variations-v1-2026-10-07](research/reports/smothered-training-variations-v1-2026-10-07/) | Smothered training variation screen |
| [stability-channel-branch-v1-2026-10-07](research/reports/stability-channel-branch-v1-2026-10-07/) | Matched teaching-channel branch |
| [stability-disabled-prefix-v1-2026-10-07](research/reports/stability-disabled-prefix-v1-2026-10-07/) | Disabled-plasticity receipt prefix |
| [stability-dose-memory-drift-v1-2026-10-07](research/reports/stability-dose-memory-drift-v1-2026-10-07/) | Dose memory drift |
| [stability-dose-receipt-prefix-v1-2026-10-07](research/reports/stability-dose-receipt-prefix-v1-2026-10-07/) | Dose receipt prefix audit |
| [stability-dose-recovery-v1-2026-10-07](research/reports/stability-dose-recovery-v1-2026-10-07/) |  |
| [stability-dose-transfer-v1-2026-10-07](research/reports/stability-dose-transfer-v1-2026-10-07/) | All-dose sibling assessment |
| [stability-feedback-dose-v2-2026-10-07](research/reports/stability-feedback-dose-v2-2026-10-07/) | Active feedback dose V2 |
| [stability-informative-prefix-v1-2026-10-07](research/reports/stability-informative-prefix-v1-2026-10-07/) | Completed informative-condition joint repair |
| [stability-joint-prefix-v1-2026-10-07](research/reports/stability-joint-prefix-v1-2026-10-07/) | Intermediate joint repair |
| [stability-prefix-audit-01-2026-10-07](research/reports/stability-prefix-audit-01-2026-10-07/) | Stability first-receipt recurrence audit |
| [stability-prefix-audit-02-2026-10-07](research/reports/stability-prefix-audit-02-2026-10-07/) | Stability first-pair recurrence audit |
| [stability-prefix-audit-03-2026-10-07](research/reports/stability-prefix-audit-03-2026-10-07/) | Stability three-receipt prefix audit |
| [stability-prefix-audit-04-2026-10-07](research/reports/stability-prefix-audit-04-2026-10-07/) | Stability four-receipt prefix audit |
| [stability-recovery-preflight-v1-2026-10-07](research/reports/stability-recovery-preflight-v1-2026-10-07/) | Recovery preflight |
| [stability-search-prefix-v1-2026-10-07](research/reports/stability-search-prefix-v1-2026-10-07/) | Informative search prefix audit |
| [stability-transfer-diagnostic-v1-2026-10-07](research/reports/stability-transfer-diagnostic-v1-2026-10-07/) | Transfer score and input diagnostic |
| [stage1-attack-map-cue-2026-10-27](research/reports/stage1-attack-map-cue-2026-10-27/) | Stage 1 attack-map cue: design, surrogate screens and graph checks (2026-10-27) |
| [stage1-attack-map-cue-v2-2026-10-28](research/reports/stage1-attack-map-cue-v2-2026-10-28/) | Stage 1 attack-map cue v2: design, surrogate validation and screen (2026-10-28) |
| [stage1-cue-sparsity-surrogate-2026-10-29](research/reports/stage1-cue-sparsity-surrogate-2026-10-29/) | Stage 1 cue sparsity on the planner surrogate (2026-10-29, no graph) |
| [stage1-data-separation-check-2026-10-30](research/reports/stage1-data-separation-check-2026-10-30/) | Stage 1 data-separation check (2026-10-30) |
| [stage1-encoder-crosstalk-2026-10-25](research/reports/stage1-encoder-crosstalk-2026-10-25/) |  |
| [stage1-eye-route-2026-10-29](research/reports/stage1-eye-route-2026-10-29/) | Eye input route (input v3 candidate), preparation (2026-10-28/29) |
| [stage1-full-r14-2026-10-30](research/reports/stage1-full-r14-2026-10-30/) | Full Stage 1 run r14: audit result and D4 diagnosis (2026-10-30) |
| [stage1-full-r15-recovery-witness-2026-10-30](research/reports/stage1-full-r15-recovery-witness-2026-10-30/) | Stage 1 full-r15 pending-receipt recovery witness (2026-10-30) |
| [stage1-learnability-diagnostics-2026-10-24](research/reports/stage1-learnability-diagnostics-2026-10-24/) | Stage 1 learnability diagnostics (2026-10-24) |
| [stage1-memory-literature-and-surrogate-2026-10-27](research/reports/stage1-memory-literature-and-surrogate-2026-10-27/) | Stage 1 memory and transfer: literature pass and no-graph surrogate (2026-10-27) |
| [stage1-representation-ceiling-2026-10-27](research/reports/stage1-representation-ceiling-2026-10-27/) | Stage 1 representation ceiling (step 1, 2026-10-27) |
| [stage1-retention-probe-2026-10-24](research/reports/stage1-retention-probe-2026-10-24/) | Stage 1 retention probe (2026-10-24) |
| [stage1-smoke-r13-2026-10-27](research/reports/stage1-smoke-r13-2026-10-27/) | Stage 1 smoke r13 (outcome-only, attack-map cue): early stop and diagnosis (2026-10-27) |
| [stage2-cue-v3-budget-2026-10-29](research/reports/stage2-cue-v3-budget-2026-10-29/) |  |
| [stockfish-feedback-review-2026-10-22](research/reports/stockfish-feedback-review-2026-10-22/) | Stockfish feedback quality review |
| [stockfish-mate-deadline-diagnostic-v1-2026-10-07](research/reports/stockfish-mate-deadline-diagnostic-v1-2026-10-07/) | Stockfish mate-deadline score diagnostic v1 |
| [stockfish-target-feasibility-v1-2026-10-07](research/reports/stockfish-target-feasibility-v1-2026-10-07/) | Stockfish target feasibility v1 |
| [task-aware-forcing-profile-2026-10-07](research/reports/task-aware-forcing-profile-2026-10-07/) | Task-aware Monte Carlo bottleneck loop |
| [task-outcome-adapter-2026-10-22](research/reports/task-outcome-adapter-2026-10-22/) | Root-action outcome feedback repair |
| [training-latency-2026-10-19](research/reports/training-latency-2026-10-19/) | Latest verification:2026-10-19 |
| [training-volume-prefix-2026-10-06](research/reports/training-volume-prefix-2026-10-06/) |  |
| [training-volume-resumed-2026-10-06](research/reports/training-volume-resumed-2026-10-06/) |  |
| [training-volume-resumed2-2026-10-06](research/reports/training-volume-resumed2-2026-10-06/) | Frozen training-volume V1: completed failure |
| [training-volume-v1-2026-10-06](research/reports/training-volume-v1-2026-10-06/) |  |
| [verified-line-explanation-2026-10-06](research/reports/verified-line-explanation-2026-10-06/) | Verified line explanations: teacher-only examples |
| [warmstart-gain-interference-v1-2026-10-07](research/reports/warmstart-gain-interference-v1-2026-10-07/) | Warm-start gain interference diagnostic |
