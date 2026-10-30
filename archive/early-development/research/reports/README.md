# Experiment reports and raw evidence

- [Response to the research maturity review, 2026-10-30](maturity-review-response-2026-10-30/README.md): the Fly's Stage 1 input is a deterministic function of 28 cue tokens (33 patterns in training); a token lookup transfers 23/24 leave-one-family-out; Stage 1 is a positive control for associative valuation, not reasoning; proposes a read-only withheld-relation decodability test.
- [Stage 1 full-r15 recovery witness, 2026-10-30](stage1-full-r15-recovery-witness-2026-10-30/README.md): predeclared D8 pending-receipt recovery check; exactly-once recovery on all 3 replicas (block 7, two interruption kinds); found that the registered stage-level resume cannot resume mid-event (fixed in block v3).
- [Stage 1 data-separation check, 2026-10-30](stage1-data-separation-check-2026-10-30/README.md): researcher-authorized, counts only; 0 shared positions (exact, history, colour-flip/mirror, placement) between train, validation and final; final has 32 distinct pairs covering all 64 boards once. Answers review W01/W02 for the r14/r15 data.
- [Codebase weakness review, 2026-10-30](codebase-weakness-review-2026-10-30/README.md): independent read-only review (Codex CLI); 7 findings W01-W07 (D5 pair-ID trust, D8 recovery flag copied from replay, resume rollback, unpinned dependency closure, babysit lock race, doc drift).
- [Stage 1 full r14, 2026-10-30](stage1-full-r14-2026-10-30/README.md): gate-failed on D4 only (64/128 in every replica; final 61-64/64, pairs 29-32/32, D6 pass); D4 reads tanh(MBON12-MBON01), positive on 1,412/1,412 training rows, so it is structurally 64/128; the choice readout ranks correctly but has no calibrated zero, and learning is mostly aversive.
- [Stage 1 smoke r13, 2026-10-27](stage1-smoke-r13-2026-10-27/README.md): outcome-only attack-map smoke early-stopped (training counts 0, 7, 20, 19, 7, 20); collapses follow punishments of safe quiet moves that share att:none with safe captures; 2 training boards tie by construction; stop S2 for a cue v2 decision.
- [Stage 1 attack-map cue, 2026-10-27](stage1-attack-map-cue-2026-10-27/README.md): researcher option A. Encoder design, r11 surrogate screens (coarse capture tag, 20 cells per token, 5 cell wirings), a read-only full-graph fidelity check (held-out families 21/24 in graph and surrogate, gains learned in the surrogate), mechanics check, registration r12 and probe v8 launch. Diagnostic only.
- [Stage 1 representation ceiling, 2026-10-27](stage1-representation-ceiling-2026-10-27/README.md): step 1 of the representation-first plan; a perfect-memory perceptron is tested on held-out training families for allowed move descriptions (all at chance) and restricted ones (attack map 18.6/24; with king-line 20-21/24). Diagnostic only.
- [Stage 1 memory literature and surrogate, 2026-10-27](stage1-memory-literature-and-surrogate-2026-10-27/README.md): probe v7 interruption, no-graph linear surrogate of the r11 learner (validated against v7 pulses), mechanism and representation screens, static readout/feedback measurements and a literature pass on fly memory, prediction error and KC coding. Diagnostic only.
- [Build weakness audit, 2026-10-25](build-weakness-audit-2026-10-25/README.md): evidence-backed list of memory, mapping, teaching, data and engineering weaknesses of the Stage 1 build, with literature.
- [Stage 1 encoder cross-talk, 2026-10-25](stage1-encoder-crosstalk-2026-10-25/encoder-crosstalk.mjs): no-graph comparison of existing encoders on the retention-probe boards.
- [Stage 1 retention probe, 2026-10-24](stage1-retention-probe-2026-10-24/README.md): fix-goal task 1 eta probe on training boards (with/without Stockfish phase, mover-value cue), cue cross-talk diagnostic and the literature check for a slower dopamine-only recovery rule.
- [Stage 1 learnability diagnostics, 2026-10-24](stage1-learnability-diagnostics-2026-10-24/README.md): read-only scripts and measurements behind the input and memory diagnosis (86% same-board cue overlap; lesson effects erased by later lessons; no taught advantage in smoke r6 lesson choices).
- [G0 intermediate-checkpoint pruning, 2026-10-24](g0-checkpoint-pruning-2026-10-24/README.md): researcher-approved deletion of 164,280 G0 checkpoints (96.12 GiB) with a SHA-256 manifest; results, audits and receipts kept.

