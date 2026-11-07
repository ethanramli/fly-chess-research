# Three proposals awaiting the researcher's approval (2026-11-03)

**Researcher decisions, 2026-11-03:**

1. **C approved:** use the existing Lichess puzzle database and fetch the needed game histories. Generate training and development examples only; locked sets stay closed. The exclusion of earlier games must be verified with evidence, not folder names.
2. **A1, build only:** build and test the eye-test runner and its saved run settings, and prepare its exact command and limits for review. **Do not run the fly simulation.**
3. **B and A2 not approved.** The researcher noted the formula's recorded earlier failures, and asked why transfer had been restricted to changes inside the brain. Answer: that restriction was a mistake and is corrected in the [revision](restart-plan-revision-2026-11-03.md), problem 7 correction; it does not change the reasoning-first scope.

**Original status line: proposals only. Nothing here is approved or has run.** Training, fly simulations and sealed test data stay blocked until the researcher approves a specific proposal below. The researcher asked for these on 2026-11-03, after the [peer-review fixes](../../../research/reports/overnight-peer-review-2026-11-02/fixes-2026-11-03.md). Each proposal unblocks one item that the fixes could not finish without a run or a decision.

Order: **C (game source) first**, because the eye test needs twin pairs. Then **A (fly simulations)**. **B (memory formula)** is the formula that the second simulation in A tests.

Passing software tests does not show that the fly passes any scientific test. Every result below is still unknown.

## Words used here

- **Full-graph pass:** one run of the simulated brain on one input, through all 134,209 neurons and 2,700,513 connections.
- **Twin pair:** two boards where the same move has opposite certified answers.
- **Bucket:** the group (training, development or one locked set) that a game is assigned to by a fixed hash of its game code.
- **Gain:** a number that scales the strength of one connection. 1 is the released strength.

## Proposal C: the chess-game source

### What the repository already has

1. The **Lichess puzzle database**, decoded at `.cache/lichess-puzzles-2026-10-21.csv` (1,139,783,132 bytes; the compressed download is 307,234,795 bytes). Its download and decoding receipts are preserved in the [early-development Lichess report](../../../archive/early-development/research/reports/lichess-foundations-pilot-2026-10-21/README.md). Each row gives a position from a real game, the source game's address (`GameUrl`, for example `https://lichess.org/yyznGmXs/black#34`), themes and a rating.
2. A recorded method for fetching full game histories: the Lichess **export games by IDs** endpoint, up to 300 game codes per request, returning PGN (the standard text format for chess games). This was read from the official API specification and used for 192 games on 2026-10-22 ([source register entry](../../../research/literature/source-solution-register.md), section "2026-10-22 - Lichess games export by IDs").
3. The old split rule: each source game went to train (80%), validation (10%) or final (10%) by a SHA256 hash of its game code ([old curator line 150](../../../.codebase/scripts/data/curate-lichess-puzzles.mjs)).

No restart game source is registered yet.

### Proposal

