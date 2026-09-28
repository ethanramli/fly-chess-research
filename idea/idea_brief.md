# Idea brief: Strategic evaluation in a connectome-constrained model

- Date started: 2026-09-28
- Status: Core cognitive-science framing selected; literature, rubric, and protocol remain to be completed

## Central question

Can a model constrained by a fly connectome learn abstract strategic evaluation and use it to generalize to unfamiliar chess positions without relying primarily on deep search or memorized moves?

Chess is a controlled testbed for studying evaluation, planning, and transfer. The project does not claim that a biological fly understands chess. A connectome is a wiring constraint, not a complete working brain; neuron dynamics, input encoding, output mapping, training, and software search remain explicit model choices.

## Why this is scientifically interesting

The contribution would concern the computational ingredients of strategic cognition. A positive result could show that explicit, interpretable assessment supports transfer in a compact biologically inspired architecture. A negative result could reveal dependence on search, teacher supervision, or memorization. Either result is more informative than a demonstration that a fly-themed system can play games.

## Working hypothesis

Rubric-supervised position evaluation will improve transfer to held-out positions and novel combinations of strategic motifs relative to an appropriate move-prediction or outcome-learning baseline, after controlling for search, parameters, data, and compute.

## Minimum viable experiment

1. Define and document the position rubric.
2. Create leakage-safe train/validation/test splits.
3. Audit the existing implementation and identify all engineered components.
4. Compare one-shot prediction, baseline sequential search, and rubric-supervised sequential search.
5. Evaluate transfer, criterion-level predictions, tactical errors, resource use, and multiple seeds.
6. Interpret the result conservatively, separating the model, rubric, search, and interface.

## Optional extensions

Threat/escape-circuit routing, adaptive puzzle sampling, online human games, ratings, explanations, pondering, and a public website are separate hypotheses or engineering projects. They should not be allowed to obscure or replace the minimum controlled experiment.

## Important limitations

“Grandmaster-level” play, if achieved, would not by itself establish human-like cognition. The claim must be tied to held-out generalization and ablations. Success would establish what this specified computational model can do under its constraints; it would not show that flies or humans use the same mechanism.

## Immediate next actions

- Write the rubric in operational terms.
- Define the final test set before training.
- Audit the existing Fly Chess implementation and prior literature.
- Specify parameter, search, data, and compute matching.
- Discuss the protocol with a qualified mentor before extensive experiments.
