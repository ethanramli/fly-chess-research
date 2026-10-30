# Capture-retention task interface

This is the first executable consequence task for the proposed minimal transfer assay. It adds a bounded teacher/verifier path and a versioned public cue. It does **not** establish neural learning, transfer, chess quality, or completion of the puzzle-and-feedback goal.

## Exact task meaning

The candidate must be a legal capture. After that move, enumerate every legal reply for the opponent, up to 256. The outcome is:

- `failure` if at least one legal reply captures the piece that made the candidate capture on its landing square;
- `success` if no legal reply can immediately recapture that piece;
- `unknown` if the reply set cannot be completely verified within the declared bound.

This is a one-reply *recapturability* label. It does not mean that the move is good or bad overall, model the opponent's strategic choice, or account for compensation, checks, later tactics, or delayed sacrifices. A later experiment must not describe it as full chess evaluation.

The teacher-side [certificate builder](../../../.codebase/src/search-and-feedback/capture-retention-certificate.mjs) records the complete legal reply set and recaptures. The separate [receiver checker](../../../.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs) recomputes both sets from the bound board and action, checks the certificate digest, and rejects incomplete or changed evidence. `verifiedExperience` routes this objective through that checker. Unknown yields no teaching event.

## Neural input and existing learner

The new [relational cue v3](../../../.codebase/src/chess-input/relational-chess-cue-v3.mjs) accepts `{ objective: 'capture-retention', plies: 1 }`. It uses the board and candidate action already available to the cue encoder. It does not receive the certificate, result, safe/unsafe bit, proof text, future reply, or Stockfish score. Candidate-relative pieces and coordinates are engineered symbolic input; this is not natural vision. The older v2 encoder remains unchanged for frozen experiment reproduction.

The task can use the existing dual-valence adapter: verified success and failure select its existing PAM02/PPL103 experimental channels. That wiring is an experimental mapping, not evidence that these synthetic outcomes are natural dopamine or that the pathway is biologically validated. The candidate readout remains the frozen MBON move-preference score; it is not a learned position value. No new plasticity equation or trained decoder is introduced.

The software fixtures include a board where the recapture outcomes of two compared rook captures switch when the blocking pawn changes. They establish verifier/input plumbing only and are not an untouched final-transfer set. A separate eight-cell synthetic network test confirms verified outcomes reach the existing two-channel update adapter. It is a software integration check, not the released connectome or evidence that candidate ranking improved.

## Required assay before any reasoning claim

Freeze disjoint training, validation and final board families with at least two legal candidate captures per choice panel. Vary blocker role, attacker type, squares, side, material, check status and unrelated pieces so no single surface feature predicts the outcome. Include counterfactual pairs that change only whether a specific attacker's path is blocked, and held-out layouts beyond built-in symmetry transforms. Do not reuse these software fixtures as final evidence.

The first [actual-mapping cue audit](../../../archive/early-development/research/reports/capture-retention-cue-audit-2026-10-07/README.md) found six distinct patterns, no exact collision or label leak, and retained attacker/blocker features in these inspected fixtures. This is only a necessary input check. Before training, audit a broader disjoint family set for projection collisions, role-binding and nuisance balance. Report actual KC activity later; tokens or stimulated-cell membership alone do not prove a neural representation. Pin the v3 encoder, source hashes, mapping, memory, readout, task families, seeds and exact teacher certificates in a new protocol.

The informative condition must receive independently checked successes and failures through the existing learner. Compare it with identical no-feedback exposures, balanced shuffled outcomes, and disabled plasticity from matched initial states. After training, freeze memory and evaluate both unaided choices and a fixed search budget on held-out boards. Require the preferred candidate to flip on the blocker counterfactual, persist after repeat assessment, disappear after reset, and return on exact restoration. Use multiple layouts and seeds with a predefined comparison and uncertainty report.

A pass would be narrow evidence that feedback learned and reused this one consequence relation. It would not establish general reasoning, transfer across arbitrary chess concepts, stronger Monte Carlo investigation, or the full goal. Integration with bounded puzzle search, richer consequence attribution, useful all-legal play, and broader unfamiliar/counterfactual transfer remain required.

## Current status

Teacher certificate generation/checking, objective routing and versioned cue support are implemented. Targeted software tests pass, including one update in an eight-cell synthetic model. Frozen [data family v2](../../../archive/early-development/research/data/capture-retention-transfer-v2/README.md) has disjoint 8/4/8 train/validation/final panels; an independent audit checks all certificates and reports no exact cue collisions. This remains data and input plumbing, not a full neural experiment protocol. No released-graph training, useful choice gain or transfer result exists yet. See [the current status](../../current-status.md) and [the dated journal entry](../../../research/journal/experiments/2026-10-07-capture-retention-task-interface.md).

Post-run investigation of the failed v3 transfer assay found a plausible KC collision on the moved-blocker path. The new [bound-ray cue prototype](../chess-input/bound-ray-relational-cue.md) exposes the candidate-target slider and intervening-piece geometry without a teacher outcome label. Its static training/validation audit passes input-dose and cue-distinction checks; it has not been run on the connectome. The old v3 final family is inspected and cannot be reused as final evidence. This prototype remains only one component of the broader Monte Carlo and consequence-feedback program.
