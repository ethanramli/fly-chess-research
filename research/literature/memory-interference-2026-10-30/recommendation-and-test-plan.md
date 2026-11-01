# FlyChess memory: recommendation and test plan

2026-10-30. Research and planning only. The researcher approved the [scope](README.md) and explicitly declined a formal review. This memo answers the engineering/research decision; it is not a claim that a new rule has passed. Primary-source investigation and local code inspection are the evidence. No new simulation, learner implementation or chess training ran.

## Recommended direction

**Investigate selective, compartment-local learning first, then add a small amount of revisable slow memory if interference remains. Measure actual representation overlap alongside both.** This is a proposed development sequence, not a package of mechanisms to install at once.

The aim is useful retention while the learner continues acquiring and revising concepts. It can forget individual examples if the learned concepts survive and later support the approved combination test. A fixed bank per puzzle or a protected weight copy could preserve examples without meeting that goal.

The best evidence supports a division of work:

1. Restrict feedback-driven changes to the appropriate activity, synapses and compartment. This addresses inappropriate updates, including the present recovery of inactive synapses.
2. Use slower, revisable physiological state or interacting memory compartments to protect traces from continual overwriting. This addresses a limitation that eligibility alone cannot solve when another experience activates the same KCs.
3. Preserve usable distinctions between experiences through the existing inhibitory circuit. Measure output similarity and task conflict; do not minimize the number of active KCs as an end in itself.

The priority is an inference combining this project's code-level defects with the biological findings below. No retrieved paper supplies a validated chess-memory rule for this eye-driven graph.

## Why overlap is only part of the problem

The current [ReversalMemory equation](../../../.codebase/src/neural-learning/reversal-memory.mjs) can recover a depressed gain under DAN activity even with zero local KC activity. Setting `D=-d`, `a=eta*dt*d`, and `k=0` gives `g_next=(1-a)*g+a`. An unrelated teaching event can therefore move a useful old change toward baseline without overlapping activation. This is an analytical property, not a new estimate of how much historical forgetting it caused.

The [alpha rule](../../../.codebase/src/neural-learning/alpha-lobe-memory.mjs) avoids that recovery term but only reduces active gains, eventually reaching its lower floor. It trades recovery for limited write capacity. Neither a lower learning rate nor permanent freezing resolves both problems. The model already stores gains per permitted KC-to-MBON edge; the concern is plasticity acting on shared activity, not every neuron sharing one software memory variable.

There are two further distinctions. A wrong action returning to first place can reflect a competitor changing rather than erasure of that action's own trace, as the historical handoff warns. In living flies, reminders can also recover inaccessible information from silent traces. This supports measuring retrieval separately from storage; it does not establish a silent-memory implementation in FlyChess. [Yang et al., 2026](https://www.nature.com/articles/s41593-026-02381-2).

