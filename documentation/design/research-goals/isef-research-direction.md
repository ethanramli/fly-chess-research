# ISEF research direction: reasoning in the fly-derived model

Date: 2026-10-10, Asia/Jakarta. Advisory framing following the researcher's request to inspect official ISEF judging criteria. This is not an experimental registration, a category commitment, a result, or a predicted award score.

## Official judging criteria

The [Society for Science Grand Award criteria](https://www.societyforscience.org/isef/grand-award/criteria/), accessed 2026-10-10, give science projects these suggested weights: research question 10; design/methodology 15; execution/data/analysis 20; creativity/potential impact 20; presentation 35 (poster 10, interview 25). The question must be focused, identify a contribution and be testable. Controls, reproducible data, appropriate statistics, sufficient evidence, student understanding, independence and limitations are evaluated. Engineering uses a practical problem, solution requirements/constraints, alternatives, prototype and testing instead of the science question/design/execution criteria; the weights are the same. These are official criteria, not a guarantee of judging outcomes.

## Current overarching question

2026-10-10 researcher clarification supersedes treating the feedback-comparison question below as the overarching goal. The main motivating question is whether a simple organism-derived architecture can support transferable reasoning; our operational subject is the connectome-constrained simulation. Working main question: "Can a computational model constrained by the Drosophila connectome acquire transferable, consequence-sensitive reasoning through experience-dependent plasticity?" Use chess as the measurable testbed. The local-plasticity and prediction-error comparisons below remain possible subquestions only. Within-chess transfer does not establish domain-general reasoning or living-fly cognition. Scientific contribution requires operational criteria, disjoint/counterfactual tests and shortcut controls, not narrower wording alone. No new mechanism/protocol selected.

Candidate first causal experiment (a subquestion, not the overarching goal):

> How does consequence-driven local plasticity affect the accuracy and generalization of chess position evaluation in a Drosophila-connectome-constrained network?

Hypothesis to register after defining the value output and mechanism: informative, verified consequences improve useful evaluation and unaided choices on disjoint/counterfactual positions compared with absent, matched-shuffled and disabled-plasticity conditions, at matched exposure and declared computation. This states a measurable effect rather than presupposing reasoning or superiority.

The proposed contribution is causal evidence about whether the specified local mechanism can support useful evaluation beyond familiar associations, and which interventions explain success or failure. First-ever novelty, anatomical advantage and biological fidelity are unestablished. Preserve the from-scratch graph/sign/identity boundary and the source justification requirements. Checkpoint selection is a disclosed external engineering intervention, not the learning mechanism.

"Can the fly beat me?" remains an illustrative human comparison, not the primary causal question. A comparison with one researcher depends on that person's strength and supports only that participant-level conclusion. The broader predefined trained/untrained human comparison remains separate and later.

## Smallest useful direction

1. Define a fixed neural value output and the exact consequence it predicts, including task/horizon/perspective. The current mapped search value is zero; candidate MBON preferences are not calibrated value. Begin with bounded, independently verifiable outcomes. One-ply association is a prerequisite, not the intended reasoning result. Unknown or incomplete verification supplies no teaching event.
2. Declare the mechanism and permitted persistent state. Retain prerequisite association/retention/reversal requirements and use verified feedback in the informative arm. Train, validation and final families stay disjoint.
3. Run one serial, bounded matched comparison with informative, absent, matched-shuffled and disabled-plasticity conditions. Pin all identities, exposure and timing. Snapshot selection has predefined per-criterion validation and a capped number of attempts; preserve all rejected runs and compute. Never select using final outcomes. A frozen checkpoint's choice performance and continuously adapting retention answer separate questions.
4. Measure value prediction error appropriate to its defined target, all-legal consequence-correct choices, retention after intervening lessons and disjoint/counterfactual transfer. Separate unaided from equal-budget search; include memory reset/restoration and relevant fixed heuristic/memorization/search-only comparisons. Do not count correlated events or nominal unused seeds as independent replicates. Report uncertainty across genuinely independent runs/families.
5. Only after useful transfer, add a matched human comparison and broader playing-strength evaluation. A model outperforming the researcher may be compelling supporting evidence; Elo, one game and familiar puzzle accuracy do not substitute for transfer or calibration.

The immediate implementation gap is the value-output/feedback interface; no new graph experiment is warranted by this framing alone. Use the [value-teaching design](../puzzle-learning/stockfish-value-teaching.md) and [latest evidence review](../../../plasticity%20problem.md). This note does not select Stockfish-assisted teaching over the researcher's consequence-only goal; keep any engine-assisted condition separately declared.

## Category and presentation

[CBIO / Computational Neuroscience](https://www.societyforscience.org/isef/categories-and-subcategories/computational-biology-bioinformatics/) is a plausible fit if the contribution concerns neural learning mechanisms. [ROBO / Machine Learning](https://www.societyforscience.org/isef/categories-and-subcategories/robotics-intelligent-machines/) may fit if the main contribution is an artificial learning algorithm. These are interpretations of official definitions, not an assigned category. The science-versus-engineering distinction depends on the actual study, not merely its title or category.

For the interview, prepare to explain the graph, engineered encoder/readout, local update equation, feedback verification, controls, seed independence, checkpoint intervention, statistics and limitations. Preserve who made each design decision and what AI/other assistance supplied. This is preparation for demonstrating understanding and independence; this note does not determine all submission-rule requirements.

## Correction and scope

### 2026-10-10 researcher answers and working proposal

Researcher has not chosen the discovery yet; targets ISPO and ISEF, works more than 30 hours weekly, and seeks a 2000-rated system that develops its own evaluation and style through learned investigation rather than human-game imitation. Puzzles are an initial stage only. The researcher understands the intended training but is learning the neural mathematics and brain model. These are goals/background, not measured strength or reasoning. ISPO cycle, exact submission deadline, rating scale and meaning of "train how it thinks" have been asked and remain unconfirmed.

Provisional candidate question, assuming prediction/investigation/revision is intended:

> Does training a fly-connectome-constrained network to predict and revise chess consequences improve transferable position evaluation and playing strength compared with outcome-only training?

Primary endpoint should be causal, disjoint/counterfactual consequence-sensitive evaluation; playing strength is a subsequent endpoint on a pinned rating scale. The proposed intervention is a specified prediction/verified-feedback/revision pathway inside permitted plasticity, not an external search engine choosing moves or a fitted chess evaluator. It has not been implemented, biologically justified or shown to improve learning. Outcome-only comparison plus absent/shuffled/disabled controls must have predeclared exposure/timing/information/compute accounting; more search, feedback or board exposures are confounds unless explicitly tested. No protocol or intervention selected by this advisory wording. Generic prediction-error learning is not itself a novelty claim.

For student understanding, prioritize tracing one full example through input encoding, sparse dynamics, value/readout, consequence certificate, teaching pathway and local persistent update; learn the update equation, sign/perspective and controls well enough to defend their assumptions. Whole-brain biological expertise is not a prerequisite to starting, but central mathematical and causal claims must be understood by the researcher. Maintain an assistance/contribution record. ISEF's interview explicitly evaluates scientific understanding, independence and limitations.

The company analogy is not a scientific distinction: [Xiaomi's MiMo paper](https://arxiv.org/abs/2505.07608), abstract accessed 2026-10-10, combines pretraining and reinforcement learning using curated verifiable problems. No MiMo optimizer, pretrained model or distillation method is adopted here.

### ISPO 2027 portal findings, accessed 2026-10-10

The [portal's ISPO 2027 guide](https://ispo.competzy.com/guide) lists registration closing 15 October 2026, proposal upload 17 October 2026, final documents 14 January 2027 and finals 28-31 January 2027. It presents itself as the official guide; the older ispo.or.id site still shows the 2023-24 cycle. Confirm the researcher's intended cycle and school announcement before making a fixed submission schedule. The first deadline is a proposal, not a requirement to have reached 2000 rating.

Listed preliminary weights: idea/background/creativity 50%, design/methodology 30%, writing 20%. Listed final weights: paper/interview 40%, presentation 35%, poster/product 15%, attitude/character 10%. These differ from ISEF's rubric. A credible proposal must specify the unestablished contribution, intervention, independent consequence evidence, controls, measurements and resource-feasible stages; report current negative/limited results honestly. Publication/award outcome and reaching 2000 by the final are unpredicted.

Earlier chat suggested outperforming the researcher as a main question. That directly expressed the aspiration but provided a weaker causal research direction. The official rubric supports retaining that aspiration as an additional benchmark while organizing the study around an identified contribution and controlled variables. This is a recommendation, not an accepted mechanism replacement or an executed experimental pivot.
