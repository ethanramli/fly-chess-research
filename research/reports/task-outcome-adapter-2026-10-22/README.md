# Root-action outcome feedback repair

22 October 2026. Authorized work after explicit full-goal resumption. Software repair only; no new learner experiment, measured chess improvement, biological validation or transfer claim.

## Problem and change

The isolated `StockfishValueBrain.replayValue` required a child-action value even for `outcome-only`. It therefore skipped independently certified terminal successes and spent an irrelevant child-action sweep for ordinary outcome feedback.

Outcome-only now takes a separate early path: recheck the certificate, bind actor, reserve root-all-legal-plus-one neural presentations, obtain a fresh frozen-memory root ranking, and reuse `DualValencePuzzleBrain.replay` on the exact root/action. The receipt identifies chosen/alternative/tied review roles and uses `task-consequence-feedback-receipt-v1`. It contains no invented terminal prediction. Root-context, before-memory and fixed-wiring checks apply. The inherited replay helper accepts a validated bounded current override, preserving the adapter's declared maximum even when below1.5. Default helper behavior is unchanged.

The remaining engine-value branch is still experimental and isolated. Its child-max value proxy, root-cue credit, residual-dependent control skips and missing authentic campaign/schedule audit are unresolved. This repair does not implement combined outcome-plus-engine delivery or claim matched exposure between different objectives. A future task-only campaign must register matched task controls through the appropriate temporal/session path.

## Checks and preservation

- [Registered checks](../../../python%20actions/task-outcome-adapter-checks.json) pin13 source/test files and use one-process Node execution with the256 MiB heap.
- **31/31 passed**, exit0: `runs/python-actions/20261022T024602-df21030e/` contains config, intent, raw TAP and completion receipt.
- The new terminal check uses an eight-cell numerical fixture, missing engine analyses and a0.5 configured maximum. It checks success channel, exact root cue, fresh memory identity, root-only exposure, one update event and fixed wiring. The budget/actor check verifies no adaptation on failure. Existing engine-target, task-certificate, absent/disabled and default terminal-value-skip checks still pass.
- Sources [before repair](stockfish-value-brain-before.mjs), [shared helper before repair](dual-valence-puzzle-brain-before.mjs) and [tests before repair](stockfish-value-brain-test-before.mjs) are preserved. Active G0's source/dependency lists were inspected: none of these edited files is pinned there. No active scientific source or frozen protocol changed.

A draft test accidentally compared a memory hash with itself; it was corrected before execution to compare against the saved pre-feedback identity and to inspect actual encoder calls. Review also caught that reusing the inherited replay without a current override would ignore a smaller declared dose; that was corrected before execution and covered by the0.5 fixture. These were development mistakes, not observed graph failures.

## Next evidence required

Freeze a coherent task/representation/timing/control contract, integrate the existing transaction/persistence machinery and independent replay, and evaluate useful selective learning plus retention against controls after receiver prerequisites qualify. The31 software checks cannot satisfy those requirements or justify automatic stage advancement. Historical Astra prompts/reviews describe the previous source version and remain preserved as such.

### Quiet-action integration follow-up

Prepared quiet-action task-failure certificates now pass through one shared adapter-level verifier, reused by base/two-valence/Stockfish replay. The frozen generic verifier is unchanged.34 related checks pass (20261022T053053-1b4d8e11). [Exact scope, prior sources and limitations](quiet-action-integration/README.md). These are numerical/interface checks; the remaining engine-value alignment and campaign requirements above still apply.
