# FlyChess research maturity and external-review assessment

2026-10-30. Advisory assessment for the researcher, based on current source paths, registered protocols, preserved results and primary external sources. ISEF target: **2028 or later**. Manuscript polish, absence of a finished poster and absence of submission forms at this development stage are not scored as scientific defects.

**Verdict: substantial research engineering, a disciplined but still exploratory methodology, and promising evidence for a narrow feature-association task. The present evidence does not establish transferable reasoning, physiological validity, or reasoning in a living organism.** A broad eLife reasoning claim is premature. An ISEF award or editorial decision cannot be predicted from a repository review.

The most consequential new observation is a fixed, nonlearned rule over the current supplied attack/pin tokens: it gets **24/24 training boards, 12/12 training counterfactual pairs and 390/390 legal-action classifications correct**. No neural simulation or parameter fitting was involved. This is training-only evidence; it does not establish comparator performance on validation/final sets. See [reproduction and limits](evidence-ledger.md).

This review records **40 issues and review themes**, including conditional concerns, unknowns and repaired safeguards. They are not 40 independently confirmed bugs. The full [issue register](issue-register.md) distinguishes them. [Source map](source-map.md), [external sources](external-sources.md), [coverage](coverage.md), [commands](commands.md) and [review log](review-log.md) make the assessment inspectable.

## Maturity by component

| Component | Present maturity | What the evidence supports |
|---|---|---|
| Sparse execution, resource discipline and experiment records | Substantial working infrastructure | Large sparse graph execution on the laptop, versioned runs, receipts, checkpoint lineage and several independent replay checks. Source/runtime binding and recovery evidence still need work. |
| Anatomical provenance | Strong for the specific packaged release | Independently checked graph identities, aggregated connections and released transmitter convention. This does not validate neuronal dynamics or every transmitter prediction. |
| Teaching and causal comparisons | Developed for the narrow task | Exact one-reply certificates, learner rankings before feedback, matched absent/shuffled/disabled arms and persistent local updates. Biological natural reward and multistep explanation/credit remain unestablished. |
| Current useful learning | Promising, task-specific evidence | Full-r14 reports 61–64/64 final safe-capture choices across three projection replicas versus matched neural controls. It failed its registered D4 gate. These choices use engineered attack-map input. |
| Independent confirmation | Incomplete | Full-r15 training is documented as finished; its audit was not published at the checks during this review. D8's recovery subclaim has no separate witness. Reused final families cannot constitute a wholly fresh confirmatory test. |
| Transfer and reasoning | Early | New positions/source games within familiar constructors, including designed counterfactual pairs. Structural novelty, delayed consequences, composition and shortcut-resistant reasoning have not been demonstrated. |
| Biological mechanism validation | Early | Identified cells and motivated plasticity assumptions; no quantitative validation of this implemented receiver/dynamics against relevant physiological or behavioral measurements was found. |
| General chess/playing strength | Unestablished for this learner | The present assay is not a complete learned chess player. A historical untrained browser player's games do not measure the current learner's Elo. |
| Reproducible scientific release | Incomplete | Considerable local evidence exists, but no clean-environment reproduction or complete licensed release was verified. Some historical G0 intermediate states were deliberately pruned. |

These are qualitative assessments, not rubric scores or a comparison with the typical entrant.

## The criticisms that matter most

### 1. The current task does not separate learned reasoning from a small feature-to-valence mapping

The encoder computes move legality, successor-board attack facts and geometric pin marks outside the neural model, then stimulates selected KC pools. Those are meaningful chess computations supplied by the interface. The learner's task is consequently much narrower than inferring consequences from an unprocessed board.

The review's training-only comparator chooses a capture when every supplied attacker token says none or pinned. It achieves perfect training performance, including the designed counterfactual pairs. The geometric pin rule is not correct on every possible chess position; that is exactly why a fresh adversarial/structural evaluation is informative.

A professor would ask: **which computation is learned by the connectome, and which was already supplied by the representation?** Scratch, absent, shuffled and disabled-plasticity arms are useful causal controls for feedback-driven change. They do not answer whether a fixed rule, a tiny learned comparator, or a reduced circuit solves the same problem equally well.

