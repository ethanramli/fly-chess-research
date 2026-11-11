# FlyChess: one-page outreach summary

**Prepared:** 2026-09-30  
**Status updated:** 2026-11-09
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

## Earlier prototype evidence

The following results predate the 2026-10-30 research restart and are historical engineering evidence, not the current project status.

1. A sparse full-graph supervised baseline and inference path run within the laptop budget. This is an engineering comparison, not endogenous biological learning.
2. A record-only puzzle round uses a separate hypothetical board, bounded search, independent mate verification, and atomic checkpoints. In the fixture it selected `Qh7#` and recorded `+1`, while explicitly reporting that no feedback was applied to neurons and no learning occurred.
3. A gamma4 mushroom-body prototype maps 1,056 existing KC-to-MBON edges and 22 PAM08 neurons from pinned annotations. It implements a local, timing-dependent efficacy state while preserving wiring and nonplastic parameters.
4. In a frozen six-seed follow-up with balanced cue sampling, contingent feedback strengthened the rewarded preference in 6/6 runs. Erasing/restoring the stored efficacy removed/recovered the effect, while nonlearning controls stayed fixed.

The six-seed association follow-up strengthened the rewarded preference in 6/6 runs, but only 3/6 selected the new target after reversal, so its full acceptance test failed. The record-only puzzle round did not apply feedback to neurons or learn. These results do not establish a biologically justified reward pathway, chess learning, or transfer.

## Current status

As of 2026-11-09, the project is stopped pending the researcher's decision on Volume 2, chapters 3 and 5. The predeclared single-shot capacity gate for revision 4 failed on two of three development boards. A later sequential exact search found safe-capture settings on all three, but it followed the failed gate and has not had independent review. Reward-only and valence probes still left safe captures below their best rivals on all three boards. No full revision-4 learning run is recorded, and sealed test games remain unused. Properties 1–3 remain unmet; there is no transferable-reasoning result. See [current research status](../../../documentation/current-status.md), the [stop report](../../reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md), and the [next checkpoint](../../../documentation/next-checkpoint.md).

## Questions for expert feedback

1. Which identified pathways and annotations could support a defensible reward interface for the released graph without inventing neuron roles?
2. Which local plasticity and reward-omission mechanisms are supported strongly enough to test as explicit approximations?
3. What minimal association, retention, omission, and reversal controls should precede any chess interpretation?
4. How should sensory and action mappings be justified so that the connectome constraint remains scientifically meaningful?

## Project evidence

- [Project overview](../../project/project_overview.md)
- [Feedback-driven learning direction](../../../documentation/design/research-goals/feedback-learning.md)
- [Mushroom-body learning prototype](../../../documentation/design/neural-learning/gamma4-plasticity.md)
- [Association validation and failed gates](../../../documentation/design/neural-learning/gamma4-association-tests.md)
- [Puzzle-feedback round](../../../documentation/design/puzzle-learning/record-only-round.md)

