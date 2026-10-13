# Code guide

All commands below run from the repository root with Node 22 or newer. [Current research status](../documentation/current-status.md) distinguishes implementation from scientific results. Check for an active full-graph experiment before launching another.

| Folder | Contents |
|---|---|
| [scripts](scripts/README.md) | CLI runners, independent auditors, fetching and profiling |
| [src](src/README.md) | Sparse serial graph, learning, encoding, search and persistence modules |
| [tests](tests/README.md) | Software checks for numerical behavior and contracts |
| [vendor](vendor/README.md) | Vendored assets and their existing licenses |

```powershell
npm run fetch:graph
npm test
npm run benchmark
```

## Engineering fixture

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/puzzle-round.mjs --out runs/my-record-only-round --cpu-duty 0.5
```

Records feedback without neural learning. [Round contract](../documentation/design/puzzle-learning/record-only-round.md).

## Supervised comparison

```powershell
node --max-old-space-size=256 .codebase/scripts/supervised-baselines/train-pilot.mjs --dataset research/data/coverage-pilot-v2 --optimizer adam --learning-rate 0.001 --cpu-duty 0.5 --shuffle-buffer 24 --out runs/my-training-run --epochs 1 --max-pairs 169
```

This is an Adam engineering baseline, not endogenous biological learning. Resume into a new directory with --resume PATH and unchanged identities/settings. [Memory and baseline design](../documentation/design/supervised-baselines/low-memory-training.md).

## Other entry points

- npm run play: separate browser player using an untrained one-ply policy.
- npm run evaluate -- --checkpoint DIRECTORY --fen "FEN": criterion predictions, without move search.
- validate-compartment-input.mjs / audit-compartment-input.mjs: frozen association comparison and independent receipt/recovery audit; use [the pinned protocol](../research/data/compartment-input-association-v1/protocol.json), not improvised settings.

Maintain sparse one-position execution, 768 MiB RSS / 256 MiB free-memory guards, atomic resumability and serial full-graph experiments. Numerical/software passes are distinct from biological validation and reasoning.

## Topic navigation and frozen sources

The [source](src/README.md), [command](scripts/README.md) and [test](tests/README.md) guides group files by the same topics as the documentation: neural learning, chess input, puzzle learning, search and feedback, diagnostics, evaluation and performance, and supervised baselines. Shared graph/storage utilities live in runtime; the browser player has its own folder.

[Relocation map](relocation-map.json) records every previous and current code path. Historical commands in dated notes remain historical; consult the map for current entry points.

[Pre-move source snapshot](../research/source-archives/codebase-before-2026-10-07/README.md) preserves exact original bytes with a SHA-256 manifest. Existing frozen protocols and report source archives remain unchanged. Relocated imports change live source identities: frozen experiments and checkpoint resumes require their matching archived code in a separate checkout, rather than bypassing provenance checks. New experiments require separately reviewed source pins.
