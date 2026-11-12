# Experiment designs

Start with [current status](../current-status.md) to see which designs have been tested. Each topic below explains a part of the experiment, from presenting a chess position to deciding what the resulting scores mean. Individual pages identify proposals, approved protocols, and earlier designs.

<!-- directory-map -->
| Directory | Question it answers |
| --- | --- |
| [`research-goals/`](research-goals/README.md) | What is FlyChess trying to establish? Find the restart plan, the five-volume scope, and the criteria for applying or combining lessons on unfamiliar boards. |
| [`chess-input/`](chess-input/README.md) | What information does the model receive? Find the designs for encoding pieces, squares, and candidate moves, including earlier inputs that supplied chess cues. |
| [`search-and-feedback/`](search-and-feedback/README.md) | How does the teacher check what a move leads to? Find the search limits and the records the checker uses to verify a consequence before delivering feedback. |
| [`neural-learning/`](neural-learning/README.md) | What can change inside the model after feedback? Find candidate memory rules and tests of whether associations persist or adapt when feedback changes. |
| [`puzzle-learning/`](puzzle-learning/README.md) | How is an experiment staged? Find task definitions, practice schedules, feedback requirements, and the rules for keeping evaluation positions separate. |
| [`diagnostics/`](diagnostics/README.md) | How do we find out why a test behaved as it did? Find probes for what the model responds to and when it loses earlier learning. |
| [`supervised-baselines/`](supervised-baselines/README.md) | What can comparison models learn from labeled positions? Find trainer designs, their data requirements, and the limits of what those comparisons can establish. |
| [`evaluation-and-performance/`](evaluation-and-performance/README.md) | How do we measure playing strength and compute cost? Find rating plans, latency benchmarks, and run-time measurement designs. |
<!-- /directory-map -->

[Documentation guide](../README.md) · [Experiment reports](../../research/reports/README.md)
