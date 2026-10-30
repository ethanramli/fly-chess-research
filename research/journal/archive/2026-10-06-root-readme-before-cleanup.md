# Historical README.md before documentation cleanup

Archived 2026-10-06. Historical snapshot, not current instructions or current experiment status. Local links were updated for navigation; original text is preserved below.

# Can a compact, fly-connectome-constrained neural system learn transferable chess reasoning from experience and feedback well enough to outperform humans, including trained chess players, under matched conditions?

FlyChess uses chess as a controlled testbed for this broader cognitive-science question. It studies whether a from-scratch, connectome-constrained model can learn strategic evaluation through puzzle experience and verified consequence feedback.

The project is not claiming that a biological fly understands chess. The goal is to test whether a fly-inspired model, under explicit engineering assumptions, can learn to evaluate positions in a way that generalizes beyond the training set.

## Current status

The project is in the early-to-mid research-planning phase:

- Research framing, datasets, reports, literature, and decisions are in `research/`
- The minimum experiment and documentation are in `documentation/`
- Executable scripts, source modules, and tests are in `.codebase/`

The current focus is to validate how experience and feedback can produce persistent learning inside the simulated fly. A [mapped gamma4 conditioning prototype](../../../documentation/design/neural-learning/gamma4-plasticity.md) now implements a reduced local plasticity rule: synthetic paired stimulation changes a neural response, retains that state and reverses it when timing reverses; two controls stay unchanged. This is an engineering check of an unfitted model, not validated biological or chess learning. The puzzle receiver remains record-only. The rubric, biological sensory/reward interfaces and transfer evaluation still need refinement. See the [current learning direction](../../../documentation/design/research-goals/feedback-learning.md) and [research journal](../README.md).

[Controlled choice experiments](../../../documentation/design/neural-learning/gamma4-association-tests.md) now provide evidence of basic association: the balanced six-seed follow-up strengthened preference for the rewarded cue in 6/6 runs, while memory erasure/restoration removed/recovered the changes and nonlearning controls stayed fixed. Only 3/6 selected the new target after reward reversal, so the complete acceptance test failed. These are choices from an engineered decoder in a simplified stimulation model; reliable adaptation and chess transfer remain open.

2026-10-06 update: a separate [fixed MBON-choice experiment](../../../documentation/design/neural-learning/mbon-choice.md) passes its computational acquisition/reversal gates; it does not establish biology or chess reasoning. A [separate verified puzzle-feedback path](../../../documentation/design/puzzle-learning/verified-neural-feedback.md) now changes persistent local efficacy, but useful full-root choice still fails. [Adaptive review](../../../documentation/design/puzzle-learning/adaptive-review.md) and the [matched representation comparison](../../../documentation/design/chess-input/representation-comparison.md) also fail the tested fixture-repair gates. These isolated paths do not change the original record-only receiver or browser player. The frozen [8/32/128-experience volume test](../../../documentation/design/puzzle-learning/training-volume.md) is complete and independently audited: repetition did not repair either encoder within these budgets; broader volume/coverage hypotheses remain unresolved. No unfamiliar reasoning or calibrated Elo result has been demonstrated.

### Laptop training feasibility

A separate [seeded Monte Carlo search and consequence-trace review](../../../documentation/design/search-and-feedback/monte-carlo-traces.md) now records sampled continuations, preserves unknown cutoffs and independently checks defensive replies absent from investigation. Its bounded synthetic-policy probe and record audit pass. The [experience planner and mapped neural receiver](../../../documentation/design/puzzle-learning/experience-pipeline.md) have numerical integration tests. Plans now attach [verified material-concession/payoff explanations](../../../documentation/design/search-and-feedback/line-explanations.md); 75 total project tests pass. The full-graph pilot is complete and its record, trace and after-update resume audits pass, but useful acquisition is not demonstrated: one fixture remains wrong and the other already succeeds. The separate [positive-channel association test](../../../documentation/design/neural-learning/positive-feedback-v1.md) is complete and audited but fails its overall acceptance gate, and [verified consequence replay contexts](../../../documentation/design/search-and-feedback/consequence-clips.md) have teacher-only software evidence. The current project suite passes 80 tests. There is no unfamiliar-position learning result. Its leaf heuristic remains neutral, not a learned strategic evaluator.

