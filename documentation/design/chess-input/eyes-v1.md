# Eyes v1: the board shown to the modelled photoreceptors

Frozen 2026-10-31, before any eye test. Identity `5ec27466a30d29208afb431f48ebc7ab4bcbfe29cb31296a4b556abb75290cff`, on graph `.cache/full.npz` SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`. Code: [eyes-v1.mjs](../../../.codebase/src/chess-input/eyes-v1.mjs). Evidence: [report](../../../research/reports/eyes-v1-2026-10-31/README.md). It implements [restart plan section 3](../research-goals/restart-plan-2026-10-30.md).

Eyes v1 replaces the token line as the current input: input cue v1-v4 and attack map v1-v3 stated chess facts through hashed Kenyon-cell (KC) tokens. Those modules stay in place because frozen old code imports them. New work uses Eyes v1.

## What it does

The caller gives a position and one legal move. Eyes v1 returns one current per lit photoreceptor, in the `{index, current}` form that `SparseTrainer.forward` already accepts. It returns no tokens and no chess facts.

1. **Placement.** 5,543 photoreceptors, each looking at one square, from Carlo Esposito's fly-chess (see Credit). `retina_idx`, `retina_square` and `retina_uv` are read from the pinned graph.
2. **Seat.** The Fly sits behind the mover's pieces. Ranks are mirrored when Black moves; files are not. This is Esposito's convention, so a position and its colour mirror give identical input (tested).
3. **Board.** The eyes see the board after the move, including castling rook moves, en passant removals and promoted pieces.
4. **Pictures.** One 32 x 32 grey picture per piece type, rendered once from DejaVu Sans chess glyphs and stored as digits in [eyes-v1-pictures.json](../../../.codebase/src/chess-input/eyes-v1-pictures.json). [Generator](../../../.codebase/scripts/chess-input/build-eyes-v1-pictures.py).
5. **Viewing cell.** In each square, the distinct `u` and `v` values of its photoreceptors divide the picture into cells. A photoreceptor reads the mean ink in its cell.
6. **Current.** `side level x ink + mark`.

| Fixed value [choice] | Number |
|---|---|
| Mover's piece level | 1.0 |
| Opponent's piece level | 0.5 |
| Mark on the from-square and to-square | +0.5 |
| Largest possible current | 1.5, the per-cell ceiling used by earlier inputs |

## Why the plan's point sampling changed

Plan section 3 says each photoreceptor samples the picture at its position. That failed before any graph use. Squares have only 9 to 51 distinct columns, and some are one or two lattice rows tall. With point sampling, some piece pairs give identical input on some squares: 21 of 960 square-and-pair cases for the adopted pictures, 35 to 74 for the other sets at 16 x 16. A viewing cell removes every identical case. The worst mean difference is 0.0527 of full ink, on a1, pawn against bishop. [Measured comparison](../../../research/reports/eyes-v1-2026-10-31/compare-sampling-output.txt).

The opponent level halves this difference for opponent pieces, so the worst case there is about 0.026.

The pictures changed for a separate reason: the browser's vendored piece sets carry a repository MIT notice, but nothing we read states where the art came from. DejaVu glyphs have a clear licence, and they also gave the best worst case.

## Limits we disclose

1. The renderer is an engineered interface. It is not a measured model of fly vision, optics or colour. All photoreceptor types (R1-6, R7, R8) read the same picture.
2. Stretching a picture over each square's own columns ignores real square shape. Many squares are thin or irregular, so pictures are coarse. [Eye view](../../../research/reports/eyes-v1-2026-10-31/eye-view.png).
3. Code still supplies the legal moves, through chess.js 1.4.0. The move mark is an external pointer.
4. Mover and opponent levels give a seat-relative colour, supplied by code.
5. Two moves on one board share most of their input: weighted current overlap 0.76 and 0.74 on the start position. The old action-relative cue reported 0.18 on its own cell-overlap measure. The two numbers are not a matched comparison, but they warn that telling moves apart may be harder.
6. Earlier eye-route measures used the older square-brightness rendering: under 1% of cue KC drive overall, about 5% in visual KCs, and saturating. Nothing here changes the pathway, and no gain was added. Eyes v1 itself has not run on the full graph.
7. Eyes v1 does not settle [finding F10](../../../research/reports/research-weakness-review-2026-10-30/README.md). It freezes image bytes, brightness, orientation and pointer construction. Counterbalanced shortcut probes and a capable same-rendering nonlinear baseline belong to the eye test and are not built.

## Credit

- **Placement and seat convention:** Esposito, C. (2026). *fly-chess: the FlyWire connectome as a chess-playing network* [Computer software, MIT License]. https://github.com/cesp99/fly-chess, commit 3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf; `docs/RETINA.md`. [Archive, licence and full citations](../../../research/literature/cesp99-retina-2026-10-28/README.md). His trained `w_ret` and `W_in`, gains and heads are not used.
- **Column data under that placement:** Matsliah et al. 2024, Nature 634, 166-180, doi:10.1038/s41586-024-07981-1.
- **Pictures:** DejaVu Sans, as bundled with matplotlib 3.11.1, SHA-256 in the picture file. [Licence](../../../.codebase/src/chess-input/eyes-v1-pictures-LICENSE.txt).

## Changing it

Do not edit these values. Any change after this freeze gets a new version (Eyes v2) with a record, as plan section 7 requires. Check: `node --test .codebase/tests/chess-input/eyes-v1.test.mjs`.


## 2026-11-01 source clarification: retain the annotation provenance

The [retina identity trace](../../../research/reports/eyes-retina-identity-2026-11-01/README.md) verifies that every selected root matches the original Codex primary type, photoreceptor classification, side and column coordinates. The thirteen inputs flagged by the graph audit are conflicts with the separate v2.1 TSV; a full exact-type comparison finds thirty-eight disagreements, including twenty-five photoreceptor-subtype disagreements. Both sources use v783 root IDs. This does not establish a root/index error or independently adjudicate biological identity.

For the frozen artifact, interpret stored retina types through the pinned Codex primary-type table used by the original loader. Keep v2.1 types and curated transmitter annotations as separately identified evidence, retaining all conflicts. No renderer bytes, placements, levels, image identity, graph signs, numerical gate or experiment authorization changes. A color-learning protocol requires explicit treatment of subtype uncertainty and spectral drive; this scalar renderer does not supply that physiology.
