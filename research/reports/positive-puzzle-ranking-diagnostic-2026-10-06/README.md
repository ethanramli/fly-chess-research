# Read-only positive-puzzle ranking diagnostic

Generated from the immutable published checkpoint 00024 while the separate full-graph experiment continued. The diagnostic loads no graph, changes no memory and supplies no teaching event. It uses only completed informative fixture records; the currently incomplete full experiment must not be interpreted as audited from this diagnostic.

```powershell
node --max-old-space-size=256 .codebase/scripts/diagnose-positive-puzzle-ranking.mjs --state research/reports/positive-puzzle-pipeline-v1-2026-10-06/checkpoint-00024/state.json --out research/reports/positive-puzzle-ranking-diagnostic-2026-10-06
```

`report.json` pins the state/source hashes, checks plan/receipt hashes and includes independently generated/replayed bounded consequence certificates for all 26 legal moves. `source.mjs` preserves the diagnostic implementation. This is a training-fixture analysis, not a held-out test or new acceptance gate.

Only four root candidates received teaching: successful Qh7#, and unsuccessful Qf5, Qe6, Kh6. The final leading move Qb3 is independently verified unsuccessful and unreviewed. Qb3 preference fell from 0.0144772672 to 0.0097366385; Qh7# fell from 0.0150785521 to 0.0092338007. Qh7# ranks fourth after learning. The initially leading Qf5 also fell, from 0.0157928728 to 0.0096586817, but remains second and unsuccessful.

The best-success gap to the highest preference narrows from about -0.0007143 to -0.0005028 while the successful move's ordinal rank worsens. Positive feedback does not imply a net score increase after other teaching events. These are net changes across four events; no counterfactual replay isolated each event's causal contribution. Coverage and shared-representation interference remain competing explanations. Neither more coverage nor a replacement rule is established as a cure.

Preserve the running pilot's frozen sources/gates. After terminal results and independent receipt/trace/recovery audits, use this training-only evidence to design a separately frozen coverage comparison if warranted. Familiar repair, if achieved, would still leave unfamiliar/counterfactual transfer and learned strategic evaluation unproved.
