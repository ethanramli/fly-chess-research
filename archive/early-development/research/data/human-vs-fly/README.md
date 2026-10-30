# Human-vs-fly baseline games

Approved shareable baseline games played by the researcher against the local
browser player. No personal data beyond the label "You" for the human side.

## Game 001 — researcher (Black) beats untrained fly (White)

- Source file: `C:\Users\ethan\Downloads\flychess.pgn`, copied byte-for-byte to
  `game-001.pgn` on 2026-09-30.
- Source SHA-256: `D3B0082801A53708BC463D0F155481A54FD398DB3B24F4AFFBCB560AA73BEFC4`
- PGN headers as exported: `[White "Untrained fly"]`, `[Black "You"]`,
  `[Result "*"]`.
- Moves: `1. c4 c5 2. Nf3 e5 3. Rg1 e4 4. b3 exf3 5. d4 fxg2 6. Nd2 gxf1=Q+ 7. Rxf1 Nc6 8. e3 Qe7 9. Qe2 cxd4 10. Rh1 d3 11. Rg1 dxe2 12. Rg4 d5 13. Ba3 Bxg4 14. f4 Nd4 15. exd4 O-O-O 16. Rd1 exd1=R+ 17. Kf2 Qh4+ 18. Kg2 Bh3+ 19. Kf3 Bd6 20. Bb2 Re1 21. f5 Qf4# *`
- Correct result by move order is `0-1`: White played `21. f5`, Black replied
  `21... Qf4#`. The exporter leaves `Result "*"` unchanged even on checkmate.
- Player: untrained one-ply browser policy described in `README.md`
  ("How to use this workspace"). Scores every legal successor through the
  connectome and picks highest/lowest with no established chess meaning.

## Limitations (must be preserved in any citation)

- One informal game against an untrained policy. Not training data, not a
  validation split, and not evidence of fly learning, reasoning, or transfer.
- Do not use for checkpoint selection, tuning, or claim of strategic ability.
- Later games go in `game-002.pgn`, etc., with source hash and result noted here.
