# Chess Input src

[Src guide](../README.md) · [Code guide](../../README.md)

[Design and scientific boundaries](../../../documentation/design/chess-input/README.md)

- [chess-cue.mjs](chess-cue.mjs)
- [compartment-chess-cue.mjs](compartment-chess-cue.mjs)
- [relational-chess-cue-v2.mjs](relational-chess-cue-v2.mjs)
- [relational-chess-cue-v3.mjs](relational-chess-cue-v3.mjs)
- [relational-chess-cue.mjs](relational-chess-cue.mjs)
- [bound-ray-relational-cue.mjs](bound-ray-relational-cue.mjs) is an experimental candidate-target geometry cue; it adds no outcome labels and does not alter mapped wiring.

- [public-lesson-frame-cue.mjs](public-lesson-frame-cue.mjs): public board/history/action frame projection, including terminal endpoints; accepts both serialized frames and the learner's board/action encoder call; absolute geometry, no teacher labels.
- [public-action-relative-cue.mjs](public-action-relative-cue.mjs): 2026-10-24 action-centred cue for Stage 1 registrations revision 6+ (task, mover, captured type, move vector, every other piece relative to the landing square, actor-oriented); each token drives one MBON01-compartment and one MBON12-compartment KC. Same-board cue overlap 0.18 vs 0.86 for the absolute frame cue. Overlaps in purpose with the earlier relational-chess-cue v1-v3, which were not consulted when it was written.
- [public-action-relative-cue-v2.mjs](public-action-relative-cue-v2.mjs): 2026-10-24 (revision 7+): identical action cues; a position with a last public move is encoded in the move's own token family from the mover's side (perspective 'mover'), so Stockfish value pulses act on the move's cells. Positions without history keep the v1 own-king cue.
- [public-attack-map-cue-v1.mjs](public-attack-map-cue-v1.mjs): 2026-10-27 (revision 12+, researcher option A): capture or quiet, plus each enemy piece type that can reach the landing square after the move (pseudo-legal, pins ignored), marked when on a clear line with its own king; 20 hashed KCs per token per pool. A restricted, engineered attack judgement, not vision. [Report](../../../archive/early-development/research/reports/stage1-attack-map-cue-2026-10-27/README.md).
