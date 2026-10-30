# Follow-up research review: what would make the route to reasoning work?

Thank you for the detailed review. It identifies substantial concerns about representation, feedback, credit assignment, shortcuts, and the gap between human chess topics and demonstrated computational capabilities. We want to examine those concerns seriously before changing the research direction.

Please use your strongest reasoning to reassess the entire research strategy, including both our assumptions and your previous recommendations. We want a productive second review, not a debate to win. Correcting details is useful insofar as it changes what we should build, measure, or conclude. You may conclude that the current approach needs a major redesign, that chess is premature, or that particular ambitions cannot be supported under these constraints. Explain the evidence and the strongest alternative interpretation.

The central request is: **Can you give us a falsifiable route from this actual learner toward increasingly general consequence-sensitive reasoning, with early experiments that distinguish a promising direction from an expensive dead end?** A list of human chess topics is insufficient. A list of successively harder assays is also insufficient unless you explain what mechanism could connect them and how to test whether earlier learning helps later transfer.

The researcher is willing to do substantial work and sustained automated experiments. Optimize for scientific information and progress toward the real goal. Do not silently redefine success as the easiest association task this model can pass. Conversely, do not assume that a curriculum or a long training loop will create an absent capability.

You have no repository access. The factual project information supplied here is the limit of your implementation knowledge. If you need equations, annotations, traces, or source code to decide something, specify exactly what you need and what competing hypotheses it would distinguish. Do not assume those details.

Prioritize five decisions in your answer: (1) what the actual learner can plausibly represent and learn; (2) whether the proposed curriculum causally helps transfer; (3) the next informative study after G0 replication; (4) what must change to make later ambitions testable; and (5) which bounded work can run automatically between scientific reviews. Address the detailed questions below in a connected analysis; avoid repeating the same answer for every bullet.

## 1. Clarified target and boundaries

The research question remains: could experience-dependent plasticity in a Drosophila-connectome-constrained computational model support useful, persistent, consequence-sensitive evaluation that transfers across unfamiliar chess positions and counterfactual changes?

The researcher also wants to explore stronger chess play and longer-horizon reasoning eventually. Neither the original twelve stages nor your replacement sequence is an experimentally established route. We need a scientifically defensible way to discover which capabilities are possible, rather than assume either their emergence or their impossibility.

The longer-term playing aspiration is around 2000 Elo, with an evaluation shaped by the model's own learning. No such strength or rating calibration exists. It is a separate performance ambition: assess its dependencies honestly without making Elo either the definition of reasoning or a requirement for an informative first result.

The relevant constraints are:

- Initialization from scratch; preserve released neuron identities, wiring topology, and fixed sign conventions.
- Lasting adaptation must arise through an explicitly modeled and biologically justified mechanism inside the simulation. The external teacher must not calculate neural parameter updates.
- Symbolic chess input and mechanical legal-move infrastructure are engineered interfaces. Natural visual perception is unimplemented.
- Independent consequence verification can generate teaching evidence after the learner commits. A bare engine score is not an exact consequence certificate. A separately declared Stockfish-value teaching condition is possible, but would not validate its biological pathway.
- Unaided evaluation and evaluation with a fixed external search budget are distinct conditions and must support distinct claims. External search success does not establish endogenous planning.
- Matched informative, absent, shuffled, and disabled-plasticity conditions; disjoint training, validation, and final-test families; final tests stay sealed.
- Sparse serial computation on a laptop, with up to 2 GiB process RSS for new unfrozen work. Frozen experiments retain their original limits.

Please use plain numbered stage names in any revised curriculum: Stage 1, Stage 2, and so on. Give prerequisite assays descriptive names. Avoid introducing another system of R0/R1/C1/C2 identifiers for readers to decode.

## 2. The actual learner: implementation evidence, not an idealized fly brain

The following packet was checked against the registered G0 replication protocol and source files whose SHA256 values match that registration. It describes the tested computational configuration, not a physiological reconstruction of a living fly. Older documentation sometimes describes its earlier unintegrated development state; the implementation below is the one used in the completed G0 diagnostic.

### Neural dynamics and plastic scope

The simulation propagates nonnegative continuous activity through the released sparse graph with fixed signs. It uses a bounded leaky rate recurrence, not a calibrated biophysical spiking model. A simplified description of each numerical step is:

