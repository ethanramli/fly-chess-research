# Peer review of memory v7 proposal, round 1 (2026-11-05)

Same reviewer and session. Prompt: `peer-review-v7-round1-prompt.txt`. (The first call hung on open stdin; this is the rerun.)

**APPROVE WITH REQUIRED CHANGES. Building may start with the BUILD changes below; launch remains conditional.**

Capture-only scoring removes the **constant capture-versus-quiet preference** shortcut. It does not eliminate correlations with piece identity, capture appearance or position composition.

1. **BUILD. Separate candidates from key construction.** Keep `legalOf` returning **all legal moves** for K3 centring and calibration; pass a separate sorted capture subset to scoring. Otherwise filtering at [worker:124](../../../.codebase/scripts/neural-learning/memory-v6-worker.mjs:124) can inadvertently change the mean computed at [task-v5:30](../../../.codebase/src/neural-learning/engineered-memory-task-v5.mjs:30). Derive membership from replayed capture status plus **rechecked** certificates. Assert both safe and unsafe candidates remain. Independently audit membership; test quiet exclusion, unknown exclusion, en passant, ties and unchanged practice keys/fingerprints.

2. **BUILD. Preserve capture-versus-quiet learning in the shuffled control.** The reused global permutation mixes capture and quiet slots ([ledger:134](../../../.codebase/src/neural-learning/engineered-memory-v4-ledger.mjs:134)). That also destroys coarse capture learning, whose imperfect generalization can influence rankings within captures. For v7's gating shuffled arm, permute values **only among known capture slots**, using the existing seeded permutation algorithm on that subset. Keep quiet values −1, unknowns null, and every exposure unchanged. Save and independently reconstruct this permutation.

3. **LAUNCH. Freeze provenance and qualify the claim.** Implement [proposal:23–25](../../../documentation/design/neural-learning/memory-v7-proposal-2026-11-05.md:23) with pinned selection/source hashes, explicit game-set intersections, the complete earlier-board exclusion set and ordered retained IDs. Report the result as **selection among externally filtered, known-certificate captures on label-conditioned fixtures**. Eligibility uses answers ([generator:39](../../../.codebase/src/puzzle-learning/capture-choice-positions-v1.mjs:39)); coverage filtering supplies assistance. Neither establishes unaided all-legal chess choice.

Answers to the three questions:

- **Keep quiet entries.** They need not be removed for this bounded comparison. Keep all-legal centring too: it uses no safety labels, although legal-move context is external assistance.
- **Keep the piece-value rule descriptive.** Beating it need not become a Volume 2 gate. It cannot exclude every piece-based shortcut: Eyes explicitly exposes captured-piece identity ([eyes-v2:28](../../../.codebase/src/chess-input/eyes-v2.mjs:28)). A pass supports useful learned association, not proof of relational safety reasoning.
- **Keep `ceil(7N/150)`.** A fixed 4.67-percentage-point improvement remains interpretable with a higher baseline; it is an engineering threshold, not a power guarantee.

This is an openly outcome-informed redesign, **not HARKing if frozen before v7 evaluation and reported as such**. It cannot retrospectively validate v3–v6.
