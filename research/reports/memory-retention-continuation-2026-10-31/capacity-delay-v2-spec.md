# Capacity-delay assay v2: separating capacity, noise and reversal

2026-10-31, after [v1's result](capacity-delay-v1/report.json), written before v2 code or data. v1 and its marks stay preserved. v2 fixes the v1 design flaw and splits one test into three. No graph, chess or sealed seeds. Seeds 3001-3012, now development data.

## Parts

Rule: `prediction-reservoir-v1.1` plus `local-reservoir-v1`, `local-gated-v1` as comparisons. Informative arm only, except where stated. Trial structure as in v1.

**Part A: capacity without noise.** No delay and no noise. Sizes `(nKC, s)`: (200, 20), (800, 20), (800, 80), (3200, 20). Items N: 4, 8, 16, 32 (stored and tested at the end of each N; one run of 32 gives all four by using `T4`, `T8`, `T16`, `T32`). Coverage is `N*s/nKC`. Measure at each N, for each item: `v(good)`, `v(bad)`, margin, greedy, and margin at its own acquisition test. Report by item age.

**Part B: reversal without delay.** After `T16` at sizes (200, 20) and (800, 20), run one 24-trial reversal block on item 1. Measure item 1 margin, and the median ratio of other items' margin after reversal to before. No delay before it.

**Part C: noise dose.** At size (800, 20) and N=8, after `T8`, run delay levels 0, 400, 1600, 6400 with DAN jitter `e` of 0, .01, .03, .1, and 10% of KCs active per step as in v1. Measure mean margin and greedy share at each level. Report the delay at which mean margin first falls below half of its `T8` value, or "not reached".

## Marks

v2 is a measurement. It has no pass marks. Any pass mark for a selected rule comes in a later written version, using these curves, and it must not be fitted to make the frozen rule pass.

## Predictions, written before data

1. `v(bad)` rises with N for old items, and most margin loss comes from `v(bad)` rising, not `v(good)` falling. If `v(good)` falls most, the overlap hypothesis is wrong.
2. Loss depends mostly on coverage: (800, 20) at N=16 looks like (200, 20) at N=4, and (800, 80) at N=8 looks like (200, 20) at N=8.
3. Reversal does little harm at (800, 20): other items' ratio at least .90. At (200, 20) it does more harm.
4. Loss over delay falls as `e` falls. At `e=0` nothing changes, because no DAN deviation exists. Half-life scales about as `1/e`, since the hazard is linear in `e` in these equations.

## Limits

Sizes and patterns are synthetic. Random patterns are not chess images, whose codes may overlap much more. Noise amplitude stays an unmeasured choice.

## Clarifications, same day, before any v2 data

1. Size (3200, 20) is dropped because of its cost, about 25 minutes of CPU per rule at the measured step rate. Its coverage range is already reached: (800, 20) at N=4 and N=8 gives .1 and .2.
2. The run's wall limit is 5400 s. Duty stays .5.
3. Margins in v2's summary are raw `v(good) - v(bad)`, not divided by 1.6.
4. Part B trains 16 items, then reverses after `T16`. Part C at jitter 0: gains stay fixed, though local traces still change.
