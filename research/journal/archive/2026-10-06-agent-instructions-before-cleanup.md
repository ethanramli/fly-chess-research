# Historical AGENTS.md before documentation cleanup

Archived 2026-10-06. Historical snapshot, not current instructions or current experiment status. Local links were updated for navigation; original text is preserved below.

# FlyChess project instructions

## Project objective

Build a from-scratch connectome-constrained simulation that learns chess through experience and feedback while staying usable on a laptop with about 8 GB total RAM and as little as 3 GB available. Preserve the released wiring. The teacher presents puzzles and feedback; lasting adaptation should arise through an explicitly modeled, biologically justified mechanism inside the simulation. Strategic position evaluation and transfer to unfamiliar positions remain the research outcomes. Do not replace this objective with fine-tuning a pretrained chess model.

The researcher clarified this direction on 2026-09-30. Read `documentation/design/research-goals/feedback-learning.md` for the teacher/brain boundary and current unresolved questions. The older supervised protocol remains baseline and draft material; it does not specify the intended biological-learning experiment.

## Researcher scope clarification and deferred evaluation (2026-10-06)

- Preserve the original reasoning goal: varied puzzle experience, bounded seeded Monte Carlo investigation on a separate board, high-quality independently verified consequence feedback, supported persistent neural adaptation, and unfamiliar/counterfactual transfer. Repeated moves, event counts, changed gains or successful external search do not prove reasoning.
- Treat insufficient training volume as a competing hypothesis. Failures at four/eight experiences do not establish universal incapacity. Compare frozen experience budgets and matched feedback controls; distinguish more training from more independent test runs. Do not assume human-like plasticity or equate numerical steps/CPU rest with biological timing or consolidation.
- Scale experience volume within approximately 8 GB total/3 GB available RAM using the sparse serial path, bounded search/state, streamed records and resumable checkpoints. Preserve the resource guards below; do not assume a dense batch or many simultaneous brain instances are necessary for Monte Carlo training.
- The researcher explicitly requests future **FlyChess snapshot tracking and an evaluation system calibrated against Stockfish to predict Elo performance**. Document this accepted scope in README.md; implementation of that future system is not required to conclude the current goal. Finish and verify the original goal against its existing requirements, without expanding its completion gate to include the Elo system. Do not claim the original goal is complete merely because future scope is documented.
- For the future evaluator, pin snapshot/model/memory/encoder/readout/policy identities and benchmark versions. Freeze learning during evaluation. Measure unaided and fixed-search-budget strength separately; Elo is not a substitute for reasoning/transfer evidence.
- Stockfish calibration must record engine version/binary hash, strength settings, threads, hash memory, compute/time control, opening sample and colour balance, and reference-game outcomes. Respect the same hardware limits and preserve raw results/resumability. Do not treat a configured Stockfish rating, puzzle accuracy or an arbitrary score conversion as measured Elo calibration.
- Specify the target rating scale and reference pool; validate any benchmark-to-Elo predictor on disjoint calibration/validation data and report prediction error and uncertainty. Do not use final test families for fitting, sampling, checkpoint selection or tuning. No calibrated predictor or Stockfish pipeline currently exists.
- Both current chess encoders bypass modeled eyes and stimulate mapped KCs from symbolic input. Do not imply visual perception from the presence of connectome wiring; a natural visual pathway is separate, unimplemented work.

## Learning requirements

- Treat the rubric as feedback on choices and consequences. Directly supervised criterion predictions can be a comparison condition, but must not silently replace this objective.
- Preserve neuron identities, graph topology and the model's fixed sign conventions. Distinguish fixed wiring from persistent physiological or memory state that may change through a supported learning mechanism.
- The teacher supplies experiences and feedback, not calculated parameter updates. Adam/backpropagation runs provide supervised baseline or engineering evidence, not evidence of endogenous fly learning.
- A generic weight-update formula does not become biologically justified by putting it inside a class named "brain". Specify the reward pathway, plasticity mechanism and location of lasting memory, with primary-source evidence and explicit approximations.
- Verify that required neuron identities and annotations are available for the released graph. Do not invent reward-neuron mappings, label an arbitrary scalar as dopamine, or imply that the wiring diagram alone provides learning dynamics.
- Identify what changes during learning, how feedback causes it, what persists across trials, and how it is checkpointed. Recording a feedback event is not a neural learning mechanism.
- Validate a candidate mechanism on a bounded association task, retention and reward reversal, compared with a matched control without informative feedback, before interpreting chess results as learning. The gamma4 prototype passes software timing/retention checks and now has an engineered two-cue choice/contingency-reversal experiment. V2 acquisition strengthened the rewarded preference in 6/6 seeds, but reversed choices succeeded in only 3/6; both V1 and V2 failed overall acceptance. It remains biologically unvalidated. Preserve those failures rather than presenting positive response changes as adequate reversal.

