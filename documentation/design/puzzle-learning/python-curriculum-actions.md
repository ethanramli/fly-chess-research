# Reusable Python curriculum commands

The bare command is installed in the Windows user PATH: open a fresh terminal application and type `fly babysit` from any folder. Registration uses [install-fly-command.ps1](../../../python%20actions/install-fly-command.ps1); the launcher enters the project directory before calling Python.

Everyday commands: `fly babysit` starts/resumes; `fly report` displays a visual progress/performance report; `fly pause` finishes the current lesson, saves and stops. Wait for **PAUSED - progress saved. Safe to close.** before closing. A slow lesson may take longer than a minute. During independent verification, pause stops after a verified lesson; resuming restarts read-only verification while retaining training results.

20 October 2026. Tooling around existing registered commands. The curriculum goal is active; adding or using a tooling command does not authorize an unregistered experiment or recovery from an unverified checkpoint.

From the repository root:

```powershell
.\fly.cmd status
.\fly.cmd plan audit
.\fly.cmd babysit
.\fly.cmd run action-tests
```

`fly.cmd` only invokes [curriculum.py](../../../python%20actions/curriculum.py) through the existing `%USERPROFILE%\.venv-class\Scripts\python.exe` (Python 3.14.7). No new packages, installation, PATH edit, or firewall exception. It uses `GlobalMemoryStatusEx` for free memory and `Get-Process` for process metadata, avoiding WMI. A tracked child is matched by PID, creation time and executable path against its saved launch argv; untracked attach still requires exact command-line inspection. Missing identity or resource fields remain unknown and block unsafe launch/recovery. Direct equivalent:

```powershell
& "$env:USERPROFILE\.venv-class\Scripts\python.exe" "python actions\curriculum.py" status
```

## Change a few values for the next authorized step

Edit [curriculum-step.json](../../../python%20actions/curriculum-step.json); each launch saves an exact copy and its hash beside the logs. Another prepared config can be selected with `--config PATH` before the subcommand.

| Setting | Purpose |
|---|---|
| `paths.run` | One run identity for training/resume output, audit, and evidence reports. Training/resume require a fresh directory. |
| `paths.checkpoint` | Explicit complete publication for manual recovery; babysit selects the newest complete matching publication in its tracked run. Never a partial file. |
| `paths.protocol`, `runner`, `auditor` | Reviewed protocol and actual existing executable paths. |
| `pins` | Expected SHA256 values from registration. Investigate mismatches; never update a pin simply to make a check pass. |
| `jobs.NAME.argv` | Exact registered argument array, changed only when the actual CLI differs. No shell interpolation. |
| `artifacts`, `report_fields` | Small published result/audit metrics and per-criterion gates. Exclude memories, receipts, and sealed case data. |
| `observe` | Existing PID and sibling logs, only when attaching to earlier work. |
| `paused` | Keep true during a research pause. Editing it does not authorize research. |

The supplied config describes the registered G0 history replication, with the separately pinned [lesson-pause execution version](../../../archive/early-development/research/data/lesson-pause-control-v1/README.md). Its unpaused config permits an explicit launch/resume after preflight; this documentation does not launch it. Original frozen sources/protocol remain preserved and canonical numerical identity is distinct from actual operational-source identity. This interface adds no executable C01 protocol.

## Command reference

All rows follow `.\fly.cmd`.

