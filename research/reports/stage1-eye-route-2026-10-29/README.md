# Eye input route (input v3 candidate), preparation (2026-10-28/29)

Researcher decision 2026-10-28: use Carlo Esposito's fly-chess retina placement and cite him (archive, licence and citations: [cesp99-retina-2026-10-28](../../literature/cesp99-retina-2026-10-28/README.md); source register 2026-10-28). Only the anatomical photoreceptor-to-square placement is used. His trained input weights are not used. Our graph's connectivity was verified against FlyWire on 2026-10-28 ([provenance check](../connectome-provenance-check-2026-10-28/README.md)).

## Step 0: wiring only (done; `eye-paths.py`, output `eye-paths-results.txt`)

The model propagates for 8 steps, one synapse per step. Shortest synaptic paths from the 5,543 retina photoreceptors:
- All 5,177 Kenyon cells (FlyWire class Kenyon_Cell) are within 5 hops on any path (2 hops: 145; 3: 580; 4: 4,451; 5: 1).
- Using excitatory edges only, 5,135 are within 7 hops (most at 4-5), and 42 are not reached within 12.
- The learner's encoder pools: MBON01 pool (84 KCs) at 3-4 hops (excitatory 4-6; 3 not reached), MBON12 pool (664) at 3-4 hops (excitatory mostly 4-5; 24 not reached).

The wiring therefore does not block the route. Whether the signal survives in strength, and is board-specific, is not shown by wiring: Esposito needed data-calibrated gains for his visual pathway.

## Step 1: reach test (prepared, not run; `eye-reach.mjs`)

This is a read-only simulation of the registered full-r14 learner, with no memory change.
- **Rendering.** The 24 training roots are shown to the photoreceptors under a fixed, declared rendering: per square, mover's piece 1.5, opponent's piece 0.75 or 1.5, empty 0.
- **Measures.** Active KCs (all KCs and the encoder pools), and board specificity as the mean pairwise correlation of KC activity across boards.
- **Timing.** It must wait until full-r14 has finished, because graph work is serial.

**How to read the outcome:**
- **No KC activity, or near-identical patterns for every board:** the eye route needs a justified amplification model before it can carry boards. Do not tune it to make it work.
- **Board-specific activity:** next, the representation-ceiling and planner-surrogate transfer checks against cue v2, eyes alone and eyes plus attack map.

Five optic-lobe neurons have near-tied transmitter labels that differ from our reimplementation (15 edges; provenance check). They lie on this route and are recorded here.

## Step 1 results (2026-10-29, read-only, run alongside the full-r14 audit)

Scripts: `eye-reach.mjs`, `cue-reference.mjs` and `eye-gain.mjs`. Results are in the matching `*-results.jsonl` files. All three ran with the full-r14 r1 learner built read-only, and memory was unchanged in every run.

| Measure | Eyes (24 training boards) | Cue-style direct KC input (128 KCs at 1.5) |
|---|---|---|
| KCs above rest | 270-2,372 of 5,177 | 279-379 |
| Mean KC activity above rest | 2e-6 to 1e-4 | 0.038 (stimulated KCs 1.48) |
| Board specificity (mean pairwise KC correlation) | 0.36-0.37 | - |
| Learner pools reached (MBON01 / MBON12 / MBON07 KCs) | 0-61 / 1-400 / 10-640 | - |

Gain curve on 4 boards (`eye-gain.mjs`), photoreceptor current x1, x10, x100, x1000: mean KC activity rises from 0.1% to 0.7% of the cue level, then saturates (x100 equals x1000). Correlation across boards stays at 0.40-0.44.

**Findings** (measured on this pinned graph and rate model, with a fixed declared rendering):
1. The eye signal reaches the mushroom body, and different boards produce different KC patterns. Wiring and step count do not block the route.
2. At best it delivers about 0.7% of the cue's KC drive. The loss is in propagation through the pathway, not in the chosen brightness, so raising photoreceptor current cannot fix it. KC->MBON plasticity scales with KC activity, so learning through the eyes alone would be about 140x weaker per lesson, before any other difference.
3. The eyes see the board, not the candidate move. The learner scores each legal move, so eye input alone cannot tell candidate moves apart. It could at most supply board context next to a move-specific input.

**Implication for input v3:** the eye route is not a drop-in replacement for the cue. Esposito's model reached usable drive with learned photoreceptor weights (w_ret) and homeostatic gains, which are trained by backpropagation and are excluded here. A biologically supported option would need its own mechanism and evidence, for example a gain-control or adaptation step in the visual pathway, registered in the source-solution register before use. Next candidates, untested:
- (a) eyes as board context added to cue v2, tested with the representation-ceiling and planner-surrogate checks;
- (b) the olfactory projection-neuron route that was the first choice for v3, the mushroom body's main natural input, which has fewer synapses to the KCs.

## Step 2 (2026-10-29): eye signal by KC type, and where the visual KCs sit in the learner

Script `eye-visual-kc.mjs` (Haiku agent, reviewed; read-only, memory unchanged, peak 171 MiB) and `kc-types.py`, which maps all 5,177 KCs to FlyWire consolidated types. The visual KCs are KCg-d (295) + KCab-p (128) = 423, i.e. 8.2%, matching Ganguly et al. 2024 (8%, verified abstract).

| KC group | n | Share of eye-driven above-rest KC activity | Eye / cue mean activity |
|---|---|---|---|
| visual (KCg-d + KCab-p) | 423 | **93.7%** | **5.2%** |
| KCg-m | 2,189 | 3.8% | 0.06% |
| KCab (other) | 1,644 | 0.4% | 0.007% |
| KCapbp-* | 916 | 0.9% | 0.04% |

Board specificity within the visual group: mean pairwise correlation 0.33 over 276 pairs.

**Visual KCs inside the learner's pools** (main-session check of the registered mappings, unique KCs):

| Pool | Visual KCs |
|---|---|
| MBON01 (restrained) | 0 of 84 (all KCapbp) |
| MBON12 (restrained) | 1 of 664 (KCapbp + KCg-m) |
| MBON07 (alpha1 reward store) | 122 of 1,577 (KCab-p) |
| MBON14 (alpha3 aversive store) | 32 of 1,340 (KCab-p) |

**Findings:**
1. Step 1's 0.7% was diluted. The eye signal is concentrated in the visual KCs, where it reaches about 5% of the cue level.
2. **Structural:** the restrained-memory pools (MBON01/MBON12) contain essentially no visual KCs. The eye route can only reach the alpha1/alpha3 stores, through KCab-p. This is a property of the released wiring, not a tuning issue.
3. Implication for input v3: an eye-based board context would act only through the alpha-lobe stores. Any test must use those readouts, and the Stage 1 learner's restrained pathway would never see it.
