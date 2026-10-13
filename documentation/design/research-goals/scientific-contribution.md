# Research goal: transferable reasoning in a compact neural system

Date: 2026-10-06. This note records the researcher's intended scientific contribution and the discussion that clarified it. It is a research hypothesis and target, not a result or claim that the current model has achieved reasoning.

## The question

### 2026-10-10 researcher restores the overarching question

The researcher clarifies the motivating question as "could a simple organism achieve reasoning?", with the fly as the organism and chess as a tool for testing transferable generality. Preserve this broader ambition. The current experiment concerns a fly-derived computational model, not a living organism, so the defensible operational question is: "Can a computational model constrained by the Drosophila connectome acquire transferable, consequence-sensitive reasoning through experience-dependent plasticity?" Chess operationalizes unfamiliar-family, counterfactual and delayed-consequence tests; it does not by itself establish general reasoning across domains or reasoning in living flies. Local-feedback comparisons are mechanistic subquestions, not replacements for this overarching question. A 2000 rating remains a separate performance target; no result or impossibility claim follows from this framing.

2026-10-10 ISEF framing addendum: the researcher's request for official judging guidance led to an [advisory rubric and experimental direction](isef-research-direction.md). Recommend a causal question about plasticity's effect on evaluation accuracy and transfer, with outperforming the researcher as an additional benchmark. Historical ambitions remain preserved. No new experiment, human comparison or category commitment.

### 2026-10-10 focused question and potential contribution

The researcher endorsed the focused question: "Can a connectome-constrained system, starting from scratch, develop useful position evaluation through modeled plasticity and consequence feedback, then apply it to unfamiliar positions?" This is a proposed tractable scientific focus within the broader program, not an achieved result or a requirement to beat humans before establishing the narrower contribution.

### Previous upper-level performance framing

The comparative questions and claims below preserve an earlier ambitious outcome: outperforming trained and untrained human chess players. The researcher now identifies 2000 Elo, with an evaluation and style developed by the model, as the long-term playing-strength aspiration. Human comparison remains a possible future benchmark. Neither rating nor human performance is the overarching question or a current result; the current scientific question above governs.

A successful controlled study could establish an existence result for transferable evaluation under the specified graph, local learning mechanism, engineered interfaces and checkpoint policy. Reset/restoration, disabled/absent/shuffled teaching and matched search-only controls must locate the cause. A separate architecture comparison, with suitable degree-preserving rewired controls and matched learning/resources/interfaces, would be necessary to claim that biological topology itself provides an advantage. Mechanism interventions could locate useful credit assignment, interference and limitations without establishing physiological fidelity. A reproducible consequence-certified benchmark with untouched family/counterfactual evaluation could independently provide a methodological contribution. Failure is informative only at the tested mechanism, representation and budget scope, not a universal incapacity result.

