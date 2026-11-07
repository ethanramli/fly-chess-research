# Memory v4 run-folder file formats (2026-11-04)

Contract between `run-engineered-memory-test-v4.mjs` (writer) and `audit-engineered-memory-test-v4.mjs` (independent reader). Design: [memory v4 proposal](memory-v4-proposal-2026-11-04.md) section 8. All JSON is UTF-8, no BOM. JSONL = one JSON object per line. Seeds: 6101, 6102, 6103. `id` = `${gameId}:${ply}`. `key` = `${id}|${uci}`.

| File | Content |
|---|---|
| `manifest.json` | `{schema:'engineered-memory-test-v4-run', status, pid, argv, startedAt, endedAt, exitStatus, volume:2, chapter, registrationSha256, pins, limits, scheduleSha256, cacheSha256, error?}`; rewritten atomically at each stage. |
| `split.json` | `{practice:[id...], test:[id...], testGames:[gameId per test id], chance}` in v3 order. |
| `schedules.json` | `{ "6101": [{id, moves:[uci...]}], ... }` exactly as `buildSchedules().schedules`; its SHA-256 (of the file bytes) is `manifest.scheduleSha256`. |
| `certificates.jsonl` | line 1: `{kind:'verifier', task, maxReplies, sources:{path: sha256}}`; then one line per legal move of every position (practice and test, sorted by id then uci): `{id, uci, category, value, status, proof, certificateSha256}`. |
| `collisions.json` | `{stop:[...], unknownMixed:[...]}` from `classifyCollisions`. |
| `ledger-<seed>.jsonl` | one slot per line: `{slot, id, uci, category, value, certificateSha256}`. |
| `permutation-<seed>.json` | `{indices:[...], values:[...]}` from `permuteKnownValues`. |
| `keys.json` | `{rows: ['blank', key...]}`: row 0 is the blank input, then every key in the order of the cache. |
| `kc-cache.f32` | little-endian Float32, rows x 5177 columns, row-major, rows in `keys.json` order, no header. |
| `cache-schema.json` | `{rows, columns:5177, dtype:'float32', byteOrder:'little', kcIndices:[...], kcRootIds:[...], fileSha256, pins}`. |
| `scalers.json` | `{graph, 'graph-sparse', 'graph-centred', raw, random}` each `{rmsSha256, zeroRmsFeatures}`; plus `randomWiringSha256`. Scalers are fitted on the first sorted legal move of each practice position. |
| `records.jsonl` | progress lines, then one line per (seed, arm, test position): `{kind:'test', seed, arm, id, c, s, expected}`; one line per (seed, arm): `{kind:'arm-done', seed, arm, writes, unknown, stored, replacements, evictions, expectedTotal, ties, fingerprint}`. |
| `summary.json` | `{schema:'engineered-memory-test-v4', outcome, verdict (judgeV4 result), rows (arm-done lines), positives:{seed:n}, density:{graph-sparse: mean}, sparseZeroRmsTestCoords, passes, peakRssMiB, elapsedSeconds, cpuSeconds, scope}`. `outcome` is one of `passes`, `does not pass`, `insufficient experience`, `input-validity failure`. |

Feature definitions (all Float64 arithmetic on Float32 cache values, then the pinned `rmsScaler`, then the zero-RMS mask: coordinates that are 0 in every scaler-fit vector are set to 0): graph = row; graph-centred = `centred(row, blank)`; graph-sparse = `sparse(row, blank, 259)`; raw = photoreceptor vector over `retina.retina_idx` (as v3); random = `makeRandomExpansion({inputs, units: 5177, fanIn: 6, seed: 20261103})(raw, 0.05)` (as v3).
