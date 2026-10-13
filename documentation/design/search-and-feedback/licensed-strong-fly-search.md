# Licensed strong-fly search comparison

2026-10-07. Engineering comparison, separate from endogenous learning. Reuses Carlo Esposito's MIT-licensed browser PUCT at commit3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf. See [source review](../../../research/literature/cesp99-calculation-2026-10-07/README.md) and [vendor attribution](../../../.codebase/src/search-and-feedback/vendor/cesp99/README.md).

The adapter retains all legal candidates, upstream selection/value perspective/backup/visit selection, and the current neural preferences. It injects no biological mapping, neural delta or pretrained weights. Current leaf evaluation remains explicitly neutral0; single-pass board policy and learned position value are missing. Reproducing search mechanics does not reproduce cesp99's trained model strength or speed.

Bounds cover simulations, graph evaluations, nodes, traversal depth and a soft deadline. An unfinished traversal is discarded without backup; the scratch board is discarded on interruption. Real position/history and persistent neural memory must remain frozen. Completed traces record move sequence, leaf position, estimated value and task; they are not verified feedback. Unknown verification supplies no teaching event. Full trace replay and independent consequence certificates remain required before integration into teaching.

Validation: all110 tests pass, including mate perspective, quiet alternatives, evaluation/depth interruption and memory mutation rejection. A separate test dynamically loads the archived unmodified upstream module (only its softmax dependency path is redirected) and compares move, full root visits/priors/values and simulation count exactly with the adapter under nonbinding bounds. This establishes software parity on one fixture, not a graph speed or strength comparison.

Next graph comparison must freeze sources, graph/annotations, memory checkpoint, encoder/readout, task, candidate set, evaluation/simulation/depth/node budgets and pacing. Compare baseline versus learned memory with learning disabled; preserve complete raw traces, certificates and resource metrics. All-legal versus forcing-shortlist searches are different workloads and must not be labeled pure implementation speedups. Keep graph experiments serial, heap256/duty0.5 and768MiB RSS/256MiB free guards.

No graph comparison has run yet. Learning/transfer acceptance remains separate from search reuse.

2026-10-07 graph comparison completed: both searches make identical choices and use equal candidate presentations across four paired cases. Independent certificate/trace/replay audit passes. Familiar repair survives; counterfactual fails. No speedup, learned value or reasoning improvement. [Evidence](../../../research/reports/licensed-search-comparison-v1-2026-10-07/README.md).