```text
z_j = external_drive_j + sum_i signed_weight_ji * h_i
activation_j = 0                         if z_j <= 0
             = 10 * tanh(z_j / 10)       otherwise
h_j(next) = (1 - alpha_j) * h_j + alpha_j * activation_j
```

Initial recurrent magnitudes use row-normalized log(1 + released synapse count), scaled by 0.9. The registered model uses float32 activity and eight recurrent steps per presented frame. Leak and other nonplastic parameters are pinned. Neural state continues across frames within a teaching episode, then is reset at the episode boundary. Persistent plastic state continues across lessons.

The current permitted learning is restricted to **122 existing positive gamma-KC-to-MBON12 edges**, under a coarse gamma2 map with identified PPL103 teaching cells, one per mapped hemisphere group. Other recurrent weights are fixed. The mapping checks released IDs/indices and annotation identities but does not establish synapse-coordinate or receptor-specific physiology. The fact that the full graph participates does not mean the entire graph learns.

### Local plasticity equations

For each eligible edge, persistent state includes a multiplicative gain g, a KC credit trace e, and short/long response-filter states S and L. Let k be normalized local KC activity, capped in [0, 1], and r be nonnegative normalized local DAN activity. Both are rectified deviations above the fixed unstimulated-model reference, divided by 1.5. The registered dynamics are:

```text
de/dt = (k - e) / tauKC
dS/dt = (r - S) / tauShort
dL/dt = (r - L) / tauLong
delta = L - S
dg/dt = eta * e * [max(delta, 0) * (gmax - g)
                  - max(-delta, 0) * (g - gmin)]

eta = 0.5
gmin = 0.2; gmax = 1.8; initial gain = 1
tauKC = 0.4; tauShort = 0.6; tauLong = 1.0
numerical interval per recurrent sample = 0.075 model units
```

The integrator handles the sign change of delta within each piecewise-constant interval. Graph gains are held fixed while a frame's neural trajectory is computed, then updated from that trajectory. This is a declared approximation. These intervals are not calibrated biological seconds. The filters are source-motivated; the bounded gain law, normalization, eligibility, and their biological interpretation remain engineering hypotheses. There is no established endogenous reward-prediction-error computation.

### Input, teaching, and readout

G0 has eight four-bit target contexts and two public actions, A/B. Its public input contains only the cue and candidate action. For each cue/action and candidate KC cell, the encoder hashes the complete tuple `(projection seed, full cue, action, cell index)`, selects eight cells from the mapped KC pool, and stimulates each at current 1.5. This is a fixed, label-blind, whole-cue random projection. It does **not** preserve an explicit additive representation of individual cue bits, spatial coordinates, or reusable relations. Phase, correct outcome, and proof are excluded from that input. This is the synthetic G0 encoder, not a claim that a raw-occupancy chess encoder has already been validated.

Verified favorable and adverse outcomes use the **same identified PPL103 targets and pulse amplitude**, with different timing: the favorable code delivers the pulse two frames before the replayed cue; the adverse code delivers it in the cue frame. The cue is at frame 2; there are 19 frames total, including the tail. This is an experimental pulse-order code, not an established mapping of natural reward and punishment. Outcome verification occurs before this replay episode. The teacher supplies the stimulus schedule, never the gain delta.

The fixed score for a candidate is:

```text
balance = mean(MBON12 activity) - mean(MBON01 activity)
score = tanh(balance - unconditioned_balance_for_identical_cue)
```

Higher is preferred. The reference is computed from the identical unconditioned model; no decoder is fitted to outcome labels. This measures a memory-dependent contrast, not calibrated position value, confidence, or natural motor action selection. Persistent learning is frozen during unaided assessment. No supervised optimizer is called in this learning condition, even though the shared numerical model also supports separate supervised comparisons.

### Questions the concrete implementation raises

