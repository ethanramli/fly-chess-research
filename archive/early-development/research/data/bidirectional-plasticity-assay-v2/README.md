# Bidirectional plasticity assay protocol v2

This is a dated correction to [v1](../bidirectional-plasticity-assay-v1/README.md). V1 and its protocol bytes remain preserved. V2 adds fixed per-assessment evaluation budgets and fixes the prospective runner contract so it repeats complete preflight before any adapter import. It retains the narrow, one-reply capture-retention fixture and does not introduce contradictory task-context examples.

## Status

The static preflight verifies two exact training-panel experiences and rejects the unknown fixture for teaching. Seeded controls match the ordered cue schedule and delays. The static feasibility report is pinned by hash and remains **blocked**. No reviewed graph adapter exists; model, encoder, readout, policy, and adapter identities remain unresolved. The protocol therefore cannot run.

The current dataset does not support independently certified contradictory outcomes for the same measured cue in separate task contexts. The protocol's finite-reversal gate is explicitly blocked; no reversal success is claimed. The coordinator/auditor can record per-phase results and fail missing forward/back reversal evidence, but an assay schedule with valid reversal certificates remains a scientific prerequisite.

Protocol hash: recorded in `protocol.json`. Feasibility report: [static source/anatomy audit](../../reports/plasticity-signal-anatomy-preflight-v2-2026-10-08.json). The report inspected annotation joins and existing sparse edge signs only; it did not run neural activity or graph inference.

## Static checks

Fixture-only tests: `node .codebase/tests/puzzle-learning/plasticity-mechanism-assay.test.mjs`.

Preflight command, expected to exit nonzero while blockers remain:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs --preflight --anatomy-report research/reports/plasticity-signal-anatomy-preflight-v2-2026-10-08.json
```

## Future assay command — not run

The prospective command is intentionally unavailable until the report passes, missing identities are pinned, a reviewed adapter is registered, and a reversal-capable certified schedule is frozen. Its form is:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs --run --adapter C:\absolute\path\to\reviewed-assay-adapter.mjs --anatomy-report research\reports\plasticity-signal-anatomy-preflight-v2-2026-10-08.json --out runs\bidirectional-plasticity-assay-v2
```

**Not run.** The example adapter path is not present; the feasibility report is blocked; execution currently refuses. The protocol fixes future CPU duty at 0.5 and the runner applies that pacing internally.
