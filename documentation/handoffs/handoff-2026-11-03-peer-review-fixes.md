# Handoff, 2026-11-03: peer-review fixes, seeing test, memory test

Written at the end of a long session so a new session can continue. Nothing is committed to git. The working tree also holds other sessions' uncommitted work; preserve it.

## Where things stand (one paragraph)

All eight peer-review problems have software fixes and tests (full suite 837 tests, 0 failures). Three brain runs happened today, each authorized by the researcher. **Eye test v2:** pipeline fault, so it does not count; the raw eye input gave the answer away (38/48). **Seeing test v1:** the fly's memory cells tell a knight from a bishop on e4, 48/48, so the fly can see. **Memory test v1:** the γ4 memory rule did not pass; feedback had no effect. The MBON05 move score stays switched off. The researcher's standing instruction for this failure: **design and build, but do not run, the disclosed engineered-memory condition.**

## Read these first

1. [Fix report](../../research/reports/overnight-peer-review-2026-11-02/fixes-2026-11-03.md): problem-by-problem table (implemented / verified / needs approval).
2. [Review package](../../research/reports/overnight-peer-review-2026-11-02/review-package-2026-11-03.md): for the four reviewers; separates software repairs from untested scientific claims.
3. [Restart plan revision](../design/research-goals/restart-plan-revision-2026-11-03.md): decisions for problems 1, 4, 5, 6 and 7, including the later correction that allows disclosed engineered memory.
4. [Transfer and combination protocol](../design/research-goals/transfer-and-combination-protocol-2026-11-03.md): Phases B and C.
5. [Proposals and researcher decisions](../design/research-goals/approval-proposals-2026-11-03.md).
6. Results: [Eye test v2](../../research/reports/eye-test-v2-2026-11-03/README.md), [Seeing test v1](../../research/reports/seeing-test-2026-11-03/README.md), [Memory test v1](../../research/reports/memory-test-2026-11-03/README.md).
7. [Mistakes and pivots journal](../../research/journal/experiments/2026-11-03-peer-review-fixes.md).

## The eight problems

| # | Problem | State |
|---|---|---|
| 1 | Identical eye input for capture and non-capture | Fixed: Eyes v2 plus `inputCollisions` check |
| 2 | Audit passed an empty answer list | Fixed; pilot re-audit counts 144 |
| 3 | `check` label skipped safety checks before training starts | Fixed in `python actions/curriculum.py` |
| 4 | Memory changed between move scores | Fixed: `frozenScores`; pilot report labeled |
| 5 | Unreachable strength 1.8; incomplete move score | Eye test v2, contract and chooser built. Contract stays **switched off**: memory test failed |
| 6 | Impossible en-passant group | Replaced, with a test |
| 7 | Exact-match answer file | Comparison systems built; brain-only rule corrected to allow disclosed engineered memory |
| 8 | Incomplete later tests | Protocol, pass rule, answer checker and twin-pair generator built; phases cannot start before Phase A |

## Researcher decisions in force

1. Data source approved: the Lichess puzzle database (CC0) with fetched histories; training and development data only; locked sets closed.
2. Engineered memory is allowed if it is disclosed (2026-11-01).
3. On memory-test failure: build the engineered-memory condition, **do not run it**.
4. No chess training without separate approval.
5. Some earlier approval answers were drafted by a delegated AI (GPT-6.1 Sol). Treat only the researcher's own words as approval.

## Data and run artifacts (not in git)

- `runs/restart-data-2026-11-03/`: old-game exclusion report (48,432 files scanned, 0 split mismatches), 300 training-bucket game histories, 136 capture twin pairs, the 48 eye-test pairs.
- `runs/eye-test-v2-2026-11-03/`, `runs/seeing-test-2026-11-03/`, `runs/memory-test-2026-11-03/`.
- Step files: `python actions/eye-test-v2-step.json`, `seeing-test-v1-step.json`, `memory-test-v1-step.json`.

## Update: engineered memory is BUILT, not run (end of session)

