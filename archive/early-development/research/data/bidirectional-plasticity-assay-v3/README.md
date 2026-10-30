# Bidirectional plasticity assay protocol v3

V3 preserves [v1](../bidirectional-plasticity-assay-v1/README.md) and [v2](../bidirectional-plasticity-assay-v2/README.md), adding no-teaching retention probes and a longer alternating schedule. It is frozen as a development protocol; it is not authorization to run.

## Design

The schedule has 28 verified teaching presentations balanced across the two registered cue outcomes, 16 long-alternation presentations with delays cycling 0–3, and two unaided retention probes. All five arms receive the same ordered experiences, delays, probe positions, assessment budget and exposure opportunity. Probe slots carry verified context and unaided ranking but deliver no teaching channel in any arm. The shuffled plan is seeded, preserves 14/14 channel dose across teachable slots, and records its agreement count (12/28 for the registered seed).

The coordinator writes bounded per-arm JSONL, snapshots physiological/neural-transient/eligibility state and randomization, and persists pending/applied receipts in atomic checkpoints. Resume requires identity match, reads only completed checkpoint publications, copies acknowledged records into a new output directory, and recovers an applied receipt without a second delivery. The independent [post-run auditor](../../../.codebase/scripts/puzzle-learning/audit-bidirectional-plasticity-assay.mjs) rereads certificates, signal assignments, exposure parity, checkpoint identity, and behavioral/resource gates. Ten fixture groups cover these contracts; no graph adapter is registered.

## Blockers

The pinned static signal-and-anatomy report remains **blocked**. Precisely: the pinned upstream equation accepts signed modulation, but the current mapped learner rectifies DAN activity to above-rest excess; no unrectified per-cell DAN trace with a justified tonic baseline is pinned for this graph; the mapped plastic-edge groups lack receptor and synapse-coordinate identities needed to defend separate drives; and no source-backed finite-timescale stabilization state is mapped to these targets. The model, encoder, readout, policy and adapter identities are also unresolved. No independently certified contradictory outcomes for the same cue in separate contexts are available, so the two-direction finite-reversal gate remains blocked. The registered schedule therefore tests repeated associations, acquisition, coexistence, delayed exposure and retention probes only. Do not interpret this as a completed mechanism assay.

The protocol pins graph, source/model files, memory, train data, checker, runtime, encoder/readout/policy placeholders, protocol digest, seeds, search settings and algorithms. Train, validation and final identifiers are disjoint; only the train family is inspected. No final family is read for tuning or selection.

## Checks

Fixture checks:

```powershell
node .codebase/tests/puzzle-learning/plasticity-mechanism-assay.test.mjs
```

Required static preflight (expected to refuse while blocked):

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs --preflight --anatomy-report research/reports/plasticity-signal-anatomy-preflight-v2-2026-10-08.json
```

## Future command — not run

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs --run --adapter C:\absolute\path\to\reviewed-assay-adapter.mjs --anatomy-report research\reports\plasticity-signal-anatomy-preflight-v2-2026-10-08.json --out runs\bidirectional-plasticity-assay-v3
```

**Not run.** The adapter path is a placeholder. The current report and identity/reversal gates fail preflight, and run mode repeats all pinned hash, certificate, mapping, resume and feasibility checks before adapter import. Future pacing is pinned to 256 MiB Node heap, 768 MiB RSS, 256 MiB free memory and CPU duty 0.5.

Post-run audit command form, also **not run**:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-bidirectional-plasticity-assay.mjs --run runs\bidirectional-plasticity-assay-v3 --anatomy-report research\reports\plasticity-signal-anatomy-preflight-v2-2026-10-08.json --out research\reports\bidirectional-plasticity-assay-v3-audit.json
```

