# FlyChess archive

| Record | Where to start |
| --- | --- |
| [Early development](early-development/README.md) | Reports, data, and source snapshots from before the October 30 research restart. |
| [Retired Python actions](#retired-python-actions) | Find the original scripts and run registrations for earlier experiments. |

## Retired Python actions

The [Python actions snapshot](https://github.com/ethanramli/fly-chess-research/tree/8d9bc9ed87c4f38bfb5d2ca07a7eb59f4875f746/python%20actions) preserves the old folder before the cleanup. It includes the dated monitors, experiments, benchmark campaigns and registrations cited in the reports. Browse the snapshot to look up an old path or checkout the revision recorded by the run to replay it.

Use the run's saved registration, source hashes and original paths for an audit or recovery. Local `runs/` artifacts are stored on the machine that ran the experiment. Campaign state is keyed to the absolute registration path, so recovery needs the recorded checkout location and its saved state. The [current research handoff](../documentation/next-checkpoint.md) identifies the work awaiting a decision.

The [memory v7 registration](python-actions/engineered-memory-test-v7-step.json) is also stored here because the auditor's regression test compares its data hashes against the original file.