- [Synthetic Stage 1 microfamily feasibility v2, 2026-10-23](babysit-stage1-synthetic-microfamily-feasibility-v2-2026-10-23.json): requires the Lichess puzzle's first move; finds 4 train and 5 validation source roots, still below training quota and not independently audited.
- [Synthetic Stage 1 microfamily feasibility v1, 2026-10-23](babysit-stage1-synthetic-microfamily-feasibility-v1-2026-10-23.json): superseded because it used any legal capture rather than the puzzle's prescribed first move.
- [Training-only Lichess capture-retention stratum feasibility, 2026-10-23](babysit-stage1-capture-retention-strata-v1-2026-10-23.json): mechanism coverage only; not family, learning or reasoning evidence.
- [Training-only derived capture-family v2 audit, 2026-10-23](babysit-stage1-derived-capture-families-audit-v2-2026-10-23.json): 1,653 replayed pairs grouped into 613 proposed causal-role signatures; no family-separation or graph authorization.
- [Stage 1 derived capture-family candidates v1, 2026-10-23](babysit-stage1-derived-capture-families-audit-v1-2026-10-23.json): independent replay passed 1,653 candidate pairs; focal-geometry grouping is too specific and grants no training eligibility.
- [Lichess-rooted pinned recapture feasibility v1/v2, 2026-10-23](babysit-stage1-pinned-recapture-potential-v1-2026-10-23.json): bounded one-piece search from the current training roots; zero pairs, no general impossibility claim.
- [Existing Stage 1 training capture strata, 2026-10-23](babysit-stage1-training-pinned-capture-coverage-v1-2026-10-23.json): train-only coverage audit; no open, blocked or pinned cases.
- [Validation v3 Stage 1 capture counterfactual audit v3, 2026-10-23](babysit-stage1-validation-v3-capture-counterfactual-audit-v3-2026-10-23.json): independently replayed 822 static flips; synthetic-history candidates only, exact signature overlap remains, and the four-stratum gate is unmet.
- [Validation v3 Stage 1 king-relocation audit v5, 2026-10-23](babysit-stage1-validation-v3-capture-counterfactual-audit-v5-2026-10-23.json): independently replayed 1,277 validation-only flips; no classified pin/block stratum, with check states unknown and teaching disabled.
- [Root-action outcome adapter repair, 2026-10-22](task-outcome-adapter-2026-10-22/README.md)
- [Registered G0 recovery and supervisor inspection, 2026-10-22](babysit-recovery-2026-10-22/README.md)

- [Stockfish feedback method review and focused software checks, 2026-10-22](stockfish-feedback-review-2026-10-22/README.md)

- [Plasticity diagnosis from completed experiments, with source/provenance checks](plasticity-evidence-review-2026-10-10/README.md)

- [Baseline-relative readout hypothesis: fixture prediction reproduces; fresh-seed test invalidated](gamma2-relative-readout-2026-10-09/README.md)

- [Warm-start repair on a second development position](adaptive-near-transfer-repair-v2-2026-10-07/README.md)
- [Sibling evaluation after repair: choices fail, two ranks degrade](adaptive-near-transfer-repair-transfer-v1-2026-10-07/README.md)

- [Fushiki literature review and saved-receipt diagnostic, 2026-10-07](fushiki-literature-review-2026-10-07/README.md)
- [Smothered positive-channel eligibility probe, 2026-10-07](smothered-positive-eligibility-v1-2026-10-07/README.md)
- [Full-graph Monte Carlo neural iteration profile, 2026-10-07](monte-carlo-neural-profile-v2-2026-10-07/README.md)
- [Paired full-graph forcing shortlist profile, 2026-10-07](forcing-shortlist-paired-v3-2026-10-07/README.md)
- [Audited contrastive feedback screen, 2026-10-07](contrastive-feedback-screen-v1-2026-10-07/README.md)
- [Forcing-prior contrastive screen v2: acquisition failed](contrastive-feedback-screen-v2-2026-10-07/README.md)
- [Puzzle loop v4: matched forcing-prior comparison, 2026-10-07](forcing-loop-v4-2026-10-07/README.md)
- [Adaptive near-transfer v4: improved ranks, choices still fail](adaptive-near-transfer-v4-2026-10-07/README.md)

Read [current status](../../documentation/current-status.md) for conclusions. This folder preserves raw results, receipts, checkpoints, source snapshots and independent audits at their pinned paths. They are grouped here through navigation pages; raw directories are not relocated.

- [Association and reversal evidence](navigation/association.md)
- [Puzzle-learning evidence and interrupted-run recovery](navigation/puzzle-learning.md)
- [Memory, input and circuit diagnostics](navigation/diagnostics.md)
- [Search, verification and software evidence](navigation/search-and-software.md)
- [Supervised baseline measurements](navigation/supervised-baselines.md)

## Reading a run

Start with its README when present, then its report/result and independent audit. Prefix/replay directories validate recovery; they are not additional independent training seeds. Interrupted and resumed invocations remain separate artifacts; combine measurements only with an explicit whole-run accounting. A checkpoint or successful audit does not override a failed scientific gate.

