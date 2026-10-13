# Verified-consequence neural fixture V1

2026-10-06. **Experimental neural delivery/persistence now run; useful full-root choice remains failed.** Not the complete requested learner, biological validation or transfer.

This frozen follow-up to the MBON prerequisite runs one mate-in-one fixture with fresh encoder seed 13007 and four from-scratch conditions. All 26 legal candidates are scored. Separate-board depth-one PUCT commits `Qg7#`; independently checked feedback reviews that success and three bad initial preferences. Two cycles deliver eight known experiences per condition, with coincident cue/identified PPL103 experimental stimulation for adverse bounded consequences. Unknowns supply no event; the teacher supplies no parameter delta.

| Condition | Unaided before | Unaided after | Post-choice bounded mate | Reviewed good-minus-bad mean after |
|---|---|---|---|---:|
| Informative | Qf6 | Qd7 | Failure | +0.00188254 |
| Absent external stimulus | Qf6 | Qf6 | Failure | -0.00062354 |
| Matched shuffled | Qf6 | Qd7 | Failure | -0.00083197 |
| Disabled plasticity | Qf6 | Qf6 | Failure | -0.00060517 |

All start at mean margin -0.00060517. Informative feedback improves the reviewed relationship, but full-root choice still fails. Qd7 was not among the four reviewed candidates; Qg7# becomes second in the informative ranking. Shuffled feedback changes the choice too, so changed choice alone is insufficient evidence.

Fixed-budget depth-one search selects mate before/after under every condition. Informative terminal leaves rise 61 to 63 of 64 simulations; others remain 61. This single-fixture descriptive count is not strategic strength or a general resource/quality improvement. Pre-learning search reproduces exactly after JSON normalization. The first comparison attempt rejected chess.js Move prototypes/undefined properties versus persisted plain objects; only serialization normalization was corrected, retaining exact scientific field equality.

Raw evidence:

- [report.json](report.json): full protocol/pins, receipts, proofs and causal probes; SHA-256 `34b4d80860c499c51cd7f1fa678b09c6436c1169df8d872bf697942979aac8fc`.
- [audit.json](audit.json), [audit-prefix.json](audit-prefix.json): 24 certificates, all 32 local transitions/receipts, disabled invariance, repeat/reset/restoration and exact one-event resumed prefix.
- [search-comparison.json](search-comparison.json): identical before/after root-readout search budgets without teacher labels or future-position policies.
- `checkpoint-00001` onward: atomic raw state/event cursors; `sources/`: pinned driver/modules, frozen protocol and auxiliary sources.

Only eligible existing efficacy gains change; graph/sign/nonplastic hashes remain fixed. Explicit replay activates the relevant candidate immediately with feedback. This is not natural reward delivery, eligibility surviving search, measured biological retention or unfamiliar transfer. Existing record-only/browser paths are unchanged.

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-neural.mjs --out research/reports/puzzle-neural-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-puzzle-neural.mjs --run research/reports/puzzle-neural-v1-2026-10-06 --out research/reports/puzzle-neural-v1-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/compare-puzzle-search.mjs --run research/reports/puzzle-neural-v1-2026-10-06 --out research/reports/puzzle-neural-v1-2026-10-06/search-comparison.json
node --max-old-space-size=256 .codebase/scripts/puzzle-neural.mjs --out research/reports/puzzle-neural-prefix-2026-10-06 --cpu-duty 0.5 --max-events 1 --resume research/reports/puzzle-neural-v1-2026-10-06/checkpoint-00004/state.json
node --max-old-space-size=256 .codebase/scripts/audit-puzzle-neural.mjs --run research/reports/puzzle-neural-v1-2026-10-06 --prefix research/reports/puzzle-neural-prefix-2026-10-06 --out research/reports/puzzle-neural-v1-2026-10-06/audit-prefix.json
npm test
```

Use new outputs. Main: **552 full-graph presentations**, **116.80 MiB** peak RSS, **211.754 seconds** elapsed, **107.454 CPU seconds**, heap 256/duty 0.5. Resume: 107.63 MiB, 1.934 seconds, 1.516 CPU seconds. **52/52 tests pass**. Workloads differ from previous assays; no comparative improvement claimed.

Graph SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`; annotations SHA-256 `30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6`. Protocol/dataset/source hashes, model/mapping identity and exact commands are in report.json. Heap/RSS/free-memory guards and per-event resumability remain.

Remaining problem: distinguish insufficient reviewed coverage from interference/generalization to unreviewed actions. Training-only adaptive review of newly high-ranked unchecked candidates is proposed, not proven. Do not substitute the favorable reviewed mean for full-root evaluation. Multi-ply defensive calculation, richer attribution, delayed eligibility, natural interfaces, broader physiological adaptation and family-held-out/counterfactual transfer remain unfinished. No test family is used here.
