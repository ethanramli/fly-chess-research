# Independent research review: can this connectome-constrained learner develop reasoning through chess?

You are an independent research reviewer with expertise in computational neuroscience, animal learning, machine learning, chess, and experimental design. **This is a fresh conversation. Everything you need to begin is below; you have no repository access or earlier messages.**

The central question is: **Is our actual learning system and proposed curriculum a defensible experimental route toward transferable reasoning, and what should we do next to find out?** Assess both the mechanism and the curriculum. We want an intellectually independent judgment, including a major redesign or rejection if warranted. Do not assume that a sequence of human chess topics creates reasoning, that more training repairs a missing capability, or that a failed model proves an organism incapable.

**Search is optional.** Without it, reason from the supplied implementation and measurements, and mark literature-dependent biological claims as provisional. Do not invent citations or claim to have read linked papers. Identify the specific source checks that could change your recommendation. If browsing is available, use primary sources for those checks. Distinguish published findings, cross-species analogies, mathematical deductions, engineering assumptions, and proposals. If tools permit calculations or chess validation, use them where they resolve a decision; otherwise show derivations and label numerical estimates and fixtures unverified. Prioritize a defensible next decision over a literature survey.

## 1. Research objective and constraints

Our overarching question is **"Could a simple organism achieve reasoning?"** We study a computational model constrained by a released adult Drosophila connectome, using chess as a structured environment with independently checkable consequences.

The first intended claim is narrow: experience-dependent plasticity supports useful, persistent, consequence-sensitive evaluation that transfers to unfamiliar positions, changes appropriately under relevant counterfactuals, and resists shortcuts. This would not establish cognition in a living fly, general intelligence, or internal mental search. The longer-term aspiration is stronger play, around 2000 Elo, with evaluation shaped by the model's own learning. No calibrated rating or useful chess-transfer result currently exists.

The project requires:

- Initialization from scratch; preserve released neuron identities, graph topology, and fixed sign conventions. Initial magnitudes derive from anatomical synapse counts, not pretrained chess weights.
- Lasting adaptation through an explicitly modeled, biologically justified mechanism inside the simulation. The teacher supplies experience and consequence stimuli, never neural parameter deltas. Backpropagation and supervised fitting are permitted only as separately labeled diagnostic comparisons, not replacements for the primary learner.
- Symbolic board input currently bypasses modeled eyes. Legal-move enumeration and mechanical board transitions may be infrastructure, but their contribution must be explicit. We cannot count a predicate supplied by the interface as a relation learned inside the model.
- Independently verified teaching evidence bound to the exact board/history, candidate action, actor, task criterion, and consequence scope. Search estimates and bare engine scores are not exact certificates. Resource-exhausted or incomplete verification is unknown and produces no teaching event.
- A separately declared condition may use pinned Stockfish values as estimated teaching targets for a defined neural value output; it cannot masquerade as exact consequence proof or validate the biological pathway.
- Unaided rankings recorded before feedback. Informative, absent, shuffled, and disabled-plasticity conditions matched for public exposure and timing. Unaided performance and performance with a fixed external search budget support separate claims.
- Disjoint training, validation, and sealed final-test families. Training errors may guide lessons; validation may select a checkpoint; final outcomes cannot guide redesign while remaining a fresh confirmatory test.
- Sparse, serial full-graph computation on a laptop. New unfrozen work may use at most 2048 MiB process RSS while preserving 256 MiB free system memory. Existing frozen G0 work retains its 768 MiB RSS limit, 256 MiB Node heap, and 0.5 CPU-duty pacing. No dense adjacency or edge-by-batch tensors.

These are the target conditions, not claims of established biological fidelity. If a condition undermines a proposed inference or must be reconsidered, explain that explicitly. Recommendations do not authorize changing frozen protocols or reclassifying old failures.

## 2. Actual computational learner

This summary was checked against the registered G0 protocol and matching source files. It describes the tested implementation, not an idealized insect brain.

**Dynamics.** Nonnegative continuous activity propagates through the sparse signed graph using a leaky rate recurrence, not a calibrated biophysical spiking model:

```text
z_j = external_drive_j + sum_i signed_weight_ji * h_i
activation_j = 0 if z_j <= 0, otherwise 10 * tanh(z_j / 10)
h_j(next) = (1 - alpha_j) * h_j + alpha_j * activation_j
```

