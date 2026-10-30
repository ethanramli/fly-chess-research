# 2026-10-23: Stage 1 evaluator retention stub replaced with explicit stop

## Mistake found

`lichess-stage1-acceptance-evaluator.mjs` read `treatment.selectedChoices` and `treatment.lastChoices`. `treatment` is built by `evaluateLineage`, which never sets those fields, so the path would have thrown a TypeError. Had the field been read from the lineage row instead, retention would have been the end-of-acquisition validation set. That is not post-interference retention, so the handoff already marks it invalid.

## Change

At the retention point the evaluator now calls `assert.fail` with a message saying Stage 1 has no post-interference retention challenge. The dead downstream references (`validationSelected`, `retention`) remain, and are reachable only if the assert is removed. Stage 2's `runCurriculumRetentionChallenge` is the intended wiring; it has not been connected to Stage 1.

## Evidence and limits

- `node --check` passes.
- `lichess-stage1-acceptance-evaluator.test.mjs`: 2/2 pass. Both tests stop before the retention point, so they do not exercise this change.
- No learner, Stockfish, graph or G0 run occurred.

## Next

Route Stage 1 through the Stage 2 retention challenge, then remove the dead references. The Stage 1 data gate remains unmet, so this does not make Stage 1 runnable.

## Addendum: edit reverted

The `assert.fail` edit above was reverted; the evaluator is back to the pre-edit text (SHA256 `54573da2a6722ce3d1779b572d982fc810abfbd9f568aceecd14f12029cdb945`, syntax check passes).

Reason: the file is pinned. The v7 check config pins it at `ff6f7aaa80a9f44d306745e32b7acdaeb096f1accd3ebebcf8c1f0717763887a`, and the v2–v5 configs pin `6c6540db91d9ee7de23d783842c4a51fe27a57719c4da6761fc017f4e225f088`. The reconstructed pre-edit file matches neither, so the file was already out of step with its pins before my edit, and the cause is unverified. The v7 run (`runs/python-actions/20261023T135944-e00408d0`) completed with exit 0. Its configs did not use the edited text, so no live check depended on the change. The file is untracked, so there is no git baseline to recover the pin-time version.

Diagnosis: the Stage 1 evaluator's retention path is broken (`treatment.selectedChoices`/`lastChoices` are undefined), and its pins don't match the file. Both need a decision on which version is authoritative before any repair. The fix belongs in a new versioned evaluator with new pins, not in place.

Next: preserve the current file, record its hash against the pin history, then decide the repair path with a fresh pin.
