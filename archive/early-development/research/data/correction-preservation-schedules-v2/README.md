# Correction-preservation schedules v2

Prepared 2026-10-08 from the audited training-only baseline. This artifact corrects the move-frequency imbalance found in v1 while preserving v1 and its history.

The targeted schedule reviews tr-06 and tr-03. The score-blind comparator selects tr-05 and tr-02 from verified outcome strata by a stable seeded hash, excluding the selected target/sentinel panels. Both schedules have two contexts and the exact same four-event pattern: a1a4 failure, e1e5 success, a1a4 success, e1e5 failure. Each move therefore has one verified success and one verified failure in both schedules.

The manifest records hashes for the schedule and preparation script. The schedule embeds the source protocol, training-data, baseline report, independent audit, completion marker, and v1 schedule hashes. No validation panel outcomes were inspected and no final-family file was opened; the pinned audit bytes were hashed only for source integrity. Certificates were rechecked while constructing each event.

This directory contains schedules only. No graph inference, learner update, retention measurement, acquisition result or transfer result occurred. The shuffled-control specification keeps verified consequence truth separate from the deliberately reassigned channel. A new frozen protocol, archived experiment runner, independent graph auditor and recovery validation are required before graph use.

- [Schedule manifest](manifest.json)
- [Full schedules and certificate-bound experiences](schedules.json)
- [Preparation script](../../../.codebase/scripts/diagnostics/prepare-correction-preservation-schedules-v2.mjs)
- [Experiment design and gates](../../../documentation/design/puzzle-learning/correction-and-preservation-feedback.md)
- [Journal audit](../../journal/experiments/2026-10-08-correction-preservation-schedules-v2.md)