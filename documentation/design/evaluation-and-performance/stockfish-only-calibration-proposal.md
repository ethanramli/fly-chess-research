# Stockfish-only FlyBench calibration proposal

2026-10-11. Requested replacement proposal; implementation and experimental acceptance remain pending. Supersedes loss-count extrapolation as a calibration method. [Prior design](elo-calibration.md), [existing runner](flybench.md), [mistake/pivot record](../../../research/journal/discussions/2026-10-11-stockfish-calibration-revision.md).

## What the result will mean

Estimate the frozen Fly's strength on a **FlyBench local Stockfish reference scale**, under published playing conditions. Give the unmodified minimum-strength reference a conventional local anchor of 1320 points. This is a coordinate choice, not a measurement that this reference is actually 1320 Chess.com, Lichess, FIDE or CCRL Elo under our conditions. Other references and the Fly acquire relative ratings from actual matches. A negative local rating is allowed; do not floor results at zero.

The original 13-game run is excluded from placement, calibration, fitting, prior initialization, checkpoint selection and stopping decisions. The seed-48 follow-up is also excluded: it inherited the earlier estimate and changed the Fly's parameters. Preserve both as engineering history. No 760.3 prior, inherited RD, fabricated outcomes or 3x-budget replication enters the replacement fit.

Fifty Fly games are a pilot budget, not a guarantee of a finite estimate or narrow interval. Scores against each opponent remain publishable even when a rating cannot be located.

## A ladder that can reach weak play

Native-only option: retain unchanged Stockfish and its supported UCI settings. If the Fly loses all games against the floor, report its score and a model-dependent upper bound. Native controls currently do not establish a substantially weaker rung. More losses cannot guarantee a precise point rating.

Recommended option: retain Stockfish as the only chess engine, with a transparent seeded move-selection wrapper. On each reference turn:

1. Get the minimum-strength Stockfish move with `UCI_LimitStrength=true`, `UCI_Elo=1320`, one thread, 32 MiB hash, pondering off and 100 ms search.
2. With probability p, play that move; otherwise uniformly sample from the board's legal moves, in sorted UCI order, using a pinned PRNG.
3. Log the branch, RNG state, engine suggestion, selected move and full board/history. Still obtain the engine suggestion on random branches so the search budget is comparable across rungs.

Initial candidates are p = 0, 0.1, 0.3, 0.6 and 1. Here p=0 is the random-policy endpoint, p=1 is native minimum-strength Stockfish. This adds no second pretrained model. It does introduce a custom error policy: the result concerns these **Stockfish-based references**, and the endpoint is not Stockfish play. If only unmodified engine output is allowed, use the native-only option and accept bounds.

These probabilities are engineering choices, not Elo values or validated human behavior. Do not interpolate ratings linearly from p, assume increasing p always increases measured strength, or calibrate against centipawn loss. Preserve cycles/reversals as model failures rather than forcing a monotone ranking.

## Reference calibration before Fly games

Run engine-only reference games without loading the Fly graph. Reuse one Stockfish process serially for both sides, set the complete position/history on each turn and clear hash before each search. Apply the same per-turn hash clearing in Fly games. Wrapper RNG streams are separate for each player/game; Stockfish's internal random state is not claimed recoverable.

| Phase | Schedule | Games |
|---|---|---:|
| Reference fitting | 20 colour-swapped opening pairs per adjacent p edge; four edges | 160 |
| Held-out reference checks | Five fresh pairs per adjacent edge | 40 |
| Cross-edge check | Ten fresh pairs for p=0.1 versus p=0.6 | 20 |
| Total engine-only pilot | Before Fly placement | 220 |

Freeze all schedules before launch. Reference validation games are excluded from reference fitting. Check predicted held-out win/draw/loss and pair-score distributions with simultaneous simulation envelopes over the five validation edges. Use a predeclared aggregate discrepancy test at alpha=0.05; passing a low-power pilot is limited adequacy evidence, not proof of a universal rating model.

Require a finite identifiable reference fit connected to the anchor, no unresolved separation, usable uncertainty and no failed model check before Fly scoring. A chain of matches is not sufficient if every edge is one-sided. If this pilot fails, preserve it and propose a separate revised ladder/budget; do not quietly label candidate levels as calibrated. No extra reference or Fly games are automatically authorized by this proposal.

## Fresh 50-game Fly budget

Freeze the exact target player first. Default target for continuity is the original untrained seed-47 player, recreated and parameter-hash checked without using its old outcomes. Pin graph, parameters/checkpoint, physiological memory, encoder, readout, policy and source hashes. A researcher-selected learned snapshot is a separate condition. Use independent model, opening, allocation and opponent seeds; changing openings must not initialize a new Fly. Freeze learning and check persistent identity before/after each game.

| Phase | Fly games | Purpose |
|---|---:|---|
| Placement | 10: one swapped-colour pair against each calibrated rung | Select useful opposition |
| Scoring | 40: ten fresh pairs against each of two selected rungs | Estimate rating from new outcomes |

