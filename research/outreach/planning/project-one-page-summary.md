# FlyChess: one-page outreach summary

**Prepared:** 2026-09-30  
**Purpose:** Optional background link for researchers who request more detail. This is not evidence of endorsement or a completed biological model.

## Research question

Can a from-scratch simulation constrained by a released *Drosophila* connectome learn useful strategic evaluations from experience and feedback, then transfer them to unfamiliar chess positions and new combinations of motifs?

Chess is a controlled task environment for studying learning, credit assignment, selective calculation, and transfer. The project does **not** claim that biological flies understand chess or that a connectome alone supplies cognition.

## Design commitments

- Preserve released neuron identities, sparse graph topology, and fixed sign conventions.
- Keep teacher feedback separate from internal adaptation: the teacher supplies experiences and consequences, while any lasting change must arise through an explicitly modeled and biologically motivated mechanism inside the simulation.
- Distinguish external search, verified task feedback, neural feedback, persistent learning, and held-out transfer.
- Use bounded, resumable experiments that fit a laptop with about 8 GB total RAM and as little as 3 GB available.
- Retain failed experiments and use disjoint validation/test families; do not tune on final tests.

## What currently works

1. A sparse full-graph supervised baseline and inference path run within the laptop budget. This is an engineering comparison, not endogenous biological learning.
2. A record-only puzzle round uses a separate hypothetical board, bounded search, independent mate verification, and atomic checkpoints. In the fixture it selected `Qh7#` and recorded `+1`, while explicitly reporting that no feedback was applied to neurons and no learning occurred.
3. A gamma4 mushroom-body prototype maps 1,056 existing KC-to-MBON edges and 22 PAM08 neurons from pinned annotations. It implements a local, timing-dependent efficacy state while preserving wiring and nonplastic parameters.
4. In a frozen six-seed follow-up with balanced cue sampling, contingent feedback strengthened the rewarded preference in 6/6 runs. Erasing/restoring the stored efficacy removed/recovered the effect, while nonlearning controls stayed fixed.

## What has not been established

The full association acceptance test failed: only 3/6 seeds selected the new target after contingency reversal. The model lacks a justified account of reward omission or recovery of an old association. Direct experimental stimulation is not a reconstructed natural reward pathway, the software choice decoder is engineered, and synthetic cue trials are not biological animals. Natural sensory/action/reward interfaces, biological validation, chess learning, and held-out transfer are all outstanding.

## Immediate questions for expert feedback

1. Which identified pathways and annotations could support a defensible reward interface for the released graph without inventing neuron roles?
2. Which local plasticity and reward-omission mechanisms are supported strongly enough to test as explicit approximations?
3. What minimal association, retention, omission, and reversal controls should precede any chess interpretation?
4. How should sensory and action mappings be justified so that the connectome constraint remains scientifically meaningful?

## Current next step

Diagnose incomplete reversal, identify evidence-based sensory/action/reward interfaces and independent predictions, then reconnect one puzzle-feedback learning round. Only after that should latency optimization and scaling proceed.

## Project evidence

- [Project overview](../../project/project_overview.md)
- [Feedback-driven learning direction](../../../documentation/design/research-goals/feedback-learning.md)
- [Mushroom-body learning prototype](../../../documentation/design/neural-learning/gamma4-plasticity.md)
- [Association validation and failed gates](../../../documentation/design/neural-learning/gamma4-association-tests.md)
- [Puzzle-feedback round](../../../documentation/design/puzzle-learning/record-only-round.md)