Initial recurrent magnitudes use row-normalized log(1 + released synapse count), scaled by 0.9. Activity is float32, with eight recurrent steps per frame. Leak and nonplastic parameters are pinned. Neural activity continues across frames within a teaching episode and resets between episodes. Persistent physiological state continues across lessons.

**Plastic scope.** Only 122 existing positive gamma-KC-to-MBON12 edges can change their multiplicative gains. They originate from 120 unique Kenyon cells (KCs); two cells each participate in two eligible edges. Other recurrent weights are fixed. The coarse gamma2 compartment map identifies one PPL103 dopaminergic neuron (DAN) per mapped hemisphere group. Released identities/annotations are checked, but synapse-coordinate and receptor-specific physiology are unmeasured. Full-graph participation does not mean full-graph plasticity.

**Local rule.** Each eligible edge stores gain g, KC credit e, short response S, and long response L. Let k be local KC activity rectified above a fixed unstimulated-model reference, divided by 1.5 and capped at one. Let r be local DAN activity rectified above its reference and divided by 1.5:

```text
de/dt = (k - e) / tauKC
dS/dt = (r - S) / tauShort
dL/dt = (r - L) / tauLong
delta = L - S
dg/dt = eta * e * [max(delta, 0) * (gmax - g)
                  - max(-delta, 0) * (g - gmin)]

eta = 0.5; initial gain = 1; gmin = 0.2; gmax = 1.8
tauKC = 0.4; tauShort = 0.6; tauLong = 1.0
numerical interval per recurrent sample = 0.075 model units
```

Integration handles a sign change of delta inside a piecewise-constant interval. Gains remain fixed while computing a frame's neural trajectory, then update from that trajectory. Filters are source-motivated; the gain law, credit trace, normalization, and their interpretation remain engineering hypotheses. Numerical intervals are not biological seconds. There is no validated endogenous reward-prediction-error mechanism.

**Synthetic input.** G0, our prerequisite assay, uses four-bit public cues and actions A/B. For each candidate KC, a fixed encoder hashes `(projection seed, complete cue, action, cell index)`, selects eight cells from the mapped 120-cell pool, and stimulates each at current 1.5. Labels, phase, and proofs stay teacher-side. This whole-cue random projection does not explicitly preserve elemental bits, spatial geometry, or reusable relations. Subsets overlap. This is the synthetic-assay encoder; a chess representation supporting the intended transfer has not been validated.

**Teaching signal.** Known favorable/adverse consequences use the same PPL103 targets and current amplitude, with different pulse timing. There are 19 zero-indexed frames: the replayed cue is at frame 2; a favorable pulse is at frame 0; an adverse pulse is at frame 2. Each frame contains eight numerical intervals. The teacher determines the outcome before presenting this episode. Pulse order is an experimental teaching code, not an established natural reward/punishment mapping. Unknown evidence causes no episode.

**Readout.** Each candidate receives a fixed scalar score:

```text
balance = mean(MBON12 activity) - mean(MBON01 activity)
score = tanh(balance - unconditioned_balance_for_identical_cue)
```

Higher is preferred; ties are incorrect in the current assay. No decoder is fitted to labels. The reference comes from an identical unconditioned model. This is a memory-dependent preference, not calibrated position value, confidence, or a natural action circuit. Learning is frozen during assessment. Consequently, an unchanged disabled model can return zero scores and ties by construction; this is an invariance control, not a meaningful chance-policy baseline by itself.

## 3. Teacher replay and the intended learning loop

For chess, the proposed loop is: record an unaided ranking; commit to a move; independently certify its task-relative consequence; present a declared teaching episode; revisit changed training examples and earlier successes; evaluate retention and disjoint transfer.

External hypothetical search operates on a separate board with persistent learning frozen. Search visits and sampled wins do not reinforce the model. We distinguish externally aided decisions from unaided ones.

For consequences beyond a supported eligibility interval, the teacher may re-present an earlier board-action cue and its certified outcome stimulus. This counts as another external training exposure. It is not claimed to be endogenous recollection or biological temporal credit across moves. Credit for an earlier action requires a consequence certificate for that action at the supported resolution; otherwise unsupported per-action credit is withheld.