1. Does this configuration behave primarily as an associative readout over fixed representations, or can its permitted recurrently effective gains support more? What follows analytically from the equations, and what requires empirical measurement?
2. Does direct stimulation of mapped KCs bypass the expansion, sensory geometry, or input binding that your configural-learning argument depends on? What can G0 then establish about the later task?
3. If a proposed XOR/biconditional assay hashes each complete compound into a separate random cue, would passing it test endogenous nonlinear binding, or learning associations to already separated compounds? Specify an elemental representation and controls that make the intended inference identifiable. Compare acquisition of four compounds, savings, and zero-shot transfer to genuinely new compounds.
4. Given the actual bounded bidirectional rule, what precisely would constitute saturation, interference, a wrong teaching direction, or readout misalignment? Does your earlier description of a single monotonic plasticity rule still apply?
5. Could pulse ordering, residual e/S/L state, episode resets, fixed-reference subtraction, or finite neural propagation dominate the result? Propose measurements rather than presuming which is responsible. Explain which counterfactual state combinations would be physiologically uninterpretable even as diagnostic interventions.
6. What is the minimum source-supported change, if any, that could improve representational or learning capacity while preserving the graph contract? Adding arbitrary channels, altering signs, or wiring a relational solver into the encoder would change the scientific question.
7. With an identical unconditioned reference and no permitted state changes, the disabled arm may have zero scores and tied choices by construction. What useful causal comparison does that provide, and what must absent/shuffled controls or additional fixed-policy baselines establish beyond it? Likewise, does removal of all learned state necessarily remove a reference-relative score, making that intervention insufficient by itself to establish the intended computation?
8. What biological claim can an artificial favorable/adverse pulse-order code support, if any? Distinguish capacity under a declared experimental teaching interface from reconstruction of natural reinforcement learning. Which source evidence and perturbations would be needed to strengthen that interpretation?

## 3. Current G0 evidence: what can it actually diagnose?

G0 is a synthetic association, interference-retention, and contingency-reversal prerequisite. It is not chess training or a reasoning result.

The original frozen G0 experiment failed its reversal comparison; an informative arm tied a shuffled control at 7/8. Subsequent retained-versus-reset diagnostics have now been completed and independently replayed on two predetermined effective projection seeds, 20261011 and 20261012. Both reproduce the predeclared pattern: complete-memory reset passes the descriptive branch gates, while retained memory fails at least one required comparison.

For seed 20261012:

- Reset informative reversal: 8/8, with all registered descriptive reset-branch gates passing.
- Retained informative reversal: 7/8, mean oriented margin 0.00010604.
- A shuffled retained control: 5/8, mean oriented margin 0.00030735.
- Retained informative passes minimum-choice and context-advantage thresholds but fails margin advantage. Independent neural replay passes; overall G0Passed remains false.

The complete reset restores multiple persistent variables together: gains, KC traces, short- and long-response states, and event count. It is an artificial intervention, not a modeled biological forgetting process. The diagnostic does not isolate an individual memory component. Endpoint gain clipping and a feedback-routing defect have not been demonstrated. A final predetermined projection seed, 20261013, remains unregistered and unrun at the latest documented inspection.

Your answer attributed the limitation to saturation, unbounded plasticity, or missing opponent-valence architecture, and recommended antagonistic channels plus normalization.

Please answer:

1. Which causal conclusions follow from the actual retained/reset contrast, and which do not? Distinguish a replicated behavioral limitation from a mechanism diagnosis.
2. What evidence would separate gain-bound saturation, persistent trace interference, response adaptation, input overlap, readout sensitivity, timing effects, or another explanation? These are candidate hypotheses, not established causes.
3. What is the smallest discriminating diagnostic after the pending replication? Prefer an intervention or bounded analysis that distinguishes hypotheses over a bundled redesign that changes several things together.
4. What source and annotation evidence would be required before assigning appetitive/aversive roles to particular released DAN/MBON identities? Does your generic PAM/PPL1 proposal meet that requirement?
5. Does a failed reversal or configural task establish structural incapacity, or only failure of a specified model, interface, dose, schedule, and evaluation? What stronger evidence would support an impossibility claim?

Do not change the old gates or recast a failed experiment as a pass. If new thresholds are warranted, propose a separately registered study.

## 4. Reconsider categorical claims about planning and later stages

Your review says the fly connectome lacks the machinery for internal board simulation, later stages are unachievable without cheating or memorization, and progressing through the curriculum is guaranteed to produce uninterpretable failures.

Please identify the strongest primary evidence supporting those statements. Then distinguish:

- a capability not demonstrated in living Drosophila;
- a mechanism not implemented or validated in the present simulation;
- a capability not inferable from the proposed tests;
- a capability shown to be impossible under precisely specified assumptions.

Which category actually applies to each of your strongest negative conclusions?