This does not show that neural learning is absent or worthless. It blocks interpreting success on this assay, by itself, as evidence that the model inferred general chess relations. It also does not require natural vision before any useful computational study: engineered input is acceptable when its contribution is explicit and matched across comparisons. Issues M01, M03, M06, M18–M20.

### 2. Genuine anatomical wiring is not a validated biological learning system

The actual dynamics use row-normalized log synapse counts, a uniform bias, selected leak/saturation parameters, eight numerical steps and reset neural activity for each presentation. These are computational choices. The active alpha1/alpha3 stores implement immediate gain changes without physiological consolidation or a biological retention clock.

The code explicitly acknowledges these approximations. Honest documentation is a strength; it does not turn an approximation into validated physiology. In primary experiments, memory acquisition and updating differ substantially by compartment, including delayed expression under particular alpha3 training protocols. The current immediate store needs a bounded interpretation or validation against relevant observables. See the primary [Aso/Rubin study](https://elifesciences.org/articles/16135) and [alpha3 timing evidence](https://elifesciences.org/articles/49257).

The engineered output MBON12 − MBON01 − MBON07 + MBON14 also needs justification; the register acknowledges that the MBON14 sign is a convention rather than a measured alpha3 valence. Cell-type/hemisphere masks do not establish synapse-level modulatory locality. The alpha stores can only depress gains under their current equation; their long-run capacity, interference and reuse remain questions.

One additional interpretation problem appears in the provenance report: being outside the MB mapping does not by itself prove that 15 ambiguous optic-lobe edges cannot affect a recurrent graph computation. No actual Stage 1 effect was demonstrated here. See E06. Issues M12–M17, M24, M26.

### 3. The final evaluation is becoming development evidence

Full-r14's D4 channel was disconnected from the changed choice readout and predicted the same sign on every inspected training action. The original failure is preserved. Full-r15 changes the D4 observation to the alpha-lobe channel and reuses the same final families, with new projection seeds. The change is disclosed and was selected using training evidence.

That is a defensible exploratory repair. It is not equivalent to testing a fully frozen pipeline against a wholly untouched final distribution: the previous aggregate final failure informed the decision to repair the measurement. This creates a risk of adaptive evaluation, not proof of actual overfitting.

New seeds provide another computational replication on the same stimulus set. They do not make those stimuli unseen again. Keep r14/r15 as development/replication evidence and reserve a fresh, independently prepared final family set for the definitive claim, with the input, memory, readout, curriculum, selection policy and gates fixed before evaluation. Issues M05, M21–M24, M37.

### 4. 'Unfamiliar family' currently has a narrower meaning than the overarching question

The splits are source-game disjoint, and the new counts-only check finds no exact, placement, history or tested symmetry overlap. The 32 final counterfactual board pairs are genuinely distinct and cover 64 boards once.

Nevertheless, all splits use the same pin/blocked/absent constructors. A different source game and FEN can express the same learned feature rule. Six training families and eight final families provide limited independent coverage; 390 legal actions or 128 probes are not 390 or 128 independent tactical families.

The eight-cluster paired bootstrap respects important within-family dependence, which is good. Ten thousand bootstrap draws do not create more original clusters, and three cue projections on one graph are not three biological subjects. Its uncertainty applies to the declared computational sampling design, not all flies or all chess. There is no automatic need to penalize every conjunctive gate with a multiple-comparison correction; the actual selection/testing design needs analysis.

For a reasoning claim, distinguish new source positions, new feature combinations, new causal structures, delayed consequences and transfer across task domains. Counterfactual sensitivity alone does not distinguish relational inference from an associative rule that already sees the changed relation. Issues M04, M06–M08, M20–M23.

### 5. The task's verified consequence is not general move value

Here a quiet move is a failure of the capture-retention task. A capture is evaluated on immediate legal recapturability. This is well-defined and certifiable; it is not equivalent to strategic goodness, net material gain, avoiding loss, sacrifice understanding or a calibrated position value.

The teacher is also unusually informed: it checks all legal training outcomes and uses the learner's ranking to schedule contrasting successes/failures and rehearsal. It does not compute the neural deltas, but the amount of external curriculum assistance must be counted. The model receives a limited modulatory signal; a detailed logged proof is not evidence the model understood that proof.

A strong next scientific test targets a specific excluded alternative explanation. Adding many more repetitions of the same easy feature rule would mainly strengthen that narrow association result. Issues M18–M20, M24.

### 6. The role of the connectome and the new contribution remain unresolved

A feedback effect versus untrained controls establishes something different from an advantage attributable to biological topology. For that latter claim, appropriate same-input reduced-circuit and topology-null comparisons are missing from the active protocol. They should preserve the properties relevant to the hypothesis; an arbitrary damaged graph is not automatically a fair null.

Published work already includes whole-brain sensorimotor models, connectome-constrained task optimization, and mushroom-body learning models. The local prior fly-chess implementation also exists. The distinctive contribution must be a demonstrated result that these precedents do not already provide, rather than the conjunction of fly, chess and laptop.

A narrow existence result for endogenous local learning need not outperform every generic machine-learning system or require topology superiority. A biological-topology advantage claim does. A tool/resource claim instead needs a useful, reusable capability and a relevant comparison. The current novelty note is explicitly a snippets/abstract scoping search; it is insufficient for a confident first-ever claim. Issues M03, M25–M26, M38, M40.

## What the history actually establishes

The preserved history contains informative successes as well as failures:

- Positive-channel V2 passed a bounded computational association/reversal prerequisite, with six seeds and recurrence/receipt audits. That report explicitly did not rerun full-graph inference in the auditor or establish biological validity.
- Training-volume V1 failed to rescue useful choices at the tested budgets. Delayed-learning work showed some persistent contrast adaptation despite incorrect top choices. Neither is evidence of universal incapacity or no learning whatsoever.
- Several stability/transfer studies repaired familiar positions without useful sibling transfer. The cue-width hypothesis improved a relative score-change rank while absolute choices remained wrong.
- G0 acquisition/retention and later interference/reversal were mixed; policy B subsequently removed G0 as a chess-stage prerequisite. The current receiver also differs. A Stage 1 snapshot result cannot silently inherit an unmet reversal or biological-retention claim.
- The r13 failure motivated separating quiet/capture features and introducing a pin mark. The r14 validation smoke and full-r14 reported useful restricted choices. The improvement therefore follows a joint history of representation, mechanism, readout and curriculum changes; it is not an isolated estimate of any one change's effect.
- WASM and latency work supports bounded engineering results, with historical correctness/reporting corrections. It does not supply learning or reasoning evidence.

Many reports are audits, prefixes, resumed invocations or analyses of shared runs. They are not independent replications merely because they have different directories. Preserving negative results and corrections is good practice. An exploratory sequence becomes a confirmatory scientific result only when its final claim receives a suitably protected test.

## Software concerns after the latest repairs

The earlier [seven-finding software review](../codebase-weakness-review-2026-10-30/README.md) is historical evidence, not an unchanged list:

| Earlier concern | Current assessment |
|---|---|
| W01 split equivalence; W02 duplicated pairs | Actual registered data cleared by a separately authorized counts-only audit. Stronger future audit code exists; evaluator/schema integration remains. |
| W03 D8 recovery | Still substantive: evaluator v4 derives pendingReceiptExactlyOnce from the fullNeuralReplay flag. Uninterrupted replay is not a recovery witness. |
| W04 repeated-interruption resume | Matrix-v3 repair exists and its six bounded tests passed. Frozen r15 remains on matrix-v2; no full-graph double-interruption witness was produced by this review. |
| W05 source closure | New future-run builder adds the 37 missing local source pins. Runtime/package enforcement remains incomplete; active r15 is unchanged. |
| W06 supervisor race | Exclusive hard-link publication repairs the old acquisition race. Stale-owner reclamation retains a documented compare/unlink window; no duplicate graph launch was observed here. |
| W07 stale handoff | Dated corrective update exists. Residual current-versus-historical phrasing is a maintenance concern, not proof of a bad result. |

Four bounded synthetic/train-only test files passed **22/22** during this review. The new data-test directory is not included by the root npm test globs. No whole-suite, graph or recovery experiment was run for this documentation review.

## Likely ISEF pressure points

Using the official current [science judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/) as a planning reference:

| Criterion | Maximum | Likely challenge from this evidence |
|---|---:|---|
| Research question | 10 | Define reasoning operationally and separate computational-model claims from living-organism claims. |
| Design/methodology | 15 | Missing same-input simple comparators; generator novelty; biological assumptions; protected confirmation. |
| Execution/analysis | 20 | D4 repair/reused final set, D8 recovery evidence, few independent families, uncertainty, reproducible identities. |
| Creativity/potential impact | 20 | Identify the new demonstrated mechanism/result and why the full graph matters for that claim. |
| Presentation | 35 | Interview 25: student ownership, central mathematics, limitations and troubleshooting decisions. Poster 10: not assessed because no finished poster is being evaluated. |

These weights are not deductions. The repository cannot establish the student's interview mastery, and AI assistance alone does not establish a violation.

For the **2028+** target, eligibility remains a separate check: affiliated-fair route, actual-year research window/continuation rules, school/age eligibility and the eventual AI/support rules. The current [2027 rules](https://www.societyforscience.org/isef/international-rules/rules-for-all-projects/) distinguish disclosed code assistance from restricted AI authorship of initial submission documents. This advisory review is not a student-authored submission or a finding of disqualification. Human benchmarking would require whatever approvals apply before collection; no missing human experiment is charged against a purely computational claim.

## Likely eLife pressure points

The current [author guide](https://elife-rp.msubmit.net/html/elife-rp_author_instructions.html) describes editorial selection before review and publication with assessments after review. It also provides a tools/resources route. No acceptance probability or hypothetical editorial score is assigned here.

For a broad reasoning/biology paper, the largest weaknesses are construct validity, biological validation, the new contribution and independent confirmation. A computational model can be publishable without new animal experiments, but it still needs evidence appropriate to its biological claims. For a tools/resources paper, the present missing evidence is usefulness and relevant benchmarking, alongside a reproducible release. A finished manuscript would not repair these evidence gaps.

Real reviewers of the [Gkanias mushroom-body model](https://elifesciences.org/articles/75611/peer-reviews) asked for mechanistic specificity, clear fitting-versus-testing distinctions, quantitative biological comparison, justified comparisons and sensitivity. That paper was eventually published after revision; its history does not predict FlyChess's outcome.

## Repair order with the highest scientific return

1. **Specify one defensible next claim.** State exactly what the learner must infer from its supplied features, what a pass excludes and what would falsify it. Keep organism-level reasoning and 2000 Elo as separate ambitions.
2. **Test the strongest cheap alternative explanation first.** Freeze the same-input rule and small learned/reduced-circuit comparators; evaluate on newly protected structural/adversarial families. Do not use existing final boards to design those families.
3. **Freeze the full pipeline and evaluator together.** Resolve readout semantics and D8 evidence, integrate staged fixes in a new registration, pin the source/runtime/package closure and preserve the old failures.
4. **Run a bounded confirmatory study at the right units.** Plan independent family sampling, effects/uncertainty, matched experiences and any architecture comparison required by the chosen claim. Extend retention/reversal/delayed consequence only as required by that claim.
5. **Establish the biological or tool contribution.** Validate the exact receiver against suitable published observables or explicitly restrict it to an engineering abstraction; test relevant parameter/mapping uncertainty.
6. **Make a clean, licensed reproduction possible and establish student contribution.** Package one complete result and derivation path, preserve provenance/support records and verify the actual target-year entry route.

This sequence does not authorize new training or prescribe an unlimited collection of controls. Fixing the listed software defects, increasing training volume or completing all twelve curriculum stages would not by itself answer the central scientific criticisms.

## Coverage and residual uncertainty

The review traced the active task path and selected historical branches; it did not read every byte of 57,567 inventoried artifacts. It did not open sealed validation/final rows, run a fresh full neural audit, inspect every supplement, measure student mastery, determine future eligibility or reproduce the study on another machine. [Coverage](coverage.md) records these limits and the distinction between direct reproduction, source tracing and reported evidence. The protected inputs and ongoing experiments remain unchanged.
