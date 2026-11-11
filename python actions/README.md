# Python actions

This folder contains Python command-line actions, their registration files and dated records; use the read-only commands below to inspect registered work. The research is currently paused, so read the [current handoff](../documentation/next-checkpoint.md) before considering any job command; the [status page](../documentation/current-status.md) summarizes why it stopped.

## Before using the commands

These examples are for PowerShell from the repository root on the Windows machine where the Python environment is installed. [`fly.cmd`](../fly.cmd) calls [`curriculum.py`](curriculum.py) with the project Python at `%USERPROFILE%\.venv-class\Scripts\python.exe`; that environment must exist. Run the launcher from the repository root so its paths resolve. It can inspect a configured registration without starting its job.

## Inspect a registered job

| Read-only command | What it tells you |
| --- | --- |
| `.\fly.cmd status` | Campaign registration and readiness state. This is not the project research status; use the handoff above for that. |
| `.\fly.cmd --config "python actions\curriculum-step.json" status` | Status for one selected registration, including its recorded job/process state. |
| `.\fly.cmd --config "python actions\curriculum-step.json" watch --seconds 60 --interval 30` | Samples the selected registration for up to 60 seconds, every 30 seconds. Expiry only ends observation. |
| `.\fly.cmd --config "python actions\curriculum-step.json" logs` | Reads the bounded tail of the selected job's stderr log. Use `logs --stream stdout --bytes 4000` for a bounded stdout excerpt. |
| `.\fly.cmd --config "python actions\curriculum-step.json" plan audit` | Previews the registered audit command and blockers; it does not run the audit. |

Choose the registration named by the handoff or the relevant record. The example `curriculum-step.json` is a legacy single-step configuration, not an instruction to resume or launch its job. Status, watch, logs and plan only inspect or preview; they do not restart work or change research state.

## Starting or changing work

Commands such as `start train`, `start resume`, `start audit`, `run NAME`, `babysit`, and `detach` can start work. Do not use them while the current research pause is in force. The handoff is the route to the next decision and identifies any later authorization.

The [command guide](../documentation/design/puzzle-learning/python-curriculum-actions.md) explains command behavior, registration prerequisites, logs, recovery and resource limits. The [dated action history](https://github.com/ethanramli/fly-chess-research/blob/3262856e24edf3cda34bd3170a72ee88f8de4334/python%20actions/README.md) preserves the former landing page for context; its commands and status notes are historical, not ready-to-run instructions.
