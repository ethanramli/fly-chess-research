# Study protocol (working draft)

Do not begin data collection or other regulated research activity until required supervision, permissions, ethics review, and approvals are in place. Version this document whenever the plan changes.

- Protocol title: Strategic evaluation and generalization in a connectome-constrained chess model
- Version and date: 0.2 / 2026-09-28
- Lead researcher / mentor:
- Status: Draft

## Rationale

- Problem and why it matters: Cognitive science lacks simple computational tests that separate learned strategic evaluation from memorization and external search.
- What reliable literature already says: Chess combines pattern recognition, evaluation, planning, and tactical decision-making; connectome-constrained models impose explicit architectural constraints. The relevant literature review is still in progress.
- Specific uncertainty or gap: Whether explicit, interpretable position-evaluation supervision improves transfer to unfamiliar states in a connectome-constrained model, and whether any improvement comes from the evaluator or from external search.
- Intended contribution: A controlled computational test of strategic evaluation and generalization under a biologically inspired architectural constraint.

## Question and objectives

- Primary research question: Can a connectome-constrained model acquire task-relevant strategic evaluation from explicit position-assessment supervision and generalize to previously unseen chess positions?
- Secondary questions:
  - Does rubric supervision improve transfer beyond move prediction or outcome supervision?
  - How much performance comes from the model versus external search?
  - Does the model predict criterion-level assessments, not only move outcomes?
- Objectives:
  1. Define a reproducible position-assessment rubric.
  2. Freeze leakage-safe training, validation, and test sets.
  3. Compare matched training signals and search conditions.
  4. Measure transfer, tactical errors, criterion-level behavior, and resource use.
- Hypothesis: Explicit structured supervision will improve generalization to novel positions relative to an appropriate baseline, provided the effect survives search and parameter-matched ablations.

## Design and methods

- Study type and why it fits: Controlled computational cognitive-modeling experiment.
- Materials: A documented connectome-constrained model, legal chess positions, permitted puzzle/game data, and fixed engine opponents only where specified.
- Core conditions:
  1. One-shot move prediction baseline.
  2. Sequential search using the baseline evaluator.
  3. Sequential search using rubric-supervised evaluation.
  Optional engine-target and parameter-matched controls must be labeled separately.
- Rubric: Define criteria, scoring scale, side-to-move perspective, aggregation, label provenance, and annotator/reliability procedure before training.
- Procedure: Audit the existing implementation; create splits; train matched conditions; freeze checkpoints; evaluate once on held-out positions; repeat across seeds.
- Primary outcomes: Transfer on unseen positions and novel motif combinations, criterion-level evaluation accuracy, and move quality under fixed search budgets.
- Secondary outcomes: Tactical blunder rate, legal-move rate before filtering, playing strength against documented opponents, latency, peak memory, parameter count, and compute.
- Quality safeguards: No tuning on the final test set; balanced colors/openings; fixed engine versions/settings; report all seeds and failures; separate model, search, and interface contributions.
- Analysis: Report effect sizes and uncertainty intervals; include ablations with search disabled or matched; perform sensitivity analyses for thresholds and rubric aggregation.
- Software / tools and versions: Record repository commit, simulator, chess library, engine, hardware, and configuration for every run.

## Ethics, access, and data

This is initially a simulation using public or appropriately licensed materials and is not expected to involve new human or animal subjects. Confirm data licenses, privacy requirements, connectome-use terms, and supervision requirements. Do not collect human games for training until consent, data policy, and approval requirements are addressed.

## Feasibility and reporting

- Resources: Python/software engineering, chess-engine analysis, experimental design/statistics, connectomics, and mentor review.
- Milestones: literature audit; rubric; protocol freeze; baseline; matched training; held-out evaluation; analysis; manuscript.
- Likely limitations: model engineering choices may dominate; chess performance may depend on search; human-like interpretation may be underdetermined; one model architecture or task cannot establish a general theory of cognition.
- Intended audience / venue: Computational cognitive modeling, cognitive science, or computational neuroscience; select only after checking fit and current instructions.
- Product features such as public play, online learning, rating estimation, explanations, and pondering are out of scope for the minimum experiment and belong in future-work documentation.

## Amendments

| Date / version | Change | Reason | Approval or notification needed / completed |
|---|---|---|---|
| 2026-09-28 / 0.2 | Adopted cognitive-science framing and separated the minimum offline experiment from product extensions. | Clarify the scientific claim and prevent system features from substituting for controlled evidence. | Researcher review pending |