If the full observed input and relevant internal state/history are identical for situations requiring opposite responses, a deterministic model cannot distinguish them. More memory cells alone cannot solve that information problem. Conversely, some shared activity can support generalization: Hige et al. linked overlapping odor representations to both plasticity specificity and generalization. The target is harmful interference, not zero overlap. [Hige et al., 2015](https://pubmed.ncbi.nlm.nih.gov/26637800/).

## What the sources support

These are bounded source findings; the proposed FlyChess adaptations remain hypotheses. See [primary-source notes](primary-source-notes.md) for the additional fly studies and their read coverage, and [saved access evidence](source-evidence/web-access.json). Some sources predate ten years because they are foundational; current work was also searched.

**Representation control.** Lin et al. experimentally linked disruption of APL feedback to worse discrimination of similar odors and more correlated KC patterns. Their discussion cautions that sparseness matters through the distinctions it preserves; stronger activation is not uniformly harmful. Amin et al. showed local APL activity and local inhibition, exposing an important limitation of treating a whole APL neuron as one uniformly mixed signal. These are olfactory findings, so transfer to the visual route must be tested. [Lin et al., 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4000970/), [Amin et al., 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7541083/).

**A particularly relevant protection mechanism.** Manoim et al. identify local mAChR-B-mediated signaling between KC axons that suppresses calcium and dopamine-evoked cAMP in neighboring KCs. Removing it induced inappropriate associations with an unreinforced odor. This is a stronger biological lead than an arbitrary protection multiplier: it suggests explicitly modeling local control of plasticity. Its read scope here is summary/introduction, so kinetics and the visual-compartment mapping require further inspection before implementation. [Manoim et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9613607/).

**Current corroborating evidence.** Chen et al. found that acute sleep deprivation impaired discrimination of similar odor mixtures, with increased KC activity/overlap, and rescued discrimination by APL-specific SK-channel knockdown. The ordinary odor-conditioning comparison remained learnable. This is evidence about representation and physiology under sleep deprivation, not a demonstration that adding a sleep delay or an SK scalar cures sequential forgetting. Retrieved coverage includes abstract, introduction and initial results; later methods/results were intermittently blocked. [Chen et al., 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13075853/).

**Interacting fast and slow memory.** Huang et al. measured distinct short- and longer-lasting MBON changes and demonstrated that short-term circuitry regulates longer-term learning through recurrent pathways. Their accompanying reduced model uses bidirectional plasticity and parameters fitted to recordings. It motivates local interactions between timescales; importing its fitted parameters or assuming its rule holds for all visual compartments would require additional justification. Its proposed strengthening under PPL1 inhibition is not a direct measurement of every alpha3 KC synapse; the discussion calls for analogous PPL1 causal experiments. [Huang et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11525173/).

**A concrete computational storage mechanism.** Benna and Fusi model a synaptic efficacy coupled bidirectionally to slower hidden variables. Persistent information in those variables can influence the fast efficacy later. This differs from merely lowering one learning rate. Their storage analysis makes assumptions about statistics, balance and readout; its capacity results are not a prediction for correlated chess experiences. The accessible 2015 preprint was inspected for the construction and assumptions; publication metadata and abstract were verified for the 2016 journal version, whose body was inaccessible here. [Preprint construction](https://arxiv.org/html/1507.07580), [published article metadata](https://pubmed.ncbi.nlm.nih.gov/27694992/).

**Engineering comparisons.** Synaptic Intelligence tracks parameter importance using loss gradients and restricts subsequent movement through a surrogate objective. EWC similarly penalizes movement of important parameters. They are useful controls for how much forgetting a conventional learner can avoid, but their original gradient/task machinery is not an endogenous DAN teaching pathway. A weight-importance scalar invented for FlyChess would be a new heuristic, not an implementation validated by those papers. [Zenke et al., 2017, methods](https://proceedings.mlr.press/v70/zenke17a/zenke17a.pdf), [Kirkpatrick et al., 2017](https://doi.org/10.1073/pnas.1611835114).

## Candidate ranking for this project

The order is research priority, not an empirical score.

| Priority | Candidate | What it could repair | What would defeat it |
|---|---|---|---|
| 1 | Synapse/compartment-local eligibility with a justified timing and direction signal | Inappropriate feedback updates to unrelated inactive edges; overly pooled teaching | The same KCs are genuinely reactivated by B, or the modeled local signal cannot distinguish correct writing from recovery |
| 2 | The same receiver plus minimal fast/slow physiological state or supported compartment interaction | Continual replacement and finite write range while retaining acquisition | Apparent retention comes only from slower acquisition; opposite learning cannot revise the slow state; no source-backed way to write/reset the selected compartment |
| 3 | Correctly represented APL/local inhibition, where the graph and physiology support it | Excessively similar or saturated representations that make local updates conflict | Increased inhibition silences the weak eye signal; task distinctions remain absent; a global scalar fails to represent local physiology |
| 4 | Fixed interleaving/rehearsal, or a bounded local metaplasticity comparison | Quantify the benefit obtainable from extra exposure or extra synaptic state | Oracle scheduling, unmatched exposures, cached answers, or a task label supplies the missing discrimination |
| 5 | EWC/SI or expanding task-specific banks as separate conventional baselines | An upper/reference comparison for conventional retention | External optimization or task identity explains success; no biological-primary claim follows |

Do not change all three leading components simultaneously. A combined success would otherwise leave the cause unknown. Inhibition is a parallel representational diagnostic; the justified receiver must also avoid inactive erasure and saturation.

## Candidate specification before implementation

For the first receiver, retain the released graph, neuron identities, edge signs and fixed input. Memory remains on existing supported KC-to-MBON edges. Its activity-derived eligibility limits which synapses a local, physiologically justified modulation can affect. Delayed credit changes eligibility strength; it must not accidentally reverse update direction. An inactive-protection invariant is a mathematical software property, not permission to remove all biologically supported forgetting.

A local bounded illustrative update of the form `dg/dt = e * [p*(gmax-g) - d*(g-gmin)]` already appears in the project's [earlier hypothesis](../../../documentation/design/neural-learning/bidirectional-plasticity-without-freezing.md). It is an engineering hypothesis, not a published universal fly equation. Nonnegative `p` and `d` would need identified local physiological origins and validated timing. The teacher cannot supply parameter deltas or turn a success label directly into an invented positive modulatory factor. This formula protects at `e=0` but cannot protect shared KCs with nonzero eligibility.

For the local mAChR-B lead, preserve the released fast transmitter/sign convention: receptor-mediated suppression would be an explicitly modeled modulatory pathway, not a reason to flip positive KC-to-KC edges into negative fast synapses. The graph's transmitter annotations alone do not specify receptor dynamics. Establish the supported receptor/compartment scope, or label a simplified version as a computational comparison.

If that receiver acquires but cannot retain conflicting associations, the next candidate adds the smallest slow state capable of changing the prediction: begin with one extra state on permitted synapses, coupled to the fast state and still revisable. This two-state approximation would be tested against a single-rate receiver; it does not inherit the full multi-variable model's capacity guarantee. Specify coupling, leakage, bounds, model time and consolidation trigger from inspected equations/physiology before registration. Keep interneuron compartments and slow synaptic variables conceptually distinct.

The eye-route map governs where this can act. The [existing wiring count](../../reports/restart-wiring-2026-10-30/wiring-count-output.txt) identifies visual-KC output targets that differ from the old readout. Mapping a dopamine soma near an MBON or finding one edge does not establish a receptor/compartment rule. No source result justifies applying gamma timing everywhere or changing every graph edge.

## Minimal causal study, staged

This is a proposed protocol outline. Numerical budgets, seeds, candidate equations and thresholds must be frozen on development evidence before execution. It does not change the approved eye test or authorize new graph runs.

1. **Finish the information/pathway prerequisite.** Resolve the approved decoder check and eye-test interpretation through the existing restart path. L125 shows a linear decoder can miss a constructed contextual relation. A failure means failure of that decoder/readout under that protocol; it cannot establish absence of all information. Any protocol revision is separate and precedes graph data.
2. **Use a small non-chess association task through the chosen valid route.** Acquire A, measure its unaided score/choice, acquire B/C, measure A again, then reverse A's consequence. Include distinguishable similar patterns with congruent and conflicting consequences, plus low-overlap patterns. Control stimulus energy and exposure. For intentional identical-input/opposite-answer fixtures, label the information impossibility instead of counting failure as forgetting. Keep correct associations out of the input.
3. **Make one mechanistic comparison at a time.** Start with a pinned baseline and the local candidate. Add the slow-state version only after the relevant residual failure is established. Every mainline experiment includes independently verified informative own-choice feedback alongside absent, contingency-balanced shuffled and disabled-plasticity controls. Compare the same presentations/timing and report choices and pulse counts separately; unknown produces no pulse. Intervention-only or replay schedules are explicitly diagnostic comparisons rather than new chess-learning progress.
4. **Measure what changed after B.** Log graded KC activity, eligible edge activity, local modulation, gains and all-legal output margins. Compare A's score before/after B and the relevant competitors. Use numerical update/restore interventions only as labeled model diagnostics; changing a trace while keeping old activity does not replay a new causal trajectory. For retrieval loss, compare preserved traces with the output effect of restoring a matched state; any reminder test needs no-teaching and control reminders to detect relearning or new errors.
5. **Escalate only after joint success.** Test more associations and varied ordering, retention over continued learning, reversal, and a sensitivity range fixed in advance. Then return to the restart's Phase A concept learning, Phase B learning benefit and separately registered Phase C combination. Improvement on remembered images alone never passes the reasoning criterion.

For model-time retention, represent time explicitly and distinguish passive rest from experience-dependent interference. A frozen checkpoint tested later measures digital persistence. Extra CPU sleep supplies no physiological clock.

## Outcomes and fair interpretation

Use three primary behavioral quantities together: prior-task retention, new-task acquisition, and correct reversal. Report initial acquisition too: a candidate that never learned A has no retained A. Retain all attempted lineages in the accounting; conditional retention among acquired associations is a supplementary view. A strong retention number accompanied by failed B learning or reversal is a failure of the intended solution.

Report both fixed-exposure results and a separately capped acquisition-matched analysis if justified, so slowing all learning cannot masquerade as consolidation. Stratify by actual graded overlap, consequence conflict, valence and association age. Measure plasticity saturation/floor occupancy and the contribution of updates on inactive versus shared edges. Equal mean firing or equal pulse counts alone do not establish matched learning.

Choose independent replication at the computational seed/schedule/task-family level and retain matched contrasts with uncertainty. Repeated reads of one brain or checkpoint are not independent flies. Select mechanisms and rates on training/development families only, with per-criterion gates. Freeze the final test and use it once; publish failed candidates and deviations.

A satisfactory result supports a bounded computational statement: under the registered conditions, this local memory mechanism reduces interference while allowing acquisition and reversal. Biological validity requires the corresponding physiological predictions. Reasoning additionally requires unfamiliar concept combination without externally supplied concept/task labels, plus the approved comparators and audit.

## Memory and compute compromise

A small number of per-synapse variables is compatible with sparse storage. One extra Float64 per permitted edge costs `8*M` raw bytes for `M` edges: 8,000 bytes per 1,000 edges, before metadata/checkpoints. This is storage arithmetic, not measured runtime RSS. Bound traces and buffers, stream events, and preserve the 2048 MiB RSS/free-memory guards and frozen legacy budgets.

Fixed interleaving is worth a separately declared comparison because it can protect old associations without claiming a new biological rule. Keep the primary training schedule independent of errors and recheck any replayed consequence certificate. Count every replay in the practice budget. Unlimited rehearsal or retrieving a stored answer would answer a different question.

A useful compromise is finite capacity with preserved transferable concepts. We should report its capacity/learning-rate/reversal trade-off rather than demand zero forgetting or promise indefinite memory. More RAM cannot repair a representation that cannot distinguish cases; extra modeled physiological state can be tested for that specific storage function.

## Decision and remaining uncertainty

The recommended first candidate is **local eligible plasticity on the verified eye-compatible pathway**. The recommended next storage candidate is **a minimal revisable fast/slow mechanism**, with inhibitory coding assessed for damaging overlap. The first informative assay is A → B/C → A test → A reversal, with matched controls and explicit model time.

What remains unknown is the exact biological rule for the relevant visual compartments, whether local eligibility is sufficient on their actual activity, whether the slow mechanism helps under correlated inputs, and whether the model can later combine learned concepts. These are testable uncertainties. None warrants declaring the present memory problem solved.

AI assistance: Codex gathered the primary-source evidence and drafted the recommendation. An attempted native research helper remained uninitialized, supplied no findings and was cancelled; no independent review is claimed. No outside-provider manuscript processing or formal publication pipeline was used.