Targeted primary-source check accessed 2026-10-10: [Silver et al., 2018](https://doi.org/10.1126/science.aar6404) already establishes chess learning from self-play without human-game imitation; [Lappalainen et al., 2024](https://www.nature.com/articles/s41586-024-07939-3) demonstrates connectome-constrained task optimization and neural predictions; [Gkanias et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8975552/) models fly mushroom-body learning/memory dynamics. [Dhiman, 2026 preprint](https://arxiv.org/abs/2604.04033) illustrates initialization/null-model confounds in topology comparisons. These support the relevance of the question, not a first-ever novelty claim. This was a targeted review, not an exhaustive literature search; no external mechanism or new experiment adopted.

### Historical performance framing, subordinate to the current question

The following question and proposed claim preserve the earlier human-performance framing. They are not the current overarching research question or a current result. The current question is the simple-organism reasoning question stated above; human comparisons and 2000 Elo are separate future performance measures.

The project uses chess as a demanding, measurable testbed for that earlier framing:

> **Can a compact neural system derived from a simple organism's connectome, given extensive experience and feedback, learn transferable chess reasoning well enough to outperform humans, including trained chess players, under matched conditions?**

The motivating possibility is that training may let a simple, compact architecture perform strong reasoning without a large, human-like neural architecture. The intended contribution is evidence about the relationship between architectural scale, experience and reasoning—not the novelty of a fly playing chess as such.

Chess is useful because it offers legal actions, explicit consequences, adversarial counterexamples, and controlled positions that can be varied or held out. Its strength as a test depends on excluding shortcuts. Winning games or solving familiar puzzles alone would not show that the fly-derived network reasoned: performance could come from memorized positions, a fixed chess heuristic, brute-force/external search, or the engineered input/output interface.

## What a strong result would support

A strong, reproducible result could support this bounded claim:

> **A trained, connectome-constrained fly-derived system can use persistent experience-dependent neural adaptation to make transferable, consequence-sensitive decisions on a defined reasoning benchmark, outperforming human participants, including trained chess players, under matched task conditions.**

Such evidence could challenge the assumption that strong performance on that particular task requires a large, human-like neural architecture. It would provide a proof of principle for what a compact architecture can do with sufficient training. It would not establish that biological fruit flies reason about chess, that this simulation is a faithful complete fly brain, that simple organisms generally outperform people, or that the system exceeds humans on reasoning broadly.

The human comparison must define the chess-training or playing-strength criteria for its trained-player cohort, sample size, puzzle/position families, time and tool allowances, scoring, and uncertainty. Report trained and untrained human groups separately, along with relevant solver baselines where useful. Do not generalize beyond the participants and task actually tested.

## Evidence needed

The claim requires all of the following, assessed separately:

1. **Endogenous learning:** independently verified teacher feedback changes a biologically motivated persistent neural state through the declared mechanism. Reset/restoration and informative-feedback controls establish causality. External search, event counts, changed neural rates, or modified state alone do not pass this gate.
2. **Useful puzzle choices:** with all legal candidates available, the frozen learner improves on verified consequences compared with absent, shuffled and disabled-learning controls. Search assistance and unaided neural choices are measured separately.
3. **Reasoning and transfer:** evaluate on held-out position families and unfamiliar/counterfactual variants without feedback. Test whether choices track altered consequences, including misleading surface similarity, unseen motif combinations, sacrifices and delayed consequences. Keep training, validation and final test families disjoint; never select or tune on final tests.
4. **Shortcut controls:** compare against memorization, fixed heuristic, search-only, and relevant nonplastic/readout baselines. Bound and match search, compute, information, and time. Audit candidate generation, defense coverage and independent consequence verification so a teacher or external solver cannot silently choose the answer for the model.
5. **Human comparison:** preregister a fair protocol that includes trained chess players, with the same task information and comparable decision budget. Define the cohort and report trained and untrained participant results separately, with performance distributions and uncertainty rather than a cherry-picked match or rating label.
6. **Reproducibility and scope:** pin graph/model/memory/encoder/readout/policy and benchmark identities; preserve raw records, seeds, controls, resource use and independent audits. Explain which inputs and outputs are engineered and which neural computations are modeled.

An eventual Stockfish-calibrated playing-strength estimate can supplement this evidence, but Elo does not establish reasoning or human comparative performance. Keep strength under fixed search separate from unaided decisions and transfer evidence.

## What the current system does and does not establish

The project has computational evidence that a modeled association task can acquire and reverse a preference under controlled conditions. Current puzzle-feedback experiments have not demonstrated useful acquisition on the tested fixtures, and no unfamiliar/counterfactual reasoning result or human comparison exists. These results do not pass the claim above; failures should remain visible and constrain the next experiments.

The present board encoders bypass the modeled eyes and directly stimulate mapped Kenyon cells from symbolic board/action features. The task input and action readout are engineered interfaces. Therefore even a future successful result would initially concern a **trained fly-derived computational system**, not a living fly reasoning about chess. A claim about biological fly cognition would require separate behavioral and mechanistic evidence.

The discussion referred to another project as “Cesp6's fly chess” and the researcher described it as machine-learning circuitry presented as a fly. That characterization is the researcher's concern, not an independently verified finding in this note. The distinction this project must preserve is evidence-based: fixed connectome-derived wiring plus explicit, biologically motivated endogenous adaptation is the intended investigation; performance produced by externally fitted parameters, learned chess circuitry, or an engine must not be presented as evidence for the intended claim.

## Research sequence and decision rule

### 2026-10-10 comparison and evidence clarification

Checkpoint selection is shared engineering practice, not the intended scientific distinction from Cesp. Pinned Cesp self-play code at commit `3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf` uses mixed imitation/self-play targets, gradient optimization, and candidate-versus-best promotion with restoration after rejection. Neither gradient training nor checkpoint selection by itself establishes or excludes task-bounded reasoning. The proposed distinction remains explicit endogenous adaptation and independently audited consequence-sensitive transfer; neither superiority nor uniqueness has been demonstrated. Our symbolic input and engineered readout also require shortcut controls. Adopting external checkpoint management does not authorize substituting gradient fitting for the primary learning mechanism.

The earlier current-system paragraph above predates audited familiar-puzzle repairs. The [2026-10-10 evidence review](../../../plasticity%20problem.md) establishes narrow familiar-choice acquisition and coexistence in some older conditions; retention after further adaptation and disjoint/counterfactual transfer remain unresolved. This dated correction preserves the earlier statement's historical scope.

Continue from the existing learning direction and current milestone rather than resetting the project around a grand claim. First demonstrate a useful, causally attributable puzzle-learning round. Then freeze the learner and test transfer on held-out and counterfactual positions with matched controls. Only after those gates pass should the team freeze a human-comparison protocol and test the larger claim. If proposed mechanisms fail, document the failure and change one justified factor at a time; do not imply that more training volume is automatically sufficient.

The result should be described at the strongest level the evidence supports. A win on chess is a chess-performance observation. Controlled learning is learning evidence. Held-out, consequence-sensitive generalization with shortcut controls supports task-bounded reasoning. Beating a defined sample of trained chess players supports comparative performance on that task. None alone licenses a claim about general intelligence or biological flies.

## Provenance

The researcher also proposes testing whether a first verified reasoning ability makes subsequent learning more efficient, using a Rubik's Cube teaching analogy. The [learning-efficiency hypothesis and proposed figure](learning-efficiency.md) separate reliable repeated success from causal acquisition and reduced experience required on new related tasks. This is an untested hypothesis; neither hours to first breakthrough nor exponential acceleration has been established.

This is a researcher-directed framing documented from the 2026-10-06 discussion. It adds no external mechanism or literature claim. No experiment, human protocol, or acceptance threshold was run or validated as part of writing this note. Related current requirements remain in [AGENTS.md](../../../AGENTS.md); evidence and failed gates remain in linked experiment notes and raw reports.

## 2026-10-07: Accepted piece-relationship and investigation scope

The researcher explicitly added learning contextual piece usefulness, relationships and blunder avoidance, together with deciding how much bounded tactical investigation to allocate. Preserve the knight 1.2/3/4.7 and passive-rook-sacrifice examples as hypotheses, not teacher value labels. The proposed 2000 Elo sufficiency is unproved. Unfamiliar/counterfactual consequence-sensitive choices and matched investigation budgets must distinguish learning from fixed heuristics. See [accepted scope](piece-relationships-and-selective-investigation.md).
