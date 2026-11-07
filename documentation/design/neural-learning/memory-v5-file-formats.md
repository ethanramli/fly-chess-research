# Memory v5 build contract: modules, jobs and run-folder files (2026-11-05)

Design: [memory v5 proposal rev 3](memory-v5-proposal-2026-11-04.md). JSON is UTF-8, no BOM; JSONL is one object per line. `id` = `${gameId}:${ply}`; `key` = `${id}|${uci}`. Seeds 6101, 6102, 6103. Keys: `K1` (graph), `K2` (graph-sparse), `K3` (graph-pc). Secondary: `raw-pc`, `random-pc`.

## Modules (pure; no brain)

1. `.codebase/src/neural-learning/memory-v5-data.mjs`
   - `practiceOrder(positions)`: sort by `sha256('engineered-memory-v3-split:' + gameId)` (hex string order), then ply.
   - `buildPartition({ all, v4 })`: `all` = max-50 positions, `v4` = the 572 v4 positions. Uses v3 `splitPositions(v4, 198)` to get the 198 practice games and 99 test games. Returns `{ practice: [id] (750, practice order), foldA: [id], foldB: [id], freshTest: [id] (test order = practice order rule), droppedBoardRepeats: [id], foldBoardRepeats: n, counts }`. Fold rule: practice games sorted by `sha256('memory-v5-fold:' + gameId)`; first 99 = A. Fresh test = positions of the 99 test games whose id is not in v4 and whose board is not any v4 board, minus any whose board equals one of the 750 practice boards (dropped, listed).
   - `openRows({ v4Dir, v5Dir })`: returns `{ row(key) -> Float32Array(5177), blank() }` reading `kc-cache.f32` by offset (`fs.readSync`) using each folder's `keys.json`. v5 keys win only for keys not in v4; a key in both throws.
2. `.codebase/src/neural-learning/engineered-memory-task-v5.mjs`
   - `transformFor(key, { row, blank, legalOf, rawOf, randomOf })` → `(id, uci) => Float64Array`: K1 = row; K2 = v4 `sparse(row, blank, 259)`; K3 = row − mean of rows of `legalOf(id)` (sorted UCI order, Float64 sum then divide); `raw-pc`/`random-pc` = the same centring on `rawOf`/`randomOf`. Position means are cached per id.
   - `fitPipeline(transform, calibrationKeys)` → `{ apply(id, uci) -> Float64Array, rmsSha256, zeroRmsFeatures }`: pinned `rmsScaler` on the calibration vectors, then the zero-RMS mask.
   - `calibrationKeys(orderedIds, legalOf)`: first sorted legal move of each of the first `floor(n/4)` ids.
   - `buildStore({ slots, values, apply, capacity: 4096 })` → `{ memory, counts: { writes, unknown, replacements, evictions, identicalConsistent, identicalConflicting } }`. `values[i]` aligned to `slots[i]` (null = no write).
   - `retention(memory, probes)` → `[bool]` with recalled = sign(score) === probe value (score 0 → false).
   - `scorePositions(memory | null, positions [{ id, moves }], apply, categoryOf)` → `[{ id, c, s, expected }]` via `frozenScores` (null = none arm, all scores 0).
   - `judgeV5(perSeed)` exactly as proposal §8 (adapter with `numericPairGate`, comparator order `['none', 'shuffled', 'quarter']`), and `selectKey(devResults)` exactly as §5.

## Jobs

Identity `{ phase, key, direction, seed, arm }`; placeholders: `direction: '-'` in confirmation, `key` = selected key in confirmation except `raw-pc`/`random-pc` arms whose `key` is the arm name, `seed: 6101` in development. Development jobs: phase `dev`, key K1-K3, direction `AB`/`BA`, arm `store`/`shuffled` (12 jobs). Confirmation jobs: phase `confirm`, arm in `full, half, quarter, shuffled, none, raw-pc, random-pc` per seed (21 jobs). Sort order = tuple order (phase `dev` before `confirm`; strings compared with `<`; seed numeric).

Worker: `node --max-old-space-size=256 .codebase/scripts/neural-learning/memory-v5-worker.mjs --run DIR --job '<json>'` writes `DIR/jobs/<phase>-<key>-<direction>-<seed>-<arm>.json` atomically: `{ job, scores: [{id, c, s, expected}], expectedTotal, counts, pipeline: {rmsSha256, zeroRmsFeatures}, retention?: {probes, recalledQuarter?, recalledFull?}, fingerprint, peakRssMiB }`. Quarter and full jobs both compute retention on the same probes (the known slots of the quarter store).

## Run folder (`runs/engineered-memory-test-2026-11-05/engineered-memory-test-v5/`)

| File | Content |
|---|---|
| `manifest.json` | as v4 (status, pid, argv, startedAt, endedAt, exitStatus, volume 2, chapter, pins incl. v4 cache SHA-256, partitionSha256, cacheSha256) |
| `partition.json` | output of `buildPartition`; SHA-256 in the manifest before any brain pass |
| `schedules.json` | `{ seed: [{id, moves}] }` over the 750 practice positions (v4 `buildSchedules`) |
| `certificates.jsonl` | v4 format, every legal move of the 750 practice + fresh-test positions |
| `ledger-<seed>.jsonl`, `permutation-<seed>.json` | v4 format; dev ledgers are the seed-6101 ledger restricted to each fold's ids (order kept), permutations `permuteKnownValues(foldLedger, 6101)` saved as `permutation-dev-A.json`, `permutation-dev-B.json` |
| `keys.json`, `kc-cache.f32`, `cache-schema.json` | v4 format, **new keys only** (row 0 blank, then the new keys) |
| `jobs/*.json` | worker outputs |
| `selection.json` | dev results per key and direction, and the selected key |
| `summary.json` | `{ outcome, selectedKey, verdict, positives, retention, jobs: [job identities], passes, peakRssMiB, elapsedSeconds, scope, dryRun }`; outcome in `passes`, `does not pass`, `insufficient experience`, `no learning key found in development`, `input-validity failure` |
