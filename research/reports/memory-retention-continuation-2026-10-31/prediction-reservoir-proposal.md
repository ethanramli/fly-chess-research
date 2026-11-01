# Prediction-scaled teaching on the reservoir store

2026-10-31, written before any code or result of this candidate. No graph, chess, held-out seeds or gate changes. This is a declared development grid, not an open sweep. Every setting is reported.

## What the existing audited data show

From the [phase reconstruction](phase-diagnosis-v1.json), reservoir medians, in units of normalized A margin:

1. **T1 to T2 loss is 0.119.** A-/shared falls 0.098 (0.021 to -0.077). A+/shared falls only 0.021. A+/unique and A-/unique do not change. So most retention loss sits on A- cells that B+ reward trains. Those cells were naive, so a reservoir has nothing to protect there.
2. **T3 shortfall.** A- reaches 0.315 of its 0.400 ceiling, and A+ still adds 0.010. Reversal spends 8.75 trials on punishment against 3.58 for the original control, which leaves about 12 rewarded trials to raise A-.
3. **The eta frontier.** eta .5 gives R .732 and first reversal .320. eta 1 gives R .698 and first reversal .385. A fixed rate moves along this tradeoff. It did not cross both limits at the two tested values, and a fixed rate between them can only pass if the frontier bends, which neither result shows.

## Why a prediction signal could shift that frontier

A fixed pulse treats all contradictions alike. The events that should differ are:

| Event | Value of the chosen image at that moment | Wanted update |
|---|---|---|
| Punish A+ at first reversal | about +.6 | large |
| Punish B- early in B/C (shares 5 cells with A+) | about +.16 | small |
| Reward on an image already valued high | near +.6 | small |

The scale below separates them using the circuit's own readout at the moment of the pulse. The teacher still sends one fixed consequence. It does not see or compute this scale.

The earlier [self-limit diagnostic](../overnight-memory-plasticity-2026-10-31/loop-log.md) clipped its factor at 1, so it could never raise the update on a confident error, and it had no protected store. It failed its own prediction (R about .60). That failure stands. This test differs on both points and may also fail.

## Fixed equations

Reservoir transitions, gains, eligibility and readout stay exactly as in [reservoir-proposal.md](reservoir-proposal.md). Only the DAN deviation inside a pulse frame changes:

```
v = current readout value of the frame's KC activity (before this frame's update)
sigma = +1 for a reward pulse (R-side DAN above rest), -1 for a punish pulse (P-side DAN above rest)
f = clamp((V0 - sigma*v) / (2*V0), 0, 1)
danP' = rest + (danP - rest)*f
danR' = rest + (danR - rest)*f
```

`f` is at most 1, so each DAN stays inside its existing range. No pulse exists on frames at rest, so `f` has no effect there. With `eta` the base rate, `f=.5` at `v=0`. So setting `eta=2E` gives the same hazard at `v=0` as the fixed-rate rule at rate `E`.

`V0` is a setting. `V0=.8` is the readout's range at full activity: gains differ by at most .8.

**Scope.** On this fixture `v` stands in for an MBON-to-DAN microcircuit. The approach-minus-avoid reading comes from models (Bennett et al. 2021; Zhao et al. 2021). Felsenberg et al. 2017 (*Nature*, [nature21716](https://www.nature.com/articles/nature21716), search-summary level) report that MBON and DAN recurrent connections take part in re-evaluation of memory. Eschbach et al. 2020 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/32203499/), abstract level) map feedback onto DANs in the larva. None of these validates this equation or supplies these numbers. Bennett's own scope excludes consolidation, so this signal only regulates updates. Storage stays in the reservoir, and the delayed-retrieval requirement in [the scope document](long-term-memory-scope-and-next-test.md) stays open after any pass here. Whether real graph edges can deliver this signal is unresolved; the [static check](feedback-path-feasibility-v1.json) shows direct MBON-to-DAN edges in four of five example pools, with mixed signs and no measured dynamics.

## Declared grid

Cell q=.25, conflicting, w=0, bg=0. Twelve development seeds, four arms, 144 trials per arm, temperature .1, danDip 0. Original G1-G6 and the one-cell shuffled diagnostic.

- `store`: reservoir, gated (no reservoir; causal check on the store).
- `eta`: 1, 1.5, 2, 3.
- `V0`: .8, 1.2, 1.6.

That is 24 settings. The unscaled rules already have audited results and act as the comparison: reservoir (`eta` .5 and 1) and ablation.

**Selection rule, fixed now.** Among settings that pass every gate and the shuffled diagnostic, take the largest minimum slack, where slack is the smallest of (G1, G2, G4 margins minus .40) and (R minus .70). If none passes, report the closest and select nothing. A selected setting then goes through, in order: the recorded run with separate audit, the 28 gated grid cells on development seeds, and only then a single held-out seed check, under its own written plan.

## Predictions, written before results

1. A setting exists that passes G3 and all of G4 together on the reservoir store. This is uncertain; the tail on reward (low `f` near high value) may keep A- below the margin needed at T3.
2. The gated store fails G3 at every setting, because nothing protects A+/shared. If it passes, the reservoir is not needed here, and I will say so.
3. Reversal punishment count falls below the reservoir's 8.75.

## Limits

One cell and twelve seeds. Software evidence on a synthetic fixture only. A pass does not establish biological long-term memory, memory on the graph, or any retention timescale, because the rule has no time-dependent loss in this assay. Per-run limits: heap 256 MiB, RSS 2048 MiB, free 256 MiB, duty .5.