1. **Source:** the Lichess puzzle database already on disk, for candidate positions, plus full histories fetched by game code from the export endpoint. No new large download.
2. **License:** CC0, public domain. The database page states: "Database exports are released under the Creative Commons CC0 license", for "research, commercial purpose, publication, anything you like" ([database.lichess.org](https://database.lichess.org/), read 2026-11-03). The Lichess terms of service allow use of its services "for your own personal or commercial use, such as in your own applications, projects, research, or products", subject to "reasonable caps" ([terms](https://lichess.org/terms-of-service), read 2026-11-03).
3. **Excluding every old game** (the plan requires this), without opening any sealed set:
   - Keep only games whose **old** hash bucket was train (`oldSplit` in [twin-pair-generator-v1.mjs](../../../.codebase/src/puzzle-learning/twin-pair-generator-v1.mjs)). Every old validation and final game, including all old sealed sets, is removed by the hash alone.
   - Remove old training games by game code. The code list is built only from archive folders whose path contains `train`. Folders whose path contains `final`, `sealed`, `locked`, `confirm` or `test` are never opened.
4. **New split** of the remaining games, by `restartSplit` (SHA256 of `fly-restart-split-v1:` plus the game code):

   | Bucket | Share | Used for |
   |---|---|---|
   | train | 70% | Eye test v2 pairs and all training puzzles |
   | development | 10% | snapshot choice only |
   | locked-a | 5% | Phase A locked set |
   | locked-b | 5% | Phase B locked set |
   | locked-c1 | 5% | Phase C, two ideas |
   | locked-c2 | 5% | Phase C, three ideas |

   Each locked bucket feeds exactly one locked set, once. The generator command refuses locked buckets; a separately approved sealing step will generate them and print only counts and a SHA256 code.
5. **Fetching histories:** one request at a time, at most 300 game codes each. Stop and wait on HTTP 429 (too many requests). Save every raw response with its SHA256. The exact rate rule was not verified: the API page returned no text on 2026-11-03.
6. **Rejected alternative:** the monthly game files. The database page summary gave about 31 GB for one recent month (not read word for word). That is too large for this laptop, and the puzzle database already gives real-game positions.

**Limit:** a twin board is one edit away from a real-game board, so the twin itself was not reached by real moves. Each pair records the real history of the original board and the single edit.

**Approve C to allow:** building the old-training code list, fetching histories for train and development games, and running `generate-twin-pairs.mjs` on them. Locked sets remain blocked.

## Proposal A: the fly simulations

Two simulations, run one after the other, never at the same time as another brain-model run.

### A1. Eye test v2

**What it checks:** whether the brain's response to Eyes v2 input carries the safe-or-unsafe answer, and whether reachable connection strengths can turn that into a measurable difference. The rules are in the [revision](restart-plan-revision-2026-11-03.md), problem 5. Memory stays unchanged; the full fingerprint is checked after every pass.

**Inputs:** 48 twin pairs from 48 train-bucket games (Proposal C), task `capture`, with zero input collisions on the real retina.

**Passes:**

| Part | Full-graph passes |
|---|---|
| Graph, unchanged strengths, 96 boards | 96 |
| Tokens comparison, 96 boards | 96 |
| Strength settings "plus" and "minus", Graph and Tokens, 96 boards each | 384 |
| Shuffled wiring, only if Graph passes | up to 288 |
| **Total** | **576, or 864 with shuffled wiring** |

**Estimated time:** the 2026-11-01 pilot measured about 0.22 seconds per full-graph pass at half CPU (553 passes in about 120 seconds per arm). So 576 passes take about 2 minutes, plus graph loading and decoder fitting. **Plan for 15 minutes; hard stop at 60 minutes.**

**Memory limit:** at most 2048 MiB process memory (the limit for new work), at least 256 MiB free system memory, `--max-old-space-size=256`, `--cpu-duty 0.5`. The pilot peaked at 258 MiB.

**Command, once its runner and registration are written and reviewed:**

```
fly.cmd --config "python actions/eye-test-v2-step.json" plan eye-test
fly.cmd --config "python actions/eye-test-v2-step.json" start eye-test
```

The runner does not exist yet. It will reuse `createEyesV2`, the existing `neuron-reader` recorder and `eye-test-v2.mjs`. Writing it is software work and needs no run; it will be written only after A is approved, so that its numbers are fixed by an approved plan.

**Results that stop the work** (from the plan, unchanged): Tokens below 44/48 means a pipeline fault. Raw eyes at least 36/48 means a shortcut. Graph at most 30/48 means no. Anything not a clear pass means stop and talk.

### A2. Memory test for the MBON05 move score

**What it checks:** whether the memory formula in Proposal B lets verified feedback move MBON05-based move margins in both directions, against the absent, shuffled and plasticity-off controls. This is the evidence that switches on [move-score-contract-v1.json](../../../.codebase/src/neural-learning/move-score-contract-v1.json). It runs only if A1 passes.

**Design:** the same structure as the completed 2026-11-01 pilot, so its runner and audit can be reused: four associations from four of the A1 twin pairs, 24 practice trials each, a 16-step delay, then 24 reversal trials, with read-only tests after each block. Changes from the pilot: the score is the MBON05 contract score (not the pilot's readout); every move is scored with `frozenScores` from unchanged memory, so learning happens only after the choice; no separate answer file.

**Arms and runs:** informative, absent, matched-shuffled and plasticity-off, each with 3 seeds: 12 arms.

**Pass rule:** in all 3 seeds, the informative arm ranks all four items correctly after acquisition, after the delay and after reversal; and every control arm fails that same joint rule in every seed. Any other result means stop and talk.

**Passes and time:** about 553 full-graph passes per arm (as in the pilot), so about 6,600 passes. At about 0.22 seconds each, about 25 minutes. **Plan for 60 minutes; hard stop at 120 minutes.** Same memory limits as A1.

**Command, once written and reviewed:**

```
fly.cmd --config "python actions/mbon05-memory-test-v1-step.json" plan compare
fly.cmd --config "python actions/mbon05-memory-test-v1-step.json" start compare
```

**Approve A to allow:** writing both runners and registrations, then running A1, then A2 only if A1 passes.

## Proposal B: the memory formula

### The formula

For every positive connection from a visual Kenyon cell (KCg-d) to MBON05 (the γ4 output cells), after the chosen move's feedback period:

`g ← clip( g + η · dt · D · (k + g − 1),  0.2,  1 )`

- `g`: the connection's gain. Starts at 1.
- `k`: the Kenyon cell's activity above rest, divided by 1.5 (the existing activity scale), never below 0.
- `D`: minus the mean activity above rest of the PAM08 dopamine cells (the γ4 dopamine cells), divided by 1.5. So D is never positive.
- `η = 0.5`, the existing default [choice]. `dt = 1` per feedback period. The run stops with an error if η · dt · |D| > 1 (the existing stability check).
- No update while moves are scored. Only the chosen move's feedback period counts.

Effect: when dopamine fires, active Kenyon cells weaken their connection to MBON05, so MBON05 responds less to that board and the move scores higher (the contract uses −MBON05). Inactive Kenyon cells recover toward 1. Gains can never exceed 1: the new value is a weighted average of the old gain and a number at most 1 ([proof](../../../research/reports/overnight-memory-plasticity-2026-10-31/pre-data-corrections.md), part 2).

**Code:** this is the existing `ReversalMemory` in [reversal-memory.mjs](../../../.codebase/src/neural-learning/reversal-memory.mjs), given the γ4 connection map (MBON05 with PAM08) that the 2026-11-01 pilot runner already builds. No new learning code is needed.

### Biological support and its limits

| Claim | Source | What was read |
|---|---|---|
| Activating MBON05 alone makes flies avoid | Aso et al. 2014, eLife 3:e04580 | Results and Figures 2-3 ([neuron-reader review](../../../research/reports/neuron-reader-design-review-2026-10-31/README.md)) |
| In γ4, odor followed by dopamine weakens the Kenyon-cell connection; the reverse order strengthens it; two dopamine receptors are involved | Handler et al. 2019, Cell | Abstract and figure legends only |
| The equation form `dW = d · (k + W − 1)` | Gkanias et al. 2022, eLife (a model) | Part of the paper and its code |
| One dopamine pair weakens and then restores an output response | Berry et al. 2018 | Abstract, introduction, part of results |
| Compartments differ in how fast they learn and forget | Aso and Rubin 2016, eLife | Full text |

All are listed in the [source register](../../../research/literature/source-solution-register.md).

### Assumptions (not established)

1. The γ4 connections in the model stand for the real γ4 compartment. The map uses Kenyon-cell type and side, not synapse positions.
2. Activity above rest in a rate model stands for dopamine release. No timing between odor and dopamine is modeled, so the strengthening that Handler reports for the reverse order is not included.
3. Punishment gives no MBON05 change, because no dopamine pathway in this map raises MBON05. A punished move is learned only by contrast with rewarded ones.
4. η = 0.5 and the 0.2 floor are engineering choices, not measured values.
5. The two MBON05 cells have different graph signs ([sign report](../../../research/reports/mbon05-sign-provenance-2026-11-01/README.md)). This is recorded, not corrected.

### Known risks from earlier evidence

1. In the old early-development work, this recovery term erased a one-lesson memory in about 10 lessons (restart plan section 5).
2. The original γ4 association tests V1 and V2 failed; V2's reversed choice was correct in only 3 of 6 seeds ([record](../neural-learning/gamma4-association-tests.md)). Those used the old token input, not Eyes v2.

So this formula may fail A2. If it does, the result is reported as a failure. Other candidates already in the repository (the prediction-scaled reservoir and the cubic reservoir rules) are not selected by this proposal and would need their own approval.

### Required checks

1. Software, before A2: a fixture test that the γ4 map has only positive KCg-d to MBON05 connections, that gains stay within 0.2 to 1, that scoring never changes memory, and that the plasticity-off arm leaves every gain at exactly 1.
2. A2 itself, with its pass rule above.
3. An independent replay of every feedback event and gain change from the saved records, like the pilot audit.

**Approve B to allow:** using this formula in A2. It does not approve training on chess puzzles.

## What to approve, in order

1. **C:** game source, exclusion rule and split. Unblocks the twin-pair data.
2. **A1:** Eye test v2. Unblocks the decision on whether the input carries the answer.
3. **B with A2:** the memory formula and its test. If A2 passes, the move score is switched on. Training still needs its own approval.
