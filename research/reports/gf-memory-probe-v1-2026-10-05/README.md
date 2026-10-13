# Stored memory reaches GF, but the proposed clipping erases it

2026-10-05. Diagnostic replay of synthetic association memories. No new learning or chess feedback was applied.

All 24 seed/condition jobs reproduce original MBON values exactly and preserve wiring/nonplastic hashes. Memory reset and restoration reproduce GF responses exactly. A fixed, outcome-blind unclipped diagnostic decoder gives informative acquisition/reversal choices correct in 6/6. Effects are small: acquisition margin changes approximately 2.38e-7–3.16e-7 and reversal 5.99e-7–6.54e-7 in normalized experimental-panel units. These are reused training cues, not transfer or an independent Gate B test.

| Condition | Acquisition correct | Reversal correct |
|---|---:|---:|
| Informative | 6/6 | 6/6 |
| Absent | 3/6 | 3/6 |
| Pulse-count-matched shuffled | 1/6 | 5/6 |
| Disabled plasticity | 3/6 | 3/6 |

Every tested baseline/acquisition/reversal cue response is below the resting GF reference. Consequently, the proposed application's clipping to [0,1] erases every difference into ties and yields 3/6 correct choices per phase in every condition. This is a **failed application-interface prediction**, preserved alongside the small causal signal. The diagnostic decoder must not silently replace that interface. No biological response fit, independent-seed choice validation, natural sensory/reward interface, puzzle learning or whole-model adaptation has been established.

`report.json` retains every raw GF/MBON response, normalized readout, calibration, memory identity, original checkpoint/source hashes, command and measurements. `audit.json` independently recomputes stored readout arithmetic, choices, effects, causal memory identity, original MBON consistency, condition/seed coverage and clipped-interface comparison; it does not independently re-simulate the graph. `job-NNN/state.json` supports atomic resume at completed-job boundaries. Archived executable sources are in `sources/`.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-gf-memory.mjs --out research/reports/gf-memory-probe-v1-2026-10-05 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/probe-gf-memory.mjs --out research/reports/gf-memory-prefix-replay-2026-10-05 --cpu-duty 0.5 --max-jobs 1 --resume research/reports/gf-memory-probe-v1-2026-10-05/initial/state.json
node --max-old-space-size=256 .codebase/scripts/audit-gf-memory.mjs --run research/reports/gf-memory-probe-v1-2026-10-05 --compare research/reports/gf-memory-prefix-replay-2026-10-05 --out research/reports/gf-memory-probe-v1-2026-10-05/audit.json
npm test
```

Use new output paths when repeating. Full run: 242 forward evaluations, peak RSS 106.73828125 MiB, elapsed 282.6080415 seconds, CPU 129.469 seconds, duty 0.5. Existing tests ran briefly alongside it. No exclusive latency benchmark or resource improvement is claimed. All 40 existing tests pass; the raw replay/audit supplies the specific new readout evidence.

Next research action: independently specify and validate a sensory/action calibration that retains meaningful signals without fitting to these choices, plus independent biological predictions and new-seed controls. Preserve the clipping failure and all original gamma4 failures. Verified chess consequences still need a supported experience/credit interface before the requested puzzle learning round works.
