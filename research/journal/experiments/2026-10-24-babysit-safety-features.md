# 2026-10-24: babysit safety features (fix goal task 2)

Work under [the fix-goal prompt](../../../documentation/handoffs/fix-goal-prompt-2026-10-24.md), started after task 1 was recorded as failed with a diagnosis ([memory retention journal](2026-10-24-stage1-memory-retention-fix.md)). Every step, hash and test count is in [the ledger](../../../documentation/handoffs/fix-goal-ledger-2026-10-24.md) (L014-L020).

## What was built (new versioned files; the originals are pinned by completed runs)

- **Rehearsal-planner cap (2c):** `curriculum-rehearsal-plan-v2.mjs`. A panel targeted in each of the last M blocks cannot be the target; the existing oldest-pair fallback is used among the other current panels. Plans keep the v1 schema (block session and audit unchanged) and also record the cap and the block-start training-board count.
- **Early stop (2a) and cooperative pause (2b):** `lichess-curriculum-block-v2.mjs`, `lichess-curriculum-matrix-v2.mjs`, `run-lichess-curriculum-matrix-v2.mjs`. Both act at block boundaries, where the stage checkpoint and every receipt are already durable. Early stop (informative arm only) is registered as `earlyStop.windowBlocks` = K and stops before block b >= K when the best block-start training-board count in the last K blocks is not above the best before them, publishing `gate-failed` with the counts. Pause: `fly pause` writes `pause-request.json`; the runner stops at the next boundary and writes `paused.json`; the matrix state stays resumable.
- **Detached launcher (2d):** `fly detach ARGS` starts `fly babysit ARGS` outside the session with a log under `runs/python-actions/detached/`. `fly pause --curriculum PATH` targets the stage a campaign babysit is running.
- Registration revision 8 turns the controls on (K = 3 for the 8-block smoke, 8 for 32 blocks; M = 2). Revisions 6 and 7 rebuild byte-identically.

## Mistakes and pivots (all recorded in the ledger before moving on)

1. `fly detach --curriculum ...` failed: argparse `REMAINDER` rejects pass-through options beginning with `--`; my test had covered only the command builder. Fixed by splitting the raw argv at `detach`.
2. First launcher used WMI `Win32_Process.Create`; it passed the survival test 2 of 3 times, and instrumented launches lost 3 of 5 processes before they finished (cause not identified). Abandoned for job breakaway (`CREATE_BREAKAWAY_FROM_JOB`).
3. With `DETACHED_PROCESS` the venv `python.exe` launcher dropped redirected output, so the first real r8 babysit log stayed empty. Switched to `CREATE_NO_WINDOW` (own hidden console) and added a test that venv-python output reaches the log.
4. The campaign supervisor recorded a cooperatively paused stage as terminal `unknown` (no result or audit), so the first resume was refused. Fixed: a stage run with a valid pause receipt and no audit is recorded as `paused`. The affected r8 campaign state was preserved as a copy and reconciled (operational bookkeeping only).
5. Finding: this agent session runs inside a Windows job object (`IsProcessInJob` = 1); closing it kills its members. That is why the full-r5 babysit stopped with an earlier session. A new test reproduces it: in a kill-on-close job, an ordinary child dies when the job closes while the detached child finishes.

## Real-graph verification (registration revision 8, engineering smoke)

`fly detach --curriculum "python actions/curriculum-campaign-smoke-r8.json"` trained r1:informative outside the session; `fly pause --curriculum ...` stopped it after block 3 ("PAUSED - progress saved"); `fly detach` resumed it into `runs/lichess-stage1-synthetic-v1-smoke-r8-resume-0001`; the registered early stop then fired before block 6 (block-start training counts 4, 7, 2, 8, 4, 6, 6; best 8 before the window, 6 within it) and the campaign stopped `gate-failed` with that reason. Targets never repeated in consecutive blocks. No control arm ran, so these counts are not a learning result.

Remaining limits: the actual agent session was not ended (the job-closure test reproduces the mechanism); power loss is untested; task 1 (memory) is still stopped for a researcher decision.