Also distinguish learning a static state-action evaluation from performing internal forward search at decision time. Could verified multi-move experience train an unaided evaluation that transfers without the model reproducing the teacher's search procedure? What results could distinguish memorized templates, systematic relational generalization, and internal sequential rollout? Do not assume that generalization by a learned evaluator proves rollout, or that absence of rollout rules out every useful form of consequence-sensitive evaluation.

For the positional topics you recommended dropping, determine whether the strongest justified decision is permanent removal, deferral until additional mechanisms exist, or replacement with narrower tasks whose consequences can be certified. A short-horizon task about a weak square cannot establish broad positional understanding; assess whether it can still test a useful limited relation.

There is also a potentially important asymmetry in learning requirements: contingency reversal matters for adapting to changed associations, but legal chess consequences are stable for a complete state. A defended/undefended minimal pair changes the input state rather than reversing truth for an unchanged state. Is reversal a defensible general receiver qualification, a logically necessary prerequisite for every static chess discrimination, or a pragmatic project gate? Explain these separately without retroactively weakening the frozen G0 contract.

## 5. Teacher replay and action credit: evaluate the actual contract

The existing design explicitly freezes persistent learning state during candidate evaluation and external hypothetical search. Search visits do not reinforce the learner.

For a consequence beyond the validated eligibility interval, the teacher may re-present the selected board-action cue and then the certified outcome stimulus within the mechanism's supported timing. Replay counts as additional external training exposure. It is not claimed to be endogenous recollection, spontaneous biological replay, or evidence that the model internally maintained the original trajectory. An earlier sequence action receives feedback only if its task-relative consequence is independently certified; otherwise per-action credit is withheld.

Under that explicit contract:

1. What can externally replayed state-action association establish, and which claims about temporal credit or planning would remain unsupported?
2. Is replay inherently disqualifying for the narrow relational-transfer question, or does it change the supported learning claim? Specify the boundary rather than treating all teacher-selected experience as forbidden.
3. You said serial candidate evaluation is required for action-specific learning. Is that a necessary architectural condition, or one possible way to isolate eligibility? What alternatives are compatible with action-conditioned local traces?
4. What is the minimum experiment that tests whether feedback affects the selected action in its board context rather than causing a global preference shift?

Assess the information actually delivered: a rich consequence certificate is held by the teacher, while the network receives a narrow pulse-order signal. Does improving the certificate's explanation improve learning if the neural stimulus is unchanged? What additional grounded sensory experience could convey the relevant contrast without the teacher supplying a predicate, correct move, or parameter update? Distinguish scalar valence learning, learning a transition model, and learning an interpretable relational rule.

For sacrifices and later positional stages, consider the objective itself. A short-horizon material delta is a declared task rubric, not exact long-term chess value; a forced-mate certificate proves a different property. Outcome-only game feedback is independently observable but sparse and policy-dependent. A tablebase may provide exact teaching truth without being part of the learner's test-time computation. Where do each of these sources help, what assumptions do they import, and which conclusions would each support? Do not equate an external teacher knowing the consequence with an external learner solving the task at evaluation.

## 6. Encoder leakage and linear probes: refine the inference

We agree that attack counts, pin flags, static exchange scores, or supplied outcome labels could perform substantial task computation before the connectome receives the input. The current encoder cannot be assumed to contain or omit such features without inspection.

Your proposed audit says that a trained linear probe performing above chance on encoder input proves answer leakage, and that a probe staying at chance is required for acceptance.

Please reconsider that criterion:

1. Can legitimate raw occupancy plus candidate coordinates be linearly predictive on a restricted or poorly balanced dataset, without the encoder computing an answer? Conversely, can a nonlinear leaked feature evade a linear probe?
2. What does probe success establish about information availability, task simplicity, dataset shortcuts, and neural necessity? What does it fail to establish about where the original system computed the relation?
3. Design a better audit combining feature provenance, direct encoder inspection, balanced counterfactuals, independently trained comparison models, family-disjoint evaluation, and relevant ablations. Keep fitted probes as external diagnostic comparisons, not the primary learner.
4. Legal-move enumeration itself contains relational rule computation: pins can remove legal actions. Under what task definitions does supplying legality become circular, and under what definitions does it provide an acceptable action set while leaving consequence evaluation to the learner?
5. How should the project distinguish coordinate transfer, unseen piece-role combinations, distractor invariance, and novel relation composition? Do all need to be passed at once in the first chess mechanism assay?

