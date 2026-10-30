# C01 six-piece counterfactual development candidate v1

This is an exploratory **training-development candidate only**. Its outcomes were inspected during design; it must never be placed in validation or final data and is not a frozen curriculum family.

Two six-piece positions preserve material, the white queen, the two black pawn targets and the two probe actions. Moving the single black rook from e1 to e8 reverses both independently checked one-ply recapture outcomes. The position below e1 has `e4e3` fail and `e4e5` succeed; the position with the rook above has the opposite result. In each case, the other target pawn blocks the rook's line to the surviving queen. This is a compact blocker/defender counterfactual, not an overall move-quality judgment.

`generate.mjs` independently certifies every legal action, checks all-legal cue encoding with the actual 693-KC mapping and three frozen projection seeds, and writes the raw proofs and verification record. `audit.mjs` separately replays every certificate, checks all 156 board/action/seed cue presentations, verifies the outcome reversal and source hashes, and writes `audit.json`. Both are static software checks; neither loads neural activity, runs the graph or demonstrates learning.

The candidate may be considered for training after comparison with the full C01 family criteria. Do not reuse it as validation/final evidence or count it as a complete family. No external puzzle solution was imported. Previously trained capture-retention data v2/v3 remains historical and is not reused here.
