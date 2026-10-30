# Chess input representations

All current encoders use symbolic input and mapped stimulation, bypassing modeled eyes. Engineered representation changes do not establish natural perception or reasoning.

- [Board/action cue association experiment](board-action-association.md)
- [Board and action cue encoder: engineered input interface](board-action-cues.md)
- [Compartment input comparison: four frozen association variants](compartment-association.md)
- [Compartment encoder: candidate conjunction and eligible-pool hypothesis](compartment-encoder.md)
- [Relational encoder: candidate-relative board features](relational-encoder.md)
- [Bound-ray cue: candidate-bound slider and intervening-piece geometry](bound-ray-relational-cue.md)
- [Matched representation comparison: puzzle-choice gates failed](representation-comparison.md)

[Current status](../../current-status.md) · [All design topics](../README.md)

- [Public lesson-frame endpoint encoder preflight](../../../archive/early-development/research/reports/public-frame-encoding-preflight-2026-10-08/README.md)

- [Public action-context conjunction for mate lesson frames](conjoined-public-mate-frame-cue.md): static matched-dose preflight passed; neural learning pending.

- 2026-10-24: [action-centred Stage 1 cue](../../../.codebase/src/chess-input/public-action-relative-cue.mjs) replaces the absolute frame cue for Stage 1 revision 6+ after the absolute cue gave two moves on one board 86% shared input. It re-implements the candidate-relative idea of the [relational encoder](relational-encoder.md) (an overlooked prior design) and adds a projection into both plastic compartments. Evidence: [learnability diagnostics](../../../archive/early-development/research/reports/stage1-learnability-diagnostics-2026-10-24/README.md).

- 2026-10-27: [attack-map cue v1](../../../.codebase/src/chess-input/public-attack-map-cue-v1.mjs) for Stage 1 revision 12+ (researcher option A). Step 1 found every allowed occupancy cue at chance on held-out training families for a perfect-memory learner ([report](../../../archive/early-development/research/reports/stage1-representation-ceiling-2026-10-27/README.md)). The new cue gives the Fly an engineered attack map of the landing square (restricted class), and claims must say so. Design choices and graph checks: [report](../../../archive/early-development/research/reports/stage1-attack-map-cue-2026-10-27/README.md).