## Current milestone and next step

2026-10-06 update: [fixed MBON choice](../../../documentation/design/neural-learning/mbon-choice.md) passes its computational acquisition/reversal prerequisite, while the [isolated verified puzzle-feedback path](../../../documentation/design/puzzle-learning/verified-neural-feedback.md), [adaptive review](../../../documentation/design/puzzle-learning/adaptive-review.md) and [matched representation comparison](../../../documentation/design/chess-input/representation-comparison.md) still fail useful full-root fixture choice. Preserve all earlier failures below. The matched comparison independently audits all 32 updates, 84 certificate uses and after-update resume; its short shuffle is identical and uninformative. The frozen [8/32/128 repetition experiment](../../../documentation/design/puzzle-learning/training-volume.md) is complete: both encoders fail all gates, while 1,024 transitions, 1,056 certificate uses and pending-receipt resume audit. Repetition-only repair fails within this fixed schedule/budget; broader volume/coverage hypotheses remain unresolved. The separate Monte Carlo experience pipeline is complete and independently audited but demonstrates no useful acquisition: the wrong fixture stays wrong and the other already succeeds. The positive-channel association is complete and independently audited: acquisition/reversal correct 6/6, but overall acceptance fails acquisition-versus-shuffled specificity (p=0.0625); retain that failure and do not integrate as validated. Verified consequence clips are teacher-only software evidence, not integrated neural learning. Neither familiar repair nor engineering audits establish unfamiliar reasoning. Future Stockfish/Elo evaluation is documented above, not an additional current goal gate.

One isolated puzzle/search/feedback-recording round runs on the full graph. The fixture selected `Qh7#` and recorded `+1`; all graph and parameter hashes stayed unchanged. The receiver explicitly reports `appliedToNeurons: false` and `learningApplied: false`. This is task-plumbing evidence, not a successful learning round. The browser player is separate and still uses an untrained one-ply policy.

An isolated gamma4 conditioning prototype now maps 1,056 existing KC-to-MBON edges and 22 PAM08 neurons using pinned FlyWire annotations. It implements an explicitly unfitted, timing-dependent local efficacy rule, atomic persistent memory and matched controls on the full graph. It preserves wiring and nonplastic parameters. The observed association/retention/temporal-reversal result is engineering evidence only. Direct experimental stimulation is not a reconstructed natural reward pathway; its MBON response contrast is not a behavioral choice. See `documentation/design/neural-learning/gamma4-plasticity.md` for sources and limitations.

Two frozen six-seed experiments now test a fixed software choice decoder with contingent, absent, pulse-count-matched shuffled and disabled-plasticity feedback. V1's three acquisition failures had no acquisition rewards. V2 used new seeds and sampled both cues once before free choice: rewarded preference strengthened in 6/6, and reset/restoration established causality of stored efficacy; only 3/6 made the correct reversed choice. See `documentation/design/neural-learning/gamma4-association-tests.md`. The full learning acceptance gate remains outstanding.

The earlier next step was to diagnose incomplete contingency reversal and connect puzzle feedback; the isolated follow-ups above do not complete the broader learning goal. Continue testing supported learning and the volume hypothesis, justify sensory/action/reward interfaces and independent predictions, and demonstrate useful puzzle choices and transfer. Do not silently wire chess reward scalars to arbitrary neurons or describe deterministic no-decay persistence as measured biological retention. Do not tune completed experiment gates or replace missing reward-omission dynamics with an unsupported negative update. The researcher's sequence remains: **working puzzle-and-feedback learning round -> latency optimization -> scaling**. Neither record-only search nor these association checks satisfy the chess-learning gate.

## Puzzles and hypothetical calculation