The [from-scratch training design](../../../documentation/design/supervised-baselines/low-memory-training.md) addresses the 8 GB laptop constraint with roughly 3 GB or less available. A dependency-free sparse-gradient prototype trained through the actual released 134,209-neuron graph at **130 MiB peak process RAM** in a bounded engineering test. This is not yet a trained chess evaluator or evidence of reasoning. CPU time and sample efficiency are the next constraints.

With Node 22 or newer:

```powershell
npm run fetch:graph
npm test
npm run benchmark
```

The graph download is about 40 MB; no pretrained chess weights are used. See [recorded measurements](../../../archive/early-development/research/reports/lowram-feasibility.json), the reference kernel in `.codebase/src/lowram/`, and the design's explicit limitations. The cache is excluded from Git.

## Core research question

Every externally sourced solution is tracked in the [source-to-solution register](../../literature/source-solution-register.md), with its evidence, assumptions, implementation status and tests. Proposed mechanisms remain labeled as proposals until tested.

Can a connectome-constrained model acquire useful strategic evaluation through experience and feedback, and transfer it to unfamiliar and counterfactual chess positions?

### Intended broader contribution

The broader, still unproved goal is for a compact, fly-derived neural system to learn transferable reasoning from experience and feedback and outperform humans on a defined task, including trained chess players under matched conditions. A sufficiently strong result could challenge the assumption that performance on that task requires a large, human-like neural architecture. It would concern a trained computational system, not establish that living flies reason about chess or that the system exceeds humans at reasoning generally. It must show persistent feedback-driven learning, useful choices, held-out/counterfactual transfer, shortcut-resistant controls, and a fair comparison with trained human players. The current puzzle experiments have not met those gates. See the full [scientific contribution and evidence requirements](../../../documentation/design/research-goals/scientific-contribution.md); do not treat this research aim as a result.

## Researcher scope and future benchmark (2026-10-06)

The target is **reasoning**, measured through investigation of consequences and transfer, rather than memorizing rewarded moves or counting training turns. The intended training program presents varied puzzles, uses bounded, seeded Monte Carlo investigation on a separate board, independently verifies consequences against defensive replies, and supplies high-quality feedback about missed candidates, incorrect assessment, missed refutations and insufficient depth. Supported neural mechanisms must retain useful changes. Unknown verification outcomes supply no teaching event. More training volume is a hypothesis to test with controlled learning curves, not an assumed cure.

Large experience counts must fit the laptop: about 8 GB total RAM and sometimes only 3 GB available. Keep the full graph sparse, evaluate one position at a time, bound search and persistent traces, stream experience records, and checkpoint atomically. Increase total training primarily by spending more elapsed time, rather than accumulating resident batches or unbounded search histories. Preserve the existing RSS/free-memory guards, heap setting and responsive CPU-duty schedule.

The researcher also wants a **FlyChess benchmark that tracks frozen snapshots and predicts their Elo performance, calibrated against Stockfish**. The accepted [two-stage calibration design](../../../documentation/design/evaluation-and-performance/elo-calibration.md) first measures game-based strength against a reference ladder, then validates a cheaper benchmark predictor on disjoint snapshots and position families. This is accepted future scope, to be implemented after the current learning goal is proved; it is not an additional completion gate for the current session. The requested evaluation system should:

- Identify each snapshot by its model/memory, graph, encoder, readout and policy hashes, with its training exposure count and benchmark version.
- Track reasoning/transfer results separately from playing strength, and report unaided decisions separately from decisions under a fixed Monte Carlo budget.
- Calibrate against a pinned Stockfish version and executable hash, recording strength settings, threads, hash memory, per-move search/time budgets, openings, colour balance and game outcomes. Fit within the same hardware constraints and resume evaluations.
- Establish a relationship between benchmark features and measured reference-game performance before calling a puzzle-based output a calibrated Elo prediction. A configured engine strength or puzzle score is not sufficient calibration evidence.
- State the target rating scale, opponent/reference pool, calibration data, held-out prediction error and uncertainty. Keep calibration fitting and validation separate from the final benchmark test families, freeze learning during evaluation, and preserve raw evidence.

