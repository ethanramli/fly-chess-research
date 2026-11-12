# Python actions

FlyChess uses Python actions to run long experiments without filling an AI session with terminal receipts. An action takes the exact command, inputs and limits from a JSON registration. It saves the command and raw output under `runs/python-actions/` and prints short updates when a run reaches a milestone, hits a limit, or ends. The same registration tells the next session which run, logs and checkpoints to inspect.

Use [`fly.cmd`](../fly.cmd) for the usual workflow. It calls the [shared Python runner](curriculum.py), which checks input hashes, identifies the process it owns, and handles registered launches, audits and recovery. [Pause and recovery controls](fly_controls.py) support that runner. A [separate audit monitor](audit_status.py) can observe an existing Windows audit by PID and log paths when it was launched outside the runner.

## Inspect a run

From the repository root in Windows PowerShell, use the Python environment at `%USERPROFILE%\.venv-class\Scripts\python.exe` that `fly.cmd` expects. Read the [current research handoff](../documentation/next-checkpoint.md) first. It identifies the checkpoint and the current pause. Choose the registration for the run you want to inspect.

```powershell
.\fly.cmd status
.\fly.cmd --config "python actions\curriculum-step.json" status
.\fly.cmd --config "python actions\curriculum-step.json" watch --seconds 60 --interval 30
.\fly.cmd --config "python actions\curriculum-step.json" logs --stream stderr --bytes 1200
.\fly.cmd --config "python actions\curriculum-step.json" plan audit
```

Bare `status` shows the default campaign's readiness. The example with `--config` selects the legacy single-step registration to demonstrate the command shape. `watch` stops observing when its time window ends. `plan audit` previews the command and its blockers. See the [command guide](../documentation/design/puzzle-learning/python-curriculum-actions.md) for job commands and recovery.

## Find a registration or tool

<!-- directory-map -->
| Folder | What it holds |
| --- | --- |
| [`chess-data/`](chess-data/) | Lichess archive extraction, game downloads, lesson preparation and independent data checks. |
| [`curriculum/`](curriculum/) | Lesson and campaign registrations, including staged training, audits, and synthetic data preparation. |
| [`memory/`](memory/) | Memory and circuit experiment registrations, analysis scripts, and experiment-specific checks. |
| [`performance/`](performance/) | Timing, resource profiling and benchmark registrations. |
<!-- /directory-map -->

The root keeps the shared runner, its tests and its default single-step registration. The original long-term-memory pilot registration and its status script also keep their recorded paths for the [independent auditor](../.codebase/scripts/neural-learning/audit-long-term-memory-v1-live.mjs), which checks their hashes.

The older campaign registrations in `curriculum/` are paused. Moving a campaign changes the path the runner uses to find its saved state. Keep the original checkout and registration path to recover a saved campaign.

## When an action earns its place

For recurring work, start with the existing runner and register the underlying command once. Write Python when it removes a repeated workflow, such as polling a process, checking for a published checkpoint, or collecting a bounded result across many jobs. A one-off terminal check or edit can stay a terminal check or edit. For long runs, save full logs and receipts to disk and return only the changed milestones, terminal state, and errors.

The [previous tree](https://github.com/ethanramli/fly-chess-research/tree/8d9bc9ed87c4f38bfb5d2ca07a7eb59f4875f746/python%20actions) holds the original paths and bytes for older reports and the removed one-off scripts. For an audit or resume tied to a saved registration hash, use the revision or invocation snapshot recorded by that run. Moving a registration can change its hash when paths inside it are updated.
