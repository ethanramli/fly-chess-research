# Project Map

## Purpose
Operate registered FlyChess curriculum experiments and inspect their evidence from a terminal.

## Requirements
- User wants `fly report` to display readable visual curriculum progress and useful performance statistics, avoiding checkpoint/test jargon.
- Latest report preference: show positive/regression trends with measured percentage changes compared with a previous evaluation; user withdrew distance-to-reasoning reporting.
- User wants `fly pause` to pause the curriculum run.
- Resume is through `fly babysit`.

## Verified components
- `fly.cmd`: installed command launcher; enters the repository before invoking Python.
- `python actions/curriculum.py`: job registration, launch guards, process tracking, JSON reporting and resumable babysitter.
- `python actions/curriculum-step.json`: registered paths, jobs and source pins.
- `.codebase/scripts/neural-learning/run-g0-reversal-history-replication.mjs`: preserved frozen canonical learner.
- `python actions/fly_controls.py`: visual report, registered-run resolution, pause request and saved-stop validation.
- `.codebase/scripts/neural-learning/run-g0-history-with-pause.mjs`: separately pinned operational copy with lesson-boundary pause.
- `research/data/lesson-pause-control-v1/`: execution registration, declared source insertions, actual auditor and preserved previous config.
- Run data: stage results include correct contexts and margins; final result includes descriptive branch gates. The active synthetic diagnostic cannot pass G0 or establish chess transfer.

## Main flow
Existing: fly command -> Python action -> registered learner -> saved state -> independent audit -> review.
Implemented: report -> registered saved measurements/current process; pause -> bound request -> saved lesson -> acknowledgment -> verified process exit; babysit -> saved-state continuation -> audit -> review.

## Data and boundaries
The supervisor and learner are separate processes. Frozen learner sources must remain intact. Saved work completed is distinct from independently demonstrated learning.

## Validation and limits
29 unit/regression cases passed; six-neuron actual prefix pause/resume and independent replay passed2 lessons/44 receipts. A complete24-stage pause-capable audit and power-loss recovery were not established. Current registered study has7/672 saved lessons and no completed comparable evaluation, so no positive/regression percentage is shown yet.
