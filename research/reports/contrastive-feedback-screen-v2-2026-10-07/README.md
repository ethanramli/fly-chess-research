# Contrastive feedback screen v2 — audited failure

The forcing-prior teacher search succeeds before feedback and in every informative, absent, shuffled and disabled condition. Unaided choices remain `c4b4` for original cues and `c4b5` for balanced cues; all are verified failures. Counterfactual unaided choices also fail. No useful-choice or acquired-repair gate passes.

V2 reviews the successful searched action `c4g8` and independently checked failing anchor `h6f7`. V1 instead reviewed each variant's actual top failing action. Thus the changed search policy changes the teaching experiences as well. Improving the success-versus-anchor margin does not establish correct ranking across all legal moves. The next coverage experiment should review the current unaided failing preference after each pair while retaining a verified positive experience.

Recorded resources: 562.91 s wall, 293.33 s CPU, 136 MiB peak RSS, 1,734 neural presentations, duty0.5. V1 used2,030 presentations and539.60 s wall. This invocation used fewer presentations but took longer; these whole-screen observations do not establish a latency improvement. The separately matched search-only comparison remains the bounded speed evidence.

The original frozen auditor rejected JSON's conversion of negative zero to zero. Its [failed attempt](audit-frozen-attempt.log) is preserved. A separate corrective auditor checks exact numerical factor equality with no tolerance, still verifies the frozen sources, and records its own source hash. It passed54 certificate checks,10 search-trace replays,12 local recurrences and matched-control exposure checks. This corrects a serialization check only; it changes no learning equation or gate.

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-contrastive-feedback-screen-v2.mjs --out research/reports/contrastive-feedback-screen-v2-2026-10-07 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-contrastive-feedback-screen-v2-json-zero.mjs --run research/reports/contrastive-feedback-screen-v2-2026-10-07
```

- [Protocol](../../data/contrastive-feedback-screen-v2/protocol.json)
- [Raw report](report.json), SHA-256 `5d6f2ce1d6ddd633662986158cf7eafb0fbce49489e52ee2cbba551d4ec0a2fb`
- [Corrective audit and source identity](audit.json)
- [Completion marker](COMPLETE)
- [V1 failure](../contrastive-feedback-screen-v1-2026-10-07/README.md)
- [Matched forcing-prior search comparison](../forcing-loop-v4-2026-10-07/README.md)
