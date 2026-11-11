# Seeing test v1, 2026-11-03: the fly's brain sees the piece

**Result: the brain's memory cells told a white knight from a white bishop on e4 in 48 of 48 real positions. Outcome "sees" under the rule fixed before the run.**

Researcher instruction: "just make a simple test that tell you whethe ror not the eyes work, not whetehr or not the fly can count pieces".

## What ran

- 48 real positions, one from each of 48 different training-bucket Lichess games (ply 16 or later, White to move, e4 empty). Each position was made twice, identical except for a white knight or a white bishop on e4. Both versions have the same number of pieces and the same proposed move, and no chess judgement is needed.
- Input: Eyes v2 on the real retina. Each board got one full pass through the fly's brain: 96 passes, 86 seconds. Memory unchanged.
- A decoder (the same leave-one-game-out linear decoder as Eye test v2) learned from 47 pairs and named the knight board in the 48th.
- Rule fixed before the run: brain at least 44/48 means the fly sees; 30/48 or less means the image is lost.
- Command: `fly.cmd --config "python actions/seeing-test-v1-step.json" start seeing`. Code: `.codebase/scripts/neural-learning/run-seeing-test-v1.mjs`. Raw output: [summary](../../../runs/seeing-test-2026-11-03/seeing-test-v1/summary.json), [pairs](../../../runs/seeing-test-2026-11-03/seeing-test-v1/pairs.jsonl).

## Results

| Decoder reads | Score | Chance |
|---|---|---|
| Raw eye input (photoreceptors) | 48/48 | 24/48 |
| Brain's memory cells (5,177 Kenyon cells) | **48/48** | 24/48 |

## What it means

1. **The eyes work, and the image reaches the memory cells.** The shape of one piece on one square, among real surrounding positions, is fully readable from the brain's memory cells.
2. So the failure of Eye test v2 (brain 26/48) was not blindness. It was the chess judgement step ("can the opponent take back?"), which needs more than seeing.

## Limits

1. One square (e4), one shape pair (knight versus bishop), one colour. Other squares, piece pairs and positions were not tested.
2. The decoder is fitted from the brain's response with labels. This shows the information is present and linearly readable, not that the fly uses it to choose moves.
3. The model is deterministic, so there is no noise. A real fly's response is noisy.

## Correction 2026-11-09: Eye test v2 failure cause

The statement above that Eye test v2 failed at the chess-judgment step is unsupported. Eye test v2's own token control failed its pipeline threshold, so the frozen rule says that run does not count as evidence either way. This separate seeing test shows that one piece pair on e4 is linearly readable from memory-cell activity; it does not establish why Eye test v2 scored 26/48 or prove that the failure was due to chess judgment. The earlier interpretation is preserved here as a dated correction. See the [Eye test v2 report](../eye-test-v2-2026-11-03/README.md).
