# Closed-loop memory on the real graph through Eyes v1

2026-10-31, written before any data from this path. Researcher instruction: do not stop until we know how to give the fly input while keeping long-term memory. This is a development experiment with **arbitrary consequences and no chess meaning**. It opens no puzzle or sealed data. It does not count as the section 7 eye test or as chess training, and it selects no rule for training.

## The path

1. Frozen Eyes v1 renders a candidate move. The full graph runs 32 steps with no memory involved.
2. **Adapted baseline:** subtract each KC's mean rise over up to 12 legal moves on that board, then rectify.
3. **Threshold code:** the top 20 KCs fire, with current 1.5 down to .9 by rank; all others are silent. This is a relay standing in for KC spike threshold and APL normalization, which this rate model lacks. It is computed at naive gains.
4. The full graph runs 8 steps with those KCs driven, real KC-to-MBON edges carrying them.
5. **Store:** `LocalSupralinearReservoirMemory`, `eta=2`, on the real KC-to-MBON05 and KC-to-MBON07 edges, with PAM08 and PAM11 as the local dopamine cells.
6. **Teaching:** tonic current .75 on those DANs sets a resting level. Reward raises the pool toward 1.5, punishment lowers it toward 0, each scaled by `f = predictionScale(v, sigma, 1.2)`. The teacher sends only good or bad.
7. **Readout:** `v = .8*(1 - mean relative response of MBON05 and MBON07) - .32`, so naive is -.32 and a fully depressed response is +.32. Signs come from the reader's investigated -1 convention for MBON05 and MBON07. This is a development policy, not a reviewed score contract, and it does not call `scoreNeurons`.

No wiring, sign or Eyes value changes. Every step above that is not in the released graph is a declared model choice: the baseline, the threshold code, the tonic level, the store's parameters and the readout scaling.

## Design

4 items, each 2 legal moves on one seeded-play board; good is X+ at first. 24 trials each, every eighth trial unknown. Tests after each item, read only (state hash checked). Then 400 steps of delay noise (4 units each, 10% of the pool's cells active, DAN jitter 10%). Then a 24-trial reversal of item 1. Arms: informative, absent, matched shuffled, disabled. Seeds 4101-4106. The informative arm is rerun per seed and must reproduce exactly. Limits: heap 256 MiB, RSS 2048 MiB, free 256 MiB, duty .5.

## Marks, fixed now

With only depression-type compartments here, normalized margin cannot exceed about .40, so these marks are lower than the fixture's. They are engineering choices made before data, for development.

| Id | Requirement |
|---|---|
| R1 | Each item at its own test: median margin at least .20, greedy in at least 90% of seeds |
| R2 | After all four: oldest two items share correct at least .90, margin ratio to own test at least .50 |
| R3 | After reversal: item 1 margin at least .15, greedy at least 90%; others keep at least .80 of their margin |
| R4 | After delay: all items share correct at least .90, margin ratio at least .70 |
| R5 | Controls: disabled gains unchanged; shuffled share correct below .75 and informative at least .25 above it. Absent arm reported |

## Predictions, written before data

1. R1 and R5 pass.
2. R2 is at risk from the small KC pool, because 4 items at 20 cells in a pool of roughly 100 cells has coverage near .8.
3. R4 is at risk, because the tonic level makes small DAN deviations reach every edge, and real recurrent input may move the DANs on every frame.
4. MBON-to-DAN feedback and DAN-to-KC edges may disturb eligibility. If so, it will show as gains drifting in the absent arm, which is why the absent arm is reported.

## Limits

Six seeds and one development policy. The relay is the largest assumption: it stands in for a KC stage this model does not simulate. A pass would show that this path can hold memory on the real wiring for arbitrary associations, not that the fly's real visual system does this.

## Addendum, same day, after a smoke run on spare seed 4999 and before seeds 4101-4106

Smoke result: plumbing works and save/restore matches. Item 1 margin .001, item 2 .162. Probe: 20 of 20 code cells were shared between the two moves in item 1, and 19 of 20 in another pair, because top cells by raw contrast are high-gain cells that respond to any move. Visual codes reach MBON05 but no MBON07, and the equal average of the two ratios halved the signal.

Two changes, made before main data:

1. **Code:** rank cells by `(v - mean) / sd`, with mean and sd taken per cell over the board's sampled legal moves, rather than by `v - mean`. Cells with sd 0 are skipped. This stands for per-cell gain adaptation, an engineering hypothesis.
2. **Readout:** `v = .8*(1 - (r05 + r07) / (n05 + n07)) - .32`, with r the current and n the naive response. So a compartment contributes in proportion to its real response.

Marks and all else stay fixed. The change will be judged first by the shared-cell count from the probe.

3. **Floor, added before main data:** a cell can enter the code only if its rise is at least 1% of the image's largest rise [choice]. Reason: ranking by `(v - mean) / sd` gives a cell that rises in only one move the top score however small the rise, so without a floor the code could select numerical noise. The probe reports shared cells after this floor.
