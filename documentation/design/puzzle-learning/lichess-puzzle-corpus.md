# Lichess puzzle corpus as a source of candidate experiences

Lichess publishes its puzzle database under CC0. The current published row schema contains `PuzzleId`, `FEN`, `Moves`, puzzle rating metadata, themes, source `GameUrl`, opening tags and a daily date. The position in `FEN` is before the opponent's setup move; `Moves[0]` is that move and `Moves[1]` begins the solver's line. Lichess reports that the puzzles were selected from analyzed games and reanalyzed with Stockfish. These facts make the corpus a practical source of varied candidate positions and solution lines.

## What the corpus can and cannot teach

Lichess documents the solver moves on each solution line as “only moves,” with an exception that mate-in-one puzzles may have several mating moves. This is a useful source-side curation claim and lets us prioritize the supplied line when constructing a bounded teacher check. The row still contains no certificate, alternative-move analysis or proof transcript, so the claim alone does not meet our independent consequence gate or explain a failure at the resolution of the task. Rating, popularity and themes can guide stratified sampling; none is a verified consequence or calibrated quality target. Stockfish's role in source production is provenance, not an independent certificate attached to a particular teaching event.

The supplied FEN captures the current board, side to move, castling rights, en-passant square and move counters. It does not encode the full path that led to the position or repetition counts. The source game URL identifies a game and ply, but the local importer does not fetch that game. Its generated rows therefore remain ineligible for teaching until the complete game PGN has been retrieved, the puzzle setup and solver positions have been matched to it, and the relevant history has been bound into the task evidence.

For a small development sample, Lichess's official `PuzzleAndGame` API response includes a game PGN and puzzle fields such as FEN, last move, solution and initial ply. This offers a route to check complete history without first obtaining the full archive. The batch endpoint allows at most50 puzzles but explicitly says not to enumerate puzzles for mass download; use one bounded batch only for a development fixture, and use the CC0 archive for corpus-scale work. Require the PGN replay to reach the supplied puzzle FEN and match the last move before treating history as resolved. The endpoint's `initialPly` meaning must also be cross-checked against the replay rather than assumed.

## Bounded import contract

`.codebase/scripts/data/curate-lichess-puzzles.mjs` uses Node's built-in Zstandard stream decompressor and `readline`; it does not load the multi-million-row archive into RAM. A seeded reservoir sample, capped at4,096 rows per split, is assigned by a stable hash of source game ID: 80% train, 10% validation and 10% final. All sampled puzzles from one game stay in one split. Exact duplicate post-setup positions across selected splits and duplicate puzzle IDs are discarded. This prevents direct same-game and exact-position leakage in the retained sample; it does not detect every thematic, transpositional or near-position family overlap.

Each output row preserves the source line and metadata, replays every UCI move for legality, checks any source URL orientation and ply against the side/move counters in the source FEN, records source game identity, and explicitly marks full history and consequence certificates unresolved. The manifest records the compressed input hash, curator hash, Node version, filters, seed, split counts and output hashes. A fresh output directory is required. This is corpus preparation only; no neural activity or learning occurs.

## Required next stage before training

1. Retrieve each selected game's full PGN under reasonable Lichess API limits; verify the recorded FEN, setup move, solver side and puzzle ply against the original game.
2. Choose a narrow, explicit task criterion and bounded calculation/search budget. Recompute all relevant legal alternatives or a complete certificate within that criterion. Reject exhausted or ambiguous verification as unknown.
3. Bind each event to the exact game history, board, chosen candidate, unaided learner ranking, criterion and independent consequence certificate. Keep the solution line out of the pre-feedback ranking.
4. Freeze train/validation/final families and all hashes before model evaluation. Use training only for targeting, validation only for declared checkpoint gates, and keep final sealed until the independent audit.
5. Compare the informative arm with matched absent, count-balanced shuffled and disabled-plasticity controls. Measure error correction and preserved correct choices separately, then require retention and unfamiliar/counterfactual transfer.

The source provides breadth; these verification and feedback stages provide the teaching evidence. Adding puzzles alone does not improve the quality of a neural update. A Lichess puzzle transfer result would still be narrower than general chess reasoning until all-legal choice, fixed-search-budget and counterfactual gates pass.

## Source and implementation status

Primary source and access coverage are recorded in the [source-to-solution register](../../../research/literature/source-solution-register.md). The CSV importer is implemented and syntax-checked. The 293 MiB archive download was stopped after only32 KiB arrived in about50 seconds. One request for a bounded10-puzzle API development batch also returned an empty reply; no API payload or puzzle sample was received. No full game history has been locally replayed, no certificates have been constructed, and no graph experiment has used this corpus.