| Command | Action and useful output |
|---|---|
| `status` | By default reports the twelve-stage campaign registration, accepted-stage count, current stage and stopped/running state; it does not mix in legacy one-step fields. Use `--config PATH status` to inspect one explicitly selected action's PID identity, progress, resources, checkpoint and config drift; `status --curriculum PATH` selects another campaign registration. |
| `attach audit` | Observe the configured existing PID; optional `--pid N`. Requires the exact command-line argument list and records its creation time. Starts nothing; attach remains unavailable when Windows denies command-line inspection. |
| `watch --seconds 60 --interval 30` | Bounded observation; initial sample and meaningful changes only. Expiry is not termination and never triggers restart. |
| `babysit --interval 300` | Select the default twelve-stage campaign registration (`python actions/curriculum-campaign.json`). If it is not installed, report it as missing without starting an experiment. 2026-10-24: none is installed; the full-r5 default is preserved as `curriculum-campaign-full-r5-superseded.json`. |
| `--config PATH babysit [train] [audit] --interval 300` | Explicitly run one registered job and its independent audit, then stop with a compact summary. If rerun after interruption, verify the tracked run and protocol, select its newest complete checkpoint, and resume into a fresh directory. The runner validates receipt continuity and pending-receipt exactly-once recovery. |
| `babysit --curriculum PATH --interval 300` | Run a pinned twelve-stage campaign serially. Registration revision 8+ adds registered safety controls fixed before the run: an informative-arm early stop (gate-failed with the block-start training-board counts when the best count does not improve within the registered window) and a rehearsal-planner cap (no panel targeted in more than 2 consecutive blocks). Each stage requires its own registered train/audit config, pinned prerequisite evidence and explicit audit booleans. Stops on failed, missing or changed evidence; resumes only the same in-progress registration. It does not supply missing stage runners or accept unspecified gates. Stage 1 campaigns (smoke/full, by revision) run end to end; Stages 2-12 stop with recorded readiness reasons. |
| `verify` | Stream configured pin hashes; mismatch exits 1. This small preflight does not replace the runner/auditor's full identity checks. |
| `plan train` / `plan resume` / `plan audit` | Exact argv, working directory, pins, and launch blockers. Preview only; blocked preview returns `ready:false`. |
| `start train` / `start resume` / `start audit` | Explicit background launch of the selected registered job. Refuses pause, another experiment/unknown Node owner, low free RAM, changed pins, overwritten output/audit, partial/mismatched recovery protocol, or changed heap/duty flags. |
| `run action-tests` | Python tooling checks with counts, exit code, and log paths. Does not overwrite the tracked graph handle. |
| `plan core-tests` / `run core-tests` | Preview/run existing `npm test` via its Node CLI. Run when applicable; tooling-only changes do not require simulations. Raw output stays in files. |
| `checkpoint` | Configured recovery publication's hash, sequence, receipt count, protocol identity, and pending flag. Reads without acknowledging/mutating. |
| `checkpoint --latest` | Greatest completed checkpoint filename in `paths.run`, excluding partial/temp names. A parsed candidate, not proof of continuity. `--path PATH` inspects an explicit publication instead. The `babysit` resume path additionally checks protocol identity and relies on the runner's full receipt-chain validation. |
| `report` | Visual status, lesson progress bar, current skill, measured correctness/retention/adaptation, and observed positive/regression/mixed trends. Trends require complete independently replayed results and the same test/source/seed conditions in explicitly registered history. Changes are in percentage points, not probabilities. Missing comparable evidence is stated. |
| `report --json` | Raw configured result/audit summaries for automation, resolved to the actual current resumed run. |
| `pause` | Request a stop at the next fully saved lesson boundary, then confirm saved state and process exit. Unknown identity or timeout never counts as a successful pause; no forced termination. Rerun babysit to resume. Lichess stage matrices support it from registration revision 8 (runner `run-lichess-curriculum-matrix-v2.mjs`, `pause_control` in the step file): the runner stops at the next block boundary after its stage checkpoint is durable and writes `paused.json`; the campaign records the stage as `paused`, not terminal. Older stage-matrix step files have no `pause_control`. |
| `pause --curriculum PATH` | Pause the stage that this campaign's babysit is running (bare `pause` does this for the default campaign when it is running). |
| `detach --curriculum PATH [--interval N]` | Start `fly babysit` with these arguments detached from the current terminal or agent session (job breakaway, own hidden console, new process group), appending its output to `runs/python-actions/detached/babysit-<time>.log` and recording a JSON handle beside it. Use for multi-day runs: a babysit started inside an agent session dies with that session. Resume after a pause or stop with the same command. |
| `logs` | Last 1,200 bytes of tracked stderr. `--stream stdout --bytes 4000` reads bounded stdout; maximum 8,192 bytes. |

