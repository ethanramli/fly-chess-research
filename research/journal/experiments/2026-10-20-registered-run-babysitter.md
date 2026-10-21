# 2026-10-20: Registered-run babysitter and recovery-state mismatch

## Direction

The researcher requested a cheaper operating loop: AI initiates a registered run, deterministic code watches it and performs routine steps, then the AI reviews a compact evidence checkpoint. Added `babysit TRAIN_JOB AUDIT_JOB` to `python actions/curriculum.py`, reusing the existing pinned job plans and launch guards. It is intended to run exactly one registered train/resume job, emit only changed progress, launch its registered audit only after `result.json` appears, and stop with the artifact summary. It does not choose experiments, select checkpoints, resume/retry failures, classify scientific success, or start another run. Any identity/configuration/resource ambiguity stops it and leaves the process untouched.

The action and command guide have not been runtime-tested. No experiment was launched by this software change. A normal launch still needs the platform's existing process-inspection access; where inspection is denied, the action must stop before launch.

Implementation correction: while adding the supervisor's inspection-failure stop, the first patch landed in the existing bounded `watch` function and used the wrong phase label. Source review caught this before execution; the original `watch` behavior was restored and the stop handling was placed in both babysitter loops. No runtime test was performed, so this correction is not independently validated.

## Recovery discrepancy found during preflight

At 2026-10-20 13:20 Asia/Jakarta, `fly.cmd status` reported the registered seed-20261012 run's PID17100 as missing. The configured run has no `result.json` or `audit.json`. The latest visible publication is `checkpoint-000312.json.gz` (155 receipts, stage0/lesson7) with `pendingReceipt=true`; SHA256 `3e73e664da3c2b0d69e2b779bd32b3ad31b407c96e8a2e7e117d06ad2ba14d0e`, protocol hash `5943dc8fcb68d2dd6a92ec5fd5ae3e4985daf37e2a9c2afe58b012b19a3f025d`. The action's launcher stdout and stderr were empty at inspection. The cause and whether any later publication exists are unknown.

The registered config's `paths.checkpoint` points to `runs/g0-history-replication-20261012-v1/checkpoint.json.gz`, which is missing. Consequently `fly.cmd plan resume` cannot construct a recovery preview. This is a configuration/path mismatch, not evidence that checkpoint312 is safe to resume. No checkpoint was selected, config was not changed, and no resume/retry was launched. The supervisor must not be used until this recovery state is reconciled and the new output directory/checkpoint are registered and preflighted.

## Next actions and limits

1. Inspect the run's bounded raw recovery evidence and verify the last complete publication and pending-receipt contract against the matching runner/auditor.
2. If recovery is supported, register the exact checkpoint and a fresh output directory in the current config, then verify all pins and `plan resume` before launch. If not, record the blocker and preserve the incomplete run.
3. Exercise the babysitter on the registered train-to-audit path before relying on it for long unattended work.

This observation does not alter the seed-20261012 protocol or its scientific gates, and it does not establish a result.

## 2026-10-20 13:43 Asia/Jakarta: same-command checkpoint recovery added

Researcher clarified that rerunning `fly babysit` after an interruption should resume the same experiment. Revised the action: it keeps a small campaign lineage record, verifies the registered config/protocol and process state, selects the newest complete checkpoint from the tracked run, and writes an immutable per-attempt config pointing at a fresh output directory. The registered resume runner then performs full identity and receipt-chain validation, including pending-receipt acknowledgement without reapplying the neural update. If the interrupted run already has a result, babysit continues with its audit instead. A completed audit is reported without advancing to another experiment. Missing/corrupt checkpoints, changed config/protocol/pins, active or unknown processes, or missing output stop without a fresh training restart.

Added two synthetic Python action cases: resume an incomplete run from its latest checkpoint, and invoke babysit again after a second interruption to select a newer publication. Initial sandboxed test execution failed because the harness could not access `%TEMP%`; rerunning with approved elevated filesystem access exposed an uninitialized runtime-config variable in the resume monitor. Fixed it. Final Python action suite:19/19 passed, no graph or real recovery launched (`runs/python-actions/20261020T064341-1f6317fe/`). This verifies supervisor selection/lineage behavior only, not the Node runner's full recovery against checkpoint312.

Operational limit: the frozen replication protocol explicitly does not guarantee filesystem recovery after sudden power loss. The supervisor can resume only from a surviving complete publication; the runner validates its receipt chain and rejects corruption. Laptop sleep pauses progress; shutdown or battery loss may terminate the processes. No automatic next-curriculum run is authorized by this action.

## 2026-10-20: persistent bare terminal command installed

Researcher explicitly requires typing `fly babysit` in a new terminal without a relative path. Earlier chat used that spelling before installing command resolution; that was an interface/documentation mistake. Added the repository to the Windows user PATH through the idempotent `python actions/install-fly-command.ps1`, preserving existing entries. Updated `fly.cmd` to enter the repository and preserve Python's exit code. Approved installation succeeded; a fresh PowerShell from the home directory resolved bare `fly babysit --help`, and bare `fly verify` from the home directory matched all four configured pins. No training was launched for these command-resolution checks. Existing terminal applications need one restart to inherit the updated PATH.
