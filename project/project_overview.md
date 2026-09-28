# Project overview

Update this summary when the research question or design changes.

- Working title: Strategic evaluation and generalization in a connectome-constrained chess model
- Project status: Cognitive-science framing adopted; rubric and protocol still under development
- Primary research area: Cognitive science, with computational neuroscience and machine learning methods
- Lead researcher:
- Mentor / collaborators:
- Target audience: Cognitive science and computational neuroscience readers, with interest from machine learning researchers
- Intended contribution: Test whether explicit, interpretable position-evaluation supervision enables a biologically constrained model to acquire strategic evaluation and generalize to unfamiliar chess states
- Target output: Empirical research article or registered/transparent research report
- Target journal or venue: To be selected after the protocol and literature review; must fit computational cognitive modeling
- Key dates:
- Current next action: Specify the evaluation rubric, freeze the minimum experiment, and define leakage-safe held-out tests before training

## One-paragraph summary

This project uses chess as a controlled testbed for a broader cognitive-science question: what computational ingredients support abstract strategic reasoning? It will compare a connectome-constrained model trained with explicit position-assessment targets against appropriate baseline training signals. The central outcome is not a rating alone, but transfer to unfamiliar positions and novel combinations of strategic motifs. Ablations will separate the contributions of the constrained model, the rubric-based training signal, and external search. A successful result would support the narrower claim that strategic evaluation can emerge under these specified constraints; it would not show that a biological fly understands chess or that humans use the same mechanism.

## Scope and constraints

The minimum study is an offline computational experiment. Public deployment, online learning from human games, rating estimation, qualitative explanations, pondering, and product integration are optional extensions and must not replace the core controlled comparison.

The study should report the connectome and simulator versions, input/output mappings, trainable parameters, data provenance, compute budget, seeds, search budget, legality handling, and all held-out evaluation procedures.
