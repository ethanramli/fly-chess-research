# Shared-memory multi-context coverage protocol

Frozen 2026-10-07. The protocol tests whether one shared, from-scratch neural memory can repair and retain all-legal choices across two related smothered-mate training positions. The teacher supplies only independently verified consequences after a choice; the neural receiver performs the existing modeled adaptation. Absent, shuffled and disabled conditions replay the same context/action/proof sequence.

The positions, positive alternatives, graph, annotations, mapping, readouts, model and memory settings, dependencies, prerequisite audits, full source closure, training slot budget and evaluation search are pinned in `protocol.json`. Both positions are explicitly training-only and final-test-ineligible. They share one motif family, so this is a same-family interference/retention experiment, not transfer.

Preflight checks the frozen hashes, required audits, resolved chess.js dependency, train-only declarations, balanced cue construction and independently verified positive alternatives before graph initialization:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-multi-context-coverage.mjs --preflight --cpu-duty 0.5
```

The main run uses one serial graph instance and the frozen resource guards:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-multi-context-coverage.mjs --out research/reports/shared-memory-multi-context-coverage-v1-2026-10-07 --cpu-duty 0.5 --max-events 128
```

After terminal publication, independently audit the report and atomically publish `audit.json` plus `COMPLETE`:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-multi-context-coverage-independent.mjs --run research/reports/shared-memory-multi-context-coverage-v1-2026-10-07
```

Unknown verification supplies no event. Keep every legal move available. The audit must pass proof, full-ranking, exact matched-exposure, channel, recurrence, memory-continuity, reset/restore, fixed-state, and fixed-budget-search checks before interpreting outcome gates. Preserve failures and interruption artifacts. Search estimates and correct moves alone do not establish verified teaching or reasoning.
