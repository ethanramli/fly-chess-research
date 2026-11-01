# Proposed next experiment: bidirectionally coupled local memory

2026-10-31. Prepared before implementation or results. Status: **proposal awaiting extension of the original six-loop limit**. One additional bounded repair cycle, within the existing fast/slow family; no parameter sweep, graph run, eye run, chess training or held-out-family access.

## Failure being addressed

The original local rule weakens A's margin under conflicting new associations. At the already inspected development cell q=.25, conflicting, w=0, bg=0, median retention is R=.611021 against .70 required. A's greedy choice remains correct there; this is weakened margin, not complete erasure. The [oracle feasibility witness](../overnight-memory-plasticity-2026-10-31/low-overlap-feasibility.json) establishes compatible bounded readout states, but not that a learner can reach them.

The failed `local-slow-v1` advances the fast state independently, lets a slow state follow it, and reads their mean. There is no slow-to-fast influence. This was a declared approximation, not a newly discovered implementation defect. Its failures do not test the source's bidirectional mechanism. The earlier self-limiting-signal diagnostic also failed; it is not repeated here.

## Source and limits

Benna and Fusi's [2015 primary preprint](https://arxiv.org/html/1507.07580), sections M.3, M.5, S.4, S.8, S.10 and S.11, describes a visible first variable and hidden variables that influence it through bidirectional exchange. S.11 discusses both continuous and plasticity-event-triggered internal dynamics. [The final 2016 journal abstract](https://pubmed.ncbi.nlm.nih.gov/27694992/) confirms the bidirectional principle. Journal body not inspected.

The paper's capacity results assume a different, largely random and balanced input protocol. They do not predict success in this correlated, own-choice task. Its illustrative chemistry does not establish these variables, gates or rates in visual KC synapses. A two-variable truncation, bounded local drive, event clock, omission of the terminal reservoir leak and numerical mapping below are engineering hypotheses. No published lifetime scaling or biological timescale is inherited.

## Candidate and causal ablation

Keep the original eligibility trace, local DAN excess/deficit, from-scratch initialization, readout coefficients, gain bounds [.2,1], feedback and exposure schedule. Per permitted edge, `u` is the visible gain and `s` is a hidden gain, both initially 1. The edge magnitude is `base * u`; the readout never sees `s` directly.

For one observation frame, first obtain the original end-of-frame eligibility `e`. Set `a = eta * excess`, `b = eta * deficit`, `z = e * (a+b) * dt` and `gStar = (a*.2+b*1)/(a+b)`. When `a+b=0`, use z=0 and change neither gain. Over this bounded event-clock interval integrate exactly:

```
du/dz = (gStar-u) + kappa*(s-u)
ds/dz = (kappa/C)*(u-s)
```

One fixed setting, kappa=.125 and C=2. The first-link scale and capacity ratio are motivated by the preprint's coarse-grained chain; interpreting them relative to this local teaching drive is our uncalibrated choice. There is no post-result rate adjustment in this cycle.

The **zero-coupling ablation**, kappa=0, uses the same visible-gain interface and must reproduce `local-gated-v1` exactly within declared floating-point tolerance. This isolates hidden-state coupling. The historical mean-readout variant is retained as history; it is not the causal ablation because its readout differs.

Exchange alone conserves `u + C*s`. Local teaching changes that quantity. The affine two-state system is cooperative and its vector field points inward on [.2,1]^2: at a minimum boundary every contribution is nonnegative; at a maximum boundary every contribution is nonpositive. Use the exact 2x2 matrix exponential for held frame inputs, not a clamped Euler approximation. Eligibility itself follows the existing split-step convention; this is not exact integration of simultaneous eligibility and gain dynamics.

The event clock freezes gain exchange without a local eligible teaching signal. This preserves the existing inactive/no-feedback contract, but the biological trigger remains unverified. It tests retention through additional learning, not elapsed biological time, sleep or consolidation.

## Fixed controlled test

1. Before behavioral data: pin this protocol, sources, fixture, adapter and auditor. Check bounds/finite state, exact zero-coupling equivalence, conservation without teaching, influence of s on u, no-event and disabled inertness, and snapshot/restore of both gains, trace, clock and counters. Failed checks stop the behavioral run.
2. Use only the existing 12 development seeds 1001..1012 and the already inspected cell q=.25, conflicting, w=0, bg=0, nKC=200, s=20. Original 144 trials per arm: A acquisition, B/C acquisition, three A reversals; every eighth trial is unknown. Same temperature .1 and reciprocal feedback. No extra exposure or imported oracle state.
3. Run informative, absent, matched shuffled and disabled arms for the coupled candidate and zero-coupling ablation: 96 trajectories, 13,824 trials. Preserve informative choices before feedback, true and delivered consequences, unknown handling and all per-event hashes. Independently replay every trajectory. Audit and producer may share pinned math classes; this is software replay, not independent biological replication.
4. Report all original G1-G6 criteria for this cell without lowering thresholds. In particular acquisition and reversal margin medians >=.4, greedy correctness >=90%, median retention >=.70, preserved B/C and the original G5 control requirements must pass jointly. As an additional prospective diagnostic for this narrow experiment, require the shuffled pool within this cell to have correctness in [.35,.65], with informative correctness at least .25 higher. The original G5s was pooled across the grid; this smaller aggregation does not replace or retrospectively reinterpret it. Also report paired retention change versus the ablation. A higher retention ratio caused by failed/weak acquisition is not success. A pass is development evidence for this one cell, not the original 28-cell gate or a selected graph rule.

Each run/audit has a fresh output directory, Node heap256MiB, RSS2048MiB maximum, free memory256MiB minimum, duty.5 and a 300s elapsed guard. No automatic restart. Core math changes still require `npm test`; known historical-path failures must remain identified. Expected work: roughly 15-30 minutes for implementation and focused checks, plus about 11 minutes for the current serialized repository suite; estimate only, no promise of a passing mechanism.

If any joint gate fails, preserve the result, identify the specific tradeoff and stop this cycle. Do not claim success, silently tune the rate or expand into another family. A passing development cell would justify a separately declared broader validation, not fulfill the actual-model memory goal by itself.


## Authorization addendum, 2026-10-31 (before implementation tests)

The researcher removed the repair-cycle stopping limit: "just dont have an endstop cycle". This supersedes the pending extension and numerical cycle end stop above. Historical counts remain recorded. The next registered experiment retains this proposal's one fixed coupled setting, zero-coupling ablation, all thresholds, exposures and resource limits. No graph or chess training is added. After a failed setting, preserve results and diagnose before a new versioned, source-grounded change; no unregistered sweep. The lead's earlier authorization to write the non-core repair persists.

Implementation detail: the exact transition tolerates at most1e-14 excursions attributable to floating-point rounding at gain bounds, fails larger excursions, then repairs rounding to the boundary. The numerical test compares against independent small-step integration. One additional seed1001 four-arm software round for each setting is used to check replay before main results; it is development exposure, not extra independent evidence or selection.
