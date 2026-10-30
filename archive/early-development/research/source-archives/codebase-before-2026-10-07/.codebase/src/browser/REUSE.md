# Game Review reuse

Source: https://github.com/vietan0/chess-game-review
Revision: abb35f55f7e63cb4ada17ac05bfb4da31a2581fe
Upstream MIT notice is retained in UPSTREAM-LICENSE.txt.

Copied public/boards and public/pieces into assets (636,076 bytes total).
Adapted utils/translatePiece.ts and components/board/Coors.tsx to browser JavaScript.
Adapted the layered board and image rendering from Board.tsx/Pieces.tsx; move
navigation follows GameNav.tsx. These are ports, not unchanged React components.
The local application adds legal move input, promotions, game sessions, PGN export
and fly inference. No React runtime, Stockfish worker or analysis engine is loaded.

The model starts from seed 47 and anatomical initial recurrent magnitudes. For
each legal successor position, its first untrained output is evaluated serially.
White maximizes this output; Black minimizes it. Equal scores retain legal-move
enumeration order. This is a fixed one-ply readout policy, not a learned move head.
Candidate evaluation rests for approximately its compute time to pace CPU use.
