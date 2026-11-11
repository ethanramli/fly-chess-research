# Source code

This folder contains the browser interface and the chess-input, learning, runtime, evaluation, search, and baseline modules. Start with the topic overview before following a module into its tests; [return to the code guide](../README.md) for project-wide navigation.

<!-- directory-map -->
- [browser/](browser/): the playable browser page, its styles and script, plus reuse and upstream license notes.
- [chess-input/](chess-input/README.md): board and move encodings used to present chess positions to the model.
- [evaluation-and-performance/](evaluation-and-performance/README.md): policy, opponent adapters, and FlyBench rating and outcome helpers.
- [neural-learning/](neural-learning/README.md): memory, readout, plasticity, and assay components, with evidence limits described in its overview.
- [puzzle-learning/](puzzle-learning/): puzzle curricula, training sessions, assessments, and feedback components.
- [runtime/](runtime/): circuit, graph, sparse accumulation, checkpoint, and storage code.
- [search-and-feedback/](search-and-feedback/): puzzle search, candidate review, and consequence or feedback certificates.
- [supervised-baselines/](supervised-baselines/): paired models, position handling, optimizer, and trainer for supervised comparisons.
<!-- /directory-map -->
