# Teacher explanations: captures, concessions and verified payoff

2026-10-06 follow-up: [bounded verified consequence clips](consequence-clips.md) now create separately rechecked attacker contexts for earlier and later choices along an illustrative branch. Four clip proofs pass in the teacher-only composed probe and 79 project tests pass. This adds explicit replay preparation, not semantic neural learning or delayed eligibility; the frozen full-graph pilot does not use it.

2026-10-06. The teacher can now explain an independently checked line's immediate material concession, defensive reply coverage and eventual bounded mating consequence. This is implemented feedback evidence; it is not a learned strategic evaluator or proof that the fly uses the explanation.

[verified-line-explanation.mjs](../../../.codebase/src/lowram/verified-line-explanation.mjs) independently binds and rechecks the existing certificate before replaying an illustrative branch on a separate board. It records the actual move/capture sequence, fixed material accounting, prior attacker choices and whether a defensive move was the only legal reply. Unknown outcomes produce an empty explanation with teaching disabled. A forged certificate cannot create a payoff claim.

Material units are a declared teacher rubric (pawn 1, knight/bishop 3, rook 5, queen 9, king 0), not physiological reward units or a complete position assessment. Temporary material loss and eventual mate are separate facts. A winning line containing a concession does not show that the concession was necessary, uniquely best, or rejected by the model because of material. The full replay-checked certificate covers required defensive branches; the displayed branch is illustrative, not a replacement for that proof.

The experience planner attaches this explanation only after commitment and independent verification. The policy never receives it during search. The current neural receiver still receives the existing coincident cue/experimental reinforcement interface; it does not translate prose/diagnostics into calculated parameter updates. Learning from semantic feedback, validated delayed credit and broader physiological adaptation remain unresolved.

## Composed engineering examples

Command:

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-verified-lines.mjs --out research/reports/verified-line-explanation-2026-10-06
```

[Raw report](../../../archive/early-development/research/reports/verified-line-explanation-2026-10-06/report.json) pins sources and preserves complete certificates and explanations. Both examples are engineering fixtures used in implementation checks, **not held-out transfer data**. No fly inference, teaching pulse or neural learning ran in this probe.

- `4r2k/6pr/6K1/7Q/8/8/8/5R2 w - - 0 1`: candidate `Rf8+` has a checked five-node success certificate. The line is `Rf8+ Rxf8 Qxh7#`. The sole legal defensive reply captures the white rook, reducing the attacker's declared material balance by five units; the subsequent mating capture recovers material. This establishes a delayed consequence despite an immediate concession. Another immediate mating option exists, so this fixture does not establish the necessity of the rook move.
- `4r2k/6pr/8/7Q/6K1/8/8/5R2 w - - 0 1`: moving the white king to g4 changes support. `Rf8+` has a checked 22-node failure certificate at the same remaining two-ply horizon. It does not force mate within that budget; full-game outcome remains unknown.

All **75 tests pass**, including the success/counterfactual contrast, unknown handling and forged-proof rejection. The initial handwritten examples used pawns that attacked the white king, making the proposed move illegal. The legality checks caught this; those examples were corrected before generating evidence. No experiment thresholds, neural equations or completed results were changed.

The original goal remains incomplete: these explanations must be integrated into a useful learning program, then frozen unfamiliar/counterfactual behavior must improve under matched controls and equal search bounds. Verified exchanges/compensation, sacrifices that are necessary to achieve the objective, calibrated evaluation-error diagnosis and delayed neural eligibility remain further work.
