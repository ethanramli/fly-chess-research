# Review package: fixes for the eight problems (2026-11-03)

For the same four reviewers, before any experiment. Start with the [fix report](fixes-2026-11-03.md), whose first table lists each problem.

## Read this first

1. **Software repairs are complete and tested. No scientific claim is established.** No fly simulation, training or brain-model run happened. No real-data pair exists yet.
2. Sealed and locked test data were not opened.
3. The researcher's 2026-11-03 decisions are recorded in the [proposals](../../../documentation/design/research-goals/approval-proposals-2026-11-03.md). The researcher later said those answers were drafted by a delegated AI (GPT-6.1 Sol). So the data fetch and generation under Proposal C are **paused until the researcher confirms them**.

## Completed software repairs (verified by tests only)

| Problem | Files | Tests |
|---|---|---|
| 1. Same eye input | `.codebase/src/chess-input/eyes-v2.mjs`, design `documentation/design/chess-input/eyes-v2.md` | `eyes-v2.test.mjs` 7/7 (real retina included) |
| 2. Empty answer list | `.codebase/scripts/neural-learning/audit-long-term-memory-v1-live.mjs` (as-run copy `audit-long-term-memory-v1-live-as-run-before-fix.mjs.txt`) | `fix-checks/empty-answer-check.json`; pilot re-audit `fix-checks/pilot-audit-with-required-answers.json` (144 counted) |
| 3. Safety checks skipped | `python actions/curriculum.py`, `python actions/test_curriculum.py` | 47/47; `fix-checks/guard-check.json` |
| 4. Memory changed between scores | `.codebase/src/neural-learning/transfer-evaluation-v1.mjs` (`frozenScores`); pilot report correction | `transfer-evaluation-v1.test.mjs` 15/15 |
| 5. Strength and score rule | `eye-test-v2.mjs`, `move-score-contract-v1.json`, `move-chooser-v1.mjs`, `eye-test-v2-runner.mjs`, `run-eye-test-v2.mjs`, `python actions/eye-test-v2-step.json` (paused) | 4/4, 2/2, 6/6, 4/4 on a fake model |
| 6. En-passant group | `en-passant-capture-group.test.mjs`; generator keeps real history | 5/5 |
| 7. Exact-match answer file | `transfer-evaluation-v1.mjs` (`exactRepeats`, `similarBoardRecall`) | in the 15/15 above |
| 8. Later tests | `documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md`; `landing-square-certificate.mjs`; `twin-pair-generator-v1.mjs`, `twin-pair-search-v1.mjs`, `generate-twin-pairs.mjs` | 9/9, 9/9, 4/4 |
| Data source (C) | `verify-old-game-exclusion.mjs`, `python actions/fetch_restart_game_pgns.py` | 3/3, 5/5 (no network, no real data) |

Final full suite: 837 tests, 0 failures, 2 skipped with printed reasons; Python action tests 47/47 and 5/5. Eye test v2 then ran once: [result](../eye-test-v2-2026-11-03/README.md) (pipeline fault; does not count).

Plan changes are dated revisions, not rewrites: [restart plan revision](../../../documentation/design/research-goals/restart-plan-revision-2026-11-03.md) (with a later correction to problem 7) and three dated notes in the restart plan itself.

## Scientific claims that still need testing

None of these is known. Each needs an approved run.

1. Eyes v2 carries the safe-or-unsafe answer through the brain (Eye test v2, not run).
2. Reachable gains give a measurable strength M of at least 10% of tokens (not run).
3. Feedback can move MBON05-based margins both ways against controls (memory test, not approved).
4. Any memory formula supports acquisition, retention and reversal on this task (not approved).
5. Any transfer, or any combination of ideas, by the fly (Phases A to C, not started).

## Questions for reviewers

1. Does the Eyes v2 argument in the revision (problem 1) show that the safe-capture answer depends only on what Eyes v2 shows?
2. Is the eye test's strength measure M, which uses no approach or avoid labels, a fair replacement for the unreachable 1.8 setting?
3. Does the exclusion check prove that earlier games are excluded without opening sealed sets? (It has not run yet.)
4. Does the corrected memory rule (brain-only or declared engineered memory) keep the reasoning test as strict as before?
5. In the eye-test runner, the token pools are rebuilt from the graph, not copied from the archived Stage 1 runs. Is that acceptable for a positive control?

## Known limits

1. The runner was tested only on a fake model; its real run time is unknown.
2. The twin-pair search tries every single-square edit, about 4 seconds per move.
3. Twin boards are one edit away from a real game, so the twin itself was not reached by real moves.
4. The exact Lichess rate limit was not verified.

[Fix report](fixes-2026-11-03.md) · [Problems](ranked-problems.md) · [Journal](../../journal/experiments/2026-11-03-peer-review-fixes.md)
