# Stage 1 retention probe (2026-10-24)

Fix-goal task 1 ([prompt](../../../documentation/handoffs/fix-goal-prompt-2026-10-24.md), [ledger](../../../documentation/handoffs/fix-goal-ledger-2026-10-24.md), [journal](../../journal/experiments/2026-10-24-stage1-memory-retention-fix.md)). Question: does a smaller `ReversalMemory` eta let a taught Stage 1 training board stay correct while 10 other training boards are taught? Training boards only; one replica (r1); full FlyWire graph; no validation or final rows loaded.

## Design (predeclared in each protocol)

From scratch memory: one lesson on board A (its highest-scored failure, then its highest-scored success, each a full coupled event), then one lesson on each of 10 other training boards (seeded order, identical across etas), assessing A after every lesson. A boards: the first panel per stratum whose scratch choice is wrong. Etas 0.5, 0.2, 0.1, 0.05, 0.02. Decision rule: the largest eta keeping A the unique top choice after all 10 interfering lessons in at least 3 of 4 probes.

| Probe | Learner | Teaching | Protocol | Action | Run |
|---|---|---|---|---|---|
| v1 | registration r6 (action-relative cue v1, coupled brain v2) | informative: task pulse + Stockfish value pulse | `research/data/lichess-stage1-synthetic-v1/stage1-retention-probe-v1-protocol.json` | `python actions/stage1-retention-probe-v1-step.json` | `runs/stage1-retention-probe-v1` |
| v2 | r6 | outcome-only: task pulse; Stockfish frame shown without a DAN pulse | `...-v2-no-stockfish-protocol.json` | `...-v2-no-stockfish-step.json` | `runs/stage1-retention-probe-v2-no-stockfish` |
| v3 | registration r7 (action-relative cue v2, coupled brain v3: Stockfish error on the move's own cue cells, mover perspective) | informative | `...-v3-mover-value-protocol.json` | `...-v3-mover-value-step.json` | `runs/stage1-retention-probe-v3-mover-value` |

Scripts: `.codebase/scripts/puzzle-learning/stage1-retention-probe.mjs` (v1) and `stage1-retention-probe-v2.mjs` (v2/v3; same procedure, condition from the protocol).

## Results

**v1 (with Stockfish phase), finished 15:33, `result.json` SHA-256 `e7c34b0d...16d6`:** retained 0/4 at every eta. Correct right after its own lesson: 3/4 at eta 0.5, 0.2 and 0.1; 0/4 at 0.05 and 0.02. Scratch 4/24 (equal to smoke r6 block 0). Peak RSS 380.5 MiB, 8250 s elapsed.

Pattern: after its own lesson A is the top choice (except `f3-blocked-p0a`, which its own lesson never lifts), but the punished scratch favourite returns within 1-3 interfering lessons, and no later at smaller eta. At 0.05 and below one lesson is too weak to change the choice.

**v2 (no Stockfish phase), finished 17:12, `result.json` SHA-256 `6dd4efc7...e25f`:** retained 1/4 at eta 0.5, 0.2 and 0.1 (always `f0-pin-p0a`), 0/4 at 0.05 and 0.02; acquired 3/4 at 0.5-0.1 and 0/4 below. Peak RSS 386 MiB, 5865 s. Only `f0-pin-p0a` differs from v1 (final rank 2 -> 1): the Stockfish phase is not the main cause of forgetting.

**v3 (mover-value cue, registration r7), finished 18:47, `result.json` SHA-256 `4691b533...ac21`:** retained 1/4 at eta 0.5, 0/4 at 0.2-0.02; acquired 3/4 at 0.5-0.1, 0/4 below. Peak RSS 386 MiB, 5689 s. First full-graph run of encoder v2 / brain v3: no runtime error.

| eta | v1 retained | v2 retained | v3 retained | acquired (all three) |
|---|---|---|---|---|
| 0.5 | 0/4 | 1/4 | 1/4 | 3/4 |
| 0.2 | 0/4 | 1/4 | 0/4 | 3/4 |
| 0.1 | 0/4 | 1/4 | 0/4 | 3/4 |
| 0.05 | 0/4 | 0/4 | 0/4 | 0/4 |
| 0.02 | 0/4 | 0/4 | 0/4 | 0/4 |

**Outcome for task 1: no eta passes (needs 3/4) under any of the three conditions.** Task 1 is recorded as failed with the diagnosis below; the literature check (task 1c) does not support the allowed rule variant, so the memory path stops for a researcher decision.

## Stockfish signal on these boards (no graph)

`stockfish-sign.mjs` (v3 receipts): the Stockfish pulse opposes the verified task outcome in 207/440 events (raises 67 punished moves, lowers 140 certified moves); both moves of a lesson receive the same channel in 183/220 lessons; median delivered |error| = 1 (current 0.75). `stockfish-saturation.mjs` (smoke-r6 review cache, training boards only): 289 of 390 legal moves have a saturated root-actor expected score (<= 0.05 or >= 0.95); on 12 of 24 boards every move is on the same side of 0.5 (9 boards are lost after every move: all six absent-defender boards, f3-blocked-p0a/p0b, f4-blocked-p0b); on 3 boards the certified success move has E = 0 while another move has E = 1. With the registered absolute target (W + D/2)/1000 minus the Fly's value, Stockfish mostly reports that a board is won or lost, the same for every move, so it can add little move-specific information, and on the move-cue (v3) it often pushes against the verified task lesson. This is a property of the target and of these synthetic decisive positions, not of the receiver.

## Cross-talk diagnostic (no graph)

`cue-crosstalk.mjs` re-encodes every taught move with the registered encoder and counts A's action-cue cells that the interfering lessons also drive (task token excluded). On v1 probes: 21-27 of A's ~29 cells are hit; by token kind capture-type 16/16, mover 10/10, vector 14/15, relative pieces 53/75. The signed overlap (success pulses raise, failure pulses lower the moves sharing their cells) correlates with A's rank change at r = 0.27 over 120 lessons (mean +1.08 when A's rank worsened, -1.89 when it improved). Hypothesis: generic action tokens recur across boards, so later lessons rewrite A's cells; A's imprint and this cross-talk both scale with eta, so eta alone cannot separate them. This ignores graph dynamics and graded KC activity; it is not a causal test.

