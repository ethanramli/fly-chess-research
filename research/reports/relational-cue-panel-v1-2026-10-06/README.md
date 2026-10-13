# Relational input panel V1

2026-10-06. Completed read-only input engineering comparison. **No learning or reasoning gate passed here.** Both encoders directly stimulate mapped KCs; neither uses modeled eyes.

Same frozen seed 14009 and current caps for absolute and relational features; all legal candidates at four explicitly selected engineering fixtures, plus eight repeats. No teacher labels enter encoding, no parameters change and no feedback occurs. Independent checked-move certificates demonstrate that Qg7# and its two symmetry equivalents succeed, while Qg7+ fails when the supporting king moves to e6.

| Position | Encoder | Legal cues / distinct scores | Mean cell Jaccard | Cells | Actual total current |
|---|---|---:|---:|---:|---:|
| Original | Absolute | 26 / 26 | 0.51614 | 16–17 | 24 |
| Original | Relational | 26 / 26 | 0.28335 | 14–15 | 21–22.5 |
| File reflection | Absolute | 26 / 26 | 0.51031 | 16–17 | 24 |
| File reflection | Relational | 26 / 26 | 0.28335 | 14–15 | 21–22.5 |
| Colour/rank exchange | Absolute | 26 / 26 | 0.48669 | 15–16 | 22.5–24 |
| Colour/rank exchange | Relational | 26 / 26 | 0.28335 | 14–15 | 21–22.5 |
| King-support counterfactual | Absolute | 25 / 25 | 0.49906 | 16–17 | 24 |
| King-support counterfactual | Relational | 25 / 25 | 0.28036 | 14–15 | 21–22.5 |

All 52 transformed relational candidate pairs have exactly identical token inventories, stimulation and neural responses. The king-support counterfactual differs. These symmetries are engineered into the encoder, not acquired through learning. Lower cue overlap may arise in part from fewer stimulated cells; neither improved choices nor reduced neural interference is established. Naive original-board preference is Qf5 with both encoders. No representation is selected using held-out performance.

- [report.json](report.json): SHA-256 `f7b4aa308663e204d27c0c012b20a433c28453c9489fb91cd3d96d97a4d7bba1`.
- [audit.json](audit.json), [audit-prefix.json](audit-prefix.json): projection/ranking arithmetic, complete legal coverage, repeats, 52 exact symmetry pairs, four independently replayed certificates and one-job resumed prefix.
- `sources/`: SHA-verified driver/modules, protocol, auditor and tests.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-relational-cues.mjs --out research/reports/relational-cue-panel-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-relational-cues.mjs --run research/reports/relational-cue-panel-v1-2026-10-06 --out research/reports/relational-cue-panel-v1-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/probe-relational-cues.mjs --out research/reports/relational-cue-prefix-2026-10-06 --cpu-duty 0.5 --max-jobs 1 --resume research/reports/relational-cue-panel-v1-2026-10-06/candidate-053/state.json
node --max-old-space-size=256 .codebase/scripts/audit-relational-cues.mjs --run research/reports/relational-cue-panel-v1-2026-10-06 --compare research/reports/relational-cue-prefix-2026-10-06 --out research/reports/relational-cue-panel-v1-2026-10-06/audit-prefix.json
npm test
```

Main: **214 presentations**, **115.44 MiB peak RSS**, **119.482 seconds elapsed**, **57.452 CPU seconds**, heap 256/duty 0.5. Prefix: one presentation, 108.87 MiB, 1.441 elapsed seconds, 0.984 CPU seconds. **55/55 tests pass**. First test failure incorrectly treated declared forced-mate task context as an answer label; corrected the assertion, not the encoder. The counterfactual test now verifies an actual outcome change. No resource improvement claimed.

Graph SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`; annotations SHA-256 `30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6`. Other pinned source/input/model identities and whole-graph/parameter invariants are in report.json.

Next frozen learning comparison should match count/amplitude explicitly; a fixed 14-cell cap makes both encoders use 14 cells at 1.5 each on this panel, but this property must be verified on the new experiment's actual inputs. It is a proposed comparison, not a completed gate. Colour equivalence with nonzero castling rights is not validated: V1 case-normalizes the rights string without reordering it, so such strings can differ under colour exchange. Preserve this V1 limitation and address it in a new version before broader use. No test families or learning/transfer evaluation ran.
