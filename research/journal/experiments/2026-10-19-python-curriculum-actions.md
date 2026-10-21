# Python curriculum action tooling

2026-10-19, Asia/Jakarta. Research goal remains paused; the researcher authorized reusable command tooling and its software tests. This work does not launch, resume, or classify a scientific experiment. Existing pinned graph sources and protocols remain unchanged.

## Design and development record

- Reuse exact registered Node runner/auditor commands from an editable JSON step file. Add a stdlib Python dispatcher for previews, explicit execution, process identity tracking, bounded observations, pins, checkpoint summaries, and logs. No automatic stage promotion, checkpoint choice, retry, or parameter updates.
- Initial document reading failed when the Windows cp1252 output encoder met a Unicode arrow. Re-reading with UTF-8 output succeeded; this affected inspection only.
- Before execution, review found that deleting a launch lock while its file handle remained open would fail on Windows. Close the exclusive-creation handle first, retain the file during the launch transaction, and remove it in finally. Tests must cover lock cleanup and refusal.
- The first draft contained an accidental literal plus in the embedded PowerShell source. Correct it before invocation; targeted process-query tests will establish runtime behavior.

## Validation and remaining scope

Implementation and tests are in progress. No scientific or performance claim follows from tooling checks.

- First inventory smoke test failed: the attempted text replacement did not remove the literal plus in the embedded PowerShell. Python syntax checking alone did not cover the embedded language. Corrected the exact source line; rerun the inventory smoke test next. No experiment was started.

- First dispatcher test invocation stopped at Python parse time: the edit keeping foreground checks from overwriting a graph handle used the previous indentation after launch-lock refactoring. No test child or experiment launched. Correct the execute block indentation, compile, and rerun the same software checks.

- Review found an unexecuted design error: separate run/next_run paths could make a new training invocation report artifacts from its parent. Replace the default with one run path shared by training, resume, audit, and reports; reject a fresh-output path that differs from it. Store that run identity in the process handle and test the mismatch. Also surface checkpoint publications during otherwise silent training. No scientific job was launched with the draft.

- Documentation/navigation patch verification failed against the experiment README heading (leading BOM). The requested content was not treated as applied; inspect file state and retry using unaffected body context. No experiment was touched.

- Expanded validation:15/16 checks passed; the untracked-PID test failed because its status field/default attach-PID edit was in the earlier rejected multi-file documentation patch and was omitted when retrying. Reapply the missing CLI change separately and rerun the same16 checks. The failure also verifies that a failed check returns its nonzero exit and bounded traceback rather than being reported as success.

## Completed tooling validation ? 2026-10-19 09:44 Asia/Jakarta

- Unified entry: `fly.cmd` -> stdlib `python actions/curriculum.py`; active config `python actions/curriculum-step.json`. Added the command guide and AGENTS/navigation links. The earlier direct audit helper is retained for compatibility.
- Final software checks:16/16 passed, zero failures/errors. Raw result: `runs/python-actions/20261019T024258-93694e8a/stdout.txt`; stderr empty. The earlier15/16 failure remains at `runs/python-actions/20261019T024237-21d64df7/`. No full-graph execution was used in these checks.
- Tests exercise pause/pin/resource/duplicate-process/fresh-output guards; partial and pending checkpoints; bounded output and corrupt artifacts; PID reuse and exact argument identity; detached child survival after launcher exit; failed-check exit codes and logs; launch-lock cleanup; graph-handle preservation; observation expiry; recorded-run identity and mismatched recovery protocols. One tiny1500ms Node timer is an OS-process fixture, not neural learning.
- CLI smoke checks: configured pins match; audit preview blocked by pause; train preview blocked by pause and existing output; core-test command resolves without running it; configured checkpoint21918 parses with no pending receipt; result published and audit absent. No need for npm test because core math/feedback/persistence code was not changed.
- During one-off interface inspection, the former audit PID13248 was absent from the process inventory and audit.json absent. This replaces old liveness observations only; interruption cause/outcome has not been investigated while research is paused. Do not relaunch or classify on this observation alone.
- Software evidence only: exact commands and raw logs are preserved, but no G0/transfer gate was advanced. Research remains paused; on resume first reconcile audit logs/publications/current process ownership, then use the audited outcome for a registered next experiment.
