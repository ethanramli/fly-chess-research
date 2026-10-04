# FlyChess project instructions

## Project objective

Build a from-scratch connectome-constrained simulation that learns chess through experience and feedback while staying usable on a laptop with about 8 GB total RAM and as little as 3 GB available. Preserve the released wiring. The teacher presents puzzles and feedback; lasting adaptation should arise through an explicitly modeled, biologically justified mechanism inside the simulation. Strategic position evaluation and transfer to unfamiliar positions remain the research outcomes. Do not replace this objective with fine-tuning a pretrained chess model.

The researcher clarified this direction on 2026-09-30. Read `documentation/design/feedback_learning_direction.md` for the teacher/brain boundary and current unresolved questions. The older supervised protocol remains baseline and draft material; it does not specify the intended biological-learning experiment.

## Learning requirements

- Treat the rubric as feedback on choices and consequences. Directly supervised criterion predictions can be a comparison condition, but must not silently replace this objective.
- Preserve neuron identities, graph topology and the model's fixed sign conventions. Distinguish fixed wiring from persistent physiological or memory state that may change through a supported learning mechanism.
- The teacher supplies experiences and feedback, not calculated parameter updates. Adam/backpropagation runs provide supervised baseline or engineering evidence, not evidence of endogenous fly learning.
- A generic weight-update formula does not become biologically justified by putting it inside a class named "brain". Specify the reward pathway, plasticity mechanism and location of lasting memory, with primary-source evidence and explicit approximations.
- Verify that required neuron identities and annotations are available for the released graph. Do not invent reward-neuron mappings, label an arbitrary scalar as dopamine, or imply that the wiring diagram alone provides learning dynamics.
- Identify what changes during learning, how feedback causes it, what persists across trials, and how it is checkpointed. Recording a feedback event is not a neural learning mechanism.
- Validate a candidate mechanism on a bounded association task, retention and reward reversal, compared with a matched control without informative feedback, before interpreting chess results as learning. The gamma4 prototype passes software timing/retention checks and now has an engineered two-cue choice/contingency-reversal experiment. V2 acquisition strengthened the rewarded preference in 6/6 seeds, but reversed choices succeeded in only 3/6; both V1 and V2 failed overall acceptance. It remains biologically unvalidated. Preserve those failures rather than presenting positive response changes as adequate reversal.

## Current milestone and next step

One isolated puzzle/search/feedback-recording round runs on the full graph. The fixture selected `Qh7#` and recorded `+1`; all graph and parameter hashes stayed unchanged. The receiver explicitly reports `appliedToNeurons: false` and `learningApplied: false`. This is task-plumbing evidence, not a successful learning round. The browser player is separate and still uses an untrained one-ply policy.

An isolated gamma4 conditioning prototype now maps 1,056 existing KC-to-MBON edges and 22 PAM08 neurons using pinned FlyWire annotations. It implements an explicitly unfitted, timing-dependent local efficacy rule, atomic persistent memory and matched controls on the full graph. It preserves wiring and nonplastic parameters. The observed association/retention/temporal-reversal result is engineering evidence only. Direct experimental stimulation is not a reconstructed natural reward pathway; its MBON response contrast is not a behavioral choice. See `documentation/design/mushroom_body_learning.md` for sources and limitations.

Two frozen six-seed experiments now test a fixed software choice decoder with contingent, absent, pulse-count-matched shuffled and disabled-plasticity feedback. V1's three acquisition failures had no acquisition rewards. V2 used new seeds and sampled both cues once before free choice: rewarded preference strengthened in 6/6, and reset/restoration established causality of stored efficacy; only 3/6 made the correct reversed choice. See `documentation/design/association_validation.md`. The full learning acceptance gate remains outstanding.

The next step is to diagnose incomplete contingency reversal, justify the sensory/action/reward interfaces and independent predictions, and then connect a puzzle learning round. Do not silently wire chess reward scalars to arbitrary neurons or describe deterministic no-decay persistence as measured biological retention. Do not tune completed experiment gates or replace missing reward-omission dynamics with an unsupported negative update. The researcher's sequence remains: **working puzzle-and-feedback learning round -> latency optimization -> scaling**. Neither record-only search nor these association checks satisfy the chess-learning gate.

## Puzzles and hypothetical calculation

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

This uses the single engineering fixture in `research/data/puzzle-round-fixture/puzzles.jsonl` and records feedback without learning. Preserve raw `result.json` and `state.json` files. Resume into a new directory with `--resume PATH_TO_STATE_JSON`, retaining input hashes, seed and search/pacing settings. These are round-state checkpoints, not trained-weight checkpoints. See `documentation/design/puzzle_feedback_round.md` for commands and limits.

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

- `documentation/design/feedback_learning_direction.md`: current research intent, teacher/brain boundary, corrections and unresolved learning design.
- `documentation/design/mushroom_body_learning.md`: evidence, mapped gamma4 plasticity assumptions, protocol, measurements and limitations.
- `documentation/design/association_validation.md`: frozen choice experiments, controls, causal memory ablations, failed gates and interpretation.
- `.codebase/scripts/validate-learning.mjs`: bounded choice/contingency experiment with per-trial atomic checkpoints; use `--protocol` to select a frozen specification.
- `.codebase/scripts/audit-learning.mjs`: independent consistency audit of raw choice/feedback/memory records; an audit pass does not override failed acceptance.
- `research/data/association-validation-v1/` and `research/data/association-validation-v2/`: frozen specifications; V2 is an opportunity-controlled follow-up with new seeds, not a replacement for V1.
- `.codebase/scripts/condition-fly.mjs`: bounded stimulation/conditioning experiment; `--out NEW_DIRECTORY --cpu-duty 0.5`, optional `--resume STATE_JSON`.
- `.codebase/src/lowram/mushroom-body.mjs`: streamed identity mapping and compartment-local persistent efficacy/traces; not a generic chess reward receiver.
- `documentation/design/puzzle_feedback_round.md`: isolated puzzle-round implementation, measurements, limits and learning gate.
- `documentation/design/low_memory_training.md`: memory algorithm, measurements, limitations, and experiment gates.
- `documentation/design/dataset-format.md`: dataset and split contract.
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