No calibrated Elo predictor or Stockfish evaluation pipeline is currently implemented or validated. The existing encoders use a structured board/candidate and directly stimulate mapped Kenyon cells; they do not provide sight through modeled eyes. The current scientific goal and its proof requirements remain unchanged. See [learning direction](../../../documentation/design/research-goals/feedback-learning.md), [training-volume hypothesis](../../../documentation/design/puzzle-learning/training-volume.md) and the repository [agent instructions](../../../AGENTS.md).

This project is intentionally narrow and conservative:

- It studies a model constrained by a fly connectome, not a claim about fly cognition.
- It emphasizes interpretable position evaluation rather than raw game-playing strength alone.
- It separates the minimum scientific claim from later extensions such as a public website, explanation systems, or online learning.

## Repository structure

- `project/` — project framing, ethics, decisions, mentoring, and planning materials
- `design/` — training and evaluation protocol, data dictionary, and experimental plan
- `literature/` — search log, reading notes, and evidence map
- `idea/` — candidate hypotheses, experiments, and future directions
- `data/` — approved shareable or de-identified materials and governance guidance
- `writing/` — manuscript structure and submission checklist
- `README.md` — high-level project overview

## How to use this workspace

To play in a local browser, run `npm run play` and open `http://127.0.0.1:4173`. Choose White or Black, then click your piece and its destination square. The untrained connectome-constrained model scores every legal successor position; a one-ply policy chooses the highest score for White and lowest for Black. Its score has no established chess meaning. The interface reuses board and piece assets and ports display code from vietan0/chess-game-review; see `.codebase/src/browser/REUSE.md`. It includes move history, board themes, promotion, and PGN export. To request a pawn-only model move from a FEN in the command line, use `npm run fly:pawn -- --fen "FEN"`.

1. Start with `research/project/project_overview.md` for the research framing and scope.
2. Review `documentation/design/supervised-baselines/training-plan.md` for the current experimental plan and constraints.
3. Use `research/literature/` to record evidence, notes, and relevant comparisons.
4. Keep the minimum experiment separate from optional extensions.
5. Record major decisions in `research/project/decision_log.md`.
6. Preserve held-out evaluations and report limitations transparently.

## Scope and constraints

This repository is not a product repo or a chess engine implementation. It is a research workspace for a computational cognitive-science study.

The project intentionally does not prioritize:

- public demos or a user-facing website
- online learning from human games
- live skill prediction before the accepted future snapshot/Stockfish calibration work
- qualitative explanation generation for end users
- broader software features unrelated to the core experiment

These are separate work streams and should not be confused with proof of the current learning experiment. Snapshot tracking and Stockfish-calibrated Elo prediction are explicitly requested future scope as described above.

## Key research principle

A strong playing rating by itself is not sufficient evidence of strategic cognition. The meaningful claim requires transfer to unfamiliar positions, interpretable evaluation behavior, and controlled comparisons against appropriate baselines.

## Recommended next step

### Puzzle and feedback integration (2026-09-30)

Run `npm run puzzle:round -- --out runs/puzzle-round-001` for one bounded puzzle/search/feedback-recording round on the full graph. The teacher verifies the outcome after the chosen move; graph and parameter hashes must stay unchanged. **The feedback receiver is currently record-only, so this does not train the fly.** A justified biological reward/plasticity receiver remains the next gate before latency optimization and scaling. See the [implementation, measured result, and limits](../../../documentation/design/puzzle-learning/record-only-round.md).

### Resumable CPU training pilot

For datasets with additional position criteria, use `--dataset PATH`; see the [dataset contract](../../../documentation/design/supervised-baselines/dataset-format.md). The trainer derives its output count from the manifest and saves the ordered criterion schema in checkpoints. This generic dataset path is newly implemented; existing measurements use the two-criterion pilot.

