# Fushiki literature review and saved-receipt diagnostic

2026-10-07 (Asia/Jakarta). Source reading and seven published development-event checks (six failed adaptive reviews and the first fixed positive replay), without neural inference or feedback. The smothered invocation was observed active during review; its final outcome is not claimed here.

- [Reading notes and roadblock assessment](../../literature/fushiki-reading-notes-2026-10-07.md)
- [Proposed compartment/timing diagnostic sequence](../../../documentation/design/neural-learning/compartment-memory-diagnostics.md)
- [Source access and coverage evidence](access-evidence.json)
- [Seven-event summary, input hashes and scope](receipt-summary.json)
- [Reproducible independent arithmetic](build-receipt-summary.mjs)

Run from the repository root: `node research/reports/fushiki-literature-review-2026-10-07/build-receipt-summary.mjs`. It reads exactly events adaptive 0–5, fixed 0 and the existing projection preflight, and writes only receipt-summary.json here. No graph or learning implementation is imported. All seven recurrences reproduce with zero residual. During the six negative replays, other-channel net gain changes contribute at most 0.0653% of L1 magnitude. During the positive replay, no positive-associated KC entries are active or edges changed; all 39 changes are in the other groups. Existing balanced projection provides seven positive-pool cells at the same dose. These observations do not establish useful balanced-input learning or the cause of score rebound. Source data paths/hashes are preserved in the summary.
