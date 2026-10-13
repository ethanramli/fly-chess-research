# Future performance: thinking during the opponent turn

2026-10-06. Status: researcher-requested future feature; proposed design, not implemented or validated. Preserve the learning-first sequence and frozen experiments.

## Behavior

After committing a move, use opponent thinking time to investigate plausible strong opponent replies and FlyChess responses. Use a separate board with complete relevant history, and cover multiple opponent branches within a fixed budget. Estimated strong replies are not verified best defense.

When the actual move arrives, stop scheduling speculative work. If it matches a compatible stored branch, promote that branch to the current search root, check the position and legal continuations, then perform a brief bounded continuation search before responding. On a miss, start ordinary bounded search. Partial hits may reuse compatible neural evaluations without implying a complete response line.

This reduces waiting after the opponent moves by spending computation earlier. It does not eliminate latency or guarantee a good response. A brief check has a defined budget and is not a best-defense certificate.

## State and cache

- Store bounded nodes, candidate replies, continuations, visits, value sums/counts, neural evaluations and stopping reasons. Separate estimates, sampled terminal outcomes and independently verified consequences. Unknown cutoffs stay unknown.
- Reuse keys include complete relevant board/history state (repetition, castling, en passant, side to move and counters), task context, graph/model/memory/encoder/readout/policy identities and search configuration. FEN alone is insufficient for repetition history. Record RNG state and search provenance.
- Freeze lasting neural memory during pondering and reuse. Imagined outcomes cause no teaching reward or plasticity. The cache is external search state, not biological memory or learning evidence. Invalidate incompatible entries after learning or configuration changes.
- Verify the actual history/position, replay retained moves for legality and preserve score perspective when re-rooting. Handle old root-specific exploration noise and priors explicitly. Terminal positions end search.
- Use cancellation generation IDs so late speculative results cannot overwrite current results. Check cancellation between bounded operations. A soft deadline cannot interrupt an existing synchronous neural evaluation; measure its worst handover delay before claiming responsiveness.

## Resource limits and persistence

Use one sparse brain instance and serial evaluations. Bound time, evaluations, nodes, depth and cache bytes with a declared eviction policy. Preserve 768 MiB RSS/256 MiB free-memory guards, the 256 MiB Node heap and CPU duty 0.5. Do not add a second brain or unbounded background work. Record peak RSS, elapsed/CPU time, identities and commands.

Persist reusable search state only through a defined atomic resume contract containing history, identities, RNG, remaining budgets and acknowledged work. Existing search resume remains unfinished; this note does not establish it. Eviction and interrupted speculation must preserve the real board and lasting neural memory.

## Evaluation

Report unaided, search without pondering and search with pondering separately. Record opponent-think time, own-turn time, total evaluations/CPU, hit rate, reused work, handover delay, post-move latency distributions and choice quality/game results.

Compare both equal total compute (reuse/scheduling benefit) and realistic fixed-clock games (benefit of available opponent time). Freeze pondering permissions for both players and account for shared-laptop CPU contention: pondering must not silently weaken the reference opponent. Ratings and predictors are specific to these conditions; ponder-enabled strength is not unaided strength.

Test hits, misses, history mismatch, changed memory, cancellation during evaluation, stale-result rejection, score perspective, bounded eviction and interruption/recovery. Check wiring/memory invariants and compare seeded cases against fresh compatible search. Reuse changes search allocation/order, so identical trajectories are not assumed; measure quality as well as latency.

## Provenance and next step

The researcher requested thinking through opponent moves and responses during their turn, then briefly checking and reusing matching lines. The cache mechanics above are assistant engineering proposals, not an externally sourced biological mechanism. No runtime was changed or experiment launched for this note.

After the learning milestone, profile serial inference and specify bounded cancellation, cache identities and re-rooting before implementation. See [search trace status](../search-and-feedback/monte-carlo-traces.md), [Elo calibration](elo-calibration.md) and [learning direction](../research-goals/feedback-learning.md).

## Detailed implementation roadmap

See [performance and evaluation implementation](implementation-roadmap.md) for proposed modules, state contracts, build order, recovery rules and acceptance checks. All new APIs/scripts there are proposals, not available commands.