`research/data/coverage-pilot-v2` adds early and quiet positions to the same two rule-defined criteria: 169 training pairs, 56 validation pairs and 55 reserved test pairs. Its [integrity audit](../../../archive/early-development/research/reports/coverage-pilot-v2-audit.json) checked split separation, legal parent/child relationships and independently calculated material labels. The subsequent independent capture-label audit is linked below. This is broader development coverage, not a full strategic rubric; losses on its new validation set cannot be directly compared with pilot-v1 losses.

One paced Adam pass over coverage-pilot-v2 completed in 486 seconds at **174.53 MiB peak RSS**. Both criteria beat their training-mean constant predictors on the 56-pair validation set. The model beat the constant pair-difference baseline for all 8 validation families on material and 5 of 8 on capture; a side-to-move-only baseline gives a stricter comparison and the model beats it on pair differences for all 8 material families and 7 of 8 capture families. This is evidence of position-dependent signal on this development set, not strategic-chess or final-test evidence. See [family summary](../../../archive/early-development/research/reports/coverage-family-summary.json).

The frozen checkpoint was then evaluated once on the reserved 55-pair/8-family test split: material MSE 0.032032, capture MSE 0.040906; pair-difference MSE 0.022159 and 0.109845. These raw held-out metrics are recorded without a baseline or any tuning from test results. They do not establish strategic chess ability. See [test evaluation](../../../archive/early-development/research/reports/coverage-test-evaluation.json).

A resumed second epoch completed at 175.4 MiB peak RSS and slightly lowered validation loss, but its held-out material MSE rose to 0.039981 while capture MSE fell to 0.034796. The first epoch is therefore retained by the per-criterion validation gate; the second-epoch report is an audit artifact, not evidence of a generally better evaluator. See [second-epoch test evaluation](../../../archive/early-development/research/reports/coverage-test-epoch2.json).

An independent capture-label audit recomputed the board material and capture/recapture traversal over all 560 positions in coverage-pilot-v2, with zero mismatches. It still validates implementation consistency rather than the scientific usefulness of this bounded label. See [label audit](../../../archive/early-development/research/reports/coverage-capture-label-audit.json).

After fetching the graph, run the streamed paired-position baseline:

```powershell
node --max-old-space-size=256 scripts/train-pilot.mjs --out runs/pilot-001 --max-pairs 72
```

Resume with the same seed and learning rate into a new output directory:

```powershell
node --max-old-space-size=256 scripts/train-pilot.mjs --out runs/pilot-002 --resume runs/pilot-001/final --max-pairs 72
```

The command trains all parameters from scratch unless resuming its own checkpoint. It streams training rows, evaluates the validation split before and after training, saves every 72 updates (configurable with `--checkpoint-every`) and on normal completion, and records metrics in the output directory. Ctrl+C requests a stop at an optimizer boundary. Abrupt termination or a memory-guard exception requires resuming the last completed checkpoint. Dataset and graph checksums are verified. The final test split is not read. Validation reports each criterion's MSE and pair-difference MSE against a constant predictor fitted only on training labels.

This is an exact-gradient baseline for comparing faster algorithms. Its two labels cover material and a bounded capture/recapture calculation, not full strategic evaluation. File order is fixed. The 768 MiB RSS guard is a soft check; the Node heap setting does not enforce a total process memory limit.

The experimental rotating circuit mode is available with:

```powershell
node --max-old-space-size=256 scripts/train-pilot.mjs --mode cached-hybrid --out runs/circuit-001 --max-pairs 72 --checkpoint-every 18
```

It performs one exact all-parameter update per pair, then twelve cached updates of a rotating circuit, accepting the local burst only after a full paired-loss check. The partition covers every neuron once per rotation. This spends more computation per pair than the exact baseline; only a time-to-validation-quality comparison can show whether it helps. Resume with the same mode and `--local-steps` setting. Checkpoints contain the rotation cursor through the completed pair count.

