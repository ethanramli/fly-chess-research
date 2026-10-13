# Single feedback timing fixture

2026-10-08 single-feedback timing fixture: one verified tr-01/a1a4 capture-retention experience from scratch with bound-ray input, followed serially by no-channel, opposite-valence and disabled controls. Informative replay 0.6213934s; before/after/reset/restoration arm 4.3832372s; whole four-arm invocation including setup 26.3300654s, 13.656s CPU, 106.523MiB sampled peak RSS. Informative changes76 efficacy entries but a1a4 was already preferred and remains preferred. No-channel also changes77 entries; disabled changes0; opposite-valence switches to the failing e1e5. Single-event shuffle is opposite valence, not count-balanced. All870 per-arm receipt recurrences and exact reset/restoration pass; no independent fresh-graph audit or transfer acceptance. First invocation failed only the timing checker due to incorrect float32 rounding; preserved separately, then corrected checker and reran from scratch. No frozen source modified. Raw report: research/reports/one-feedback-round-timing-v2-2026-10-08/report.json.

Command: node --max-old-space-size=256 .codebase/scripts/puzzle-learning/time-one-feedback-round.mjs research/reports/one-feedback-round-timing-v2-2026-10-08 --cpu-duty 0.5

The round is a timing fixture using existing registered mechanism sources, not a replacement for the frozen 16-event matched development protocol. Updated memory plus pending receipt is atomically published before acknowledgment; interrupted receipt files are preserved, but this timing harness has no resume CLI.

Validation: npm test passes all 150 tests. Timing measurements include CPU duty 0.5 pacing; they are not a comparative latency improvement claim.