Please propose a transparent representation contract: list exactly which information enters the learner, how candidate identity and actor/perspective are bound, what history matters, and what remains private to the teacher. Compare raw board occupancy with a simple local sequential scan or other biologically motivated alternatives, without assuming a more complex interface is automatically better. Account for board transformations that do not preserve pawn movement, castling, or legality.

Explain how to construct both same-distribution held-out tasks and deliberately harder transfer tasks. A task involving a completely unseen piece type may withhold its movement semantics altogether; failure there is not automatically evidence against relational composition. Distinguish interpolation, recombination of known elements, systematic generalization, and extrapolation requiring new factual knowledge.

## 7. Check your examples and verification claims

Several concrete details in your proposed studies need independent correction before they become experiments:

- In your fork example, you describe a black knight on b5 as unable to reach c7. A knight on b5 attacks c7; a knight on a6 also attacks c7. Rebuild the example using complete legal positions, including both kings, side to move, and the relevant alternatives. Provide FENs and verified lines if you can validate them; otherwise label examples unverified.
- Your pin example may be useful, but listing a few pieces is insufficient to establish complete position legality, safe alternatives, and the claimed bounded consequence. Check all of these explicitly.
- A three-piece setup without kings, a 4-by-4 board, or Capture versus Pass is an abstract task variant. Passing is not a standard legal chess move. Explain what such a variant measures and how it would transfer to legal 8-by-8 chess with a verified alternative move.
- Your revised sequence says every task uses one-to-two-ply verification, but its double-attack stage invokes three-ply minimax. Define ply consistently and correct the horizon claims.
- Restricting minimax to forcing moves omits some legal defenses. State the conditions under which the restricted move set is complete for the claimed property; otherwise label the outcome unknown or narrow the claim.
- You assert verification takes less than one millisecond per position. Supply a measurement and workload or withdraw the unmeasured timing claim. Separate mechanical certificate checking from full neural evaluation cost.
- Distinguish an action encoding's possible move codes from the number of legal choices in a particular position. Explain the actual credit-assignment difficulty without describing 1,800-plus actions as simultaneously legal chess choices.

If exact examples cannot be verified with your available tools, give precise generation and validation requirements instead of confident but unchecked fixtures.

## 8. Statistics and what a failed test means

Your answer rightly emphasizes clustered position families and comparisons against matched controls. However, it replaces existing engineering thresholds with 30 families, five projection seeds, a 25-percentage-point advantage, alpha 0.01, and power 0.80 without deriving the needed sample size.

Please provide a defensible analysis plan rather than another unexplained set of constants:

1. Define the primary outcome, unit of analysis, independent sources of variation, pairing, practical effect size, and treatment of ties and unknown verification.
2. For your four-position family success metric, when is chance actually (1/2)^4? How do correlated decisions, fixed action biases, shared family structure, and multiple acceptable moves change the null distribution?
3. Does an all-legal ranking task have chance below 10^-4 merely because there are at least ten legal moves? Explain how the answer depends on whether success means selecting one uniquely correct move, ranking a capture against an alternative, or satisfying several acceptable actions.
4. How should comparisons with multiple control conditions and repeated curriculum stages handle multiplicity and checkpoint selection?
5. What pilot data or simulation would determine the number of independently generated families and model seeds? Give illustrative assumptions if needed, explicitly labeled hypothetical. Do not promise 80% power from a fixed family count alone.
6. Which failure would reject the registered performance claim, and what additional evidence would be required to attribute it specifically to template memorization, absent nonlinear expansion, or a defective spatial projection? Failure to demonstrate transfer does not uniquely establish its cause.
7. A final test can be sealed within one run yet repeatedly influence the research program through many failed candidate studies. How should fresh final families, development diagnostics, and confirmatory replication be managed across that broader adaptive process? Specify how to avoid both covert reuse and exhausting a small task domain of genuinely independent families.

## 9. Audit the biological support and species boundaries

Your review combines Drosophila studies with evidence from honeybees and other insects. These may inform hypotheses, but anatomical homology does not automatically establish the same learning capacity in this model.

Please check the primary studies behind your cited reviews. For example, Devaud et al. (2015), "Neural substrate for higher-order learning in an insect: Mushroom bodies are necessary for configural discriminations," tested honeybees and positive/negative patterning: https://pmc.ncbi.nlm.nih.gov/articles/PMC4629335/ . Clarify what supports the exact biconditional task AB+, CD+, AD-, BC-, and distinguish that task from other configural discriminations and from transfer to novel relations.