- A separate seeded stochastic path exists in `.codebase/src/lowram/monte-carlo-puzzle-search.mjs`, with post-commitment replay in `trace-consequence-review.mjs`. See `documentation/design/search-and-feedback/monte-carlo-traces.md`. Its 79-trace/12-certificate synthetic-policy audit and 64 tests are software evidence only; this path has not run fly inference, neural feedback or transfer. Preserve frozen deterministic search sources. Complete bounded trace replay must precede unsampled-defense claims; a larger streaming review summary and search-resume protocol remain unfinished.

- Start with bounded puzzle experience; self-play is an alternative or later condition, not an assumed replacement for the requested puzzle-first approach.
- Use a second board for hypothetical moves. Preserve the real task position and relevant move history, including repetition, during calculation.
- Bound simulations, model evaluations, search depth, node storage and elapsed time. Record which bounds stopped the search; a soft deadline cannot interrupt an evaluation already running.
- Separate candidate generation, defensive-reply exploration and position assessment. Diagnose candidate omission, incorrect evaluation, missed refutation and inadequate search depth separately.
- Assess consequences against justified defensive replies. A tactic working against weak sampled play is not a verified success against best defense.
- Keep search estimates and visit counts separate from independently verified feedback. If verification exhausts its budget, report unknown; do not convert uncertainty into failure or reward.
- Keep delayed credit assignment explicit when feedback follows a sequence. Include sacrifices, intermediate moves and combinations of motifs in future evaluations without claiming these abilities from the mate-in-one fixture.
- Use only training evidence to target weaknesses. Immediate retries are not transfer; hold out related families and novel motif combinations.

## Resource constraints

- Keep the full graph sparse. Never materialize a dense adjacency matrix or an edge-by-batch tensor.
- Process one position at a time. For supervised baselines, accumulate gradients in typed arrays. For candidate biological mechanisms, bound persistent state and traces without retaining an unbounded trial/search history. A larger effective batch must increase elapsed time, not resident activation memory.
- Stream JSONL data; do not load a complete dataset into memory.
- Keep checkpoints resumable and write them atomically.
- Preserve the existing soft guard in `.codebase/scripts/train-pilot.mjs` and use equivalent checks for new experiment runners: 768 MiB RSS and at least 256 MiB free system memory. A guard failure should be recoverable by resuming the last completed checkpoint.
- Use `node --max-old-space-size=256` for training and puzzle experiment commands. This does not cap typed-array memory, so always inspect recorded RSS.
- For a responsive laptop, use `--cpu-duty 0.5`; this is a compute/rest schedule, not a hard OS CPU cap.

The measured supervised reference run processed the full 134,209-neuron graph with Adam and bounded shuffle at **175.4 MiB peak process RSS**. The isolated record-only puzzle fixture used **101.77 MiB peak process RSS**. These are observations from different workloads, not a comparative resource improvement or universal guarantees.

## Current puzzle-round command

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-round.mjs `
  --out runs/puzzle-round-001 `
  --cpu-duty 0.5
```

This uses the single engineering fixture in `research/data/puzzle-round-fixture/puzzles.jsonl` and records feedback without learning. Preserve raw `result.json` and `state.json` files. Resume into a new directory with `--resume PATH_TO_STATE_JSON`, retaining input hashes, seed and search/pacing settings. These are round-state checkpoints, not trained-weight checkpoints. See `documentation/design/puzzle-learning/record-only-round.md` for commands and limits.

## Existing supervised baseline command

Use this path for explicitly scoped supervised comparisons or engineering checks. It does not satisfy the biological-learning objective above.

```powershell
node --max-old-space-size=256 .codebase/scripts/train-pilot.mjs `
  --dataset research/data/coverage-pilot-v2 `
  --optimizer adam `
  --learning-rate 0.001 `
  --cpu-duty 0.5 `
  --shuffle-buffer 24 `
  --out runs/my-training-run `
  --epochs 1 `
  --max-pairs 169