The conjoined-balanced association invocation completed during documentation review; its independent audits were not yet present at the follow-up. A missing summary is not proof of failure or completion. Recheck authoritative process state and raw artifacts before starting experiments. Immutable archived sources may refer to [older documentation paths](../../documentation/relocation-map.md).

[Research guide](../README.md) · [Design topics](../../documentation/design/README.md)

- [Adaptive contrastive coverage v1](adaptive-contrastive-coverage-v1-2026-10-07/README.md)

- [Adaptive acquisition transfer diagnostic](adaptive-coverage-transfer-diagnostic-2026-10-07/README.md)

- [Licensed all-legal search comparison](licensed-search-comparison-v1-2026-10-07/README.md)

- [Audited smothered training variations](smothered-training-variations-v1-2026-10-07/README.md)
- [Warm-start gain interference diagnostic](warmstart-gain-interference-v1-2026-10-07/README.md)
- [Original-puzzle retention certificate preparation](original-puzzle-retention-certificates-v1-2026-10-07/README.md)
- [Retention event localization](retention-event-localization-v1-2026-10-07/README.md)
- [Punishment component diagnostic](punishment-component-probe-v1-2026-10-07/README.md)
- [Retention cue overlap diagnostic](retention-cue-overlap-v1-2026-10-07/README.md)
- [Component score effects](component-score-effects-v1-2026-10-07/README.md)
- [Active multi-context stability experiment](multi-context-stability-v1-2026-10-07/README.md)
- [Intermediate stability joint repair](stability-joint-prefix-v1-2026-10-07/README.md)
- [Completed informative stability condition audit](stability-informative-prefix-v1-2026-10-07/README.md)
- [Matched stability teaching-channel branch](stability-channel-branch-v1-2026-10-07/README.md)
- [Disabled-plasticity stability receipt audit](stability-disabled-prefix-v1-2026-10-07/README.md)
- [Stability recovery static preflight](stability-recovery-preflight-v1-2026-10-07/README.md)
- [Informative stability search prefix audit](stability-search-prefix-v1-2026-10-07/README.md)
- [Joint-stability development sibling assessment](multi-context-stability-transfer-v1-2026-10-07/README.md)
- [Stability transfer score/input diagnostic](stability-transfer-diagnostic-v1-2026-10-07/README.md)
- [Mixed feedback dose V2](stability-feedback-dose-v2-2026-10-07/README.md)
- [Dose receipt prefix audit](stability-dose-receipt-prefix-v1-2026-10-07/README.md)
- [Dose memory drift diagnostic](stability-dose-memory-drift-v1-2026-10-07/README.md)
- [All-dose sibling assessment](stability-dose-transfer-v1-2026-10-07/README.md)
- [Bounded minimal-transfer input check](minimal-transfer-input-check-2026-10-07/README.md)
- [Bound-ray read-only activity screen: input reaches KC activity; choice gate still fails](bound-ray-activity-probe-v1-2026-10-07/README.md)
- [Completed correction-preservation v2 matched screen: repair gate fails](correction-preservation-v2-2026-10-08/README.md)

- [Adaptive contrastive coverage v2 cue-width hypothesis](adaptive-contrastive-coverage-v2-2026-10-09/README.md)

- [Gamma2 cue-capacity v8-to-v10 hypothesis (registered)](gamma2-adaptive-cue10-2026-10-09/README.md)

- [FlyBench software implementation and mistake record](flybench-software-2026-10-10/README.md).

- [Requested current-fly 50-game Stockfish evaluation](flybench-current-fly-50-2026-10-10/README.md).

- [Zero-reset move-latency candidate: staged equivalence and matched comparison protocol](move-latency-zero-reset-2026-10-10/README.md)

- [Exact WASM sparse accumulation: candidate regression and matched move-latency comparison](move-latency-wasm-2026-10-10/README.md)

- [Independent WASM adoption audit: exact engineering checks pass; checkpoint defect and statistical limits remain](independent-wasm-audit-2026-10-10/README.md)

- [Separate checkpoint synchronization repair and dated median correction](checkpoint-sync-repair-2026-10-10/README.md).

- [Consequence-value readout: 2/2 taught choices; new-board feasibility rejected, full replay passes](consequence-value-feasibility-v1-2026-10-10/README.md).

- [G0 shuffled-control schedule sensitivity (static only, 2026-10-12)](curriculum-g0-shuffle-control-diagnostic-2026-10-12/README.md)

- [2026-10-19 training latency investigation](training-latency-2026-10-19/README.md): component evidence; whole-training comparison pending.

- [Lichess validation source, preparation and independent audit](lichess-foundations-pilot-2026-10-21/README.md): 192 validation histories and Stage 1 consequence-domain certificates verified; no neural-training authorization.