Selection is deterministic and frozen in advance: all placement losses select the two weakest measured references; all wins select the two strongest. Otherwise choose the two references whose placement scores are closest to 0.5, breaking ties by lower measured rating then reference ID. Record placement inversions and inspect per-opponent scoring residuals rather than assuming a universal order. Ten placement games can misselect opponents; this is an explicit pilot limitation.

Freeze the 40-game scoring schedule after placement. Keep the learner frozen; adapt the benchmark's opponent selection only. The primary fit uses the 40 scoring games and reference-fitting games. The 10 placement games remain raw placement evidence, excluded from the primary rating fit to avoid treating a selected sample as a fixed design. Do not stop early on a favorable rating. An incomplete run reports completed scores and incomplete status, not the prespecified final interval.

## Openings, outcomes and statistics

Use a pinned manifest of ordinary legal opening positions, sampled before outcomes from a documented licensed book or curated source. Short standard opening lines may be curated as engineering inputs, with provenance and legality checks. Do not reuse the old random six-ply opening set, frozen research final-test families, or choose winning positions for the Fly. Define a common opening distribution for reference and Fly games, disjoint fitting/validation/placement/scoring manifests, and two colour-swapped games per opening. Record the exact manifests and sampling policy before launch.

Fit all scored competitors jointly using a Davidson paired-comparison win/draw/loss model with one colour term and one pool draw parameter. For White rating Rw, Black rating Rb and colour effect c, let t = 10^((Rw-Rb+c)/400) and Z=t+1+nu*sqrt(t): P(White win)=t/Z, P(draw)=nu*sqrt(t)/Z, P(Black win)=1/Z. Fix the anchor and estimate the remaining ratings, c and nu>=0. These local points use a 400-point decade in decisive odds; draw behavior is modeled separately. Glicko may remain a labelled progress display, but it does not determine the final fitted strength.

Publish paired-score and W/D/L residuals by reference and colour. Quantify uncertainty by refitting at least 2,000 seeded bootstrap resamples of complete opening pairs, resampling reference and Fly scoring data together. If an opening family appears in multiple matches, resample its whole cluster. Retain the anchor convention and frozen placement-selected schedule. This is an approximate interval conditional on the selected schedule and model, not a promise of exact 95% coverage.

Propagate estimated reference uncertainty; do not hold every rung's estimated rating fixed. Report infinite/nonconvergent/separated replicates and endpoint draw fits. Do not silently drop problematic resamples to obtain a narrow interval. If a two-sided interval is not estimable, publish an appropriate one-sided profile bound with pair-dependence sensitivity and stated assumptions, or state that the data do not determine a rating. All wins/losses, a disconnected comparison graph, severe model failures or too little effective data preclude claiming a precise point estimate. Fifty games cannot establish decimal accuracy.

Display, for example, `local rating 420; approximate 95% interval 180-660; 40 scored games`, with real values only after fitting. A decimal may be stored for reproducibility, but the headline rounds to whole points and emphasizes the interval. Never substitute predicted extra games for observations. Learning, biological validity and transferable reasoning are separate evaluations.

## Laptop execution and implementation work

Keep one game and one sparse Fly instance at a time. Preserve `node --max-old-space-size=256`, duty 0.5, combined 768 MiB RSS ceiling and at least 256 MiB free memory. Measure the combined Node/engine memory, elapsed/CPU time and engine search work. The Fly uses its declared unaided one-ply policy, so this measures that policy against the specified reference search budget; it is not an equal-compute or human-clock claim.

Reuse legal/history handling, PGN streaming, identity checks, resource guards and game-boundary publication from FlyBench. Needed implementation: separate seeds/snapshot identity, reference-versus-reference scheduling, the explicit mixture adapter, fixed placement/scoring manifests, joint fitter, pair-aware uncertainty and a results inclusion manifest. No new neural model or learning path is needed.

Score only actual chess terminations. Retain automatic repetition/fifty-move claims and insufficient-material/stalemate rules. A 400-ply cap, resource guard, timeout or crash is an interruption, never a draw/loss. Atomically preserve schedule, RNG state, receipts and game history; exact Stockfish mid-game recovery is unavailable, so retain the interrupted trace and replay the unfinished game from its opening under a declared restart policy. Never duplicate completed games or discard inconvenient games. Independently replay legality/outcomes and verify frozen memory before fitting.

## Source coverage and acceptance

- [Stockfish FAQ](https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html): retrieved official HTML 2026-10-11; relative rating context and intentionally weakened move selection. It does not validate our mixture or target scale.
- [Stockfish UCI commands](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html): retrieved official HTML 2026-10-11; limited-strength controls and their calibration conditions differ from this proposal.
- [Davidson 1970, ties in paired comparisons](https://doi.org/10.1080/01621459.1970.10481082): publisher abstract/search coverage only, full-text access blocked. Supports the existence/scope of the ties extension, not our schedule, formula implementation or precision. The explicit formula above is a proposed statistical specification and must be checked before use.

The error mixture, anchor, budgets, seed separation, manifests, selection rule, draw/colour specification, checks and reporting gates are engineering/statistical proposals. No reference calibration, fitter, bootstrap or replacement match has run. Register and pin the final source/formula implementation before experimental use; see the [source register](../../../research/literature/source-solution-register.md).
