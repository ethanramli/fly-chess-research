# Correction-plus-preservation schedule preparation

2026-10-08. Prepared a training-only comparison schedule after the audited bound-ray feedback comparison failed its acquisition gate.

The preparation script rechecked the frozen protocol hash, informative report and audit hashes, completion marker, audit scope, and training data hash. It recomputed the correction-preservation plan from the saved scratch rankings and independently verified certificates. The selected four events target the most confidently wrong panel, tr-06, and the weakest correct sentinel, tr-03: failure a1a4, success e1e5, success a1a4, failure e1e5. The score-blind schedule samples four distinct training panels using seeded stable hashes and has the same two-success/two-failure balance.

Artifacts: `research/data/correction-preservation-schedules-v1/schedules.json` and `manifest.json`. Schedule SHA256: `5c8f41ef5920a1465632a826e802142c5c7b54eb93ee100c85d4d78b80069a81`. No validation or final-family data was read, and no graph inference or neural update occurred.

This only prepares teacher schedules. It does not show that targeted teaching improves acquisition or retention. Before graph use, archive and freeze the protocol and runner, include informative plus absent, count-balanced shuffled, and disabled controls for both schedules, independently audit fresh graph replays, and validate checkpoint recovery. The next comparison must hold graph, encoder, readout, local rule, event count and resource bounds fixed; its acceptance gates remain those in [the design](../../../documentation/design/puzzle-learning/correction-and-preservation-feedback.md).
