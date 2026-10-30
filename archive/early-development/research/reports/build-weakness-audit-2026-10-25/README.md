# Build weakness audit (2026-10-25)

Read-only audit of the current Stage 1 build (registrations r6-r9, ReversalMemory, action-relative cues, coupled Stockfish brain). No graph run was started for this audit; retention probe v4 (`runs/stage1-retention-probe-v4-tag-cue`) was running separately. Numbers come from the artifacts named in each row; literature claims are marked as sources, my inferences as **hypothesis**.

## Summary

The main blocker is the memory mechanism, not the input. With the registered rule and compartments, a lesson cannot last through 10 other lessons at any eta: high eta erases it, and low eta never makes it strong enough to change the choice. The literature says the two modeled compartments are fast, low-capacity short-term stores, while persistence in the source model comes from long-term-memory compartments and a positive-dopamine branch that this build omits. The Stockfish teacher is close to uninformative: the fly's value prediction is about 0, and the target is saturated and uncorrelated with the verified outcome. My 2026-10-25 recommendation (input change first) is therefore weakened; see the correction at the end.

## A. Memory mechanism (blocking)

| # | Weakness | Evidence |
|---|---|---|
| A1 | **Recovery erases every untouched synapse on every pulse.** `dg = eta*D*(k+g-1)` with k=0 moves an inactive synapse toward rest by factor `1-eta*abs(D)` per pulse. | From the logged DAN factors of the probes: fraction of a lesson's deviation kept by an inactive synapse after 10 interfering lessons: eta 0.5: 2e-4 (MBON12) / 3e-5 (MBON01); 0.2: 0.06/0.03; 0.1: 0.25/0.18; 0.05: 0.51/0.43; 0.02: 0.77/0.72 (`runs/stage1-retention-probe-v1`; v2 without Stockfish similar, e.g. 7e-4 at 0.5). |
| A2 | **Speed vs stability trade-off has no working point.** One lesson flips the choice only at eta >= 0.1 (3/4 boards), and at eta <= 0.05 board A stays at rank 2 after its own lesson. | `probe-eta*-s1syn-train-f0-pin-p0a.json` rank trajectories (v2): eta 0.02 and 0.05 rank 2 throughout; 0.5 swings 1 to 20 to 1. Probe results: best 1/4 retained at any eta (v1-v3). |
| A3 | **Only "restrained" short-term compartments are modeled.** MBON12 = MBON-γ2α′1 with PPL1-γ2α′1; MBON01 = MBON-γ5β′2a with PAM-β′2a. Gkanias et al. call these restrained MBONs that "store short-term memories" that are "very fragile"; persistence in their model comes from LTM MBONs (MBON-β2β′2a, MBON-α′1), forgetting/assimilation DANs and the saturation effect. | `.codebase/src/neural-learning/reversal-memory.mjs` (four types only); [Gkanias et al. 2022](https://elifesciences.org/articles/75611). |
| A4 | **Fixed-negative branch: no potentiation, so no consolidation.** From scratch, gains stay in [0.2, 1]; the 1.8 bound is unreachable, and the source's δ>0 "saturation" (its persistence mechanism) cannot occur. Already documented as a limit. | `documentation/design/neural-learning/bidirectional-plasticity-without-freezing.md` items 1-2. |
| A5 | **Capacity mismatch.** Fast compartments in flies hold about one association: for PPL1-γ1pedc "only the most recently learned association was remembered"; unpaired DAN activation reduced immediate memory in 4 of 5 DAN sets. The build asks two such compartments to hold 24 board associations. | [Aso & Rubin 2016](https://elifesciences.org/articles/16135). **Hypothesis:** the target is beyond what this compartment pair supports biologically, whatever eta is. |
| A6 | **eta has no kinetic basis.** 0.5 is the upstream code's `1/(steps-1)` default. | `documentation/design/neural-learning/reversal-mechanism.md` line 9. |
| A7 | **The anti-forgetting property the fly uses is inverted.** Shen, Dasgupta & Navlakha show the MB reduces catastrophic forgetting by sparse codes plus learning *only* at synapses of activated KCs ("remaining weights are frozen"). Here recovery changes the inactive KCs. Note: a previous blanket deletion of recovery failed, and Aso & Rubin support some DAN-alone erasure, so this is a design tension, not a fix. | [Shen et al., Neural Computation 2023 / arXiv 2107.07617](https://arxiv.org/abs/2107.07617). |

## B. Mapping and readout

| # | Weakness | Evidence |
|---|---|---|
| B1 | **Success channel covers a small part of its MBON.** Only β′2a (PAM02) is plastic on MBON01; its γ5 KC inputs are excluded (no PAM-γ5 mapped). MBON01 plastic KCs: 76 left, 8 right (84 total) vs MBON12 664. KC→MBON01 edges: left 612 total (500 KCg-m excluded), right 132 total. | `research/reports/reversal-candidate-2026-10-05/mapping.json` (groups, observedKCTypes). |
| B2 | **Left/right asymmetry.** The right MBON01 group has 8 plastic edges, so one of the two MBON01 readout cells is effectively fixed, halving success leverage on `mean(MBON01)`. **Hypothesis:** annotation or proofreading incompleteness on the right; not verified against FlyWire Codex. | same mapping; readouts in `research/data/lichess-stage1-synthetic-v1/model-source.json` (MBON01: 2 cells, MBON12: 4). |
| B3 | **Weak, compressed readout.** Typical MBON12 activity is about 0.035; the median top-1 vs top-2 score gap is 0.0024 and the median spread over all legal moves is 0.013 (12 assessments, r6 informative block 1). An earlier fixture had a correct-choice margin of +0.0000979. Gains bounded in [0.2, 1] limit how far any lesson can move this. | `runs/lichess-stage1-synthetic-v1-smoke-r6/r1%3Ainformative/attempt-001/block-01/receipts.jsonl`; current-status 2026-10-07 score reanalysis. |
| B4 | **Projection is not KC-like.** Each token is hashed to an independent KC in each compartment pool, so one "feature" is carried by different KCs in MBON01 and MBON12. A real KC's axon carries the same activity through several compartments. There is no measured sparseness or APL check for these cues. | `.codebase/src/chess-input/public-action-relative-cue-v2.mjs` (`pools.map`, per-pool bucket); APL sparse coding: [Lin et al. 2014](https://doi.org/10.1038/NN.3660). |

## C. Teaching signals

| # | Weakness | Evidence |
|---|---|---|
| C1 | **Stockfish pulse is uncorrelated with the verified outcome.** Stockfish channel by task outcome (eta 0.5 probes): v1 failure→PAM02 31, success→PAM02 26, failure→PPL103 13, success→PPL103 18; v3 failure→PPL103 30, success→PPL103 28. Correct moves are often punished (e.g. h4g5 success then PPL103 current 0.75). | `runs/stage1-retention-probe-v1/probe-eta0.5-*.json`, `-v3-mover-value`. |
| C2 | **Saturated absolute target.** 74% of training moves are saturated; every move on 12/24 boards has the same sign. | `research/reports/stage1-retention-probe-2026-10-24/README.md`. |
| C3 | **The fly's value prediction is about 0, so the "error" is the target.** Prediction = tanh((MBON12−MBON01)/valueScale) with valueScale 1 and score spread about 0.013, while targets are near ±1. Learning cannot shrink this error in the bounded gain range, so every Stockfish event acts like a fixed-sign pulse that triggers recovery. | `.codebase/src/search-and-feedback/stockfish-target.mjs` (`provisionalMBONValue`), `stockfish-value-brain.mjs` (valueScale = 1); B3 numbers. **Hypothesis** for its contribution to erasure: supported by probe v2 (no Stockfish) keeping about 4x more at eta 0.5 (7e-4 vs 2e-4), still far too little. |
| C4 | **Two teachers share the same synapses.** Task and Stockfish pulses both drive PPL103/PAM02 on the same KC→MBON edges, with opposing signs in about half the events, so they cancel and add extra recovery pulses (2-3 PPL103 pulses per lesson). | lesson records in the probe files (`pulses` per event). |

## D. Data, gates and statistics

| # | Weakness | Evidence |
|---|---|---|
| D1 | **Very small sets.** 24 training, 16 validation, 64 final boards; D2 needs >= 14/16 validation from 24 taught boards, across 4 strata. Validation in r6 was 3/16. | `research/data/lichess-stage1-synthetic-v1/*.jsonl`; r6 `audit.json`. |
| D2 | **Single-replica counts are noisy relative to the acceptance margin.** r8 informative block-start counts 4, 7, 2, 8, 4, 6, 6; r6 controls at block 8 range 3-7 of 24. The smoke acceptance (+6 over block 0 and +4 over every control) is within about one swing of this noise, so a smoke pass or fail is weak evidence by itself. | `runs/lichess-stage1-synthetic-v1-smoke-r8-resume-0001/result.json` (earlyStop.counts); r6 audit diagnosis. |
| D3 | **Early-stop window K=3 (smoke) is short for this noise.** It fired on r8 after a single dip. | same. |
| D4 | **Synthetic boards** (<= 6 pieces), built to make the capture-retention task checkable; transfer to real positions is untested. | registration protocol `data` text. |

## E. Engineering

| # | Weakness | Evidence |
|---|---|---|
| E1 | **Slow inference.** 229 ms wall (124 ms CPU) per candidate presentation on the full graph at duty 0.5; each legal move is scored separately (about 21 per board), so one decision costs about 5 s, and a probe of 24,820 presentations took 5,688 s. Search-based play at a 2000-Elo target is far out of reach at this cost. | `runs/stage1-retention-probe-v3-mover-value/result.json`, probe `presentations`. |
| E2 | **Versioned-copy sprawl.** 108 of 491 source/script `.mjs` files are `-vN` copies (pinning forbids edits), e.g. the 364-line runtime factory copied to change one import. Review and drift risk grow with every revision. | file count, `.codebase/src`, `.codebase/scripts`. |
| E3 | **No automated test touches the real graph.** 0 of 107 test files load `full.npz`; graph behaviour is checked only by multi-hour runs. | grep of `.codebase/tests`. |
| E4 | **Tooling defects found only on real runs** (four in the task 2 launcher/supervisor alone). | ledger L016-L017. |
| E5 | **Most of the graph may be idle in the decision path.** Cues stimulate KCs one synapse from the read-out MBONs, and the model runs 8 rate steps. **Hypothesis, untested:** the result may barely depend on the rest of the 139k-neuron graph, while cost scales with all of it. Test: compare scores with an MB-only subgraph (read-only). | `model.steps` 8 in the registration; mapping. |

## F. Scope limits (already documented, kept for completeness)

Symbolic encoders bypass vision; a rate model, not spiking (cf. the LIF whole-brain model of [Shiu et al. 2024](https://ideas.repec.org/a/nat/nature/v634y2024i8032d10.1038_s41586-024-07763-9.html)); endpoint-only DAN rates `max(0, h-rest)` discard decreases, whereas PPL1 DANs encode valence bidirectionally ([Huang et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11525173)).

## Correction to my 2026-10-25 recommendation

I recommended the input-representation path (1a) because 21-27 of a board's cue cells are shared with other boards. Evidence found afterwards: (1) at token and cell level, interference with the v1 input is net helpful (cell pushes 52 harmful vs 63 helpful), and signed overlap correlates only weakly with A's rank change (r = 0.21-0.22); (2) A1/A2 show that the rule's recovery alone removes almost all of a lesson within 10 lessons at the eta needed to acquire it, independent of input. An input change can reduce the active-cell interference but not the passive recovery. Probe v4 still tests it, as agreed; if it fails, the evidence points to the memory mechanism (A3-A5: long-term compartments and the positive branch from the same source model), which needs a researcher decision and registered literature.

Reproduction: the numbers in A1, B1-B3, C1, D2, E1-E3 come from short read-only `node -e` computations over the named files; `encoder-crosstalk.mjs` in the sibling folder reproduces the encoder comparison.
