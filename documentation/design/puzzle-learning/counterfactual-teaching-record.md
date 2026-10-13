# Counterfactual teaching record

2026-10-08. This is a checked lesson-record interface, not a new neural mechanism or a completed learning experiment. It responds to the completed correction-preservation v2 screen, where verified scalar consequence delivery changed many eligible edges but did not repair the target and a shuffled control changed validation more.

## What a valid record contains

`bindCounterfactualTeachingRecord` requires, before any future neural delivery:

1. The exact board, PGN/history, task and current persistent-memory hash.
2. The learner's unaided candidate ranking, with the attempted move as its chosen action.
3. A separately declared learner consequence prediction for the attempted and surviving moves. It must be identified as a learner output and cannot be a Stockfish/teacher estimate. The current system has no validated neural consequence output, so this contract does not make it one.
4. Independently replayed, contrasting certificates for the chosen attempt and the alternative. The initial scope is only one-ply capture retention: the failed move must list certified immediate recapture(s), and the alternative must have none under the full legal-reply certificate.

Unknown, stale, unassessed, nonchosen, forged, same-valence, missing-refutation, or teacher-origin prediction records fail closed. The output explicitly says that the existing receiver still consumes only its board/action cue plus experimental channel; no reply prose, teacher engine score, certificate-derived efficacy delta, or external search enters the neural update.

## Why this is the next interface

The MiMo/SCoRe analogy is procedural only: record an attempt, execute an independent criterion, identify the discriminating failure, then evaluate a correction without counting a correct-to-wrong revision as progress. Stockfish informs separately pinned checking/evaluation designs; its score is neither a proof nor a neural target by default. Capablanca motivates purposeful, economical candidate investigation after tactical safety has been checked, not an arbitrary tiny candidate cap. The evidence and limitations are registered in the [feedback-quality review](../../../research/literature/feedback-quality-deep-review-2026-10-08/review.md).

The record does not resolve the v2 overlap finding: the target's opposing actions shared 8 direct cue cells and 60 recurrently active KCs. It prevents the next assay from hiding that issue behind a bare success/failure pulse. A new encoder or delivery interface must state, prior to freeze, which **public board relation** represents the attempted move, verified refuting reply, and surviving alternative. It may not encode a teacher outcome label into the action cue.

## Next experiment gate

Before graph work, freeze a separate protocol and archive its inputs. Use the same small exposure budget across informative, no-channel, within-move matched-shuffled, and disabled-plasticity arms. Pin candidate generation and defensive certificate coverage. Require, in order:

1. target error changes to correct;
2. preservation sentinel remains correct;
3. target margin gain exceeds every control and no required panel regresses;
4. a delayed frozen-memory probe remains useful;
5. a disjoint changed-relation counterfactual passes with learning off.

The first three are development gates. The last two are required before describing feedback as 8/10 or useful for transferable chess reasoning. All-legal evaluation, broader multi-ply credit and Lichess corpus scaling remain later stages.

Implementation: [record contract](../../../.codebase/src/puzzle-learning/counterfactual-teaching-record.mjs), [adversarial tests](../../../.codebase/tests/puzzle-learning/counterfactual-teaching-record.test.mjs). The contract has no graph dependency and no neural delivery path yet.
