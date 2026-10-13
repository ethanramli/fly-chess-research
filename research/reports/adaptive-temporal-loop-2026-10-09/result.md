# Adaptive temporal-loop repair result

The software repair is implemented and audited. Useful acquisition gate: **failed**. Control-specific correct-choice gate: **failed**. Adaptive strongest-competitor margin advantage over equal-dose fixed-target: **passed**. These are separate claims; this run does not establish solved plasticity or reasoning.

The informative teaching sequence was f7g8, f7h7, f7d7, f7h7, f7g8, f7h7, f7d7, f7h7. Every swapped, absent and disabled arm received that exact sequence; fixed-target used the original error at each paired failure slot.

| Arm | Final choice | Certificate | Initial Qh7 margin vs strongest competitor | Final margin |
|---|---|---|---:|---:|
| informative | f7g8 | failure | -0.005083847790956497 | -0.004301739390939474 |
| fixed-target | f7d7 | failure | -0.005083847790956497 | -0.004557949025183916 |
| swapped | f7g8 | failure | -0.005083847790956497 | -0.006074958480894566 |
| absent | f7g8 | failure | -0.005083847790956497 | -0.005083847790956497 |
| disabled | f7g8 | failure | -0.005083847790956497 | -0.005083847790956497 |

Retargeting need not dominate every metric. The inherited auditor field specificityPass is false: it compares Qh7 versus the ORIGINAL error against all other arms, including fixed-target. The registered adaptiveAdvantage gate instead compares Qh7 with the CURRENT strongest competitor; these comparisons must not be conflated. The local direction diagnostic is true.

The independent auditor replayed 760 local frame updates and 130 final graph score rows. It verified source pins, certificate bindings, current-error selection, memory continuity, exact control exposure and disabled-state isolation. The same-memory repeat agrees exactly; this is computational persistence, not biological retention. The updater is shared with the numerical audit; biological correctness remains unvalidated.

A real interruption stopped after three feedback frames at checkpoint 7. The resumed first pair exactly matches every score, rate, gain and trace in the earlier uninterrupted cap-10 result. This verifies that resumed path against an existing independent run, rather than inferring recovery from a checkpoint's presence.

All 215 software tests passed, zero failures. Static coverage found 120 gamma cue KCs, 84 PAM02-eligible KCs and zero direct overlap. The unsupported PAM02 timing extension was not installed. Previous baseline-mask claims were too strong: local score change does not identify a unique biological cause.

Informative final gain range is 0.9531738717589573 to 1.0402828212744903 within declared bounds 0.2 to 1.8. Saved score trajectories and direct cue overlaps are included in evidence.json. A previously reviewed wrong action becoming top again is not by itself evidence of forgetting; its absolute score and competing scores must be compared. These descriptive quantities are not post hoc acceptance gates.

Resumed invocation: 1142.96 s, sampled peak RSS 193.86 MiB; independent audit peak 138.53 MiB. Heap 256 MiB, duty 0.5, RSS <768 MiB and free memory >256 MiB guards. Prefix elapsed/CPU metrics were not captured, so these are not whole-run resource claims.

Raw [result](../../../runs/adaptive-temporal-loop-v1-resumed/result.json), [audit](../../../runs/adaptive-temporal-loop-v1-resumed/audit.json), [evidence hashes](evidence.json), [preregistration](README.md), [handoff](../../../documentation/handoffs/plasticity-repair.md).

## Exact commands

```powershell
node --max-old-space-size=256 research/reports/adaptive-temporal-loop-2026-10-09/run.mjs --protocol research/data/adaptive-temporal-loop-v1/protocol.json --out runs/adaptive-temporal-loop-v1-prefix --cpu-duty 0.5 --stop-after-frames 3
node --max-old-space-size=256 research/reports/adaptive-temporal-loop-2026-10-09/run.mjs --protocol research/data/adaptive-temporal-loop-v1/protocol.json --out runs/adaptive-temporal-loop-v1-resumed --cpu-duty 0.5 --resume runs/adaptive-temporal-loop-v1-prefix/checkpoint-7.json
node --max-old-space-size=256 research/reports/adaptive-temporal-loop-2026-10-09/audit.mjs runs/adaptive-temporal-loop-v1-resumed
```
