# Project overview

Update this summary when the research question or design changes.

- Working title: Strategic evaluation and generalization in a connectome-constrained chess model
- Project status: Feedback-driven biological-learning direction clarified on 2026-09-30; one puzzle/search/feedback-recording round verified; endogenous learning mechanism, rubric and protocol remain under development
- Primary research area: Cognitive science, with computational neuroscience and machine learning methods
- Lead researcher:
- Mentor / collaborators:
- Target audience: Cognitive science and computational neuroscience readers, with interest from machine learning researchers
- Intended contribution: Test whether experience and explicit puzzle/position feedback, acting through a justified learning mechanism inside a connectome-constrained simulation, support strategic evaluation and generalization to unfamiliar chess states
- Target output: Empirical research article or registered/transparent research report
- Target journal or venue: To be selected after the protocol and literature review; must fit computational cognitive modeling
- Key dates:
- Current next action: Identify and specify an evidence-based reward pathway, endogenous plasticity and persistent memory; validate basic association, retention and reversal before reconnecting puzzle feedback. Amend the rubric/protocol and held-out design before chess training or tuning.

## One-paragraph summary

This project uses chess as a controlled testbed for a broader cognitive-science question: what computational ingredients support abstract strategic reasoning? On 2026-09-30 the researcher clarified that the rubric should supply feedback after experience, and learning should arise through a justified mechanism inside the simulation while preserving the released wiring. The existing supervised trainer provides engineering and baseline evidence; the revised biological-learning mechanism is not yet specified. The central outcome remains transfer to unfamiliar positions and novel combinations of strategic motifs. Ablations must separate learning, the rubric, engineered IO and external search. A successful result would establish what the specified simulation can learn under its constraints; it would not show that a biological fly understands chess or that humans use the same mechanism.

Current design direction: [feedback-driven learning](../../documentation/design/feedback_learning_direction.md). Implementation evidence: [one record-only puzzle round](../../documentation/design/puzzle_feedback_round.md) and a [reduced gamma4 conditioning prototype](../../documentation/design/mushroom_body_learning.md). The latter now specifies and implements one candidate local memory mechanism, superseding the earlier unresolved implementation status above, but biological validation and chess learning remain outstanding. Discussion chronology: [research journal](../journal/README.md).

The subsequent [controlled association experiments](../../documentation/design/association_validation.md) provide causal evidence of stored feedback-driven response changes under an engineered choice decoder. Basic association passes in the balanced follow-up; complete acceptance fails because correct reversed choices occur in only 3/6 seeds. This narrows the next investigation to adaptation while preserving the need for justified interfaces and chess transfer.

## Scope and constraints

The minimum study is an offline computational experiment. Public deployment, online learning from human games, rating estimation, qualitative explanations, pondering, and product integration are optional extensions and must not replace the core controlled comparison.

The study should report the connectome and simulator versions, input/output mappings, trainable parameters, data provenance, compute budget, seeds, search budget, legality handling, and all held-out evaluation procedures.