Similarly, Aso and Rubin (2016) demonstrates compartment-specific rules for memory writing and updating: https://elifesciences.org/articles/16135 . Identify what it supports about competing memories and what it does not establish about a necessary remedy for this simulation's retained-memory failure.

For each biological recommendation, name the species, task, manipulation, supported result, model adaptation, and remaining assumptions. Verify citations where possible; mark inaccessible or unverified sources. Avoid deriving biological impossibility from lack of a reported capability.

## 10. Test whether the curriculum itself does useful work

Our original sequence is: Stage 1 attack/defense/recapture; Stage 2 king safety/check/mate; Stage 3 forcing moves and reply awareness; Stage 4 double threats/overloaded defense; Stage 5 lines/blockers/removing defenders; Stage 6 move order/intermediate moves/sacrifices; Stage 7 piece effectiveness; Stage 8 coordination; Stage 9 weaknesses/pawn structure/weak squares; Stage 10 restriction/prophylaxis/opponent plans; Stage 11 pawn breaks/exchanges/endgame transitions; Stage 12 composition and selective investigation.

These are proposals, not established mechanisms. They were intended to use small legal positions and bounded task consequences, rather than assume globally correct positional chess understanding. For example, the intended Stage 1 target is immediate recapturability, not globally good captures. Its specification allows at most six pieces and checks all legal immediate opponent replies. Pins/blockers are included in its strata. Later specifications introduce small-position mate/material tasks, sequence replay, position-value hypotheses, and horizons up to several plies; these capabilities are not all implemented or validated. Quiet moves, alternative successes, and resource-exhausted unknowns need explicit semantics. A stage name alone does not define its measurable target.

Original prospective chess gates combine all-legal choice, fixed-polarity consequence prediction, counterfactual preference reversal, comparison against every control, retention, and replay/recovery integrity. Illustrative quotas are 24 training boards, 16 validation boards, and 64 sealed final boards per lesson, with related transformations grouped into families. Four checkpoints are considered for validation-based selection. These are unvalidated engineering proposals, not existing datasets or scientifically justified sample sizes. You may recommend new designs, but they must be separate registrations and cannot alter prior outcomes.

The key missing causal question is whether curriculum order or composition contributes anything beyond training time and additional data:

1. Give an explicit dependency graph or table of computational capabilities. For each dependency, distinguish a demonstrated necessity, a plausible learning advantage, and an engineering convenience. What could transfer from one stage to another in the actual persistent state?
2. Design the smallest matched comparison of a proposed sequence against direct training on the target, mixed/interleaved training, or a different order. Choose only the comparisons needed for the scientific decision; do not propose an unaffordable factorial study. Match relevant exposure and report compute separately.
3. How would you distinguish positive curriculum transfer, merely better initial target performance, faster target acquisition, improved retention, and zero-shot composition? Which is the first effect worth testing?
4. If a model passes each component task but fails their composition, which representational, binding, interference, readout, or training explanations remain? Identify a diagnostic that separates them rather than declaring memorization proven.
5. For changing environmental contingencies versus stable chess relations, which kinds of rehearsal and reversal are appropriate? Could excessive reversal training impair stable relational learning? What evidence would decide?
6. What would make you abandon this stage ordering, the present plasticity configuration, or chess as the initial testbed? Keep those three decisions distinct. If another small task would better isolate a prerequisite, explain exactly what it establishes and how it reconnects to the chess research goal.

## 11. Separate learned capacity from capacity supplied by the interface

Even strong counterfactual transfer may admit several explanations. We need a precise, modest claim whose evidence actually discriminates between them.

Compare at least: a fixed material/geometric heuristic, coordinate or cue memorization, a nearest-template learner, an appropriately matched simple associative model, the connectome-constrained learner, and a supervised diagnostic comparison where scientifically useful. Select a minimal set of informative baselines instead of demanding every possible comparison immediately. Define which comparisons should match memory capacity, exposures, candidate availability, or computation, and which cannot be cleanly matched.

What causal evidence would show that permitted persistent state is necessary for the observed transfer? What further evidence would show that the anatomical topology contributes beyond a generic sparse recurrent substrate? If you propose rewired or random-topology controls, make them separate comparison systems, preserve the primary model, and explain what degree/sign/strength statistics must be matched for the interpretation to be credible. Which topology comparisons are essential for a first transfer claim, and which are needed only for a stronger claim about anatomical specificity?

