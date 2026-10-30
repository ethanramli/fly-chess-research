# G0 intermediate-checkpoint pruning (2026-10-24)

Researcher-approved deletion that overrides the default "preserve every run file" rule for one class of files.

## Why

The disk had 7.0 GiB free of 228 GiB. G0 run directories held 96.4 GiB, of which 96.1 GiB were intermediate `checkpoint-N.json(.gz)` snapshots (164,342 files). G0 is no longer a curriculum gate (policy B, same day), and its decisive runs already have published independent audits.

## Rule

`prune-g0-checkpoints.mjs` (run from the repository root) covered every `runs/*g0*` directory (26 runs, 22 checkpoint folders):

- kept every non-checkpoint file: `result.json`, `audit.json`, `receipts.jsonl`, protocols, pinned source copies, logs, partial-publication markers;
- kept the highest-numbered checkpoint in each folder (so unfinished runs can still resume);
- kept any checkpoint whose file name appears in a run JSON record (resume sources such as `checkpoint-008028.json.gz`);
- deleted the rest, writing `{path, bytes, sha256}` for each file to `manifest.jsonl` before deleting it.

Dry run: keep 62 checkpoints (0.03 GiB); delete 164,280 files (96.12 GiB). `summary.json` records the final counts and the kept list.

## Consequence

The existing independent audits, results and receipt chains remain, so every reported G0 outcome stays traceable. Intermediate states can no longer be replayed, so a new full-replay audit of these runs is impossible. The manifest hashes can verify a restored copy if one ever exists elsewhere.
