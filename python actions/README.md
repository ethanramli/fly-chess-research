this folder is meant for python actions. instead of writing terminal isntead of having the AI agent's context filed up with terminal receipts, instead, making python actions that replace terminal actions, and this way, the terminal doesnt give receipts and lines that arent important, and instead only getting the information that is important. 

this is an enforced constraint when training the fly beacuse im letting AI run all of these through the CLI, and after awhile it can be quite expensive. especialy when most of teh context is bloated by terminal receipts. instead, you can only use terminal actions when it is not a looping routine like training in the curriculum. 

if you are diagnosing a problem in the training, you are still allowed to use terminal actions. but anything that you are doing over and oevr again, python actions are much much cheaper


## Verified local Python runtime

2026-10-19 09:17 Asia/Jakarta: Python 3.14.7 is already available at `C:\Users\ethan\.venv-class\Scripts\python.exe`. Its base runtime is `C:\Users\ethan\AppData\Roaming\uv\python\cpython-3.14-windows-x86_64-none`. File access, a child Python process, and the audit action help/syntax checks succeeded without requesting elevation or firewall changes. Use the explicit executable path; the bare `python` command resolves to the Windows Store alias. No installation or security-setting change was needed.

PowerShell invocation: `& "C:\Users\ethan\.venv-class\Scripts\python.exe" "python actions\audit_status.py" --help`

## Reusable curriculum interface

The bare `fly` command is registered in the Windows user PATH. Close and reopen the terminal application once after installation, then run `fly babysit` from any folder. The launcher enters the repository and preserves its exit code. To register it again after moving the repository, use [install-fly-command.ps1](install-fly-command.ps1).

- `fly report`: visual progress and performance changes compared with the previous completed comparable evaluation. Incomplete measurements and unmatched tests/seeds do not produce an improvement claim. `--json` retains machine-readable artifact output.
- `fly pause`: finish the current lesson, save and stop. Wait for **PAUSED - progress saved. Safe to close.** Resume with `fly babysit`. An audit can pause too; its read-only replay restarts on resume.

The [registered operational pause version](../research/data/lesson-pause-control-v1/README.md) preserves frozen code and adds separately archived execution identities. Checks:20/20 action regression cases,9/9 report/control cases, exact six-neuron pause/resume comparison and independent replay over2 lessons/44 receipts. This is bounded software evidence, not a full curriculum audit or power-loss guarantee.

From the repository root, use `.\fly.cmd status`, `.\fly.cmd plan audit`, or `.\fly.cmd run action-tests`. These use [curriculum.py](curriculum.py) and the editable [step file](curriculum-step.json). Change the few registered paths/pins in that file for the next authorized step. Raw output stays in `runs/python-actions/`; the command returns compact JSON. The earlier `audit_status.py` remains available for old one-off invocations; prefer the unified interface for new work.

The [complete command guide](../documentation/design/puzzle-learning/python-curriculum-actions.md) covers launch/resume/audit, status/waiting, checkpoint inspection, evidence summaries, tests, failure handling, and pause/resource boundaries. Reading or configuring these files does not start research.

For a registered experiment, `fly.cmd babysit` starts the configured train job, checks every five minutes by default, emits only changed progress, starts its registered independent audit after `result.json` appears, and stops for review. If invoked again after interruption, it selects the newest complete checkpoint from the same protocol and resumes into a fresh directory; the runner verifies the receipt chain and applies a pending receipt exactly once. It refuses missing/corrupt checkpoints, mismatched protocols or pins, unknown process state, and any run with no complete checkpoint. It does not continue to the next experiment or classify scientific success. Use `--interval SECONDS` to change the 10-3600 second polling interval. This power-loss path is not runtime-tested, and the frozen protocol does not guarantee filesystem survival after sudden power loss.

## Latency investigation

The researcher closed the optimization search, then separately authorized three exact consistency repetitions through [repeat_training_latency.py](repeat_training_latency.py). Those repetitions and independent audits are complete: **58.1%, 59.9%, 59.5% less elapsed time**, mean59.2%, on the selected workload after the RAM upgrade. The historical69.1% result did not meet its predeclared repeatability band. See [three-repeat results](../research/reports/training-latency-2026-10-19/repeatability-v1/README.md), [historical accepted result](../research/reports/training-latency-2026-10-19/accepted-result.md) and [closed handoff](../documentation/handoffs/training-latency-state.md). Keep the runtime/codec checks and winning campaign for reproduction; no further optimization is pending. Unused candidates remain in the [source archive](../research/source-archives/training-latency-abandoned-2026-10-19/README.md). The curriculum configuration was not changed or launched; its `paused` flag was false at closeout, correcting earlier unverified prose describing that flag as paused.
