# Researcher vision and testable direction — 2026-10-01

This note records Ethan Ramli's account of his motivation and ambitions during an outreach interview. It is a statement of research intent, not a finding, frozen protocol, or claim that the present model reasons or plays master-level chess. Existing design notes and raw experiments remain the authority for implementation and results.

## Origin and central question

Ethan enjoys chess and became interested in the publicly released fly connectome. An existing fly-chess demonstration initially disappointed him because a system trained to reproduce strong human games would not answer the question he cares about: can a connectome-constrained model learn to assess and choose among unfamiliar chess positions from experience and feedback, without learning to imitate an external catalogue of strong moves? The observation about the prior demonstration is Ethan's current interpretation; it has not been independently audited in this interview.

His motivating question is how much useful decision-making a model constrained by a small biological circuit could develop. Chess provides a demanding, measurable task. The intended comparison is between an engineered model's behavior and carefully chosen controls; no result would establish that a biological fly understands chess.

## Research intent and authorship

- Ethan wants to lead the research question and training direction. In a later 2026-10-01 interview answer, he clarified that he defines the rubric and proposes training ideas while AI writes most of the code. He does not currently understand the code or mathematics well enough to explain them independently. Earlier wording about personally reviewing implementation or interpreting the math should not be taken as verified. The next step for any manuscript is to learn, audit, and reproduce the methods and results with enough understanding to defend the claims; the exact contribution record remains to be compiled.
- The teacher should supply experience and consequences. Lasting adaptation should arise through a biologically justified mechanism in the simulated neural system while preserving the released wiring. Ethan is particularly interested in dopamine-mediated feedback; a bare correctness scalar or externally optimized parameter update would not satisfy his intended study.
- Ethan wants eventual publication and hopes for methodology and publication guidance, while remaining the main contributor. eLife is an aspirational venue, not an acceptance target established by the present evidence.
- Asked what he most wants to gain from a first mentor conversation, Ethan said he wants to know whether the project can be a scientific contribution and whether his method is scientifically sound. This is an open assessment request, not a claim that current methods have passed expert review.

## Desired outcomes and public presentation

- Scientific ambition: learn to evaluate and make strong decisions on unfamiliar chess positions without training on human games as move labels. Ethan's personal stretch goal is a model that can beat him and other people and perhaps reach master-level play. These are aspirations, not current capabilities or near-term predictions.
- Planned open-source presentation: a public website where visitors can play the model, read documentation, and inspect a learning-progress graph and estimated playing strength over time. Ethan would also like circuit-activity views during training and play. Those views require an implemented and interpretable measurement model; the current code does not establish that the simulated circuit processes images or performs a biological analogue of thought.
- The public site is a communication and interaction goal. A controlled offline experiment and held-out tests must carry any scientific claim. If an Elo estimate is shown later, its opponent pool and rating method must be stated.

## Current evidence and open operational questions

The current [project overview](project_overview.md), [feedback-learning direction](../../documentation/design/research-goals/feedback-learning.md), and [association validation](../../documentation/design/neural-learning/gamma4-association-tests.md) distinguish a sparse full-graph engineering baseline, a record-only chess puzzle round, and a simplified gamma4 association prototype. The V2 two-cue experiment strengthened rewarded preference in 6/6 seeds but produced the correct reversed choice in only 3/6; its full acceptance gate failed. The puzzle runner has not applied feedback to neurons. Biological reward, sensory, action, and plasticity interfaces and held-out chess transfer remain unresolved.

Ethan currently describes the model as learning. The bounded evidence supports a narrower statement: the engineered two-cue model shows feedback-dependent association and causally stored response changes, but reliable reversal failed and no chess learning is established. He recalled a memory figure of about 215 MB; this was not tied to a specific run in the interview. Existing records include a 138.45 MiB peak RSS for the V2 association run and separate measurements for other workloads. Quote an exact memory figure only with its command, report, graph and workload.

The interview has not yet defined what behavior would count as evaluating or reasoning through a position, beyond choosing strong moves. Before a paper claims such a capacity, specify held-out position families, adversarial or changed-question transfers, fixed search budgets, independent outcome verification, and ablations that distinguish the simulated circuit from an external chess searcher, the input/output translator, or a memorized training distribution. These are proposed evaluation directions, not a frozen study design.

## Source and correction rule

Source: Ethan's answers in the 2026-10-01 outreach interview. This note paraphrases them and labels uncertain claims. If his intentions change, append a dated correction rather than silently rewriting an earlier experimental result.
