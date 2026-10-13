# Proposal: fixed weights and the persistent-learning boundary

2026-10-06 researcher proposal: freeze the weights to remove the plasticity problem. This is recorded as a proposed direction, not an established solution or an instruction to discard the original learning goal. Clarification requested: add a fixed-weight comparison, or replace synaptic learning with a fixed-weight model retaining evolving internal state. Current authorized experiments are unchanged while that distinction is unresolved.

## What is already fixed

Graph identities, topology, sign conventions and nonplastic parameters are fixed in the biological-learning experiments. Baseline efficacy values are stored; only explicitly mapped local gains change effective KC-to-MBON strengths. In [reversal-memory.mjs](../../../.codebase/src/lowram/reversal-memory.mjs), effective magnitude is baseline magnitude multiplied by persistent gain. Moving that gain into a separately named array does not make effective synaptic strengths frozen.

Evaluation already freezes learning: assessment does not call the local adaptation rule and checks the persistent memory fingerprint. Freezing a successfully trained snapshot for unfamiliar-position evaluation remains part of the original goal. It does not eliminate the need to demonstrate how useful memory was acquired.

## Freezing effective strengths before teaching

The disabled-plasticity comparison presents the same experimental cues and reinforcement without changing local efficacy. It is already a fixed-strength control. In the current [trainer](../../../.codebase/src/lowram/trainer.mjs), each forward call initializes neural activity to zero. With identical board/history/task inputs and all effective parameters fixed, the deterministic assessment repeats the same response. Search can still investigate and find a correct move; that is calculation evidence, not lasting improvement from previous feedback.

The completed [puzzle-pipeline control](../../../research/reports/puzzle-pipeline-v1-2026-10-06/README.md) illustrates this distinction: searched choices succeed before and after exposure, while its disabled unaided choices stay unchanged. The current positive-channel association includes a disabled condition as well; complete results and audits are pending. Neither condition establishes persistent fixed-weight learning.

## A different memory mechanism would be required

A fixed-weight model could in principle retain experience in an evolving internal state. This is a computational possibility, not a biologically justified mechanism selected for this project. Merely carrying activations between calls would require independent tests of stability, interference, retention, feedback specificity, reset/restoration and unfamiliar transfer. Persistent activity and durable concept learning are not interchangeable claims.

Any replacement must specify the state, its neural location and equations, the feedback pathway, what is checkpointed, what resets between positions/candidates, and how hypothetical branches avoid contaminating the real learner. It must preserve sparse serial resource bounds and have primary-source support with documented approximations. Training a decoder elsewhere, importing pretrained weights, or maintaining a position-to-answer table would not satisfy the original objective.

No persistent-activity learner or replacement mechanism is implemented here. No externally sourced solution is asserted in this note: the code behavior is inspected project evidence, and the fixed-weight persistent-state alternative is an unresolved engineering/research hypothesis. If outside evidence motivates a specific mechanism, add it to the source-to-solution register before experimental use.
