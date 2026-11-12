# Command-line tools

Scripts are executable tools for setup, software checks, demos, and research tasks. Start with the [code guide](../README.md) for prerequisites and command boundaries; choose a topic below to find its commands and the design or protocol they follow.

## Find a script by task

<!-- directory-map -->
- [Browser](browser/README.md) — start the separate, untrained browser player.
- [Chess input](chess-input/README.md) — inspect and validate how board positions become model inputs.
- [Data](data/README.md) — prepare and audit chess puzzle source data; these tools do not authorize training.
- [Diagnostics](diagnostics/README.md) — inspect saved records, mechanisms, and recovery behavior.
- [Evaluation and performance](evaluation-and-performance/README.md) — evaluate outputs and measure runtime costs.
- [Neural learning](neural-learning/README.md) — register, run, and audit learning and memory protocols.
- [Puzzle learning](puzzle-learning/README.md) — prepare, run, and audit puzzle-learning procedures.
- [Runtime](runtime/README.md) — fetch graph data and inspect source identity or runtime support.
- [Search and feedback](search-and-feedback/README.md) — search chess choices and construct or audit feedback.
- [Supervised baselines](supervised-baselines/README.md) — train and evaluate comparison models.
<!-- /directory-map -->

## Choose the right kind of command

- **Setup:** from the repository root, `npm install` installs dependencies and `npm run fetch:graph` retrieves the graph data. See [setup details](../README.md).
- **Software checks:** `npm test` checks software behavior; `npm run test:flybench` runs the FlyBench test subset. Neither is a learning or reasoning evaluation.
- **Demo:** `npm run play` starts a separate browser player using an untrained one-ply policy. It demonstrates the interface, not learned play.
- **Research:** use an experiment runner only through its documented registration and protocol. Check [current research status](../../documentation/current-status.md) for active runs, and preserve each protocol's source identity, resource limits, and output directory. Completed runs and frozen output paths must not be rerun; audits and diagnostics have only the scope stated in their guide.

Most experiment commands require the repository root as the working directory. Topic guides link to design notes and evidence records where relevant. For commands with repeated curriculum steps, use the [Python command interface](../../documentation/design/puzzle-learning/python-curriculum-actions.md).
