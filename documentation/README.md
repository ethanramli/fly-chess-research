# Documentation guide

Current direction: [approved restart plan](design/research-goals/restart-plan-2026-10-30.md). Old experiments are history in [the early-development archive](../archive/early-development/README.md).

Start with [current status](current-status.md), then [research goals](design/research-goals/README.md). Choose one topic below; dated discussion and raw evidence live in [research](../research/README.md).

For recurring curriculum work, use the [Python command guide](design/puzzle-learning/python-curriculum-actions.md) and `fly.cmd`; configure a registered step once and keep raw logs on disk.

| Section | Read it for |
|---|---|
| [Research goals](design/research-goals/README.md) | Intended contribution, feedback-learning boundary and learning-efficiency hypothesis |
| [Neural learning](design/neural-learning/README.md) | Mapped plasticity, association controls and reversal mechanisms |
| [Chess input](design/chess-input/README.md) | Symbolic board/action representations and compartment comparison |
| [Puzzle learning](design/puzzle-learning/README.md) | Learning pilots, failed useful-choice gates and volume experiment |
| [Search and teacher feedback](design/search-and-feedback/README.md) | Separate-board investigation, verified consequences and explanations |
| [Diagnostics](design/diagnostics/README.md) | Memory interventions and training-fixture bottleneck investigations |
| [Evaluation and performance](design/evaluation-and-performance/README.md) | Proposed Elo, pondering and implementation roadmap |
| [Supervised baselines](design/supervised-baselines/README.md) | Sparse Adam/gradient engineering comparisons and historical draft protocol |
| [Idea notebook](ideas/README.md) | Early proposals; the rubric-supervision brief is historical and superseded |
| [Writing](writing/README.md) | Manuscript outline, submission checklist and venue planning |
| [Handoffs](handoffs/README.md) | Task-specific recovery prompts and compact state for long-running research goals |

## Where to put a new note

Put specifications in the matching design topic, source evidence in [literature](../research/literature/README.md), dated discussion in [journal](../research/journal/README.md), and outcomes in [reports](../archive/early-development/research/reports/README.md). Add the note to its folder README. Update [current status](current-status.md) when an audited result changes; preserve earlier failures and historical entries.

Filenames use descriptive kebab-case; journal filenames begin with the Asia/Jakarta date. Label hypotheses, proposed protocols, frozen protocols, software evidence and measured results explicitly. Keep experiment appendices out of the root README and AGENTS.md.

[Previous-to-current path map](relocation-map.md) resolves older citations and references in immutable raw records.

- [2026-10-09 temporal plasticity hypothesis result](../archive/early-development/research/reports/gamma2-temporal-hypothesis-v2-2026-10-09/README.md): local effect verified; full plasticity solution unproved.

- [Adaptive feedback on current top error](../archive/early-development/research/reports/gamma2-adaptive-target-v1-2026-10-09/README.md): verified cue separation and targeted learning, while the top wrong all-legal move remains unchanged.
