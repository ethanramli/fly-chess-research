# Eyes v2: Eyes v1 plus the captured piece

Added 2026-11-03, before any eye test. Identity `a35d70a8a13b3dc6030072435458f3c9d8b254fe77e311a9f196f988ec3e36d9` on graph `.cache/full.npz` (SHA256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`). Code: [eyes-v2.mjs](../../../.codebase/src/chess-input/eyes-v2.mjs). Tests: [eyes-v2.test.mjs](../../../.codebase/tests/chess-input/eyes-v2.test.mjs). Decision record: [restart plan revision 2026-11-03](../research-goals/restart-plan-revision-2026-11-03.md), problem 1.

## Why it exists

[Eyes v1](eyes-v1.md) shows the board after the proposed move. A captured piece is already gone from that board. So a rook moving from a1 to a4 gave exactly the same eye input whether a4 held a black pawn (a capture) or was empty (a quiet move), although the task gives those moves opposite answers. The [peer review of 2026-11-02](../../../research/reports/overnight-peer-review-2026-11-02/ranked-problems.md) found this. With identical input and identical memory, the fly has no information to tell the two cases apart.

## What it does

1. Everything Eyes v1 does, unchanged: the same photoreceptor placement, pictures, brightness for the fly's pieces (1) and the opponent's pieces (0.5), and the brighter move marks (0.5).
2. When the move captures, the captured piece's picture is also drawn at brightness 0.25 [choice] on the square it was removed from. For en passant that is the passed pawn's square, not the landing square. The value is dimmer than any piece still on the board.
3. Moves that do not capture give exactly the Eyes v1 input.

It states no attack, pin, legality or safety fact. Whether a piece was captured is a fact of the board before the move, which the fly would see in any real game. Legal moves still come from outside, as in Eyes v1.

## The collision check

`inputCollisions(eyes, items)` groups items (board, proposed move, certified answer) whose eye input is identical, and reports each group whose answers differ. Every task set must give zero groups before use. Under Eyes v1 the review's example gives one group; under Eyes v2 it gives none, on both the test retina and the real graph's retina.

## Limits

1. Eyes v2 does not show castling rights, en-passant rights or move history. The safe-capture answer does not depend on them; any later task must pass the collision check.
2. The 0.25 brightness is an engineering choice, fixed before any data. It is not a measured model of fly vision.
3. Eyes v1 stays frozen for the earlier runs that pinned it.

[Chess input topics](README.md) · [Current status](../../current-status.md)
