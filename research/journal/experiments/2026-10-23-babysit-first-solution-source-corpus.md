# 2026-10-23: expand first-solution capture source candidates

## Why

The v2 synthetic microfamily feasibility scan used the correct Lichess first solution move, but only 4 train roots and 5 validation roots supplied all four six-piece layouts. The older source curator had selected candidates only when the original solver position already had at most six pieces, even though the new task is explicitly a synthetic FEN-rooted micro-position. A separate curator copy now relaxes only that source-position piece limit (to the legal 32-piece maximum), retains the original puzzle's first solution capture as the focal action, and emits exactly one non-final split per run. The existing curator/auditor scripts and pins remain untouched.

## Registered source action

- Curator: `.codebase/scripts/data/curate-lichess-synthetic-stage1-sources-v1.mjs`
- Independent source auditor: `.codebase/scripts/data/audit-lichess-synthetic-stage1-sources-v1.mjs`
- Train action: `python actions/lichess-synthetic-stage1-sources-train-v1-step.json`
- Validation action: `python actions/lichess-synthetic-stage1-sources-validation-v1-step.json`
- Each split is capped at 512 candidates, uses the pinned local Lichess CSV and extraction receipt, `--max-old-space-size=256`, 2 GiB RSS / 256 MiB free-memory guards, a 7,200-second bound and 0.5 CPU duty. Each action hashes the compressed and extracted source, extraction receipt, curator, auditor, package lock and shared pacer/filter files.
- Both read-only `plan curate` commands returned `ready:true` with no blockers. Both JavaScript syntax checks passed.

## Initial live observation at 2026-10-23 08:39 UTC

Train curation is running as the exact foreground check launched by `fly.cmd --config "python actions/lichess-synthetic-stage1-sources-train-v1-step.json" run curate`. Its Python action invocation is `runs/python-actions/20261023T082140-f079650d`, Node PID `624`, active exec session `1383`. The last targeted observation showed the same PID live, CPU time increasing, and about 96 MiB working set. No candidate manifest or lesson data has been published yet. The original session is the authoritative handle; continue polling it and never relaunch just because no progress line appeared. After successful completion, run the registered train audit, then perform the validation-only curation and audit. Final output must remain empty/unread.

Operational correction: `run` foreground checks keep their logs in the timestamped invocation directory and do not create the background state file used by `fly status`/`fly logs`. Those two commands therefore returned `untracked` / “state file missing”; they did not change or restart the process. Observe the same live exec session and use its raw invocation log only for bounded progress if needed.

This source action is data selection only. It does not retrieve source-game histories, prepare synthetic tasks, verify consequences, train a neural model, launch Stockfish, or authorize a Stage 1 registration. No G0 or graph process was touched.

## 2026-10-23 reconciliation

The previously live foreground invocation is now confirmed absent: PID 624 is not running, the original exec session is unavailable, and the invocation has no completion receipt or exit code. Its train output directory, manifest and partial publication are absent; the invocation's `stdout.txt` and `stderr.txt` are empty. The termination cause is unknown, so this attempt is not a successful or failed curation result. Preserve it and do not relaunch: a later scope correction explicitly stopped source-data expansion. The independent audit, validation-side curation and synthetic-task materialization therefore did not occur. No final data, Stockfish learning, neural/graph learner or G0 work occurred. Resume on Stage 1 evaluator/runtime-to-campaign integration; Stage 1 teaching remains unauthorized and the 12-stage campaign remains unregistered.

## Next

Source expansion is stopped. Continue on Stage 1 data eligibility and production runtimes/verifiers for Stages 2-12. Do not register or train until every existing prerequisite gate authorizes it; do not work on G0.

## 2026-10-23 runtime/readiness reconciliation

Static call-path inspection confirms that the Stage 1 evaluator/runtime bridge is already present: `run-lichess-curriculum-matrix.mjs` checks the pinned evaluator export, loads the pinned runtime factory, and routes matrix replay plus `deriveAcceptanceEvidence` through the separate stage auditor. The Stage 1 factory reconstructs evaluation arms from persisted checkpoints and the pinned evaluator derives validation-selected/final observations. These are implementation facts only; no production campaign or learner was run in this check.

The same inspection confirms the Stage 1 factory rejects any stage other than 1, and its learner/panel contracts are fixed to `capture-retention`. Stages 2-12 therefore still need stage-specific production runtimes and verifiers. Bare `fly.cmd status` was run through the campaign path and returned `not_registered`, 0/12 accepted, because the default campaign registration is absent. The current Stage 1 audit still denies teaching; there is no safe registration to add. Source expansion remains stopped, and no G0 or learner work occurred.

Diagnosis: the earlier handoff's “evaluator/runtime-to-campaign integration” wording overstated the missing work: that bridge exists for Stage 1. The actual remaining blockers are eligible/audited Stage 1 task families and production stage implementations for Stages 2-12. Keep the failed source-corpus invocation preserved; do not relaunch it or create a placeholder campaign.