A detailed teacher certificate is not directly transmitted to the neural network: the present signal is the much narrower pulse-order code. We need to know whether this supports the proposed learning targets, or whether additional grounded transition experience or another justified mechanism is necessary. A teacher knowing the correct consequence and a learner calculating it at evaluation are different computational roles.

## 4. What has actually happened

**G0 design.** Eight target cues each offer A/B, with one favorable and one adverse action. Acquisition supplies 32 experiences; four separate cues supply 16 interference experiences; reversal supplies 32 experiences with the original target contingencies inverted. This reverses synthetic truth, not chess rules.

Matched conditions include informative teaching, no external pulse, disabled plasticity, and shuffled labels preserving exposure and pulse-class counts. Shuffling does not guarantee matched endogenous neural drive or gain variance. The follow-up diagnostic uses three predeclared shuffled histories.

The original qualification requires, after each phase and in each of three effective projection seeds: at least 6/8 correct preferences, at least two more correct contexts than every control, positive mean correctly oriented margin exceeding every control by epsilon 1e-8, and state/recovery/replay checks. Failure stops advancement. These are frozen engineering acceptance gates, not established biological constants or validated statistical sample sizes.

**Outcome.** The first original G0 replica acquired and retained 8/8, but reversal was 7/8, tying a shuffled control. Independent replay passed; the learning gate failed. Later original replicas stopped under that protocol.

A separate retained-versus-reset diagnostic has since completed on two predetermined projection seeds, 20261011 and 20261012. Both show reset passing the descriptive branch gates while retained memory fails a required comparison. Reset jointly restores gains, KC credit, short/long response states, and event count. It does not isolate a component or implement physiological forgetting. The remaining seed 20261013 is unregistered/unrun at the latest documented inspection. The diagnostic cannot pass G0 or authorize chess teaching.

For seed 20261012, informative retained reversal is 7/8 with mean margin 0.00010604; shuffled-20261011 is 5/8 with margin 0.00030735. Informative reset reversal is 8/8. The retained arm passes minimum-choice and context-advantage gates but fails margin advantage.

Saved state over all 122 edges:

| Snapshot | Minimum g | Median g | Maximum g | Mean g | g < 0.21 |
|---|---:|---:|---:|---:|---:|
| Informative after acquisition + interference | 0.85676349 | 0.99695397 | 1.04067349 | 0.98009410 | 0 |
| Informative retained reversal endpoint | 0.78644834 | 0.97726248 | 1.02095990 | 0.96701027 | 0 |
| Informative reset reversal endpoint | 0.82513573 | 1.00001645 | 1.05965603 | 0.98570195 | 0 |
| Shuffled-20261011 retained endpoint | 0.78377088 | 0.97877689 | 1.04843691 | 0.96710553 | 0 |

Maximum e/S/L at the informative prefix are approximately 7.5051e-4 / 1.1136e-8 / 9.9897e-6. At retained reversal they are 7.5051e-4 / 8.2362e-8 / 3.3209e-5; reset endpoint maxima are nearly identical. These are endpoint observations, not complete local waveforms. They neither establish floor saturation nor exclude a cumulative carryover effect. One retained context fails with margin -0.00019973 while its reset counterpart passes at +0.00060172.

**Bounded scalar calculation.** Without loading the graph, we integrated the existing rule from g=1, e=S=L=0, with rectangular normalized k=1 only during cue frame 2, r=1 only during a specified pulse frame, and zero rates otherwise. All parameters and 19-frame timing are as above:

| Pulse frame | Final gain | Integrated depression dose | Integrated potentiation dose |
|---:|---:|---:|---:|
| 0 | 1.0106812377 | 0 | 0.0134414804 |
| 1 | 1.0006462385 | 0.0053026377 | 0.0060827926 |
| 2 | 0.9767321164 | 0.0309642683 | 0.0013642924 |

Moving the favorable pulse one frame later gives less potentiation in this illustration. Actual local neural rates need not resemble rectangular current pulses; this is not a graph result or a validated schedule choice. Independently check any timing calculation you rely on.

Earlier work produced some familiar chess-choice repair but failed unfamiliar/counterfactual tests. No useful, persistent, disjoint chess transfer or calibrated position evaluator has been demonstrated. A replay audit checks computational execution and shares numerical components with the runner; it is not independent biological validation.

## 5. Proposed curriculum to review

