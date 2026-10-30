# Contrastive feedback screen v1 — audited result

The runner completed both original and balanced cue variants across informative, absent, shuffled and disabled-plasticity conditions. Its independent audit passed 54 certificate checks, 10 complete search-trace replays and 12 local recurrence checks. The audit verifies records and controls; it does not mean the learning gate passed.

| Cue variant | Unaided before | Informative after | Absent / shuffled / disabled | Fixed-budget search after | Success-minus-failure margin change |
|---|---|---|---|---|---:|
| Original | `c4b4`, failure | `c4h4`, failure | All remain failures | Failure | -0.001035 |
| Balanced | `c4b5`, failure | `c4e4`, failure | All remain failures | Failure | +0.001511 |

Neither variant repaired the puzzle choice or passed the informative-versus-control gate. Balanced feedback raised `c4g8` from rank 24 to rank 6, but it still selected `c4e4`; original feedback lowered `c4g8` from rank 14 to rank 17. The shift is not a successful acquisition, and the differing feedback order means this screen cannot establish that one cue projection is superior.

The run took 539.60 seconds wall time, 282.25 seconds CPU time, 123.82 MiB peak RSS and 2,030 neural presentations at 50% duty. Across ten fixed-budget searches, neural assessments averaged 14.34 seconds of 14.40 seconds measured search wall time; legal move generation plus forcing-shortlist generation averaged 44.8 ms. Neural assessment timings include the configured duty pacing. The earlier exact forward-phase profile localized most raw inference compute to sparse recurrence, while the signed-edge cache already provides a separately measured exact speedup. See the [forcing-prior follow-up](../forcing-loop-v4-2026-10-07/README.md) for the next same-puzzle search iteration.

The report is bound to the frozen protocol and exact local source/input identities. The independent auditor wrote `COMPLETE` only after its certificate, trace, matched-exposure and recurrence checks passed.

- [Frozen protocol](../../data/contrastive-feedback-screen-v1/protocol.json)
- [Raw report](report.json) — SHA-256 `46abac60f19c01f190c4833fc9e13fd32edb11e45a47ba61e0271e871b91ee09`
- [Independent audit](audit.json)
- [Completion marker](COMPLETE)
