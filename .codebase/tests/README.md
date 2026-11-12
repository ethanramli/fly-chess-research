# Test guide

This folder contains software checks grouped by the code they exercise, plus a small set of data-integrity checks. Read the topic overview before relying on a test result; these checks establish only the behavior they cover. Return to the [code guide](../README.md) for project-wide navigation.

<!-- directory-map -->
- [chess-input/](chess-input/README.md): checks for board and move encodings, including Eyes and public cue variants.
- [data/](data/): checks that audit synthetic Lichess data families and exclude older games.
- [evaluation-and-performance/](evaluation-and-performance/): the FlyBench test for ratings, outcomes, UCI handling, and bounded synthetic-player integration.
- [neural-learning/](neural-learning/README.md): checks for memory, readouts, learning components, and evidence-recording tools; passing checks do not establish useful learning.
- [puzzle-learning/](puzzle-learning/README.md): checks for puzzle tasks, curricula, assessment, and feedback behavior.
- [runtime/](runtime/README.md): checks for circuits, storage, checkpoints, source closure, and runtime pipelines.
- [search-and-feedback/](search-and-feedback/README.md): checks for puzzle search, candidate review, certificates, and feedback.
- [supervised-baselines/](supervised-baselines/README.md): checks for the supervised trainer.
<!-- /directory-map -->

- [FlyBench software checks](evaluation-and-performance/flybench.test.mjs): Glicko, outcomes, UCI and bounded synthetic-player integration; npm run test:flybench.