These are candidate topics, not learned capabilities or proven dependencies:

1. **Attack, defense and recapture**
2. **King safety, check and mate**
3. **Sound forcing moves and reply awareness**
4. **Double threats and overloaded defense**
5. **Lines, blockers and removal of defenders**
6. **Move order, intermediate moves and sacrifices**
7. **Piece effectiveness and improving an ineffective piece**
8. **Coordination and shared duties**
9. **Weaknesses, pawn structure and weak squares**
10. **Restriction, prophylaxis and the opponent's plan**
11. **Pawn breaks, exchanges and endgame transitions**
12. **Compositional plans and selective adversarial investigation**

Stage 1's intended task is immediate recapturability on legal positions with at most six pieces, checking all legal immediate opponent replies. It is not a claim that every surviving capture is globally good. Later stages propose small-position mate/material tasks, delayed teacher replay, contextual value learning, and longer bounded horizons; required mechanisms and verifiers are not all implemented. Broad positional understanding cannot be inferred merely from passing a short-horizon proxy.

Minimal pairs preserve most of a position while a defender, blocker, pin, support, or escape route changes the consequence. Distractor variants should preserve the consequence. Success should include correct choices and preference changes, not just improved average margins.

The prospective design groups related transformations into disjoint families; proposes 24 training, 16 validation, and 64 sealed final boards per lesson; and considers four checkpoints for validation selection. Gates cover acquisition, all-legal useful choice, fixed-polarity consequence prediction, counterfactual reversal, informative advantage over controls, cumulative retention, and audit integrity. These quotas and thresholds need statistical justification; they are not evidence that the tasks are learnable.

A planned teaching block pairs a certified failed action and successful alternative with earlier successes/counterexamples, preserving one continuous physiological lineage and matching controls to the same sequence. The teacher may adapt using training evidence only. Immediate repair is distinguished from delayed retention and unfamiliar transfer.

## 6. Decisions we need your reasoning to resolve

**A. Is the scientific question operationalized correctly?** Define the strongest defensible first claim and the best simpler explanation for a positive result. What would distinguish useful associative evaluation, systematic relational generalization, composition, and internal planning? Which are plausible targets for this actual model? Separate a capability not demonstrated in flies, a mechanism missing from this simulation, and a capability impossible under explicit assumptions.

**B. Are these the right pillars and dependencies?** Audit the twelve stages: keep, reorder, split, merge, defer, or replace, with a computational rationale. Give the smallest promising foundational sequence and explain what persistent learning could transfer between stages. Avoid making the ambition disappear into permanent synthetic association tests. Conversely, identify additional mechanisms required before later topics become testable. Is reversal a general receiver qualification, a necessary prerequisite for static chess discrimination, or a pragmatic gate? Chess counterfactuals change state, not truth for an unchanged complete state; preserve the old gate while evaluating that distinction.

**C. What is the immediate bottleneck, and how could we identify it?** Use the equations and measured state to compare candidate explanations: projection overlap, limited plastic scope, residual filters, timing-dependent update dose, recurrent dynamics, or readout sensitivity. Do not infer a unique cause from whole-memory reset. Choose one existing-data analysis or minimal new intervention after the pending replication, with controls and interpretable outcomes. Separate reversal-boundary interventions from changes after every lesson. An instantaneous trace reset may be a diagnostic; calling it a biological rest interval requires calibrated dynamics and an account of gains during that interval.

**D. What should enter the brain, and what should it learn?** Choose a concrete first-chess representation and task contract: current/post-move occupancy, candidate binding, actor/history, input-cell targets, and private teacher information. Identify where coordinate offsets, pair selection, ray relations, and nonlinear conjunctions are computed. Can an elemental input support transfer without an engineered relational solver? Direct KC stimulation may bypass the expansion invoked by insect-learning analogies. Whole-cue hashing can separate compounds externally; an XOR test using it would not by itself demonstrate endogenous binding. Explain which representation diagnostics are informative, and how conclusions depend on offsets, thresholds, and normalization.

A fitted linear probe succeeding or failing is not automatically evidence of leakage or structural incapacity. Parameter count alone does not prove inability to solve a structured task, especially when gains affect recurrence. Legal-move filtering already solves some king-safety/pin questions. State the task so it measures a consequence the interface has not already supplied.

