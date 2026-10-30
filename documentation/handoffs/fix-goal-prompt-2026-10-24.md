# Fix-goal prompt (2026-10-24)

Written for a second model by the reviewing session. Paste the block below after `/goal`. The reviewing session checks the work against `documentation/handoffs/fix-goal-ledger-2026-10-24.md`.

```text
Fix the Stage 1 learner so `fly babysit` trains a Fly that measurably learns, then extend the babysit toward the full curriculum. Repository: C:\Users\ethan\Documents\fly-chess-research.

READ FIRST, in order: AGENTS.md (binding rules); documentation/handoffs/curriculum-reasoning-state.md; research/journal/experiments/2026-10-23-babysit-stage1-end-to-end.md (all 2026-10-24 sections); research/reports/stage1-learnability-diagnostics-2026-10-24/README.md (read-only diagnostic scripts); the "policy B" addendum at the end of documentation/design/puzzle-learning/principles-curriculum.md.

STATE AT HANDOFF (verify every claim from raw files; do not trust this summary):
- The Stage 1 babysit pipeline works end to end: train, interruption/resume, independent replay audit, evaluator, campaign gate, stop with diagnosis.
- Policy B is in force (researcher decision 2026-10-24): chess stages do not depend on G0; Stage 1 D7 is deferred to Stage 2's cumulative retention gate. Do NOT work on G0.
- Input fixed: `.codebase/src/chess-input/public-action-relative-cue.mjs` (registration revision >= 6). Within one lesson, success now lifts the certified move (often to rank 1) and failure lowers only the punished move.
- Remaining blocker is memory. ReversalMemory uses dg = eta*D*(k+g-1); with eta 0.5 and D about -1 per task pulse, every pulse halves the deviation of every inactive synapse in that compartment, so a board's lesson is erased before the board is revisited. Smoke r6 (runs/lichess-stage1-synthetic-v1-smoke-r6): informative 8/32 correct lesson-start choices vs 7-9/32 for every control.
- Smoke r6's independent audit may still be running from another session. Before ANY graph work: confirm no experiment node process is live and that runs/lichess-stage1-synthetic-v1-smoke-r6/audit.json exists. If that run is dead without an audit, rerun `fly babysit --curriculum "python actions/curriculum-campaign-smoke-r6.json"` to finish its read-only audit first. Graph experiments are strictly serial.

TASKS, in order. Do not start a later task until the earlier task's acceptance check passes, or is recorded as failed with a diagnosis.

1. Memory retention (the blocker).
 a. Build a retention probe as a Python action wrapping a Node script, on the real graph, TRAINING boards only, no files outside its own run directory: from scratch, teach board A (one failure and one success lesson through the existing CoupledStockfishBrain/ReversalMemory path), then teach 10 other training boards, then measure A's certified-move rank and correctness. Repeat for 4 different A boards and eta in {0.5, 0.2, 0.1, 0.05, 0.02}; record ranks after every lesson. Stay within 2048 MiB RSS, cpu-duty 0.5.
 b. Choose eta from this evidence only: the largest eta that keeps A correct after 10 other lessons in at least 3 of 4 probes. Record the choice and rationale in the journal before any training run.
 c. If no eta passes: a separately registered rule variant with slower DAN-alone recovery is allowed ONLY after registering primary literature support in research/literature/source-solution-register.md (claim, source, adaptation, assumptions, test status). Add a new class; never modify ReversalMemory. If no literature supports it, STOP and report the probe evidence. Do not switch to RateTimingMemory (the G0 receiver) without researcher approval.
 d. Acceptance: a new smoke revision (build-lichess-stage1-registration-v1.mjs and build-lichess-campaign-v1.mjs with --mode smoke --revision N; add the memory setting to revision >= N only) run through `fly babysit --curriculum ...` with all six arms. The audit diagnosis must show informative training boards at the last checkpoint >= block 0 + 6, AND >= every control's training-board count + 4. If 8 blocks are too few for the chosen eta, add a predeclared 16-block smoke option (full stays 32).

2. Babysit safety features, each with tests:
 a. Predeclared early stop: a registration field (fixed before the run) that stops a stage with gate-failed and a diagnosis when informative training-board progress shows no improvement over K blocks.
 b. Cooperative pause for run-lichess-curriculum-matrix.mjs, compatible with `fly pause` (pause_control in the step file): stop at a lesson boundary only after checkpoint and receipt are durable; resume with fly babysit.
 c. Rehearsal-planner cap: one board cannot be the target in more than M consecutive blocks; then use the existing oldest-uncovered-pair fallback. New planner version; old registrations unaffected.
 d. Long runs must survive the agent session: a Python action that launches `fly babysit` detached with logs; verify that the run continues after the launching session ends and resumes cleanly after a deliberate stop.

3. Transfer (only after task 1 passes). Target frozen D2 (>= 14/16 validation and >= 3/4 per stratum) without training on validation or touching final.
 a. Diagnose on TRAINING rows only (leave-one-family-out), e.g. encoder-overlap-and-scorer.mjs.
 b. Allowed input extensions stay public occupancy/candidate descriptions: conjunctions of relative pieces, from-square-relative tokens, and similar. NOT allowed without a researcher decision: attack maps, line-of-sight/visibility features, pin flags, engine outputs. If those appear necessary, stop and report the evidence.
 c. Each input change = new encoder file/version + new registration revision. Never edit an encoder pinned by a live or completed run.

4. Full Stage 1 run: once a smoke shows taught-board learning beyond controls AND validation >= 14/16 at its checkpoint, build the full registration (3 replicas, 32 blocks), rename the old default campaign with a -superseded suffix, make the new one `python actions/curriculum-campaign.json`, launch bare `fly babysit` detached, monitor with a Python action, and report every independent-audit gate.

5. Stage 2 (only after Stage 1 is accepted by the independent audit): lesson preparer for avoid-mate/forced-mate tasks; train/validation/final families with 4 strata; Stockfish review collection; final evaluator and gate (D1-D8 plus >= 12/16 per stratum); registration and campaign entry, following documentation/design/puzzle-learning/stage2-avoid-mate-domain.md. Give lichess-stage2-avoid-mate-panel.mjs the same synthetic-history support Stage 1 has. Update the Stage 2 selector's receiverAccepted requirement for policy B.

RULES, in addition to AGENTS.md:
- Never edit a file pinned in the step file of a live run. Check pins and live processes first.
- Every learning change = new registration revision + matched controls. Preserve all earlier runs, registrations, and negative results.
- Never tune or select on final families; never train on validation. Frozen gate thresholds stay; policy B is the only recorded change.
- The teacher never computes neural parameter updates; no pretrained/supervised chess component in the learner. Linear scorers are representation diagnostics only.
- Interpreter %USERPROFILE%\.venv-class\Scripts\python.exe; launcher fly.cmd; node --max-old-space-size=256; --cpu-duty 0.5; <= 2048 MiB RSS; >= 256 MiB free. Node tests: --experimental-test-isolation=none --test-concurrency=1. Run the relevant suites after every change.
- Record every mistake and pivot before moving on: dated journal entry, decision log, current status, handoff.
- Do not say "EUREKA EUREKA" unless the independent audit passes the transfer gates. Do not commit to git unless asked.

REVIEW LEDGER (required; another model will audit your work against it):
Maintain documentation/handoffs/fix-goal-ledger-2026-10-24.md. For EVERY change or run append: date/time; task number; files changed; why; tests run (exact command and pass counts); run directory, registration path and SHA-256, protocol SHA-256; key numbers with the artifact path each came from; open issues. Never edit earlier entries; add corrections as new entries.

DONE when either:
(A) the independent audit of a registered Stage 1 run under policy B reports stageAccepted true (D1-D6, D8, D9 in every replica), the babysit advances to Stage 2, and tasks 2 and 5 are complete with tests; or
(B) a documented stop: a blocker needs a researcher decision (mechanism switch, perception features, or an unsatisfiable gate), and the ledger and handoff state exactly what was tried, the measured results, and the decision needed.
```

