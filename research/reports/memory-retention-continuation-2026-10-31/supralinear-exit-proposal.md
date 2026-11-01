# Weak signals should not unlock stored memory: supralinear reservoir exit

2026-10-31, written before code or results of this rule. One fixed setting. No sweep, no gate change, no graph, no chess, no sealed seeds.

## Named failure

[Capacity-delay v2](capacity-delay-v2/summary.json) Part C: stored margin falls with delay under small DAN noise, with half-margin at delay 1600 for e=.1. The reason is in the equations. Transition probability is linear in DAN deviation, so a deviation one tenth of a pulse has one tenth of the pulse's effect, and it acts on every active cell over thousands of steps.

## Change

Only one thing changes from `prediction-reservoir-v1.1`: the transitions **out of a reservoir** (S1 to S0, W1 to W0) become quadratic in the local DAN drive. Entries into a reservoir and all buffer transitions stay as they are.

```
drive = excess + deficit              (per compartment, as now)
p  = 1 - exp(-trace*eta*drive*dt)     (existing: buffer moves)
px = 1 - exp(-trace*eta*drive*(drive/d0)*dt)   (new: reservoir exit)
pd = p*excess/drive,  pu = p*deficit/drive
xd = px*excess/drive, xu = px*deficit/drive

S0' = (1-pd-pu)*S0 + xd*S1
S1' = (1-xd)*S1 + pu*(S0+W0)
W0' = (1-pd-pu)*W0 + xu*W1
W1' = (1-xu)*W1 + pd*(W0+S0)
```

`d0 = .25`, the drive of a pulse at `f=.5`, so exit is unchanged at `v=0`. No other new number. Mass stays conserved and non-negative. `eta=2`, `V0=1.2` stay frozen.

Consequences in hand: a noise deviation with `e=.1` has mean drive about .025 before scaling, so its exit hazard falls by about ten times relative to the linear rule. A confident error (`f=.75`) gets 1.5 times the exit hazard of `f=.5`. So the same step could both protect memory from noise and speed revision.

## Source status

The quadratic form is an engineering hypothesis. No source supplies it. Cooperative dopamine action is plausible, but the coincidence literature conflicts: Tomchik and Davis 2009 report synergistic cAMP from depolarization with dopamine, while a later preprint challenges the model (both search-summary level). Neither gives this equation. Berry et al. 2012 (search-summary level) show that ongoing dopamine neuron activity regulates forgetting, partly through a separate receptor, DAMB. So this rule may also be wrong in kind, because real forgetting need not use the learning path.

## Tests, in order

1. Mass, bounds, unchanged-at-d0 and Monte Carlo transition checks, snapshots and S5-S9.
2. Target cell: recorded run and separate audit on development seeds 1001-1012, with G1-G6 and the shuffled diagnostic.
3. All 108 cells on development seeds.
4. Capacity-delay v2 Parts A, B and C unchanged, seeds 3001-3012.

## Predictions, written before results

1. Part C half-margin at e=.1 moves from 1600 to at least 6400. If it does not, noise acts mostly through a route this does not change.
2. Target cell: R stays at least .70 and first reversal at least .429. This is uncertain, since faster exit on B- punishment may cost R.
3. Grid: at least 19 of 28, with the same structural failures in groups 2-4.
4. Part A margins change by less than .03 at coverage .8 or below.

A failure of any joint gate stays a failure. Passing does not establish fly retention, because noise amplitude is a choice and a rule with low noise sensitivity can pass a noise test by construction. The test that matters is whether it holds with teaching still working.