For responsiveness while using other applications, add `--cpu-duty 0.5`. The worker rests approximately as long as each measured computation segment takes, including validation. This is a compute/rest schedule, not a limit on total system CPU percentage, and it increases wall-clock training time. Graph loading and checkpoint I/O are not paced. The default is `1` (continuous computation). One resumed Adam run measured 104.05 process CPU seconds over 223.44 elapsed seconds between its start and finish events, approximately 47% of one core on average, at 172.05 MiB peak RSS. This is an observation, not a guaranteed ceiling. See [profile](../../../archive/early-development/research/reports/adam-resume-profile.json).

An exact Adam baseline is also available:

```powershell
node --max-old-space-size=256 scripts/train-pilot.mjs --optimizer adam --learning-rate 0.001 --cpu-duty 0.5 --out runs/adam-001 --max-pairs 72
```

This uses standard first and second gradient moments with bias correction, global gradient clipping, and positive-magnitude projection. The two moment arrays add about 42.7 MiB for the two-output model. Adam checkpoints use format v2 and include both moments and their step counter; existing SGD v1 checkpoints remain supported. Resume with the same optimizer and learning rate. Adam is currently supported only in exact mode. It is a comparison baseline, not a novelty claim.

Use `npm run evaluate -- --checkpoint DIRECTORY --fen "FEN"` to obtain criterion predictions from saved weights. This path has been run on the real graph at about 161 MiB peak RSS. The pilot checkpoint gives incorrect scores even for the starting position, so successful execution is not evidence of a useful chess evaluator.

Optional `--shuffle-buffer 24` mixes a bounded window of training rows with a deterministic seed for each epoch. It is not a uniform shuffle of a larger corpus. Resume replays the same order up to the saved cursor, without storing the dataset in RAM; use the same buffer size on resume. One development run lowered aggregate loss but worsened material error, so shuffling has not established an across-criterion benefit. Multi-epoch runs now record validation at each completed epoch as well as at their endpoints.

Optional `--balance-criteria` weights both parts of each criterion's paired training loss by inverse training-label variance, normalized to mean weight one. The statistics come only from the training file and are saved in checkpoints; validation retains the original equal-weight objective and original label units. This changes the training objective and is an experimental option for exact mode. It adds scalar arithmetic rather than more model evaluations.

Define the rubric, freeze the minimum experiment, and establish leakage-safe held-out tests before training or tuning.

For the current project context and constraints, see:

- `project/project_overview.md`
- `design/training_plan.md`
- `project/cognitive_science_framing.md`

2026-10-06 follow-up: [positive-channel V2](../../../documentation/design/neural-learning/positive-feedback-v2.md) freezes fresh seeds and a cue-valence-balanced shuffled control, with unchanged neural settings and gates. V1's specificity failure remains preserved. V2 results/audits are pending; the original puzzle-learning and reasoning goal remains unfinished.

## 2026-10-06 completion: balanced positive-channel V2
The separately frozen full-graph V2 experiment is terminal and passes all seven recorded gates. Acquisition/reversal correct and ranking switch: 6/6 informative seeds. All four absent/shuffled effect comparisons: six positives, no ties, p=0.015625. Independent record and pending-receipt recovery audits pass 480 transitions/384 local updates; prefix exact with zero new evaluations. Report SHA-256 910e223612751face371cc59558b737ab4e0738bfae6b89baff2705f01f2acbb. Full invocation: 104.671875 MiB peak RSS, 442.1698092 s elapsed, 260.265 s CPU, 840 evaluations. This supersedes V2 pending statements, preserves V1's failure, and establishes a computational association prerequisite only. Useful puzzle learning and unfamiliar/counterfactual reasoning remain unproved. Next: a separate verified positive-channel puzzle condition, with matched controls and all-legal choice evidence. Raw evidence: research/reports/positive-channel-association-v2-2026-10-06/.

## 2026-10-06: Positive-channel puzzle pilot frozen
A separate verified two-valence puzzle adapter/runner/auditor is prepared under documentation/design/puzzle-learning/positive-feedback-pilot.md. The audited balanced association prerequisite passes, while original puzzle failures remain preserved. Same declared fixtures, relational encoder, learning rule, readout and bounded investigation; five matched-experience conditions isolate positive stimulation. Pilot gates frozen before execution; unknown produces no event. Tests 84/84 and syntax checks pass. Full-graph outcomes, receipt/trace/recovery audits and all unfamiliar reasoning evidence remain pending.