## Short /goal form (added 2026-10-24)

`/goal` rejects conditions over 4000 characters, and the block above is about 8,000. Paste this shorter form after `/goal` instead. It points back to the full block above, which stays authoritative.

```text
Complete the fix goal in documentation/handoffs/fix-goal-prompt-2026-10-24.md (repo C:\Users\ethan\Documents\fly-chess-research). Read that file in full first and again after any context compaction; its tasks, order, acceptance checks and rules are binding together with AGENTS.md. This text is a summary; the file wins on any difference.

Before ANY graph work: confirm no experiment node process is live and runs/lichess-stage1-synthetic-v1-smoke-r6/audit.json exists; if that run is dead without an audit, finish it with `fly babysit --curriculum "python actions/curriculum-campaign-smoke-r6.json"`. Graph experiments are strictly serial.

Tasks in order; do not start a later task until the earlier one passes or is recorded as failed with a diagnosis:
1. Memory retention: retention-probe Python action, TRAINING boards only, 4 A boards x eta {0.5,0.2,0.1,0.05,0.02}, 10 interfering lessons. Choose the largest eta keeping A correct in >=3/4 probes; journal the choice before any training run. If none passes: a new rule class only with registered primary-literature support, else STOP. Never modify ReversalMemory; no RateTimingMemory without researcher approval. Accept via a new smoke revision through `fly babysit` with all six arms: informative training boards at last checkpoint >= block 0 + 6 and >= every control + 4.
2. Babysit safety, each with tests: predeclared early stop; cooperative pause compatible with `fly pause`; rehearsal-planner cap (new planner version); detached `fly babysit` launcher that survives the session.
3. Transfer (after task 1): frozen D2 (>=14/16 validation, >=3/4 per stratum). Diagnose on training rows only. Public occupancy/candidate inputs only; attack maps, line-of-sight, pin flags or engine outputs need a researcher decision. Each input change = new encoder file + new registration revision.
4. Full Stage 1 (3 replicas, 32 blocks) as the new default campaign, launched detached, monitored by a Python action.
5. Stage 2 per documentation/design/puzzle-learning/stage2-avoid-mate-domain.md.

Hard rules: policy B is in force; do not work on G0. Never edit files pinned by a live or completed run. Every learning change = new registration revision + matched controls; preserve all earlier runs and negative results. Never train on validation or touch final families; frozen gate thresholds stay. The teacher never computes neural updates; no pretrained/supervised chess component. node --max-old-space-size=256, --cpu-duty 0.5, <=2048 MiB RSS, >=256 MiB free; %USERPROFILE%\.venv-class\Scripts\python.exe via fly.cmd; node tests with --experimental-test-isolation=none --test-concurrency=1 after every change. Record every mistake and pivot (journal, decision log, current status, handoff). No "EUREKA EUREKA" unless the independent audit passes the transfer gates. No git commits unless asked.

Ledger: append to documentation/handoffs/fix-goal-ledger-2026-10-24.md for every change or run (time, task, files, why, exact test command and pass counts, run dir, registration and protocol SHA-256, key numbers with source artifact paths, open issues). Never edit earlier entries.

DONE when either:
(A) the independent audit of a registered Stage 1 run under policy B reports stageAccepted true (D1-D6, D8, D9 in every replica), the babysit advances to Stage 2, and tasks 2 and 5 are complete with tests; or
(B) a documented stop: a blocker needs a researcher decision (mechanism switch, perception features or an unsatisfiable gate), and the ledger and handoff state exactly what was tried, the measured results and the decision needed.
```