Errors return `actionError` and exit 2. Foreground checks preserve their actual exit code and summarize Python counts or Node TAP counts. `stderrBytes` alone does not mean a warning is a failure.

## Repeated work after research is resumed

1. Reconcile the handoff with `status`. If older owned work is present, verify/configure it and `attach` rather than launch a duplicate.
2. Run bare `babysit` for the default campaign, or `babysit --curriculum PATH` for a selected campaign. Use `--config PATH babysit` only for an explicitly selected one-cycle registration. If interrupted, invoke the same command again; it resumes from the latest complete matching checkpoint into a new directory. If process state, protocol, checkpoint or pins are uncertain, it stops without restarting.
3. A campaign advances only when its independent audit fields all pass. Review any failure before registering a new campaign identity.

### Resumable Lichess stage-matrix registrations

Stage-matrix train, resume and audit jobs must pass `--protocol {protocol}` so the matrix runner publishes and checks the exact Python action protocol beside `result.json`. Register `recovery.kind` as `lichess-stage-matrix-v1`; the resume job must pass `--resume-state {resume_state}`. After interruption, `babysit` validates the prior `matrix-state.json` and a complete checkpoint in the active lineage, then resumes into a fresh run directory while passing the prior state path. It stops for review if either is missing or invalid; it never falls back to a fresh matrix. This recovery contract applies to matrix jobs, while the legacy single-run checkpoint flow remains unchanged.

Add another needed software check as a named job with `role:"check"` and its exact existing argv; `run NAME` captures its output. Full graph work must retain a graph role and the registered contract. Never label graph learning a check to evade guards. No command edits gates, generates scientific feedback, or opens new final families automatically. A user-requested operational pause does not edit the research-registration paused flag.

## Evidence and limits

`runs/python-actions/` contains invocation directories: exact config, intent (argv/action hash/pins), handle, raw stdout/stderr, and foreground-check completion. `current.json` is a mutable process cache; changing config does not silently rebind an old handle. Reports use the configured run; status uses the recorded process/run and flags config drift. A short launch lock serializes check-and-launch; a stale lock is investigated, not treated as live-process evidence or automatically deleted.

The wrapper adds no graph worker, package, optimizer, or dense state. Required graph flags remain `--max-old-space-size=256` and `--cpu-duty 0.5`. It checks free RAM before launch; underlying runners retain their 768 MiB RSS / 256 MiB free-memory guards, pacing, full source/certificate checks, atomic publications, and exactly-once recovery. A complete checkpoint supports process interruption recovery; the frozen runner does not guarantee recovery from filesystem damage after power loss. Status is sampling, not a hard OS resource cap.

Detached jobs have `exitCode:null`: the short launcher cannot observe their eventual OS exit code. Never infer a successful exit from that. Preserve artifacts and obtain the separate independent audit; neither runner flags nor an audit file's mere existence proves every scientific gate. Failure after launch preserves PID/log evidence and never causes automatic retry.

Read-only commands remain technically available while paused, but agents must honor the research pause unless an inspection is separately requested. This task authorized software checks and explicit one-off interface tests only.

[Validation and development mistakes](../../../research/journal/experiments/2026-10-19-python-curriculum-actions.md) · [Scientific gates](principles-curriculum.md) · [Feedback contract](feedback-quality-gate.md) · [Goal handoff](../../handoffs/curriculum-reasoning-state.md)

The matrix writes concise JSON progress events at lineage boundaries. Python `babysit` parses these from the owned stdout log and emits only changed milestones; raw logs remain under `runs/python-actions/`.

The Python matrix registration must declare `resourceLimits.rssMiB=2048` and `resourceLimits.freeMiB=256`, matching the matrix's inner guard; mismatches block before launch. Legacy/frozen registrations without explicit limits retain the 768 MiB status ceiling.