2026-10-06 execution update: the separate positive-puzzle pilot is live in research/reports/positive-puzzle-pipeline-v1-2026-10-06 after a read-only process check found no other graph run. Published checkpoint 00012 records four acknowledged informative experiences and the measurement phase; source archives match checkpoint hashes. Results and independent receipt/trace/recovery audits remain pending. Preserve the frozen sources during execution.

## 2026-10-06 completion: positive-puzzle pilot failed useful acquisition
The full-graph positive-puzzle comparison is terminal. Useful-choice and repair-above-absent/disabled gates fail; persistence/causal reset and fixed state pass. Informative/punishment-only KQK remains wrong (Qb3), KRK already succeeds. Absent/disabled preserve initial choices; shuffled degrades KRK and both searched outcomes. Receipt/prefix audits pass 80 certificate uses and 32 enabled updates; exact pending-receipt recovery has zero neural presentations. Trace audit passes 9 informative trajectories/8 explanations/2 defense diagnostics. Complete invocation: 109.5078125 MiB RSS, 916.0918095 s elapsed, 432.437 s CPU, 1692 presentations. Report SHA-256 01a7ab038b03474283580e0dd5f8cb821512dbac4f6833eb45192925dbe5445b. This supersedes pilot live/pending statements; the association prerequisite remains passed, but useful puzzle learning and original reasoning remain unproved. Raw evidence: research/reports/positive-puzzle-pipeline-v1-2026-10-06/README.md. The separate read-only memory probe started only after main/prefix terminal completion and passing audits; its results remain pending.

### Accepted future pondering feature

FlyChess should investigate likely opponent moves and its responses during the opponent's turn, then check and reuse matching search branches when the actual move arrives. The [pondering design](../../../documentation/design/evaluation-and-performance/pondering.md) specifies bounded serial execution, cache validity, cancellation, fallback and separate compute/latency accounting. This is proposed future latency work after the learning milestone; no pondering implementation or speedup is established.

## 2026-10-06 completion: positive-puzzle memory contribution probe
Read-only full-graph probe is terminal; independent auditor passes six saved-memory interventions and 156 legal-candidate records, exact baseline/final/restored reproduction. Isolated one-edge PAM02 change raises Qh7 score by 0.0004179924726 but improves its margin over Qf5 by only 0.0000000107102; all 26 candidate offsets are nearly common (0.0004178909585 to 0.0004180357791), so choice stays Qf5. Complete first-event/PPL-only states worsen the target margin. Final memory exposes failed Qb3. This supports investigating action-specific eligibility/representation without ruling out coverage; no unique biological cause or validated repair is established. Report SHA-256 496e80a914ba49db835ed1c5033a73caf9f0614419b6423b8f30411de755ff74. Resources: 101.0859375 MiB RSS, 109.4277453 s elapsed, 49.719 s CPU, 156 presentations. Raw evidence: research/reports/positive-puzzle-memory-probe-2026-10-06/README.md. This supersedes probe pending statements. Original useful chess learning and unfamiliar reasoning remain unproved.

## 2026-10-06: Candidate-specific eligible-pool input hypothesis implemented
Separate compartment-chess-cue encoder supports a four-condition conjunction/projection comparison. Original pooled stimuli reproduce existing relational V2 exactly; all conditions hold 14 distinct cells/current 1.5/total21. Balanced projections target seven PAM02-origin plus seven additional PPL103-origin cells, with overlapping membership explicitly recorded (actual pools 84/664, shared55). This is an engineering hypothesis from training diagnostics, not natural sensing or a validated cure. No wiring/sign/rule/readout changes. Tests86/86 pass after correcting a test's legal queen move. Full-graph protocol/gates/audits remain to be frozen; none of these inputs has demonstrated learning or transfer. See documentation/design/chess-input/compartment-encoder.md.

### Implementation roadmap

