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
| [`chess-data/`](chess-data/) | Extract and verify Lichess archives, fetch source games, prepare lesson batches, and report batch progress. |
| [`curriculum/`](curriculum/README.md) | Where the curriculum builders write registrations for new steps. |
| [`memory/`](memory/) | [Compile](memory/build_fly_connections_apl.py) and test the contact-site packages the memory model reads. |
<!-- /directory-map -->

The root keeps the shared runner, its tests and the default single-step registration used by the launcher.

## When an action earns its place

For recurring work, start with the existing runner and register the underlying command once. Write Python when it removes a repeated workflow, such as polling a process, checking for a published checkpoint, or collecting a bounded result across many jobs. A one-off terminal check or edit can stay a terminal check or edit. For long runs, save full logs and receipts to disk and return only the changed milestones, terminal state, and errors.

Use the [archive](../archive/README.md#retired-python-actions) for past run registrations, fixed-run monitors, experiment analyses and benchmark campaigns. For replay, use the revision and registration recorded by the run.
