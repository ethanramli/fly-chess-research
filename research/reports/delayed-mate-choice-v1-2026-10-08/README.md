# All-legal mate choice screen: no repair

2026-10-08. [Frozen protocol](../../data/delayed-mate-choice-v1/protocol.json), [raw before/after rankings and receipt references](result.json), [protocol journal](../../journal/experiments/2026-10-08-delayed-mate-choice-protocol.md). Source archive: `research/source-archives/delayed-mate-choice-v1`. Protocol SHA256 `68396f676a42cca63e50a538d50d96a960e365aa037d46b8f3c75350139ace8f`. Frozen original capture designs/results are preserved separately.

Command: `node --max-old-space-size=256 .codebase/scripts/puzzle-learning/run-delayed-mate-choice.mjs --out research/reports/delayed-mate-choice-v1-2026-10-08 --cpu-duty 0.5`.

One historically inspected mate-in-one training fixture,26 legal moves,4 scheduled certified experiences per condition. Every legal action's consequence is independently checked against the declared mate horizon. Full baseline/final rankings are at common respective memory states, unlike the earlier between-event contrast mistake. No final families or checkpoint selection. No external neural deltas/search at inference.

| Condition | Initial choice | Final choice | Initial margin | Final margin |
|---|---|---|---:|---:|
| Informative |Qe6, wrong|Qe6, wrong|-0.0011605662294|-0.0011655949056|
| No-channel |Qe6, wrong|Qe6, wrong|-0.0011605662294|-0.0011667450890|
| Frozen mixed shuffle |Qe6, wrong|Qe6, wrong|-0.0011605662294|-0.0014461274259|
| Disabled |Qe6, wrong|Qe6, wrong|-0.0011605662294|-0.0011605662294|

Margin = highest-scoring verified mate move minus highest-scoring failed move. More negative means worse. **No condition repairs the top choice.** Informative marginally exceeds no-channel/shuffled but worsens from initial; this cannot count as repaired choice or useful learning. Shuffled worsens more; comparing it with informative does not make informative a success. Disabled exactly preserves the initial ranking/margin as expected.

168 neural presentations/condition,672 total, full invocation417.2318721 seconds, sampled peak RSS114.8046875MiB. Heap256MiB, RSS768MiB/minimum free256MiB, duty0.5. These are this workload's measurements, not a speed improvement or extrapolation to another puzzle. The earlier10-probe taught-context contrast increase remains valid evidence for its separate capture task; this mate choice failure does not erase it.

## Limitations and next hypothesis

Scheduled failure feedback reviewed Qf6, while the learner's preferred mistake was Qe6. This was declared in the protocol, but means the screen does not establish whether reviewing the actual chosen error would repair it. Next informative design must bind the actual attempt, its independently checked consequence and a surviving alternative; do not simply repeat Qf6 more times.

Read-only receipt inspection finds the action:Qf6 feature mapped to KC index122251, right PPL103 mask only. Root stimulation reaches left PPL6/left PAM2/right PPL3/right PAM0 cells. The present encoder's single pooled hash projection may not give each distinguishing feature access to both reinforcement masks. This is a coverage/interference hypothesis, not causal proof, biological receptor validation or permission to rewrite graph topology. Inspect the actual Qe6 and successful-move feature coverage before selecting a new representation; preserve identity and source assumptions.

Prediction records remain an uncalibrated ordinal hypothesis. Delivered signal is certified outcome stimulation, not implemented prediction error. Candidate biological association/coexistence/reversal acceptance, sentinel retention and disjoint/counterfactual transfer remain unmet. No8/10 claim. Independent fresh-graph replay of all receipts and baseline/final rankings is running separately; do not confuse the terminal training invocation with audit completion.

Coverage addendum2026-10-08: [raw feature mask coverage](feature-coverage.json) shows3/26 legal action tokens project to KCs represented in BOTH current plasticity masks. Qe6(index100371), reviewed Qf6(index122251) and successful Qh7#(index28182) all project to right PPL103 only. Injected PAM feedback can still act through other active/shared KCs and recurrent effects; this is not proof of no reward transmission or unique cause. It identifies a specific input-to-plasticity alignment question. Do not alter active pinned sources during independent audit. Next isolate actual chosen-error teaching under the unchanged encoder first; only then test label-blind shared-mask projection as a separately frozen factor, without inventing edges or tuning completed gates.

2026-10-08 terminal audit addendum: [audit.json](audit.json) passes16/16 full receipts and8/8baseline/final all-legal rankings on fresh graph.168presentations/condition. Audit runtime306.6654234s, sampled peak106.47265625MiB, CPU user156.390/system0.203s; this audit runtime excludes preliminary identity hashing, not a resource improvement comparison. No choice repair confirmed. Next chosen-error targeting preserves original rule/encoder/budget, changes scheduled failure to actual initial Qe6 and leaves all completed gates intact.