The [performance and evaluation implementation roadmap](../../../documentation/design/evaluation-and-performance/implementation-roadmap.md) details the build order, proposed modules, cache/snapshot contracts, tests and acceptance evidence for faster inference, reusable search, pondering, snapshot tracking, complete-game evaluation, measured Elo calibration and a validated benchmark predictor. A one-pass action decoder is a separate research branch. This is a written plan; it does not implement these features or change the learning-first completion gate.

## 2026-10-06: Compartment input association protocol frozen
Fresh six-seed/four-variant comparison frozen under research/data/compartment-input-association-v1/protocol.json; independent runner/auditor prepared, syntax passes. All48 planned cues pass pinned-map dose preflight. Same five feedback controls and acquisition/reversal thresholds; each variant480trials/840planned evals/960bound. Input dose14/current21 is shared across all variants; no rule/readout/wiring change. Report all variants, no between-variant significance or transfer inference from separate exploratory passes; any selected repair requires frozen confirmation. Source evidence/engineering limits in documentation/design/chess-input/compartment-association.md. Full-graph outcomes and recovery audits pending.

2026-10-06 execution update: original-input variant is live in research/reports/compartment-input-original-2026-10-06 after authoritative process inspection found no other graph run. Completed first-seed informative and punishment-only jobs; published checkpoint00105 confirms pinned variant identity and48acknowledged trials. Frozen source/protocol archives match checkpoint hashes. Full gates and independent recovery audit remain pending. Run remaining variants only after this invocation is terminal; do not modify shared sources during the comparison.

## 2026-10-06: Original relational-input association complete
Original variant passes all seven frozen gates on six fresh seeds; acquisition/reversal/ranking switches6/6 and all absent/shuffled phase comparisons p=0.015625. Record/prefix audits pass480transitions/384enabled updates and exact recovery with zero new evaluations. Report SHA256 9647b9c1cd0311a237c7ddd38691a88b07754de19331c4a5240388f3d2e5fdd8. Complete invocation102.96484375MiB RSS/632.5162998s elapsed/337.078s CPU/840evals. This constrains diagnosis: original input at puzzle dose can learn two-cue associations, but useful all-legal puzzle learning/transfer remain unproved. Raw evidence research/reports/compartment-input-original-2026-10-06/README.md. Conjunction-only variant started serially after original and prefix invocations were terminal; remaining variants and comparison results pending. Shared sources/gates unchanged.

## 2026-10-06 completion: candidate-conjoined input association
Candidate-conjoined variant passes all seven gates six fresh seeds, acquisition/reversal/rank switches6/6, all four effect tests p.015625. Independent record/prefix audits pass480 transitions/384updates and exact receipt recovery, zero new evals. Report SHA256 ae32b40ae6388c31fcee5f845d49f2344aed321a13967f499f3807f2a47852a9. Resources107.54296875MiB RSS/665.8821585s/363.047CPU/840evals. This exploratory result does not establish superiority over baseline or puzzle transfer; variant gates separate are not a between-input statistical test. Raw evidence research/reports/compartment-input-conjoined-2026-10-06/README.md. Next balanced-eligibility variant started serially after main and recovery runs terminal; two remaining variants pending.

## 2026-10-06 completion: balanced-eligibility input association
The balanced-only variant passes all seven frozen computational gates on six fresh seeds: acquisition/reversal/ranking switch 6/6, and all four absent/shuffled effect comparisons p=0.015625. Independent record and pending-receipt audits pass 480 transitions/384 local updates; replay is exact with zero new evaluations. Report SHA-256 599af4ca2cb3087fac4a2a0608e10aa2dafe4ed3d5202bdaa909ced969fb01da; 107.6484375 MiB peak RSS, 497.6856848 s elapsed, 283.938 s CPU, 840 evaluations. Raw evidence: research/reports/compartment-input-balanced-2026-10-06/README.md. This is an engineered two-cue association result only, not biological validation, chess reasoning or transfer. It is not a statistical comparison against the other variants. The final conjoined-balanced condition is now running serially; preserve its frozen inputs and finish its audits before comparing conditions.
