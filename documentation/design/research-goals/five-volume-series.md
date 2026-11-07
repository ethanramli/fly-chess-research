# Five-volume research series: Can a Fly Play Chess?

**Status:** Researcher-proposed series structure, 2026-11-01. This is a publication plan, not a claim that the proposed results have been achieved.

## Purpose and scope

The project combines connectome-constrained neuroscience, computational modeling, learning experiments, transfer tests and chess performance evaluation. That is too broad for one readable research paper. The proposed five-volume series gives each part a distinct question and evidence boundary while keeping the volumes connected.

The central subject is a **computational model derived from a Drosophila connectome**. Results about this model do not by themselves establish what a living fly can learn or whether living flies can reason. Those claims require relevant behavioral evidence from living flies.

The shared series title is **Can a Fly Play Chess?** The volume names and questions below are working titles and can be refined as evidence and literature develop.

## Volume plan

| Volume | Working title and question | Main contribution | Neuroscience | Computer science | Mathematics |
|---|---|---|---|---|---|
| 1 | **Methodology** — no single formal research question | Explain the origin and design of the project, why chess is used, what approaches worked or failed, how the computational design was made feasible, and how earlier components can be tested by others. | Connectome-derived constraints and the biological features retained or simplified. | Sparse graph simulation, architecture, implementation decisions, reproducibility, resource profiling, and reusable components. | Graph theory; sparse linear algebra; computational complexity; memory and runtime measurement. |
| 2 | **The Classroom** — *Can a simple organism-derived model based on a Drosophila connectome learn under computational constraints?* | Test whether the model learns from experience and feedback, with appropriate controls. | Learning, plasticity, feedback pathways, and the distinction between model learning and learning in a living fly. | Online learning, feedback delivery, experiment controls, and reproducible training records. | Dynamical systems for changing activity or memory; statistics for learning curves and control comparisons. |
| 3 | **Reasoning** — *Can a Drosophila-connectome-derived model generalize to unfamiliar chess positions under computational constraints?* | Test transfer to locked, unfamiliar positions and counterfactuals, using a stated operational test for reasoning. | Neural constraints relevant to learned associations and transfer. | Generalization tests, held-out evaluation, candidate choice analysis, and separation of learned behavior from external search. | Statistical inference for transfer; probability and game-tree analysis for chess consequences. |
| 4 | **The Limits of Biology** — *To what extent do memory and learning constraints limit performance in this model?* | Measure specific limits such as retention, forgetting, interference, capacity, and resource dependence. | Memory, forgetting, interference, retention, and biological plausibility of the modeled mechanisms. | Model capacity, resource bounds, failure analysis, and sensitivity to design assumptions. | Information theory and capacity; retention/decay models; uncertainty around measured limits. |
| 5 | **Chess** — *To what extent can a Drosophila-connectome-derived model improve its chess Elo under computational constraints?* | Measure chess rating progress and provide a reproducible playable release when ready. Playing style is a secondary analysis. | How modeled biological constraints relate to decision behavior; avoid treating playing strength as a direct measure of cognition. | Chess policy, legal move selection, benchmark design, versioning, release and community evaluation. | Elo's logistic rating model; probability; calibration; rating uncertainty and performance statistics. |

## Confirmed chapter names, 2026-11-04

The researcher confirmed new chapter names for all five volumes. They replace the 2026-11-01 working chapters below. Each volume README lists the confirmed chapter files and links the superseded outline, which is kept as history.

1. **Methodology:** Introduction; Failed Attempts; Choices; Experimental Process; AI Usage; Appreciation.
2. **The Classroom:** Rome; To Teach; To Learn; Prefrontal Cortex; Evidence for Learning; Constraints; Conclusion.
3. **Reasoning:** Why You Should Care; Definition of Reasoning; Reasoning in Humans; Process; Evidence; Constraints; Conclusion. This volume tests the connectome with disclosed computational aids; a negative result is also evidence.
4. **The Limits of Biology:** I Am Nervous; Amnesia; IQ; Decay; Evidence; Survival?; Where I Failed. The Evidence chapter is a proof by contradiction about the raw connectome model (with reinforcement learning, without the aids), not the living fly.
5. **Chess:** Why Chess?; José Raúl Capablanca; Pedagogy; Elo; Overture; 1v1?. The fly's target playing style is Capablanca's: simple, low-compute improvement of the position. Elo uses about 50 games against Stockfish levels and still needs the calibration design. Overture and 1v1? publish versioned checkpoints for anyone to test and play.

## Proposed chapter outline (superseded on 2026-11-04)

These are working chapter titles and contents. The outline is deliberately staged: each volume answers a different question and does not assume that later claims have already succeeded.

### Volume 1 — Methodology

No single formal research question; this is the project's origin, design and reproducibility volume.

1. **The question that started the project** — The motivation, the simple-organism idea, and how the project question developed.
2. **Why chess?** — Chess as a measurable testbed for choices and consequences; what chess can and cannot establish about reasoning.
3. **Approaches tried and lessons learned** — Earlier components, what worked or failed, and dated pivots without rewriting failures as successes.
4. **From a large simulation estimate to a compact graph model** — Explain the Monte Carlo estimate and graph-simulation resource figures, how each was calculated, and which are estimates versus measured benchmarks.
5. **Why this learning approach?** — Connectome constraints, the decision not to use backpropagation for the primary learner, and the alternatives' roles as comparisons.
6. **Reproduce and explore the components** — Pinned sources, setup, limits, and a guided route for readers to inspect or test earlier components.

