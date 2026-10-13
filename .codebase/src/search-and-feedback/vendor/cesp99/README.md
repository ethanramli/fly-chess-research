# Licensed cesp99 search

Upstream:Carlo Esposito, cesp99/fly-chess, commit3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf. MIT license is preserved in LICENSE. Source archive:research/literature/cesp99-calculation-2026-10-07/.

mcts.mjs copies upstream web/engine/mcts.js with three adaptations: legal-softmax import points to the extracted helper; beforeSelect receives proposed traversal depth; beforeExpand receives legal child count through the evaluator. No PUCT/backup/visit-selection formula changed. policy-for-legal.mjs is the exact extracted policyForLegal function from upstream flybrain.js.

The outer adapter provides serial current-brain evaluation, bounded resources, scratch board, frozen memory, and cancellation via a private cutoff sentinel. Incomplete traversal is discarded, not backed up. It adds no learned policy/value head; our current brain value remains neutral0. Bounds can end search before200 simulations. Upstream softmax uses Float32Array; numerical priors need not exactly equal our original PUCT implementation.

No runtime graph comparison yet. No pretrained neural weights or supervised fitting adopted. Use the source-to-solution register and static source review for provenance.

2026-10-07 additional adaptation: a synchronous completion-observer hook records bounded simulation move/leaf/value traces. No search formula changed. Exact nonbinding-bound parity with the archived original passes; project tests110/110.
