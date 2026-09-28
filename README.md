# Research workspace

This repository is the planning workspace for a cognitive-science study of strategic evaluation in a connectome-constrained model. Chess is the testbed; the scientific question is how a compact, biologically inspired neural architecture can learn structured evaluation and generalize to unfamiliar states.

## Core research question

Can a connectome-constrained model acquire task-relevant strategic evaluation from explicit position-assessment supervision and use it to generalize to previously unseen chess positions?

The project does **not** claim that a biological fly understands chess. It studies what a model constrained by a fly connectome can compute under explicit engineering and training assumptions.

## How to use this workspace

1. Read `project/cognitive_science_framing.md` for the conceptual claim and its limits.
2. Define the position-assessment rubric and protocol before training or tuning.
3. Record literature searches and evidence in `literature/`.
4. Keep the minimum experiment separate from optional product features such as a public website, online learning, explanations, and pondering.
5. Record consequential decisions and amendments as the project develops.
6. Preserve held-out evaluation data and report null results, ablations, compute, and limitations.

## Workspace map

- `project/` — research question, cognitive-science framing, decisions, and ethics
- `idea/` — candidate hypotheses and extensions
- `literature/` — search log, reading notes, and evidence map
- `design/` — protocol and training/evaluation plan
- `data/` — data inventory and approved shareable materials
- `writing/` — manuscript structure and submission checklist

This is a planning aid, not evidence that the hypothesis is true. A credible contribution requires a specified rubric, leakage-safe evaluation, matched baselines, component ablations, reproducible materials, and conclusions proportionate to the results.
