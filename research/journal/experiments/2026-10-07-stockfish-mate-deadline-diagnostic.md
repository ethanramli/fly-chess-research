# Stockfish mate-deadline diagnostic

The user asked whether Stockfish feedback had improved the direction or speed of training. The earlier full-game WDL analysis was record-only and failed to distinguish several deadline failures from the intended mate. I therefore reanalyzed the same independently audited raw candidates without running another engine or graph condition.

The saved exact mate scores provide a limited useful signal: across both inspected boards and both node budgets, the verified success is actor-relative mate `+1`; the one exact mate-scored failure per panel is `+3`. This shows Stockfish can expose a deadline-relevant distinction on those candidates even when WDL is saturated. However, 74 failure candidates have exact centipawn scores rather than forced-mate scores, and 42 candidate records have no usable exact target. We cannot combine mate and centipawn scores into a complete calibrated all-legal ranking from these observations.

No neural feedback or memory update ran. This is target-feasibility evidence only. The next step is to freeze a task-aware target and its mapping through the existing pathway, then run matched training/control conditions and evaluate disjoint transfer. Reference: [diagnostic report](../../../archive/early-development/research/reports/stockfish-mate-deadline-diagnostic-v1-2026-10-07/README.md).
