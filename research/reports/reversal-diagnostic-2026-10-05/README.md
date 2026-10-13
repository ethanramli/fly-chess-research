# Observed reversal diagnosis

2026-10-05, Asia/Jakarta. Descriptive analysis of completed, frozen V1/V2 records. This does not change a gate, rerun training, or validate a new mechanism. The requested end state remains consequence-driven puzzle learning with held-out transfer; this is prerequisite diagnosis, not its completion.

Reproduce into new output paths:

```powershell
node --max-old-space-size=256 .codebase/scripts/diagnose-reversal.mjs --report research/reports/association-validation-v1-2026-09-30/report.json --out NEW_V1_JSON
node --max-old-space-size=256 .codebase/scripts/diagnose-reversal.mjs --report research/reports/association-validation-v2-2026-09-30/report.json --out NEW_V2_JSON
node --max-old-space-size=256 .codebase/scripts/audit-learning.mjs --report research/reports/association-validation-v2-2026-09-30/report.json --out NEW_AUDIT_JSON
```

[V1 analysis](v1.json), [V2 analysis](v2.json), [fresh independent V2 audit](v2-audit.json). Each diagnostic retains the input SHA-256, command, original gates, every condition, pulse counts and adjacent response observations. The script checks the algebraic decomposition for every row. No graph is loaded or mutated, and no resource improvement is claimed.

For the fixed lower-response decoder, change in preference for the new target equals **old-cue response recovery + new-cue response depression**. Positive change alone is insufficient: the final margin must favor the new cue. Here the old cue actually falls slightly further rather than recovering.

| V2 seed | Acquisition pulses | New-target reversal pulses | Old-cue recovery | New-cue depression | Final new-target margin | Reversed choice correct |
|---|---:|---:|---:|---:|---:|---|
| 503 | 3 | 6 | -0.0002393 | 0.0298917 | 0.0131083 | Yes |
| 947 | 2 | 3 | -0.0001533 | 0.0184585 | 0.0044645 | Yes |
| 1601 | 3 | 3 | -0.0001540 | 0.0183503 | -0.0002625 | No |
| 2357 | 3 | 8 | -0.0002905 | 0.0349825 | 0.0156053 | Yes |
| 3511 | 3 | 2 | -0.0001216 | 0.0131941 | -0.0065653 | No |
| 5003 | 3 | 2 | -0.0001085 | 0.0130445 | -0.0005511 | No |

Seed 947 succeeds with three reversal pulses whereas 1601 fails with three. Counts alone therefore do not explain the threshold crossing; acquired margin and response effect differ. The failed seeds receive 9, 10 and 10 old-cue omission experiences, respectively. Their mean adjacent old-cue response increases after those experiences are only about 2.4e-7, 1.4e-7 and 1.5e-7 units. Those differences include residual traces and intervening timing; they are **not isolated causal measurements of omission**. Aggregate old-cue response decreases during reversal in every contingent seed.

The current rule has no reward expectation or explicit omission-triggered recovery. That source fact and these observations motivate investigation, but do not identify a uniquely correct biological replacement. Per-trial efficacy is absent from these report histories; the response differences cannot reconstruct each local synapse update. V1 has no failed final reversal choices but still fails overall acquisition acceptance. Both original failed overall gates remain intact.

Next experiment should separate exposure sufficiency from omission-sensitive dynamics. A proposed diagnostic comparison would predeclare equal numbers and order of new-target rewarded exposures and old-target nonrewarded exposures, record local efficacy and traces at each completed trial, and compare the unchanged rule with a separately justified candidate. Keep the original V1/V2 frozen; use new synthetic cue seeds and an independent protocol. Do not extend these runs until they pass. The biological candidate still requires exact compartment mapping, primary-source-derived dynamics, independent predictions, and explicit permitted state changes before implementation. This comparison is proposed, not frozen or executed.

Verification: fresh V2 independent audit passes; original V2 reversal accuracy remains 3/6. `npm test` passes 29/29. These checks establish software consistency, not biological validity or chess transfer. The puzzle receiver still records feedback with no neural learning.
