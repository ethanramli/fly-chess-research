# Kenyon-cell scale check from the calibration replay, 2026-11-14

Volume 2, *The Classroom*, chapters 3 (*To Learn*) and 5 (*Evidence for Learning*). This is development evidence that sets one number for the [three-board feedback test](../../../../documentation/design/neural-learning/three-board-feedback-test-2026-11-14.md). It is not a learning result.

**Result.** The proposed Kenyon-cell scale, **0.014047**, can be locked. Capping each cell's rate at this value changes almost nothing on the three development boards. Across all 5,177 Kenyon cells at zero background drive, only one cell (dump position 1336) reaches the cap, and only on one move per board. Neither move is a lesson move or a safe capture. I could not recompute the exact value, because the 6,046-connection map needs the graph and annotation files, which are not in the replay package or this checkout. Every check I could make agrees with `scale.json`.

## What the replay is

The researcher made a replay to recover the cell readings that journal item 25 had used. The original dump existed only on the Windows laptop. The replay reran the tracked diagnostic `diagnose-kc-sparseness-v1.mjs --scope all --thresholds 0,0.01 --dump-all` on the three known development boards, at commit `4a2c3964`. It made no learner updates and used no sealed games ([manifest](replay-files/manifest.json), [replay notes](replay-files/replay-readme.md)).

- **Package:** `~/Downloads/flychess-memory-calibration-replay.zip`, SHA-256 `349cb83bce5e2065e515ae0fc6aa8b2c339ed76fa36cef025c21097fe95bbe72`.
- **The dump:** `all-kc.json` (15.7 MB), SHA-256 `59859482b1358bd2dfdb77203f4081dc027a6bccc02c8d5f362cba16faef783c`. It is not committed because of its size. Every other file in the package is copied unchanged into [replay-files](replay-files/). The replay's `README.md` is renamed to `replay-readme.md` so it is not mistaken for a folder guide.
- In the dump, `theta 0` rows are the default drive (0.01 to every neuron) and `theta 0.01` rows are zero drive.

## Checks and results

The two scripts in [checks](checks/) only read data. Each takes the extracted package folder as its argument. Their full outputs are saved beside them: [inspect-dump-output.txt](checks/inspect-dump-output.txt) and [inspect-pairs-output.txt](checks/inspect-pairs-output.txt).

**Inputs and pins**

- The repository's `diagnose-kc-sparseness-v1.mjs` hashes to `b4150794…`, the value pinned in the manifest. `inputs/boards.jsonl` hashes to `fc058e1e…`, also as pinned.
- The graph (`4d63295f…`), the annotations (`30be6c73…`) and the gamma mapping check (`3be788df…`) match the pins of the original dry-run registration (`python actions/memory/fly-connections-memory-v1-dryrun-step.json` in commit `8e217a1b^`).
- **The local-inhibition files differ from that registration.** The replay's `apl-midpoint/package.json` is `034ba699…` against the historical `176feecb…`, and `sites.npz` is `cb83c177…` against `3fa7733f…`. The replay notes explain the `sites.npz` difference as a ZIP platform marker with identical arrays. They do not explain `package.json`. I could not check either file, because they are not in the package. The scale holds for the inputs it was computed on, so the test must pin the replay's rebuilt files.

**Dump structure.** The dump has six rows: 3 boards × 2 drive levels, with 46, 37 and 23 legal moves. Every row holds 5,177 rates, all finite and zero or above. That gives 1,035 + 666 + 253 = 1,954 move pairs, as `scale.json` reports.

**Agreement with the published diagnostic** (`diagnostic.log` against journal item 18):

| Drive | Measure | Replay | Journal |
|---|---|---|---|
| Zero | gamma cells active | 14.4% | 14.4% |
| Zero | move-specific cells | 5.5% | 5.5% |
| Zero | median within-board difference | 0.118 | 0.118 |
| Default | mean rate | 0.0165 | 0.0165 |
| Default | median within-board difference | 0.0061 | 0.006 |

**Readings at or above the cap.** At zero drive there are exactly two, both from cell 1336:

| Board | Move | Rate | Loss from the cap |
|---|---|---|---|
| `SjmcbcGu:16` | rook a1b1 | 0.0151506 | 0.0011036 |
| `5XRGyGSj:13` | rook a8b8 | 0.0151450 | 0.0010980 |

- The highest zero-drive rate anywhere is 0.0151506. So the old 0.022 scale caps nothing, as `scale.json` says.
- `scale.json`'s share at the cap (1.3744e-5) times 145,518 edge-weighted readings gives 2.000. That matches the two readings above only if cell 1336 feeds exactly one learnable connection. This is an independent consistency check on the replay's map.

**Worst pair on each board**

| Board | Worst share kept (`scale.json`) | Worst pair |
|---|---|---|
| `Q04sIPQ5:13` | 100% on all 1,035 pairs | none: no cell on this board reaches the cap |
| `SjmcbcGu:16` | 99.0003% | a1b1 with, most likely, c3b1 |
| `5XRGyGSj:13` | 99.0054% | a8b8 with, most likely, c6b8 |

- **Why those moves:** only pairs that include a1b1 or a8b8 lose anything. Each such pair loses the same amount, shown in the previous table.
- **Why "most likely":** the partner comes from an all-cell stand-in for the map, with each cell counted once. It isn't close: c3b1 is 0.102 from a1b1 against 0.141 for the next move, and c6b8 is 0.102 from a8b8 against 0.399. Each worst pair is two moves landing on the same square.
- **Thin margin:** under that stand-in the same pairs keep 98.92%, just under 99%. The 99% pass depends on the exact connection weighting and holds by a small margin, as the method intends: it picks the smallest scale that passes.

**First board's starting ranking at default drive** ([probe.json](replay-files/valence-baseline/probe.json)):

- The best safe capture is f6e4 at 0.0038446925, and the strongest rival is b8d7 at 0.0038512701. The gap is −6.5776e-6, which matches journal item 31's −6.58e-6.
- Twelve moves score above f6e4.
- The four lesson moves (d6c5 and e5e4 rewarded; e5h2 and e5b2 punished) match `boards.jsonl`.
- The gap is about 4,700 times the tie tolerance (`1e-9 + 1e-7 × largest |score|`).
- f6e4 is not a lesson move.
- This baseline has no manifest of its own, so the new test measures its own starting scores.

**Shared cells, recorded before any feedback data.** At zero drive, each safe capture and its default-drive rival share 97–99% of their active cells (all-cell stand-in): f6e4/b8d7 98.6%, f2e3/g2g3 97.0%, g8g7/f7f6 99.1%. The moves differ mainly in how strongly cells fire, not in which cells fire. That is the condition behind the non-selective lift in journal item 21, and the swapped-label condition of the test is designed to detect it.

## What this does not show

- It does not show the scale works during feedback. These readings come from forward passes without dopamine pulses, so the test checks the cap again during lessons.
- It does not show the quiet circuit can learn.
- It does not reproduce the 6,046-connection weighting. That needs `.cache/full.npz` and `.cache/flywire-annotations-v2.1.0.tsv`. The test's first step reruns [check_scale.mjs](replay-files/inputs/check_scale.mjs) on a machine that has them, and it must reproduce `scale.json`.

Back to the [fly connections memory report](../README.md).
