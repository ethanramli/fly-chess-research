# Naive chess/action input panel

2026-10-05. Engineered sensory/calibration evidence; no feedback or learning.

The fixed encoder presents public piece/square/action/history features to an auditable 693-cell eligible KC pool on the full sparse 134,209-neuron graph. At most 64 cells are stimulated per presentation, with total current at most 24 and per-cell current at most 1.5. All graph/parameter hashes remain unchanged. Mapping is rebuilt from exact graph root IDs and pinned annotations before the run; coarse compartment and natural sensory-coding limitations remain.

| Input position | Actions | Distinct stimulation cues | Distinct GF response pairs | Distinct calibrated scores |
|---|---:|---:|---:|---:|
| White fixture | 26 | 26 | 26 | 23 |
| Black fixture | 26 | 26 | 26 | 23 |
| Initial board | 20 | 20 | 20 | 18 |
| Repetition context | 20 | 20 | 20 | 17 |

There are 92 board/action inputs, 91 globally distinct GF response pairs, and four exact repeated presentations. The initial-board and one-cycle context response differs for all 20 paired actions; that contrast changes both halfmove clock and repetition count, so it does not isolate either field's cause. Feature collisions range 0–10 and dropped cells 0–9; every assignment/drop is retained in raw records. Stimulation diversity does not imply neural separation, and GF separation does not imply good decisions or reasoning.

The new input-domain calibration derives min/max only from the 92 naive inputs, without any answer, proof, outcome or learned memory. Cell ranges are 1.6111880540847778e-7 and 1.7974525690078735e-7. They exceed the frozen 1e-7 numerical threshold. Scores retain differences on this panel, although max aggregation still yields ties. All responses remain below the old resting reference: the earlier resting-reference clipping failure remains true. This is a new engineered interface comparison, not a retroactive pass of that experiment or a biological danger fit. Calibration must remain frozen during future conditioning, and out-of-panel saturation must be reported.

Raw `report.json` and per-candidate atomic `state.json` files retain input/source hashes, encoder identity, stimulation, raw GF rates, calibration, graph/parameter identity, commands and measurements. `audit.json` independently rechecks legal feature inventories, projection/current/accounting arithmetic and calibration/score diversity using the same chess.js library. `audit-replay.json` additionally verifies exact scientific record equality after resuming from candidate 95. That replay re-simulates only the final repeated cue; its first 95 records come from the checkpoint, so it is not a full fresh replay of all inputs. Executable source snapshots are in `sources/`.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-chess-cues.mjs --out research/reports/chess-cue-panel-v1-2026-10-05 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/probe-chess-cues.mjs --out research/reports/chess-cue-tail-replay-2026-10-05 --cpu-duty 0.5 --resume research/reports/chess-cue-panel-v1-2026-10-05/candidate-095/state.json
node --max-old-space-size=256 .codebase/scripts/audit-chess-cues.mjs --run research/reports/chess-cue-panel-v1-2026-10-05 --out research/reports/chess-cue-panel-v1-2026-10-05/audit.json
node --max-old-space-size=256 .codebase/scripts/audit-chess-cues.mjs --run research/reports/chess-cue-panel-v1-2026-10-05 --compare research/reports/chess-cue-tail-replay-2026-10-05 --out research/reports/chess-cue-panel-v1-2026-10-05/audit-replay.json
npm test
```

Use new paths when repeating. Full run: 97 forward evaluations, peak RSS 142.60546875 MiB, elapsed 170.6266594 seconds, CPU 75.766 seconds, duty 0.5. Tail replay: two forward evaluations, peak RSS 142.16015625 MiB, elapsed 7.6868369 seconds, CPU 4.656 seconds. Workloads differ; no speedup or comparative resource improvement is claimed. All 46 tests pass, including legal/promotion/history context, bounded projection, privileged-label rejection, constant-signal disabling and saturation preservation.

The program now has actual board/action inputs for the candidate neural circuit. It still lacks independently validated learning with these cues, a supported feedback/credit interface, useful unseen-position decisions and whole-model adaptive coverage. The existing record-only puzzle runner is unchanged by this panel. See [interface design](../../../documentation/design/chess-input/board-action-cues.md).