```

Resume into a new output directory with `--resume PATH`, preserving the dataset, optimizer, learning rate, shuffle settings, and graph checksums.

## Scientific rules

- Document every externally sourced solution in `research/literature/source-solution-register.md` and its linked mechanism note before experimental use. Include the direct source, access date/coverage, supported claim, proposed adaptation, assumptions, implementation/test status and raw evidence. Separate source-backed findings from engineering choices and researcher hypotheses; preserve failures and corrections.

- Keep initialization from scratch unless the research question is explicitly changed.
- Keep train, validation, and test families disjoint. Never use the test split for checkpoint selection, label weighting, sampling, or tuning.
- Report each criterion separately as well as the aggregate loss. A lower aggregate loss is not enough if one criterion gets worse.
- Select checkpoints using validation gates; evaluate the frozen test split only after selection.
- Distinguish engineering evidence (memory, numerical correctness, resumability) from scientific evidence (generalization, strategic chess strength, or reasoning).
- Distinguish successful external search, recorded reward, neural feedback, persistent learning and held-out transfer. Report which stages actually ran; do not infer one from another.
- Measure unaided choices separately from choices under a fixed search budget. Grandmaster-inspired relationships or ideas remain hypotheses until tested; a connectome constraint does not establish human-like cognition or a biological fly understanding chess.
- Current pilot targets cover material balance and a bounded capture/recapture calculation. They do not establish complete-game chess ability.
- Do not describe the cached-hybrid path as faster until matched time-to-quality evidence exists.

## Files and workflows

- `documentation/design/search-and-feedback/line-explanations.md` and `.codebase/src/lowram/verified-line-explanation.mjs`: post-commitment explanations attach actual captures/material accounting and earlier attacker choices to independently checked consequences; 75 project tests pass. Teacher-only rook-concession examples are implementation fixtures, not held-out transfer tests or proof of sacrifice necessity. The current receiver uses the existing outcome/reinforcement interface; prose/diagnostic fields are not calculated parameter updates or validated semantic learning. Volume publication failure in `training-volume-resumed-2026-10-06/interruption.json` is preserved; it resumed unchanged from published checkpoint 1422 into `training-volume-resumed2-2026-10-06/`. Do not acknowledge checkpoint-01423.partial or duplicate the pending neural update.

- `.codebase/scripts/train-puzzle-pipeline.mjs` and `audit-puzzle-pipeline.mjs`: prepared full-graph orchestration/control/receipt audit under `research/data/puzzle-pipeline-v1/protocol.json`; runner has not started and live audit/after-update prefix validation remain pending. Two declared engineering fixtures pass independent solvability checking in `research/reports/pipeline-fixture-audit-2026-10-06/`; they are not held-out transfer data. Launch only after the existing volume run is terminal. The stalled original volume invocation was command-verified and terminated for unchanged-source checkpoint recovery; preserve `controlled-recovery.json`, original receipts and `training-volume-resumed-2026-10-06/`. Do not use resumed metrics as a complete-run measurement.

- `documentation/design/puzzle-learning/experience-pipeline.md`: new bounded read-only planner and wrapper around existing mapped memory; 72 tests pass with numerical fixtures, full-graph orchestration/results pending. `.codebase/src/lowram/puzzle-experience-plan.mjs` produces checked board/action replay experiences; `mapped-puzzle-brain.mjs` independently rechecks them before mapped stimulation/local observation. Preserve unknown handling and frozen investigation memory. Its neutral leaf heuristic is not a learned strategic evaluator. Caller must pin all identities/invariants and atomically checkpoint memory plus pending receipt before acknowledging an update; this wrapper does not itself implement resumable orchestration or delayed eligibility.

- `documentation/design/research-goals/feedback-learning.md`: current research intent, teacher/brain boundary, corrections and unresolved learning design.
- `documentation/design/neural-learning/gamma4-plasticity.md`: evidence, mapped gamma4 plasticity assumptions, protocol, measurements and limitations.
- `documentation/design/neural-learning/gamma4-association-tests.md`: frozen choice experiments, controls, causal memory ablations, failed gates and interpretation.
- `.codebase/scripts/validate-learning.mjs`: bounded choice/contingency experiment with per-trial atomic checkpoints; use `--protocol` to select a frozen specification.
- `.codebase/scripts/audit-learning.mjs`: independent consistency audit of raw choice/feedback/memory records; an audit pass does not override failed acceptance.
- `research/data/association-validation-v1/` and `research/data/association-validation-v2/`: frozen specifications; V2 is an opportunity-controlled follow-up with new seeds, not a replacement for V1.
- `.codebase/scripts/condition-fly.mjs`: bounded stimulation/conditioning experiment; `--out NEW_DIRECTORY --cpu-duty 0.5`, optional `--resume STATE_JSON`.
- `.codebase/src/lowram/mushroom-body.mjs`: streamed identity mapping and compartment-local persistent efficacy/traces; not a generic chess reward receiver.
- `documentation/design/puzzle-learning/record-only-round.md`: isolated puzzle-round implementation, measurements, limits and learning gate.
- `documentation/design/supervised-baselines/low-memory-training.md`: memory algorithm, measurements, limitations, and experiment gates.
- `documentation/design/supervised-baselines/dataset-format.md`: dataset and split contract.
- `.codebase/scripts/puzzle-round.mjs`: streamed puzzle runner and atomic round-state checkpoints; record-only feedback.
- `.codebase/src/lowram/puzzle-round.mjs`: task verification, fixed readout, feedback recorder and graph/parameter identity checks.
- `.codebase/src/lowram/puzzle-search.mjs`: separate-board bounded PUCT and independent bounded mate verification.
- `.codebase/scripts/train-pilot.mjs`: supervised baseline training and checkpointing entry point.
- `.codebase/scripts/evaluate-split.mjs`: frozen split evaluation.
- `.codebase/scripts/evaluate-position.mjs`: inference for named FEN criteria; it does not search moves.
- `research/reports/`: generated audits and measurements; preserve raw reports alongside summaries.
- `research/project/decision_log.md`: consequential decisions; distinguish researcher instructions from assistant proposals and unresolved mechanisms.
- `research/journal/`: dated discussion/experiment entries; follow its README and append dated corrections rather than silently rewriting history.
- `.cache/full.npz`: downloaded graph cache; verify its pinned SHA-256 before use.

## Change discipline

- Prefer small, reviewable changes and preserve the sparse serial execution path.
- Do not add dependencies, workers, GPU requirements, or dense intermediate tensors without a measured memory justification.
- When changing core math, run `npm test` and record the relevant result. For documentation or report-only changes, testing is unnecessary.
- When changing feedback, search, learning or persistence, verify reward perspective, unknown-outcome handling, task/search separation, state persistence and the applicable wiring invariants. Record-only rounds must preserve all parameter hashes; later justified learning mechanisms must document their specific permitted state changes.
- Before claiming a resource improvement, record peak RSS, elapsed time, CPU time, graph/dataset hashes, and the exact command.
- Keep documentation, the decision log and journal consistent with material changes in research direction or experiment status. Label proposed mechanisms and tests as proposed until implemented and validated.
- State limitations plainly; a successful run is not evidence that the fly has learned useful chess.

## 2026-10-06 frozen positive-channel V2 follow-up
See documentation/design/neural-learning/positive-feedback-v2.md. V1 remains failed. V2 uses fresh seeds and balanced cue/valence shuffled feedback without changing neural dynamics or acceptance gates. Full-graph results and independent after-update recovery audits are pending; do not claim validated puzzle learning or reasoning from this prerequisite.

## 2026-10-06 completion: balanced positive-channel V2
The separately frozen full-graph V2 experiment is terminal and passes all seven recorded gates. Acquisition/reversal correct and ranking switch: 6/6 informative seeds. All four absent/shuffled effect comparisons: six positives, no ties, p=0.015625. Independent record and pending-receipt recovery audits pass 480 transitions/384 local updates; prefix exact with zero new evaluations. Report SHA-256 910e223612751face371cc59558b737ab4e0738bfae6b89baff2705f01f2acbb. Full invocation: 104.671875 MiB peak RSS, 442.1698092 s elapsed, 260.265 s CPU, 840 evaluations. This supersedes V2 pending statements, preserves V1's failure, and establishes a computational association prerequisite only. Useful puzzle learning and unfamiliar/counterfactual reasoning remain unproved. Next: a separate verified positive-channel puzzle condition, with matched controls and all-legal choice evidence. Raw evidence: research/reports/positive-channel-association-v2-2026-10-06/.

## 2026-10-06: Positive-channel puzzle pilot frozen
A separate verified two-valence puzzle adapter/runner/auditor is prepared under documentation/design/puzzle-learning/positive-feedback-pilot.md. The audited balanced association prerequisite passes, while original puzzle failures remain preserved. Same declared fixtures, relational encoder, learning rule, readout and bounded investigation; five matched-experience conditions isolate positive stimulation. Pilot gates frozen before execution; unknown produces no event. Tests 84/84 and syntax checks pass. Full-graph outcomes, receipt/trace/recovery audits and all unfamiliar reasoning evidence remain pending.

2026-10-06 execution update: the separate positive-puzzle pilot is live in research/reports/positive-puzzle-pipeline-v1-2026-10-06 after a read-only process check found no other graph run. Published checkpoint 00012 records four acknowledged informative experiences and the measurement phase; source archives match checkpoint hashes. Results and independent receipt/trace/recovery audits remain pending. Preserve the frozen sources during execution.

## 2026-10-06 completion: positive-puzzle pilot failed useful acquisition
The full-graph positive-puzzle comparison is terminal. Useful-choice and repair-above-absent/disabled gates fail; persistence/causal reset and fixed state pass. Informative/punishment-only KQK remains wrong (Qb3), KRK already succeeds. Absent/disabled preserve initial choices; shuffled degrades KRK and both searched outcomes. Receipt/prefix audits pass 80 certificate uses and 32 enabled updates; exact pending-receipt recovery has zero neural presentations. Trace audit passes 9 informative trajectories/8 explanations/2 defense diagnostics. Complete invocation: 109.5078125 MiB RSS, 916.0918095 s elapsed, 432.437 s CPU, 1692 presentations. Report SHA-256 01a7ab038b03474283580e0dd5f8cb821512dbac4f6833eb45192925dbe5445b. This supersedes pilot live/pending statements; the association prerequisite remains passed, but useful puzzle learning and original reasoning remain unproved. Raw evidence: research/reports/positive-puzzle-pipeline-v1-2026-10-06/README.md. The separate read-only memory probe started only after main/prefix terminal completion and passing audits; its results remain pending.

## 2026-10-06 completion: positive-puzzle memory contribution probe
Read-only full-graph probe is terminal; independent auditor passes six saved-memory interventions and 156 legal-candidate records, exact baseline/final/restored reproduction. Isolated one-edge PAM02 change raises Qh7 score by 0.0004179924726 but improves its margin over Qf5 by only 0.0000000107102; all 26 candidate offsets are nearly common (0.0004178909585 to 0.0004180357791), so choice stays Qf5. Complete first-event/PPL-only states worsen the target margin. Final memory exposes failed Qb3. This supports investigating action-specific eligibility/representation without ruling out coverage; no unique biological cause or validated repair is established. Report SHA-256 496e80a914ba49db835ed1c5033a73caf9f0614419b6423b8f30411de755ff74. Resources: 101.0859375 MiB RSS, 109.4277453 s elapsed, 49.719 s CPU, 156 presentations. Raw evidence: research/reports/positive-puzzle-memory-probe-2026-10-06/README.md. This supersedes probe pending statements. Original useful chess learning and unfamiliar reasoning remain unproved.

## 2026-10-06: Candidate-specific eligible-pool input hypothesis implemented
Separate compartment-chess-cue encoder supports a four-condition conjunction/projection comparison. Original pooled stimuli reproduce existing relational V2 exactly; all conditions hold 14 distinct cells/current 1.5/total21. Balanced projections target seven PAM02-origin plus seven additional PPL103-origin cells, with overlapping membership explicitly recorded (actual pools 84/664, shared55). This is an engineering hypothesis from training diagnostics, not natural sensing or a validated cure. No wiring/sign/rule/readout changes. Tests86/86 pass after correcting a test's legal queen move. Full-graph protocol/gates/audits remain to be frozen; none of these inputs has demonstrated learning or transfer. See documentation/design/chess-input/compartment-encoder.md.

## 2026-10-06: Compartment input association protocol frozen
Fresh six-seed/four-variant comparison frozen under research/data/compartment-input-association-v1/protocol.json; independent runner/auditor prepared, syntax passes. All48 planned cues pass pinned-map dose preflight. Same five feedback controls and acquisition/reversal thresholds; each variant480trials/840planned evals/960bound. Input dose14/current21 is shared across all variants; no rule/readout/wiring change. Report all variants, no between-variant significance or transfer inference from separate exploratory passes; any selected repair requires frozen confirmation. Source evidence/engineering limits in documentation/design/chess-input/compartment-association.md. Full-graph outcomes and recovery audits pending.

2026-10-06 execution update: original-input variant is live in research/reports/compartment-input-original-2026-10-06 after authoritative process inspection found no other graph run. Completed first-seed informative and punishment-only jobs; published checkpoint00105 confirms pinned variant identity and48acknowledged trials. Frozen source/protocol archives match checkpoint hashes. Full gates and independent recovery audit remain pending. Run remaining variants only after this invocation is terminal; do not modify shared sources during the comparison.

## 2026-10-06: Original relational-input association complete
Original variant passes all seven frozen gates on six fresh seeds; acquisition/reversal/ranking switches6/6 and all absent/shuffled phase comparisons p=0.015625. Record/prefix audits pass480transitions/384enabled updates and exact recovery with zero new evaluations. Report SHA256 9647b9c1cd0311a237c7ddd38691a88b07754de19331c4a5240388f3d2e5fdd8. Complete invocation102.96484375MiB RSS/632.5162998s elapsed/337.078s CPU/840evals. This constrains diagnosis: original input at puzzle dose can learn two-cue associations, but useful all-legal puzzle learning/transfer remain unproved. Raw evidence research/reports/compartment-input-original-2026-10-06/README.md. Conjunction-only variant started serially after original and prefix invocations were terminal; remaining variants and comparison results pending. Shared sources/gates unchanged.

## 2026-10-06 completion: candidate-conjoined input association
Candidate-conjoined variant passes all seven gates six fresh seeds, acquisition/reversal/rank switches6/6, all four effect tests p.015625. Independent record/prefix audits pass480 transitions/384updates and exact receipt recovery, zero new evals. Report SHA256 ae32b40ae6388c31fcee5f845d49f2344aed321a13967f499f3807f2a47852a9. Resources107.54296875MiB RSS/665.8821585s/363.047CPU/840evals. This exploratory result does not establish superiority over baseline or puzzle transfer; variant gates separate are not a between-input statistical test. Raw evidence research/reports/compartment-input-conjoined-2026-10-06/README.md. Next balanced-eligibility variant started serially after main and recovery runs terminal; two remaining variants pending.

## Broader scientific contribution clarified (2026-10-06)

The researcher intends chess to serve as a controlled test of a broader, unproved question: can a compact neural system derived from a simple organism's connectome, given extensive experience and feedback, learn transferable reasoning well enough to outperform humans, including trained chess players, under matched conditions? A sufficiently strong result could challenge the assumption that performance on that task requires a large, human-like neural architecture. This would initially be evidence about a trained fly-derived computational system, not proof that living flies reason about chess or that simple organisms generally outperform people. Require causal persistent neural learning, useful choices against matched controls, held-out and counterfactual consequence-sensitive transfer, shortcut controls with bounded/matched computation, and a fair predefined comparison with trained human players before supporting that claim. Chess wins, Elo, familiar-puzzle accuracy, or external search alone are insufficient. The present puzzle-learning and transfer gates remain unmet. See documentation/design/research-goals/scientific-contribution.md. The researcher's concern about another fly-chess project's characterization as a fly is not independently verified here; state only verifiable distinctions in any comparisons.

## 2026-10-06 completion: balanced-eligibility input association
The balanced-only variant passes all seven frozen computational gates on six fresh seeds: acquisition/reversal/ranking switch 6/6, and all four absent/shuffled effect comparisons p=0.015625. Independent record and pending-receipt audits pass 480 transitions/384 local updates; replay is exact with zero new evaluations. Report SHA-256 599af4ca2cb3087fac4a2a0608e10aa2dafe4ed3d5202bdaa909ced969fb01da; 107.6484375 MiB peak RSS, 497.6856848 s elapsed, 283.938 s CPU, 840 evaluations. Raw evidence: research/reports/compartment-input-balanced-2026-10-06/README.md. This is an engineered two-cue association result only, not biological validation, chess reasoning or transfer. It is not a statistical comparison against the other variants. The final conjoined-balanced condition is now running serially; preserve its frozen inputs and finish its audits before comparing conditions.