### Volume 2 — The Classroom

**Research question:** *Can a simple organism-derived model based on a Drosophila connectome learn under computational constraints?*

1. **What does “learning” mean in this study?** — Define observable learning and distinguish it from activity, memorization, or a changed score alone.
2. **What living flies can learn** — Literature on Drosophila learning, kept separate from results on the computational model.
3. **How the model receives experience and feedback** — Describe the task, feedback source, modeled teaching pathway, and where persistent changes can occur.
4. **How learning is tested fairly** — Training and held-out examples, controls, independent verification, resource limits, and analysis plan.
5. **What the model learned** — Results by criterion, failed gates, retention evidence, limitations, and the next question raised by the evidence.

### Volume 3 — Reasoning

**Researcher clarification, 2026-11-01:** this is the volume for pushing the limits of biology and computer science to make the fly-connectome-derived system reason under computational constraints. Engineered memory and disclosed computational aids are permitted; an exact biological memory solution is not a prerequisite for that condition. State each component's contribution and test unfamiliar combinations and counterfactuals against matched retrieval-only/no-memory controls. The current engineered-memory direction is an enabling method for this volume, while biological memory-limit findings also inform Volume 4. [Volume 3 writing scope](../../../research/literature/writings/03-reasoning/README.md).

**Research question:** *Can a Drosophila-connectome-derived model generalize to unfamiliar chess positions under computational constraints?*

1. **What counts as reasoning here?** — State the operational definition and what evidence would be necessary for the project's claim.
2. **From learned facts to unfamiliar positions** — Explain why success on training examples is not transfer and define the held-out tests.
3. **Testing concepts separately** — Establish whether component concepts can be learned and used on new examples.
4. **Testing unfamiliar combinations and counterfactuals** — Test whether learned concepts can be applied together when the combination itself was not taught.
5. **Ruling out simpler explanations** — Memorization, leakage, search, symbolic cues, and matched-computation baselines.
6. **What the transfer results support** — Report successes and failures against predeclared gates; bound conclusions to chess and the tested model.

### Volume 4 — The Limits of Biology

**Research question:** *To what extent do memory and learning constraints limit performance in this model?*

1. **What limit are we investigating?** — Separate biological constraints, model design choices, and laptop resource limits.
2. **How memory is represented** — Explain the modeled memory state, overlap, persistence, and biological assumptions.
3. **Measuring retention, forgetting and interference** — Define tasks, controls, time points, and what counts as loss or preservation.
4. **Mathematical limits under explicit assumptions** — Prove a bounded statement about the formal model, such as a capacity or retention limit, only if the assumptions and proof are precise; compare its predictions with measurements.
5. **What remains unknown about biological limits** — Explain what the model results do and do not imply about living flies; do not claim finite tests prove universal impossibility of reasoning.

### Volume 5 — Chess

**Research question:** *To what extent can a Drosophila-connectome-derived model improve its chess Elo under computational constraints?*

1. **What does Elo measure?** — Explain ratings, opponents, reference pool, and why Elo measures chess performance rather than reasoning.
2. **How the rating study is designed** — Pin model snapshots, engine/opponent settings, time controls, openings, colors, and compute limits.
3. **Calibrating and reporting Elo** — Define calibration data, uncertainty, game counts, and safeguards against tuning on final evaluation games.
4. **How Elo changes with training** — Show rating progress alongside the training conditions and relevant controls.
5. **How the model plays** — Secondary analysis of style, move choices, and characteristic strengths or weaknesses; avoid inferring style from anecdote alone.
6. **A playable, reproducible release** — Version, setup, limitations, and instructions for readers to play and report results.

## Evidence boundaries

- Volume 1 may report engineering measurements and design history. Memory or runtime numbers, including comparisons between an estimated Monte Carlo workload and a graph simulation, need a reproducible calculation or benchmark and must be labeled as estimates or measurements accordingly.
- Volume 2 can support a claim that the **model** learned under the tested conditions. A claim that flies learn should be grounded in literature or experiments on living flies and kept distinct from model results.
- Volume 3 can provide evidence of transfer under the project's predefined tests. Chess transfer alone does not establish broad, cross-domain reasoning or reasoning in a living fly.
- Volume 4 should investigate bounded, measurable constraints. Experiments can show that a specified model or organism fails under tested conditions; they cannot establish universal impossibility of reasoning from finite tests. Do not turn model-specific forgetting into a general biological limit without independent evidence.
- Volume 5 can report Elo as a measure of chess performance only after the rating method and reference pool are defined and calibrated. Elo gains do not by themselves demonstrate learning mechanism, transfer, or reasoning.

## Series continuity

Each volume should state its question, evidence, limitations, and relationship to the other volumes. Preserve shared identities for model versions, datasets, evaluation protocols, and software releases where comparisons depend on them. Later volumes may build on earlier components, but should identify which evidence is reused and which results are independently re-evaluated.

The volumes are not assumed to be five successive proof steps. In particular, chess strength in Volume 5 is a separate performance outcome from the transfer evidence in Volume 3, and the limits investigated in Volume 4 are not a pre-decided conclusion that reasoning is impossible.

## Writing workspace ? researcher clarification, 2026-11-01

The researcher retains **The Limits of Biology** as Volume 4?s title and intends to adapt volumes for different competitions and possible journal submissions. The [separate writing workspace](../../../research/literature/writings/README.md) holds all five volumes. No hundreds-of-pages requirement is imposed; around 50 pages is a possible personal target, subject to evidence and destination requirements.
