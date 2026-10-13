# Bidirectional plasticity assay v4: repaired infrastructure

2026-10-09. V4 preserves v1-v3 protocols and the [reviewed v3 source snapshot](../../source-archives/bidirectional-plasticity-assay-v3-reviewed/manifest.json). It registers repaired infrastructure after the [independent review](../../reports/bidirectional-assay-infrastructure-review-2026-10-08/README.md). No learner training or prospective graph simulation has run. This development protocol remains blocked before a graph adapter can be imported.

## Executable software checks

```powershell
node --test .codebase/tests/puzzle-learning/plasticity-assay-repair.test.mjs
npm test
```

The software fixture executes the real coordinator, reviewed adapter loader and independent receipt-audit functions with inert counters. It verifies uninterrupted-versus-interrupted state/receipt equivalence at assessment, delivery and readout; rejects disabled physiology changes in each stage; rejects altered behavioral evidence even with a recomputed digest; separates same-action different-board criteria; matches cue dose, presentation counts and simulation steps; bounds evaluation work; recovers truncated unacknowledged log tails; and requires registered opposite-outcome contexts, shared measured cue identity and finite direction budgets for reversal. Its adapter is explicitly a counter fixture with no graph, neurons or learned chess policy. It is not eligible for the primary graph run.

## Adapter and persistence contract

The existing adapter interface remains `snapshot/restore/assess/deliver/readout`. The factory receives pinned identities and public model/encoder/readout configuration, runtime and budgets; it receives no teacher schedules, consequence labels or certificates. `assess` and `readout` return context-bound complete legal rankings, physiological memory hash, evaluation/presentation counts, cue input dose and simulation-step count. `deliver` receives public context/action and the declared channel/timing/disabled flag, returns bounded local eligibility/drives/gains/consequences and measured work/dose. Adapter stages must respect the supplied work limits and call the resource guard within bounded work chunks. A callback cannot forcibly interrupt an already running evaluation.

`physiological` snapshots must contain every persistent parameter/state; `neuralTransient` and `eligibility` contain the corresponding transient state. Disabled physiology is checked across the entire slot. All arms start from matched complete state. Real graph wiring/sign verification and complete serialization still require review of the future graph-backed adapter; counter fixtures cannot establish those properties.

Checkpoints record explicit assessed, delivered and applied stages. Resume restores completed neural stages and performs only unfinished work, rechecking teacher evidence before delivery. Acknowledged receipt bytes are SHA256-bound to the completed checkpoint. Resume copies exactly the committed JSONL prefix into a fresh directory; it preserves and excludes a partial unacknowledged tail. Applied receipts are published without a second delivery. Compact checkpoint JSON and aggregate bounds reduce unnecessary memory duplication. These checks cover software interruptions; power-loss durability and actual full-graph resource performance have not been measured.

## Behavioral evidence and gates

The v4 metric is `candidate-against-certified-opponents-v1`: a certified success action's score minus the highest certified failure action's score in the same board/history/task; for a certified failure action, the highest certified success score minus that action's score. Missing verified comparison evidence is unknown. The auditor derives margins and changes from saved pre/post rankings and rechecks certificates; the adapter supplies no authoritative margin. Context/action/task hashes identify criteria, with explicit registered associations for future reversal across distinct contexts. This is separation among certified development actions, not all-legal usefulness, calibrated value, biological validation or reasoning.

V4 retains the development exposure schedule (28 teaching slots and two no-teaching probes). The engineering threshold 0.01 now applies to the explicitly registered v4 metric, before any learner result. No historical v1-v3 gate or result was changed. The protocol pins entry points and local import dependencies as well as graph, annotation, source proof, dataset, package and runtime inputs.

## Remaining required stop gate

The static feasibility report is still blocked: no justified unrectified per-cell DAN trace/tonic baseline, defensible receptor/synapse-coordinate target identity, or mapped stabilization dynamics is available. Model/encoder/readout/policy/graph-adapter identities remain unresolved. No certified, encoder-bound two-direction reversal association is registered. The pinned audit report has not become biological evidence merely because the coordinator is fixed.

Static preflight:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs --preflight --anatomy-report research/reports/plasticity-signal-anatomy-preflight-v2-2026-10-08.json
```

Expected exit 1 while blocked. Run mode repeats all checks and refuses before adapter import or output-directory creation. Future command form, **not run**, requiring new supported inputs and a reviewed graph adapter in a newly registered protocol:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs --run --adapter C:\absolute\path\to\reviewed-assay-adapter.mjs --anatomy-report research/reports/plasticity-signal-anatomy-preflight-v2-2026-10-08.json --out runs\bidirectional-plasticity-assay-new-version --cpu-duty 0.5
```

The adapter path is a placeholder. V4 is frozen as a development artifact; do not remove blockers or refresh its hashes in place. Register a new protocol when supported inputs exist. [Repair report and evidence](../../reports/bidirectional-assay-repair-2026-10-08/README.md).
