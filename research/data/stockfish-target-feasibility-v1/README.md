# Stockfish target feasibility v1

Frozen before real-engine analysis on 2026-10-07. [Protocol](protocol.json) pins Stockfish 19's unmodified official Windows universal executable, supplied release metadata/license, collector, independent auditor, certificate sources, resolved chess.js dependency and audited neural report. The engine's embedded network is covered by the executable hash; no pretrained weights enter the fly.

Two inspected training-only positions, all 62 legal moves, each at 10,000 and 50,000 engine nodes. Threads 1, Hash 16 MiB, MultiPV 1, UCI_ShowWDL true, unrestricted strength, no tablebases configured, cleared hash before each candidate. Original FEN plus candidate move preserves the child transition. Score polarity is inverted from child side-to-move to original actor. Latest bounded/incomplete scores are unavailable and cannot teach. Node counts can slightly overshoot the requested budget, as preserved in raw output; mate searches can finish earlier. A 30-second process deadline and 1 MiB transcript bound fail closed.

Hypothesis tested here: full-game WDL gives a strictly higher target to the certified mate-deadline success than every failure on these fixtures, at both budgets. This is a feasibility prerequisite, not a test of the causal benefit of Stockfish training. The separate `tanh(MBON12-MBON01)` readout uses a fixed unfitted scale of 1 and preserves action ordering. Its retrospective mean squared error is descriptive and does not establish calibrated neural value.

Run from repository root:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/probe-stockfish-targets.mjs
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-stockfish-targets.mjs
```

The original auditor's signed-zero serialization failure is preserved. For the completed record, run `audit-stockfish-targets-json-zero.mjs`; its independent source hash is bound in the audit. No frozen collector/protocol/input pins were changed.

Atomic per-candidate records permit collection to resume without reanalyzing acknowledged candidates. Source/protocol identities must match. `RECORDED.json` is not an independent audit; interpretation requires hash-bound `COMPLETE.json`. No graph is loaded, no neural feedback is delivered and no memory changes. Combined parent/engine RSS and free memory are checked between setup and search operations; reported RSS is sampled, not a continuous peak. Source registration: [register](../../literature/source-solution-register.md). [Output](../../reports/stockfish-target-feasibility-v1-2026-10-07/README.md).

Preparation failure: initial PowerShell UTF-8 serialization included a BOM rejected by JSON.parse, before output creation or engine launch. The protocol was rewritten without BOM before experimental execution; no source hash checks were bypassed.