## Reviewer addendum, 2026-10-24 13:10 (binding; supersedes task 3b where they differ)

The repository already has candidate-relative encoders from 6-7 October that the handoff session overlooked when it wrote `public-action-relative-cue.mjs` (a recorded mistake): `.codebase/src/chess-input/relational-chess-cue.mjs`, `-v2`, `-v3` ([design](../design/chess-input/relational-encoder.md), [failed comparison](../design/chess-input/representation-comparison.md)) and `bound-ray-relational-cue.mjs` ([design](../design/chess-input/bound-ray-relational-cue.md)). The bound-ray cue (slider-to-target vector plus the pieces geometrically between them, with no legality or blocking judgement) was already documented by the project as label-blind geometry rather than an attack oracle, so it is NOT in the "line-of-sight needs a researcher decision" class. For task 3, first evaluate these existing encoders (training rows only, leave-one-family-out, plus the same-board overlap check) before writing a new one, and reuse them where they help. Their earlier gate failures used a single mapped KC pool and an earlier learner; the dual-compartment projection (each feature drives one MBON01 and one MBON12 KC) from `public-action-relative-cue.mjs` may need to be added as a new versioned wrapper. Attack maps, legality-aware attack judgements, pin flags and engine outputs still need a researcher decision.

## Reviewer finding 2, 2026-10-24 13:20 (binding)

Smoke r6 official audit: training boards informative 4 -> 1 (of 24) over 8 blocks; controls at block 8: outcome-only 5, absent 3, disabled 4, shuffled 3, stockfish-shuffled 7; validation 3/16. Measured cause candidate: under `public-action-relative-cue-v1` the Stockfish value pulse's child-position cue (`state:` tokens) shares only 2.63 of 15.4 cells with the chosen move's own cue (`research/reports/stage1-learnability-diagnostics-2026-10-24/state-action-overlap.mjs`). Value pulses therefore barely teach move choice but still trigger ReversalMemory recovery, erasing task lessons. Before judging task 1's memory fix, (1) report the retention probe with and without the Stockfish phase, and (2) as part of task 1 or 3, make the child-position cue share the action cue's relative token family (anchored at the landing square, seen from the mover) with the value sign converted to the mover's perspective for those shared cells, as a new encoder version and coupled-brain change under a new registration, with tests for the sign. If you judge that Stockfish should teach position value for search only, stop and record that as a decision for the researcher, because D9 requires Stockfish to improve unaided final choices.