**E. What teaching and evaluation would support the intended inference?** Assess the gap between rich certificates and the narrow neural signal. Distinguish recapturability, bounded material gain, forced mate, and global position value; define neutral actions, alternative successes, horizon limits, and unknowns. Can externally replayed certified consequences train an unaided evaluator without solving endogenous temporal credit? What additional grounded experience would help without supplying the answer?

Design family-level counterfactual tests, nuisance balancing, baseline comparisons, and a pilot-to-confirmation sample-size plan. A positive contrast between positive/negative margins can occur while both preferences remain wrong, so preserve behavioral gates. Distinguish coordinate generalization, familiar-piece role recombination, and genuinely new domain knowledge. Explain which tests are needed first and which support later stronger claims.

**F. Does curriculum order help, and can experiments run unattended?** Design the smallest comparison of staged learning with matched direct or interleaved training that could show positive transfer, savings, retention, or composition. Stage completion alone does not demonstrate a curriculum benefit. Match the relevant exposures and report compute separately.

Existing Python tooling executes one registered train-to-audit cycle, checks source/protocol identities, saves complete state and pending receipts, and supports verified recovery into a fresh directory. It stops before choosing a new experiment. We want bounded loops that run without an AI inspecting every lesson, while scientific choices remain explicit. Define which fixed replications/lessons can be automated, scientific and resource stop rules, and when review is required. Never silently tune gates, select a winning intervention and only then design controls, reuse final families, or retry failed science as operational recovery.

Recorded second-seed training and audit invocations took about 2.86 and 1.56 hours, with peaks around 208 and 182 MiB RSS. These are workload observations, not per-arm costs, whole-lineage timing guarantees, or evidence of where runtime is spent. Base feasibility on declared bounds and measurements rather than assumed speedups.

## Required response

Put the decisions first, then the support:

1. **Executive judgment:** Is this a plausible research route, plausible only after major revision, presently untestable, or misdirected under these constraints? Separate confidence for receiver learning, early chess transfer, and longer-horizon ambitions. Give the strongest argument against your own verdict.
2. **Prioritized problems:** The few issues that most threaten validity or progress, supported by the actual implementation and evidence. Distinguish facts, hypotheses, and missing information.
3. **Curriculum decision:** A compact audit of the twelve topics and your smallest revised numbered sequence. For each foundational stage give the computation, prerequisite, teacher evidence, main shortcut/control, transfer test, and meaning of failure. Use Stage 1, Stage 2, etc., rather than new letter-code systems.
4. **One next analysis or study:** An implementation-ready question, exact intervention, informative and matched control conditions, measurements, decision rules, and limits. State what each result enables. A diagnostic rescue cannot retroactively pass G0; a changed receiver needs its own complete registered qualification.
5. **First chess assay and later curriculum test:** Specify the representation/task boundary and one minimal pair. Supply complete FENs, legal focal/reference moves in both states, and all required reply coverage only if checked; otherwise mark the fixture unverified. Check kings, existing check, piece limits, pawn direction, and transformation legality. Then give the smallest comparison establishing whether earlier learning benefits a later task.
6. **Bounded roadmap and automation:** The next two or three conditional decisions, what evidence would change direction, and what a registered Python campaign can execute before returning a concise report. Separate ordinary failure, unresolved verification, and integrity/resource interruption.
7. **Evidence limits and essential missing information:** Identify which recommendations follow from the supplied facts and which depend on unverified biology. Cite primary findings with species/task/scope only when you can support them; without search, list targeted verification needs instead of manufacturing references. Request only measurements that could change the decision. Do not invent unseen code, local neural waveforms, physiological mappings, timing calibration, power calculations, or measured performance.

Starting literature you may verify independently includes [Aso and Rubin, 2016](https://elifesciences.org/articles/16135), [Gkanias et al., 2022](https://elifesciences.org/articles/75611), [Devaud et al., 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4629335/), and [Young et al., 2011](https://pubmed.ncbi.nlm.nih.gov/21742045/). Their presence here does not establish applicability to our exact cell mapping, equations, or chess claim. Distinguish Drosophila evidence from honeybee evidence and source-supported mechanisms from our adaptations.

Be direct and selective. We want a serious judgment about whether we are testing the right path, and an experiment that makes the next decision better even if the outcome is negative.
