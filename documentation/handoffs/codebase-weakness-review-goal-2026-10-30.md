# Codebase weakness review goal (for a second agent), 2026-10-30

Written at the researcher's request on 2026-10-30, for an independent agent (for example Codex CLI) to review the codebase for weaknesses. This file sets a review task only. It is not an experiment registration, it does not change frozen gates, and it does not override AGENTS.md.

Short form for the `/goal` command: **"Follow documentation/handoffs/codebase-weakness-review-goal-2026-10-30.md: review the FlyChess codebase read-only, find verified weaknesses that could block or invalidate transferable reasoning, and write them up ranked by severity."**

## 1. Why this review exists

The project asks whether a from-scratch, connectome-constrained fly brain can learn chess from verified consequences and transfer that learning to unfamiliar positions. The most expensive mistakes so far were not learner failures. They were measurement mistakes. For example, full-r14 failed gate D4 because the evaluator read a readout channel that is positive on every row, so its sign carried no information ([full-r14 report](../../archive/early-development/research/reports/stage1-full-r14-2026-10-30/README.md)). A second pair of eyes should look for more mistakes of that kind before they cost another multi-hour run.

## 2. Hard rules (read AGENTS.md first; these add to it)

- **Read-only on code, data, runs and frozen artifacts.** Do not edit any existing file. The only files you may create are inside `research/reports/codebase-weakness-review-2026-10-30/`.
- **A live experiment may be running** (the full-r15 audit, supervised by a detached `fly babysit`). Never start, stop, pause or kill a process. Never run `fly start`, `fly babysit`, `fly detach`, `fly pause`, `fly resume` or any training or audit runner. Check `tasklist` before running anything heavy.
- **No graph runs.** Do not load the full connectome graph. Cheap checks are fine: reading files, `node --test` on a single test file, the Python unit tests in `python actions/` (run them as `python test_curriculum.py`, not via `-m unittest`), and small no-graph scripts that read existing JSON/JSONL in streamed form. Keep `node --max-old-space-size=256`, and keep any process under 2048 MiB RSS with at least 256 MiB system memory free.
- **Do not open sealed data.** Final-test families stay sealed. Do not read validation or final evaluation outputs to look for weaknesses; use training-side evidence and code. If a check would need sealed data, describe it instead of running it.
- **Use the right Python.** The interpreter is `%USERPROFILE%\.venv-class\Scripts\python.exe`; bare `python` may be a Windows Store alias that hangs.
- **No commits, no network uploads, no paid services.**

## 3. What to review, in priority order

For each area, find the actual call path first, then look for places where the code does not do what the documentation, protocol or gate claims.

1. **Gate and audit integrity (highest priority).** Does each frozen Stage 1 gate D1-D8 measure what its definition says? Look for stale channels, sign conventions, ties or zeros counted the wrong way, off-by-one block or checkpoint selection, controls not truly yoked to the informative arm, and anything that could pass or fail a gate for the wrong reason. Files: `.codebase/src/puzzle-learning/curriculum-stage-acceptance.mjs`, `.codebase/src/puzzle-learning/lichess-curriculum-stage-audit.mjs`, `.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs` (and the frozen v2 it was copied from), `.codebase/scripts/puzzle-learning/report-stage1-audit.mjs`, `.codebase/src/puzzle-learning/alpha-lobe-valence.mjs`.
2. **Data separation and leakage.** Can training families, validation families and final families overlap, by position, by FEN after symmetry, or by shared motif construction? Can checkpoint selection or any planner decision see validation or final data? Files: `research/data/lichess-stage1-synthetic-v1/`, `.codebase/scripts/data/`, the registration and protocol JSON files for full-r15.
3. **Learning mechanism faithfulness.** Is all lasting change inside the modeled plasticity (KC to MBON gains under dopaminergic teaching), with no hidden supervised update, no teacher-computed weight delta, and no search used in place of learning? Are reward and punishment routed to the declared neuron identities with the declared signs? Files: `.codebase/src/puzzle-learning/` (brains, memories, feedback), `.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory.mjs`.
4. **Feedback correctness.** Are consequence certificates rechecked before replay and in the audit? Does unknown verification produce no event, rather than a reward or a punishment? Is the learner's unaided ranking recorded before feedback? Files: `.codebase/src/search-and-feedback/`, `documentation/design/puzzle-learning/feedback-quality-gate.md`.
5. **Persistence, resume and replay.** Can a resume duplicate or skip a lesson update? Is the pending receipt persisted before acknowledgement? Is the parallel per-replica training plus merge exactly equivalent to serial training? Files: `.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v5.mjs`, `.codebase/src/puzzle-learning/lichess-curriculum-matrix.mjs`, `.codebase/src/puzzle-learning/lichess-curriculum-block.mjs`.
6. **Supervisor and tooling.** `python actions/curriculum.py` and `python actions/fly_controls.py`: failure modes that could leave a job unsupervised, launch a duplicate, misreport a terminal state, or silently restart. Note: babysit hardening (single-supervisor lock, adopting a live job, retrying transient inspection failures, confirming a resource-guard breach before a cooperative pause) is being implemented in parallel on 2026-10-30; review its result if it has landed, but do not edit it.
7. **Representation and readout ceilings.** From the existing reports only (no new graph runs): which limits on transfer are measured, and which are assumed? See the weakness map in `documentation/handoffs/reasoning-research-goal-2026-10-28.md`, section 3.
8. **Reproducibility.** Are all inputs that affect a result pinned by SHA-256 in the step files, registrations and protocols? Could an unpinned file change an outcome?
9. **Documentation drift.** Places where `documentation/current-status.md`, the decision log or the handoffs state something the code or the raw evidence contradicts.

Start from `AGENTS.md`, `.codebase/README.md`, `documentation/current-status.md`, `documentation/handoffs/reasoning-research-goal-2026-10-28.md`, `documentation/handoffs/curriculum-reasoning-state.md` and the newest entries of `documentation/handoffs/fix-goal-ledger-2026-10-24.md`.

## 4. What counts as a finding

A finding is a concrete defect with a failure scenario: "given these inputs or this state, this code produces this wrong output or this invalid conclusion". For each one, record:

- **ID and title**, and the **component** (from section 3).
- **Location**: `path:line`.
- **Failure scenario**: the inputs or state, and the wrong result.
- **Evidence**: how you checked it (code reading, a unit test you ran, a small read-only script). Put any script you wrote in the report folder, with its output.
- **Verdict**: `CONFIRMED` (you reproduced or traced it end to end) or `PLAUSIBLE` (the code path allows it but you did not reproduce it). Do not report pure style preferences.
- **Severity**: `critical` (can invalidate a gate, a published result or the separation of data), `high` (can waste a multi-hour run or hide a learner failure), `medium` (a robustness or reproducibility gap), `low`.
- **Impact on existing evidence**: does it affect any completed run or audit (name it), or only future runs?
- **Smallest fix**: describe it; do not apply it.

Also list areas you reviewed and found sound, briefly, so the coverage is visible. Separate measured facts from hypotheses everywhere.

## 5. Output

Write `research/reports/codebase-weakness-review-2026-10-30/README.md` with: a one-paragraph summary, the findings table ranked by severity (most severe first), one section per finding with the fields above, the coverage list, and the exact commands you ran. Keep any scripts and their outputs next to it.

## 6. When you are done

Stop when every area in section 3 has either findings or an explicit "reviewed, no defect found" note, every finding has a verdict and evidence, and the report is written. Also stop if a check would require breaking a rule in section 2: record the check you would have run and why it matters, then move on. Do not say "EUREKA EUREKA"; this review cannot pass a gate.
