# Positive feedback association V2: balanced-control prerequisite passed

2026-10-06, prepared before any V2 full-graph conditioning. This is an engineering control-design follow-up, not a new source-derived biological mechanism. The [source-backed interface note](positive-feedback-v1.md) and [source register](../../../research/literature/source-solution-register.md) retain the biological evidence and its limitations.

V1 completed and independently audited, but failed its full frozen gate. Informative acquisition and reversal choices succeeded in 6/6 seeds; acquisition versus shuffled feedback had four positive differences and two ties (one-sided sign-test p=0.0625, alpha=0.05). Two short acquisition permutations reproduced the informative schedule. Preserve that result, including [raw report](../../../research/reports/positive-channel-association-resumed-2026-10-06/report.json) and [resume audit](../../../research/reports/positive-channel-association-resumed-2026-10-06/audit-prefix.json). This observation motivates a separately declared control; it does not override V1's failure or prove that interference is absent.

## Frozen comparison

[Protocol](../../../research/data/positive-channel-association-v2/protocol.json) uses fresh seeds 16001, 16033, 16057, 16087, 16111, 16139. The five conditions, four acquisition/twelve reversal trials, encoder, mapped reinforcement populations, stimulation current, eight-update dynamics, plasticity equation, fixed readout, tolerance and alpha remain identical to V1. Both runner and independent auditor assert equality of these scientific settings against the pinned failed V1 report (SHA-256 `93176cbcb383a09e558d9619bd6d00108f64466355974325df9056f4364f7a66`).

Only the shuffled-control design changes: seeded Fisher-Yates permutations are accepted when each cue receives equal PAM02 and PPL103 pulse counts within each phase. Construction is bounded to 128 attempts, preflighted before loading the graph and selected solely by cue/channel counts. No neural results enter selection. This conditional shuffle removes cue-valence association and matches population totals; it is not an unconstrained random shuffle. Sequence/timing effects may still exist and must be reported.

Acceptance remains all six strict acquired/reversed choices, crossing the ranking boundary, phase effects above absent/shuffled controls at p<0.05, exact persistence and causal reset/restoration, disabled-plasticity invariance, fixed wiring/nonplastic state and independently verified after-update resumability. Punishment-only comparisons remain descriptive. No threshold, polarity, current or gate is changed in response to completed results.

## Execution and evidence

Run one full graph, sparse and serial:

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-positive-channel-v2.mjs --out research/reports/positive-channel-association-v2-2026-10-06 --cpu-duty 0.5
```

The independent auditor reconstructs cues, conditional schedules, local update arithmetic, population rates and gate calculations without importing the learning implementation. A separate pending-receipt replay must establish exact recovery without duplicating an update. Preserve raw reports, receipts, resource measurements and source hashes. Windows publication failures require recovery from the last published checkpoint into a fresh directory, with unchanged identities; partial checkpoints remain unacknowledged.

At preparation, two new schedule tests bring the suite to 82 passing tests. Full-graph results and independent audits are pending. This association task is a prerequisite only: it cannot establish useful puzzle learning, learned strategic evaluation, delayed credit assignment or unfamiliar/counterfactual reasoning. Do not integrate the positive channel into puzzle training as validated until the frozen gates and independent audits pass.

## 2026-10-06 completion: balanced positive-channel V2
The separately frozen full-graph V2 experiment is terminal and passes all seven recorded gates. Acquisition/reversal correct and ranking switch: 6/6 informative seeds. All four absent/shuffled effect comparisons: six positives, no ties, p=0.015625. Independent record and pending-receipt recovery audits pass 480 transitions/384 local updates; prefix exact with zero new evaluations. Report SHA-256 910e223612751face371cc59558b737ab4e0738bfae6b89baff2705f01f2acbb. Full invocation: 104.671875 MiB peak RSS, 442.1698092 s elapsed, 260.265 s CPU, 840 evaluations. This supersedes V2 pending statements, preserves V1's failure, and establishes a computational association prerequisite only. Useful puzzle learning and unfamiliar/counterfactual reasoning remain unproved. Next: a separate verified positive-channel puzzle condition, with matched controls and all-legal choice evidence. Raw evidence: research/reports/positive-channel-association-v2-2026-10-06/.
