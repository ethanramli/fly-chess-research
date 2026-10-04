# Cognitive-science framing

**Date:** 2026-09-28  
**Status:** Conceptual reframing; hypotheses and methods require further specification

## Core idea

This project does not primarily ask whether a fly-inspired model can be made to play chess. The more important question is whether a biologically constrained neural architecture can learn and apply abstract strategic principles without relying primarily on brute-force search.

Chess is used as a controlled testbed for studying strategic cognition. The project examines whether a connectome-constrained model can learn to evaluate positions using explicit criteria, generalize those criteria to novel states, and choose strong moves without depending mainly on deep lookahead.

The intended scientific subject is therefore **strategic evaluation and generalization in a constrained neural system**, not chess-playing ability by itself.

## Primary research question

> Can a connectome-constrained model acquire task-relevant strategic evaluation from explicit position-assessment supervision and use that understanding to generalize to previously unseen chess positions?

## Why this matters to cognitive science

Chess combines pattern recognition, evaluation, tactical awareness, and planning. A strong move cannot always be selected by recalling a memorized line, and a system that performs well with limited search would provide a test of how much strategic competence can arise from learned representations of good and bad states.

The project therefore addresses a broader question:

> What kinds of computation support abstract strategic reasoning?

If a fly-inspired architecture can learn to assess central control, king safety, piece activity, threats, and tactical opportunities through explicit supervision, then the resulting model may provide a computational case study of how compact neural systems can evaluate complex state spaces. This would not show that biological flies understand chess. It would show what a model constrained by a fly connectome can compute under specified training and engineering assumptions.

## Working hypothesis

A connectome-constrained model trained with explicit position-evaluation targets will generalize better to unfamiliar board states than a model trained mainly on move prediction or outcome labels alone. The improvement should be greatest when the training signal captures interpretable strategic principles rather than only opaque end-to-end rewards or move labels.

The cognitive claim behind this hypothesis is that strategic competence may depend not only on memory of prior lines or deep search, but also on representations that support rapid assessment of a position according to meaningful principles.

## Intended contribution

The intended contribution is a cognitively interpretable account of how strategic competence can emerge in a constrained neural system. The study should test whether:

- explicit evaluation criteria improve generalization;
- learned strategic representations transfer to novel positions;
- biological architectural constraints can support abstract decision-making; and
- the source of performance is principled evaluation rather than search depth alone.

A positive result would move the work beyond the claim that “a fly model can play chess.” It would provide evidence that a compact, biologically inspired architecture can acquire structured strategic evaluation and use it in unfamiliar situations.

A null or negative result would also be informative: it could show that the proposed architecture requires external search, extensive teacher supervision, or memorized patterns, thereby placing limits on claims about constrained neural systems and strategic cognition.

## Results needed to support the claim

The study must separate the contributions of the model, training signal, and search procedure. At minimum, it should compare matched systems such as:

1. one-shot move prediction;
2. sequential search using the existing fly-constrained evaluator; and
3. sequential search using an evaluator trained with explicit strategic criteria.

Evaluation should include:

- held-out positions and puzzle families;
- novel combinations of familiar strategic motifs;
- tactical blunders and criterion-level position assessment;
- performance with and without external search where feasible;
- multiple training seeds and uncertainty intervals; and
- compute, parameter, memory, and latency measurements.

A high playing rating alone would not establish the cognitive interpretation. The strongest evidence would be improved transfer to carefully held-out positions, interpretable criterion-level behavior, and ablations showing that the result does not come primarily from an external search system or a move-legality filter.

## Scope and limitations

The project should make modest claims. It is a computational model inspired by a fly connectome, not evidence that a biological fly plays chess or possesses human-like understanding. “Human-like” or “grandmaster-like” evaluation must be operationalized through explicit criteria and behavioral tests rather than inferred from a rating alone.

Likewise, success would not prove that humans use the same mechanism. It would instead show that strategic performance is computationally possible under a particular constrained architecture and learning regime, making the system a useful model for testing hypotheses about evaluation, search, memory, and generalization.

## Conceptual significance

The intellectual payoff is a testable account of how strategic intelligence might arise from limited neural resources. The central possibility is that strong strategic behavior can emerge from learned representational structure and principled evaluation, rather than requiring unrestricted working memory or exhaustive internal simulation.

That is the claim this project should investigate—not simply whether the model wins games, but what its success or failure reveals about the computational ingredients of strategic cognition.