## Literature check for a slower dopamine-only recovery rule (task 1c)

- Aso and Rubin, eLife 2016, 5:e16135 ([PMC4987137](https://pmc.ncbi.nlm.nih.gov/articles/PMC4987137/), figure legends at [elifesciences.org/articles/16135/figures](https://elifesciences.org/articles/16135/figures); accessed 2026-10-24, text and legends only, figure images not read): DAN activation without odor "significantly reduced immediate memory" for four of the five DAN sets tested; the alpha1 compartment (MB043C) resisted. One-day memory after spaced training with MB099C (PPL1-gamma2alpha'1 + PPL1-alpha'2alpha2) or MB630B was not reduced by DAN activation. Memory capacity is compartment-specific (gamma1pedc: one; alpha1: at least two). PAM-beta'2a (our PAM02) was not tested for decay or unpaired activation.
- Berry et al., Neuron 2012 (dopamine is required for learning and forgetting; [PMC4083655](https://pmc.ncbi.nlm.nih.gov/articles/PMC4083655), summary-level access via search results on 2026-10-24): hyperactivating DANs after learning erased memory; inhibiting them after training enhanced it; forgetting needs the DAMB receptor.
- Reading: for immediate memory in the compartments we model, primary data support dopamine-only erasure (the current recovery term), not a uniformly slower one. Slower erasure is supported only for a different compartment (alpha1) or after consolidation by spaced training over a day, which would be a consolidation mechanism with timing semantics our lesson counts do not have (AGENTS.md: numerical steps are not consolidation). Not registered as solution support; no rule variant implemented.
