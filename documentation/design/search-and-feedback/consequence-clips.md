# Teacher replay clips: independently verified consequence contexts

2026-10-06. [verified-consequence-clips.mjs](../../../.codebase/src/search-and-feedback/verified-consequence-clips.mjs) turns an independently checked consequence into bounded, separately verified attacker board/action contexts along one illustrative certificate branch. This is an engineering extension of the existing teacher certificate interface, not an externally established neural mechanism.

For the composed `Rf8+ Rxf8 Qxh7#` example, the teacher can present both the initial rook choice under a three-ply task and the later queen choice under a one-ply task. Each context preserves the move history leading to it. The later certificate is bound anew to its successor position, acting side and remaining horizon, and replay checked. The original full certificate continues to justify defense coverage; one displayed branch does not replace it.

The helper emits at most four attacker clips and accepts at most 4,096 certificate nodes. It preserves the real task board, checks cloned subtree proofs, records ancestor certificate hash and preceding moves, and rejects mismatched proof contexts. Unknown supplies no clips. A checked failure means no forced mate within its horizon, not a full-game loss. The material rubric and examples remain fixed teacher engineering choices.

These are **explicit new replay experiences**, not a neural eligibility trace or retrospective updates for every hypothetical move. They do not establish that the root choice caused a unique payoff, that a sacrifice was necessary, that the fly parses explanations, or that it learned a concept. The positive source example has another immediate mating option. Known examples used during implementation cannot become held-out test evidence.

## Software evidence

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-consequence-clips.mjs --out research/reports/consequence-clips-software-2026-10-06
```

[Raw probe](../../../archive/early-development/research/reports/consequence-clips-software-2026-10-06/report.json) and its source archive preserve four independently rechecked clip certificates across the existing success/changed-support compositions. Success clips: Rf8+ and Qxh7#; changed-support failure clips: Rf8+ and Kg3 under their respective contexts. No graph inference, neural teaching or persistent adaptation ran in this probe. All 79 project tests pass, including context/history binding, replay bounds, unknown handling and forged cross-position certificate rejection.

The current full-graph pipeline remains frozen and does not use these clips. A later integration must declare exposure/review budgets, replay the same contexts into matched controls, checkpoint each local update, and pass useful choice gates. Long-delay neural credit, learned strategic evaluation and unfamiliar/counterfactual transfer remain unfinished.