Could a well-controlled positive result justify the phrase "task-bounded reasoning," or is "systematic relational generalization" the stronger defensible description? State your operational definition, the best simpler explanation, and the experiment that would most challenge your preferred interpretation. Do not define reasoning so broadly that an associative lookup qualifies automatically, or so narrowly that it requires language or exhaustive internal search by definition.

## 12. Give us a revised decision we can act on

After the audit above, answer the researcher's central question directly: is there a defensible experimental route from simple association toward increasingly transferable consequence-sensitive evaluation through chess, and what should determine each next step?

Provide:

1. **A corrected verdict**, with confidence separated for the immediate prerequisite, early chess relations, and longer-horizon ambitions. Identify which conclusions from your first answer you retain, qualify, or withdraw, and why.
2. **A compact claim audit table**: original claim; evidence; correction or retained conclusion; experiment or missing information needed.
3. **The smallest foundational sequence you currently recommend**, using Stage 1, Stage 2, etc. For each stage state its specific relation, input, learned computation, teacher evidence, strongest shortcut, held-out transfer task, advancement evidence, and interpretation of failure. Explain dependencies and how the sequence would eventually connect to longer-horizon ambitions. Separate demonstrated prerequisites from optional diagnostics and later hypotheses. Assess whether configural discrimination deserves a hard advancement gate or a diagnostic role, and justify the choice.
4. **One next study after the pending G0 replication**, conditional on its actual outcome. Specify the question, smallest intervention, informative arm and matched controls, evidence required, and what each outcome would permit us to conclude. Do not assume a repaired receiver exists.
5. **A research roadmap driven by information gained**, with the next two or three conditional decisions after that study. For each identify competing hypotheses, a discriminating observation, the cost to measure it, and whether the next action is more data, a representational change, a mechanism change, or a stop. Prefer bounded analytical or software diagnostics before an expensive graph run when they answer the same question. Distinguish predeclared decision rules from retrospective explanations.
6. **A bounded automation policy** for repeated Python-driven runs. The researcher likes loops that execute registered jobs, preserve receipts/checkpoints, monitor resources, and report concise milestones without an AI inspecting every run. Existing Python tooling already wraps one registered train-to-audit cycle, validates source/protocol identities, resumes a verified complete checkpoint into a fresh directory, and stops before choosing another experiment. Scientific audits have passed even when learning gates failed. The second-seed diagnostic required about 2.86 hours of training plus 1.56 hours of replay audit in the recorded invocation, with approximately 208 MiB and 182 MiB peak RSS respectively; these are workload observations, not per-position latency estimates or future guarantees. Build on this facility. Specify scientific stop conditions, resource/integrity stops, a bounded total budget, permissible registered recovery, and a compact decision report. Can a predeclared campaign automate replications or training lessons while holding the hypothesis and test protocol fixed? Where exactly must it return to researcher review? No automatic gate tuning, new mechanism selection, final-test reuse, or unregistered restarts. Explain how automation remains useful while the curriculum hypothesis is uncertain.
7. **A concise implementation handoff**: the specific definitions, measurements, and protocol fields a coding agent would need before building the next study. Include memory continuity, teaching exposure, pre-feedback assessment, unknown handling, seed factors, certificate coverage, independent replay, checkpoint recovery, and source/annotation checks. Give pseudocode only where it resolves a scientific ambiguity; do not invent repository APIs or claim that a proposed mechanism is ready.
8. **An uncertainty register and source table**, distinguishing primary findings, species analogies, mathematical deductions, engineering choices, and your proposals. Identify the highest-value missing information we could send you next. If the supplied evidence cannot resolve a question, provide a conditional answer and a targeted information request rather than filling the gap with a plausible story.

Use as much detail as the decisions require. Put the actionable verdict and next study before supporting technical discussion. Support material scientific claims with direct primary-source links and identify exactly what you accessed; prefer a few relevant verified sources over citation volume. You may perform bounded calculations or validate chess examples with tools if available, while clearly distinguishing your new calculation from a published result. Do not present simulated power, a repaired mechanism, legal positions, or performance measurements as established unless actually checked.

Be specific, candid, and willing to change your mind. We want your strongest defensible critique and a route to informative results, including negative results. Neither confidence of tone nor a long source list substitutes for showing what each piece of evidence actually establishes.
