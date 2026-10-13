# Hypothesis: does prior reasoning make later learning easier?

Date: 2026-10-06 (Asia/Jakarta). Status: researcher-requested hypothesis and proposed research figure; no experiment or learning-speed result exists. This note does not change current frozen experiments or their acceptance gates.

## Researcher intent and analogy

The researcher expects the first convincing reasoning result in the fly-derived simulation to be difficult and potentially take hours. The motivating analogy is teaching a child to solve a Rubik's Cube: acquiring an initial solution procedure is difficult; subsequent successful attempts may become more reliable and faster through practice. The researcher wants the calculation of this change included in a research diagram.

Hypothesis: once persistent neural learning supports a reusable consequence-sensitive relationship, subsequent experience may refine it and related relationships more efficiently. A first breakthrough might therefore remove an important learning bottleneck. Neither the hours estimate nor subsequent acceleration is measured. Exponential improvement is not assumed. The analogy expresses researcher intuition, not evidence that the simulation has human learning dynamics.

## Separate three questions

1. **Repeatability:** can the frozen trained snapshot succeed again, including across declared search seeds? This measures reliability of an acquired ability. Repeating a correct answer alone does not establish training or reasoning.
2. **Practice and retention:** does informative experience cause persistent improvement in later unaided choices or fixed-budget choices, beyond matched controls? Reset and restoration of permitted memory should test causal dependence. A repeated puzzle can support a narrow acquisition claim under these controls, but could still be memorized.
3. **Transfer and learning efficiency:** does prior learning reduce the additional experience needed to acquire a new related ability, and do frozen choices track changed consequences in unfamiliar/counterfactual positions? This tests the stronger idea that earlier learning provides something reusable to build on.

Independent fresh-seed replication of the initial experiment establishes reproducibility; continuing from a learned snapshot tests retained learning. Keep these experiments distinct. A faster second invocation due to cached files, optimized code or different search budgets is not faster neural learning.

## Proposed calculation

Freeze a useful-choice criterion, related task families, evaluation schedule and maximum experience budget before execution. The criterion must retain the applicable learning and reasoning controls; an isolated successful move is not the threshold. Freeze learning during measurement. Use separate development/validation families for threshold monitoring; reserve final test families for the frozen final evaluation, without fitting, sampling or checkpoint selection on them.

For each paired seed and matched new-family acquisition task, define:

- `N_fresh`: training experiences to the predefined criterion from a fresh initialized memory.
- `N_prior`: additional training experiences to the same criterion from a snapshot with prior verified learning. Record the prior training cost separately.
- `T_fresh`, `T_prior`: cumulative acquisition elapsed time to that criterion under matched implementation, hardware and pacing. Also report CPU time, neural presentations and teacher/search/verification costs separately.

The proposed sample-efficiency ratio is:

`S_N = N_fresh / N_prior`

The proposed fractional experience reduction is:

`R_N = 1 - N_prior / N_fresh`

The analogous acquisition-time ratio is:

`S_T = T_fresh / T_prior`

Values of `S_N > 1` support lower additional experience requirements for that comparison, subject to controls and uncertainty. They do not establish exponential growth, lower lifetime training cost, or broader reasoning. Report total cost including the prior training as well as marginal new-task cost. If a trained snapshot already passes before new training, report zero-shot transfer rather than an infinite ratio. If either condition never reaches the criterion, report its bounded/censored outcome; do not substitute the stopping budget as an observed time-to-success.

**Arithmetic illustration only:** if matched new-family acquisition required 120 minutes from fresh memory and 30 minutes after prior learning, `S_T = 4` and time reduction would be 75%. These invented numbers are not project measurements or predictions and must not appear as measured evidence in a figure.

## Proposed research diagram

Use a two-panel standalone figure when raw data are available:

- **Panel A: acquisition curves.** Horizontal axis: cumulative training experiences. Vertical axis: frozen validation performance at scheduled checkpoints. Show prior-learning, fresh-memory, absent-feedback, matched shuffled-feedback and disabled-plasticity conditions with uncertainty across independent seeds. Mark the predefined criterion. Plot search-assisted and unaided results separately. Show elapsed/CPU cost alongside experience counts rather than conflating them.
- **Panel B: experience needed for a new related ability.** Show paired `N_fresh` and `N_prior` for each declared related family, then the distribution of paired `S_N` values and uncertainty. Mark zero-shot transfer and budget-exhausted cases explicitly. Counterbalance family order/difficulty and match new-family feedback, compute and evaluation schedules; a series of easier puzzles cannot establish acceleration.

Suggested caption: "Does prior consequence-sensitive learning reduce the experience required to acquire a new related ability? Curves compare persistent learned memory with fresh initialization and feedback controls under matched conditions. Repeated success measures reliability; lower controlled acquisition cost on related tasks supports learning efficiency. Neither alone establishes exponential improvement or general reasoning."

Until measured, any conceptual sketch must be labeled **hypothesized trajectory; no experimental data**. Do not plot a fabricated learning curve as a result. This documentation request records the intended figure; it does not launch or freeze a new experiment.

## Current boundary and provenance

Useful puzzle acquisition and unfamiliar/counterfactual reasoning remain unproved. Computational association results do not supply the first reasoning milestone described here. The existing sparse serial execution, resource guards, biologically supported adaptation requirements and preserved failures remain in force.

This note records the researcher's 2026-10-06 discussion and request. The ratios and figure design are assistant-proposed operational definitions, not an externally sourced neural mechanism or a validated protocol. No new biological or empirical literature claim is made. See [scientific contribution requirements](scientific-contribution.md), [feedback-learning direction](feedback-learning.md), and the [dated journal entry](../../../research/journal/discussions/2026-10-06-learning-efficiency.md).
