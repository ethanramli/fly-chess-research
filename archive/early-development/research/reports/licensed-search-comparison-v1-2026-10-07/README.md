# Licensed search comparison v1

Frozen2026-10-07. Two inspected development positions x naive/audited learned memory x existing/licensed PUCT. All legal moves,4 graph position evaluations,4 simulations,depth3,nodes1024,60s soft deadline,cPuct1.5. Existing search randomFraction0/uniformMix0; no forcing prior. Legal policy softmax/visit conventions differ, so this is search-mechanics evidence, not a pure implementation speed benchmark.

Sources25, graph/annotation/dependency/MIT license and learned memory pins are in protocol.json. Preflight passed. Learning disabled; persistent memory and fixed parameters checked per case. Neutral leaf value0 remains. Preserve case JSON, completed traces, assessments and proof review. Checkpoint after each case; resume its JSON into a fresh output directory. Partial/resumed metrics are invocation-only and cannot establish whole-run improvement.

Command:

```powershell
node --max-old-space-size=256 .codebase/scripts/evaluation-and-performance/compare-licensed-search.mjs --out research/reports/licensed-search-comparison-v1-2026-10-07 --cpu-duty 0.5
```

RSS768MiB/free256MiB,heap256,duty0.5. Serial graph work. Run launched as tool session31467 after authoritative process inspection. This is a dated observation, not proof of live/terminal state. Terminal independent proof/trace/replay audit remains pending; no outcome or performance claim yet.

## 2026-10-07 terminal audited outcome

Main graph invocation exit0. Corrected independent audit passes8 certificate checks,24 complete legal traces and8 exact recorded-assessment search replays. Source/input/learned-memory/fixed-state checks pass. Preserve auditor-before-json-correction.mjs and audit-first-attempt.log: the initial strict object comparison failed because chess.js Move prototypes/undefined fields disappear in published JSON. Corrected replay compares exact serialized values without numerical tolerance or changed search/gates. COMPLETE report/audit byte hashes verified.

Both algorithms have identical selected moves and candidate presentation counts in every paired case:

| Position/memory | Existing | Licensed | Presentations each |
|---|---|---|---:|
| Familiar/naive | c4b5 failure | c4b5 failure |80|
| Familiar/learned | c4g8 success | c4g8 success |65|
| Counterfactual/naive | h5c5 failure | h5c5 failure |102|
| Counterfactual/learned | h5c5 failure | h5c5 failure |99|

All cases use4 position evaluations and3 completed simulations; evaluation budget stops search before the4-simulation target. This reproduces strong-fly search mechanics around our learner but does not supply cesp99's trained policy/value interface. No speedup or transfer improvement is established. The familiar acquired repair survives both searches; counterfactual transfer remains failed. No new feedback or learning occurred. Search values remain neutral0 except terminal rules.

Complete invocation320.5185258s wall,168.594s CPU,110.3203125MiB peakRSS,duty0.5. Report SHA-2568e88be5b215ef395802bf9d5fb7006aedd839544cfc45e61d8d23745166e30b2. Single fixed-order comparison is not a general runtime benchmark.
