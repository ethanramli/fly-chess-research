# Fly-chess research

This repository is a research workspace for studying whether a connectome-constrained model can learn strategic evaluation from structured position feedback in chess. Chess is used as a controlled testbed for a broader cognitive-science question about how compact, biologically inspired architectures acquire task-relevant strategic representations.

The project is not claiming that a biological fly understands chess. The goal is to test whether a fly-inspired model, under explicit engineering assumptions, can learn to evaluate positions in a way that generalizes beyond the training set.

## Current status

The project is in the early-to-mid research-planning phase:

- Research framing and scope are defined in `project/`
- The minimum experiment is being formalized in `design/`
- The literature review and evidence map are being tracked in `literature/`
- Candidate ideas and extensions live in `idea/`
- Data governance and documentation guidance live in `data/`
- Writing plans and manuscript logistics live in `writing/`

The current focus is on the minimum viable scientific study: define a rubric, freeze a leakage-safe evaluation setup, and compare training signals before adding any product or exploratory extensions.

## Core research question

Can a connectome-constrained model acquire task-relevant strategic evaluation from explicit position-assessment supervision and generalize to previously unseen chess positions?

This project is intentionally narrow and conservative:

- It studies a model constrained by a fly connectome, not a claim about fly cognition.
- It emphasizes interpretable position evaluation rather than raw game-playing strength alone.
- It separates the minimum scientific claim from later extensions such as a public website, explanation systems, or online learning.

## Repository structure

- `project/` — project framing, ethics, decisions, mentoring, and planning materials
- `design/` — training and evaluation protocol, data dictionary, and experimental plan
- `literature/` — search log, reading notes, and evidence map
- `idea/` — candidate hypotheses, experiments, and future directions
- `data/` — approved shareable or de-identified materials and governance guidance
- `writing/` — manuscript structure and submission checklist
- `README.md` — high-level project overview

## How to use this workspace

1. Start with `project/project_overview.md` for the research framing and scope.
2. Review `design/training_plan.md` for the current experimental plan and constraints.
3. Use `literature/` to record evidence, notes, and relevant comparisons.
4. Keep the minimum experiment separate from optional extensions.
5. Record major decisions in `project/decision_log.md`.
6. Preserve held-out evaluations and report limitations transparently.

## Scope and constraints

This repository is not a product repo or a chess engine implementation. It is a research workspace for a computational cognitive-science study.

The project intentionally does not prioritize:

- public demos or a user-facing website
- online learning from human games
- rating estimates or live skill prediction
- qualitative explanation generation for end users
- broader software features unrelated to the core experiment

These may become relevant later, but they are treated as separate work streams and should not be confused with the minimum experiment.

## Key research principle

A strong playing rating by itself is not sufficient evidence of strategic cognition. The meaningful claim requires transfer to unfamiliar positions, interpretable evaluation behavior, and controlled comparisons against appropriate baselines.

## Recommended next step

Define the rubric, freeze the minimum experiment, and establish leakage-safe held-out tests before training or tuning.

For the current project context and constraints, see:

- `project/project_overview.md`
- `design/training_plan.md`
- `project/cognitive_science_framing.md`
