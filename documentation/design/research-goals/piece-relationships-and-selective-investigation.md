# Piece relationships and selective investigation

Accepted scope addition, 2026-10-07 (Asia/Jakarta). This records researcher intent and hypotheses, not implemented capabilities or demonstrated learning.

## Researcher request

The fly should learn to understand relationships between pieces and avoid blunders. Evaluating every legal move can waste scarce compute on poor candidates; considering only checks, captures and attacks can overlook quiet moves and spend too much effort on forcing lines that lead nowhere. Learning how much tactical investigation a position deserves belongs in the intended decision process.

The researcher also requests context-dependent evaluation of each piece's usefulness. Their illustrative examples were an underdeveloped knight contributing about 1.2 instead of its nominal material value of 3, an active knight participating in an attack contributing about 4.7, and a passive rook sometimes being worth sacrificing. These numbers are examples, not prescribed labels, fitted targets or a fixed scoring table. The suggestion that relationships and blunder avoidance could suffice for 2000 Elo is a researcher hypothesis; no rating evidence currently establishes it.

## Intended learned capabilities

- Distinguish material at risk from positional contribution: development, mobility, access to useful squares, obstruction and participation in attack or defense.
- Recognize relationships: attacked and defended pieces, overloaded or removable defenders, pins, tactical exposure and king safety. Activity does not excuse leaving a piece undefended.
- Assess exchanges and sacrifices through verified resulting consequences and justified defensive replies, including cases where losing nominal material improves the position and near-matching cases where it fails.
- Allocate bounded investigation according to unresolved consequential threats and alternatives, rather than treating every forcing move as good or every quiet move as irrelevant.

Any persistent improvement must arise through the project's supported endogenous memory mechanism. The teacher supplies verified experiences and consequences, not per-piece value labels or neural parameter deltas. Do not replace neural learning with a handcrafted activity evaluator, supervised value fitting or external chess search.

## Proposed investigation and evaluation

A small initial investigation containing forcing candidates and quiet alternatives, followed by selective extensions or widening when consequential questions remain unresolved, is an engineering hypothesis to test. It is not currently a learned policy. Keep hard limits on evaluations, depth, nodes, elapsed time and resident memory; exhausted verification remains unknown and supplies no teaching event. Separate candidate omission, assessment error, missed defense and insufficient depth.

Training should contrast activation versus passivity, defender removal versus preservation, and sound versus unsound sacrifices. Freeze learning for evaluation and use disjoint unfamiliar and counterfactual positions where altered piece relationships reverse the correct decision. Measure blunders, verified choice quality, candidate coverage, and quality per fixed investigation budget against matched controls. Record unaided choices separately from searched choices. A numeric contextual value is optional; improved consequence-sensitive decisions are the requirement.

This addition extends the original transferable-reasoning goal. The immediate acquisition experiment remains necessary but cannot establish these capabilities. No claim of 2000 Elo follows without the separate [Stockfish-calibrated evaluation contract](../evaluation-and-performance/elo-calibration.md).

## Provenance and current status

This is the researcher's proposal plus explicitly labeled engineering hypotheses from the discussion. No external biological or chess source is being claimed for these examples. Register any externally sourced solution before experimental use. Current search has a forcing shortlist with a quiet reserve; adaptive widening and learned investigation allocation remain unimplemented. Full all-legal diagnostic panels measure ranking and omission; they are distinct from candidate-limited search.

[Learning direction](feedback-learning.md) · [Scientific contribution](scientific-contribution.md) · [Current status](../../current-status.md)
