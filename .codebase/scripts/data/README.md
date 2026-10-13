# Puzzle corpus tools

- [Lichess puzzle curator](curate-lichess-puzzles.mjs) streams the CC0 `.csv.zst` source with Node's built-in Zstandard decompressor and retains a bounded, seeded sample. It verifies the source solution line is legal from the supplied FEN, checks any source URL color/ply against the FEN mover/counters, assigns all puzzles from one source game to the same train/validation/final split, removes selected duplicate positions, and writes a provenance manifest.

The curator creates **candidate source data only**. It does not retrieve full game PGNs, verify that the source line is forced or uniquely best, produce alternative-move consequence certificates, or authorize a neural update. Its output explicitly records those limits. Full-game history and exact board/history binding must be restored before any history-sensitive teaching event. A verified certificate must then be created with an existing project verifier or a new independently audited task verifier.

The complete source archive is scanned as a stream. Memory use is bounded by at most `limit-per-split` rows per split plus one input/decompression buffer; the default is128 rows per split. The curator's output directories must be new and empty by construction; each JSONL file and the final manifest are published with rename.

Example after obtaining the Lichess archive:

```powershell
node --max-old-space-size=256 .codebase/scripts/data/curate-lichess-puzzles.mjs --input .cache/lichess_db_puzzle.csv.zst --out research/data/lichess-puzzle-candidates-v1 --limit-per-split 128 --min-rating 1200 --max-rating 2000 --themes fork
```

The filter above is only a sampling choice. Puzzle ratings/themes are not consequence quality labels or calibrated neural feedback. Freeze a separate experiment protocol, source bytes, task verifier, resource bounds, matched feedback controls and recovery audits before any graph run.