- Code: `.codebase/src/neural-learning/kc-episodic-memory-v1.mjs` (store of feature patterns with outcomes, scored by most similar pattern), runner `.codebase/scripts/neural-learning/run-engineered-memory-test-v1.mjs`, test `kc-episodic-memory-v1.test.mjs` (7/7 pass).
- Task: the same knight-versus-bishop association, with the correct candidate balanced (items 0 and 2 knight, items 1 and 3 bishop) and a truly silent no-feedback arm. Arms: Kenyon-cell features, raw eyes, random projection, mismatched values, no feedback, no memory; 3 seeds. The rewired-graph comparison is missing because no rewired graph exists.
- Pass rule, fixed in advance: the Kenyon-cell arm passes after acquisition, after the delay and after the reversal in all 3 seeds; mismatched, no-feedback and no-memory fail in every seed. Raw and random arms are reported comparisons.
- Settings: `python actions/engineered-memory-test-v1-step.json`, registered **paused**.
- To run, after the researcher's own approval: set `paused` to false, then `fly.cmd --config "python actions/engineered-memory-test-v1-step.json" plan engineered` and `... start engineered`. About 312 brain passes (2 to 5 minutes) plus memory scoring, whose time is unmeasured (possibly slow). Memory limit 2048 MiB.
- This tests whether the memory works on boards it has seen. It does not test transfer to new boards; that comes later.

## Original next-task notes

Goal: a disclosed external store that saves the fly's memory-cell (Kenyon-cell) pattern for each experienced board, with its verified outcome, and scores a new board by similarity to stored patterns. The seeing test shows these patterns carry the board picture.

Requirements already written down: the [revision](../design/research-goals/restart-plan-revision-2026-11-03.md), problem 7 correction (comparisons against the same retrieval on raw eyes, on random or rewired features, with no memory and with mismatched memory), and the [eLife protocol](../design/research-goals/elife-prospective-protocol-2026-11-02.md) (bounded nearest-neighbour readout, Blundell source not yet adapted). Reuse `similarBoardRecall` and `frozenScores` in `transfer-evaluation-v1.mjs` and `episodic-consequence-memory.mjs` (frozen; do not edit). Register any adapted source in the source register before use.

Lessons from the failed memory test to carry over:

1. Do not reward the candidate the fly already prefers; balance or randomize which candidate is correct.
2. A no-feedback arm must truly change nothing.

## Working rules for this project

1. Coding goes to Haiku sub-agents only, at most 3 at a time, each with a complete spec. The main session reviews and tests.
2. Use `fly.cmd` for brain-model runs; every brain run needs the researcher's own approval.
3. Plain English in documents; say "the fly".
4. Record every mistake and pivot.
5. The `/goal` stop hook from this session keeps repeating while problems 5, 7 and 8 wait on research results; the researcher can clear it with `/goal clear`.

## Addendum, later 2026-11-03: engineered memory v2 replaces v1 (built, NOT run)

Review found v1 (above) scores only seen boards and cannot pass its own reversal (the oldest of equally similar patterns always wins). Do not run v1. Its files stay as history.

- v2 design, fixed pass rule, run command and cost: [engineered-memory-test-v2.md](../design/neural-learning/engineered-memory-test-v2.md).
- Code: `kc-episodic-memory-v2.mjs`, `engineered-memory-task-v2.mjs` (19 tests pass on synthetic vectors), runner `run-engineered-memory-test-v2.mjs`, step file `python actions/engineered-memory-test-v2-step.json` (paused; `plan` shows only the pause blocker).
- Mistakes and pivot: journal items 11 to 15 in [the journal](../../research/journal/experiments/2026-11-03-peer-review-fixes.md).
- Needs the researcher's own approval to run.

## Addendum 2, later 2026-11-03: v2 ran and failed; v3 built

- v2 result, pathway trace and fix attempts: [report](../../research/reports/engineered-memory-test-v2-2026-11-03/README.md); journal items 16 to 23.
- v3 (episodic memory without hints): [design and pass rule](../design/neural-learning/engineered-memory-test-v3.md); step file `python actions/engineered-memory-test-v3-step.json` (paused; plan shows only the pause blocker). About 3 hours; needs the researcher's own approval.
