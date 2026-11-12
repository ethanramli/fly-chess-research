# FlyChess setup and commands

This folder contains FlyChess’s JavaScript implementation, executable commands, and software tests. Start with setup below to play the demo, or use the [code map](#code-map) to trace a model component or experiment command. The [project README](../README.md#repository-map) shows where designs and results live.

## Set up

Run these from the repository root with Node.js 22 or newer. Install the pinned dependencies, then download the file that describes how the fly's neurons are connected:

```powershell
npm install
npm run fetch:graph
```

The downloaded file is stored under `.cache/` on your computer.

## Software checks

Run the automated software suite with `npm test`. It checks code behavior and contracts; it does not measure whether the model learns or reasons. `npm run test:flybench` runs the FlyBench subset.

## Demo

Run `npm run play`, then open the address it prints in your browser. The default is `http://127.0.0.1:4173`. The demo uses an untrained model that looks one move ahead. It shows how the interface and move selection work.

The record-only engineering fixture writes a feedback record without neural learning. Choose a new output directory for each run:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/puzzle-round.mjs --out runs/my-record-only-round --cpu-duty 0.5
```

See the [fixture contract and limits](../documentation/design/puzzle-learning/record-only-round.md). Check for active graph experiments before starting another run.

## Research runs

The scripts include registered experiment runners, independent auditors, data preparation, diagnostics, and historical command support. Do not treat `npm test`, profiling, a completed procedure, or an audit as evidence beyond what its protocol measures. Before any experiment, find its registration and protocol from the relevant script guide, check [current research status](../documentation/current-status.md) for active work, and follow the protocol's source identity, resource, and output-path rules. Full-graph experiments run serially. For repeated curriculum operations, use the [Python command interface](../documentation/design/puzzle-learning/python-curriculum-actions.md), which wraps the same runners with an editable step file and logs.

The supervised training runner is an engineering baseline, not endogenous biological learning. It uses a historical dataset with the current trainer and does not reproduce the archived run. Its entry point is `npm run train`; see [baseline design and limits](../documentation/design/supervised-baselines/low-memory-training.md) before using it. `npm run evaluate -- --checkpoint DIRECTORY --fen "FEN"` evaluates criterion predictions without move search.

## Code map

<!-- directory-map -->
| Directory | What it contains |
| --- | --- |
| [`src/`](src/README.md) | The implementation. Start in [`runtime/`](src/runtime/README.md) for the circuit and graph, [`chess-input/`](src/chess-input/README.md) for how a board becomes input, or [`neural-learning/`](src/neural-learning/README.md) for memory and how activity becomes move scores. [`browser/`](src/browser/README.md) holds the demo page. |
| [`scripts/`](scripts/README.md) | The entry points that call the implementation. Use the topic guides to find graph downloads, puzzle preparation, experiment runners, benchmarks, and independent audit commands. For registered runs managed through Python, use the [run command guide](../python%20actions/README.md). |
| [`tests/`](tests/README.md) | Automated checks for expected code behavior, such as saving and restoring a checkpoint or verifying a feedback record. Test directories follow the topics in the source tree. For measured learning outcomes, use the [research reports](../research/reports/README.md). |
<!-- /directory-map -->

The [relocation map](relocation-map.json) connects previous code paths to their current locations. Vendored CESP99 search code and its license are under `src/search-and-feedback/vendor/cesp99/`, not in a top-level vendor folder; read its [license and provenance](src/search-and-feedback/vendor/cesp99/README.md).

The [pre-move source snapshot](../archive/early-development/research/source-archives/codebase-before-2026-10-07/README.md) preserves original bytes and a SHA-256 manifest. Frozen experiments and checkpoint resumes require their matching archived code in a separate checkout; relocated imports change live source identities. New experiments need separately reviewed source pins.
