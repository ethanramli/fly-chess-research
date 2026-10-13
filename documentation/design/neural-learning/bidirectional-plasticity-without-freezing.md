# Bidirectional plasticity without freezing learned weights

2026-10-08. Research specification, not an implemented or validated receiver. The researcher requests endogenous learning and explicitly rejects freezing learned task weights as a substitute for solving plasticity. Training remains prohibited for this research turn. No graph inference, prospective learning assay, task fitting or learner-source modification occurred.

The prior [separated-cue/current-error recommendation](../../../research/literature/feedback-specificity-2026-10-08/README.md) can improve lesson targeting. It cannot by itself solve memory interference, reversible adaptation, credit direction, capacity or transferable reasoning. This specification addresses that missing mechanism directly.

## What is actually plastic today

In the inspected path, `DelayedMateLessonBrain` inherits sequence teaching from `DelayedLessonBrain`, tags root-action KC activity once, carries neural state through checked frames, decays the tag and calls `DelayedReversalMemory.observe` at feedback. The memory changes effective magnitudes on existing KC-to-MBON edges via `base * gain`. These are real parameter changes; keeping the anatomical base array immutable is not the same as freezing the effective weight.

The current mapping permits **870 plastic edges**: 786 in PPL103/MBON12 groups and 84 in PAM02/MBON01 groups. Other parameters remain fixed in this condition. Thus the full graph participates in dynamics, but this is not whole-brain plasticity. The asymmetry is not a license to equalize groups by inventing connections or artificially amplify the smaller group until chess scores improve. The map is subtype/hemisphere based and explicitly lacks receptor and synapse-coordinate compartment identity.

Fixed neuron identities, graph topology and sign conventions are scientific constraints. They do not require fixed efficacy. A future broader-plasticity model needs justified rules and locations; indiscriminately enabling updates on every connection is not biological completeness. No Cesp checkpoint or task-trained decoder is proposed. This review does not independently reassess the user's characterization of Cesp's implementation.

## Four concrete limitations of the current rule

Let e be root-action eligibility, d the mean positive rest-relative DAN response, and g the effective gain. The code uses:

`e in [0,1]; d >= 0`

`g_next = clamp((1-e) + (g-(1-e))*exp(-eta*d*dt), 0.2, 1.8)`

1. **One-sided accessible gain range from scratch.** Put q = exp(-eta*d*dt), which lies in [0,1]. Before clipping, the update is q*g + (1-q)*(1-e), a convex combination of g and a value in [0,1]. Starting at g=1 therefore keeps every gain in [0.2,1]. The configured upper bound 1.8 cannot be reached from scratch through this rule. Recovery can strengthen a depressed edge; potentiation above its initial value cannot occur. This is a limitation, not proof that above-baseline potentiation is necessary for chess or that the present rule cannot learn anything.
2. **Untagged recovery under later feedback.** For e=0 and g<1, any positive d moves the old weight toward one. An unrelated lesson can erase part of an old depression without new eligibility. Existing receipts have shown such recovery; earlier interventions did not establish it as the sole cause of failed choice. Deleting all recovery previously failed and is not an accepted solution.
3. **Delay can change direction.** The target is 1-e. At g=0.7, e=0.6 drives depression toward 0.4; after a trace decays to e=0.1, the same positive d drives recovery toward 0.9. A credit trace is thereby changing both update magnitude and equilibrium. For the same gain/DAN signal, additional delay can reverse an update. This is analytical, not a new graph result.
4. **Signal information and prediction semantics are missing.** `max(0,h_DAN-rest_DAN)` discards below-baseline deviations and averages within a coarse group. The update has no explicit error between a calibrated neural consequence prediction and a verified outcome. Repetition approaches an activity-dependent equilibrium, which need not be a useful chess preference. The current MBON12-minus-MBON01 score is an engineered preference, not a calibrated state value or established prediction-error circuit.

The full Gkanias Incentive Circuit combines positive and negative modulatory factors with distinct susceptible, restrained and long-term memory roles. The inspected fixed-negative branch is intentionally narrower. Do not describe it as the complete source mechanism or silently turn a positive teacher label into the missing positive factor. [Gkanias et al., 2022](https://elifesciences.org/articles/75611); pinned local source `models_base.py` lines 424-455 and `circuit.py` memory-role sections at commit `1610c80072fe8bb59bd397e7a61f716393a509b9`.

## Recommended mechanism direction

**Develop a compartment-specific, eligibility-gated bidirectional plasticity branch, with physiological memory stabilization that remains revisable.** Treat this as a new version alongside the old rule. Do not install a supposedly solved equation into the graph before its signals and mappings are justified.

The strongest newly inspected experimental lead is Huang et al. (2024): voltage imaging found DAN firing increases and decreases; their fitted circuit model used bidirectional anti-Hebbian plasticity and interacting memory compartments. The model represents gamma1/alpha2/alpha3, not our exact current mask, and includes physiology-fitted connectivity parameters. Reuse mechanistic constraints, not fitted weights or a replacement graph. [Primary article](https://www.nature.com/articles/s41586-024-07819-w), [authors' code and license](https://github.com/schnitzer-lab/Luo_Huang_2024_MB_model).

Handler et al. establish timing/receptor-dependent changes; Manoim et al. motivate local protection from inappropriate cross-cue learning. Neither supplies a universally applicable sign or equation for all KC subtypes. Their evidence prevents treating global reward polarity as sufficient biological justification. [Handler et al., 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC9012144/), [Manoim et al., 2022](https://www.cell.com/current-biology/fulltext/S0960-9822(22)01451-8); detailed access coverage in the prior review.

### A precise candidate to evaluate, not a claimed biological law

Separate credit eligibility from the direction signal. Let a_ij >= 0 and b_ij >= 0 be locally generated depression and potentiation drives on an existing permitted synapse. Let e_ij be its bounded activity-derived eligibility. An illustrative bounded branch is:

`dg_ij/dt = e_ij * [b_ij*(g_max-g_ij) - a_ij*(g_ij-g_min)]`

For fixed drives over a numerical interval, A=e*a, B=e*b. If A+B=0, g is unchanged; otherwise:

`g_star = (A*g_min + B*g_max)/(A+B)`

`g_next = g_star + (g-g_star)*exp(-(A+B)*dt)`

This equation is an **assistant engineering hypothesis**, not Huang's, Handler's or Gkanias's published equation. Its limited analytical advantages are explicit: bounded positive gains, no permanent absorbing boundary under the opposite drive, no feedback-driven change at zero eligibility in this branch, and eligibility decay reduces speed rather than changing g_star when both drives are scaled equally. It allows above-baseline strengthening if locally generated potentiation exists. None of these properties proves useful learning.

The unresolved physiological work is to define a and b. A restricted hypothesis could derive them from rectified positive and negative deviations of an identified DAN's measured firing around a justified tonic baseline, with receptor/timing state where supported. Firing itself remains nonnegative; a drop below baseline is not negative dopamine. Another supported compartment may require receptor-mediated timing signals instead. Do not conflate those alternatives or assign either to PAM02 solely because it gives a desirable chess score.

**Do not merely remove `max(0,...)` and reuse the current exponential equation.** A negative d makes its multiplier exceed one and can amplify movement away from equilibrium until clipping. That would be a different and potentially unstable rule, not validated bidirectionality. Do not increase artificial resting activity to manufacture room for dips. First establish whether the current rate model and real signed paths can express the required local signal at all.

No teacher supplies a, b, e, g_star or a synaptic delta. The teacher may supply a verified experience and a declared bounded stimulus. The simulation must produce all local drives. For the hypothetical equation, g_star is computed from local drives, not from a chess target; the numerical symbols must not obscure that distinction.

Zero-eligibility protection here is a **scoped property of the proposed feedback branch**. Some fly plasticity and forgetting can occur without contemporaneous cue activity, as the Gkanias/Berry evidence emphasizes. A separately justified forgetting process may alter other memories. Do not redefine biological fidelity as prohibiting all inactive-edge change, and do not claim merely suppressing recovery preserves memories in the recurrent graph.

### Learning when to stop, while staying capable of learning

The bounded branch can still saturate under endless constant drive. Bounds prevent divergence; they do not tell the learner that its prediction is correct. That needs a circuit-level account of how existing MBON feedback, DAN activity and receptor state regulate learning as associations change. RPE-based models are one candidate, not a settled fact about this mapping. Bennett et al. derive local-looking rules under specified circuit assumptions and explicitly consider extra putative connections; their mathematical guarantee does not transfer to our full recurrent graph. [Bennett et al., 2021](https://www.nature.com/articles/s41467-021-22592-4).

For this project, define which neural output predicts which task consequence before invoking an error signal. Show that the required feedback paths exist with preserved signs and that the resulting local drive changes appropriately. Teacher-computed error is only a separately declared engineered teaching condition under the researcher's existing authorization; it is not evidence of endogenous prediction-error computation. Never subtract an engine position value from an arbitrary move preference and call the residual biological.

### Stability without permanent locking

Use biologically justified interacting memory compartments and/or local physiological states with finite, distinct timescales. Stronger evidence may make a memory slower to change, while contradictory experience must still modify it through the declared mechanism. Do not copy a good weight snapshot into a protected external table, set selected learning rates permanently to zero, or repeatedly roll back regressions and report the survivors as retention.

Huang/Gkanias motivate circuit-specific timescales, not adding an arbitrary slow copy to every synapse. Map the relevant released neurons/connections before specifying consolidation. Keep the initial candidate small: validate local bidirectionality first, then add one justified stabilization mechanism only if coexistence fails. This staged research order does not turn a partial prerequisite into a reasoning result.

Holding learning off during a predefined evaluation measures what has already been acquired; it does not supply the learning. Such a snapshot must not erase failed online episodes or replace continuing-plasticity retention/reversal tests. It need not wait until reasoning is achieved to be a legitimate measurement, but it cannot count as the remedy for unstable learning.

## Where this can still fail and how to discriminate the failures

| Failure | Required evidence / response |
|---|---|
| New cues memorize absolute action hashes | Changed-context and disjoint-family tests with frozen evaluation; learned relational transfer remains separate from cue separation |
| Underlying DANs never produce the necessary opposite signal | Record unrectified local rates and justified baseline; investigate missing dynamics/pathway; do not invent a signed teacher multiplier |
| Receptor/cell-type mapping is wrong | Join released identities, KC subtype and compartment evidence; keep an explicitly engineering model if biology cannot be established |
| Eligible traces overlap or wash out | Inspect weighted per-compartment trace separation and timing, not input-set overlap alone; enforce episode reset and bounded state |
| Both polarities exist but updates move rankings incorrectly | Distinguish synaptic sign, downstream pathway and readout causality; do not fit readout coefficients to puzzle answers |
| Repeated learning saturates or destabilizes | Predeclare long alternating/reversal schedules; inspect local drives and boundary occupancy; bounds alone are not a stopping rule |
| New lesson destroys older choices | Interleaved coexistence and reversal tests while plasticity remains enabled; qualify a local stabilization mechanism rather than permanently freezing weights |
| Slow memories never change | Contradictory-feedback reversal must succeed within a predeclared finite budget; slow cannot mean permanently locked |
| Local association succeeds but reasoning does not | Keep all-legal, delayed-sequence and unfamiliar counterfactual gates; 870-edge associative success is not whole-brain reasoning |

## Concrete work order before another chess-training claim

No item below was executed in this review. Training stays paused until explicitly authorized.

### Build backlog and gates

Build these artifacts in order. Each gate names the uncertainty it removes; passing one is a prerequisite, not a chess-learning claim.

1. **Signal-and-anatomy feasibility report (static; first).** Add a reproducible audit over the pinned graph, released neuron annotations and current plastic-edge map. For every candidate compartment, report neuron identity/source, KC subtype and hemisphere, permitted edge count, graph sign, available raw DAN rate and baseline provenance, timing evidence, and any missing receptor/compartment annotation. Include a small trace showing whether the existing recurrent dynamics can produce both justified above- and below-baseline responses. Do not change the graph or assign synthetic polarity. Gate: a source-supported local signal and anatomically defensible target are identified, or the candidate is explicitly marked unavailable. If unavailable, stop that branch and investigate what missing model component or source evidence is needed.
2. **Plasticity-kernel contract and numerical verification (no graph run).** Specify eligibility, local direction drives, bounded gain, finite memory states, time constants, episode reset, and checkpoint contents as separate named quantities. Verify analytically and with deterministic numerical fixtures that acquisition can move gain both ways from baseline, opposite feedback reverses the same association, zero eligibility has the declared effect, delay changes speed without secretly reversing the target, bounds hold, and interleaved associations remain distinguishable. Include the old rule as a fixed comparator. Gate: every expected change follows from a declared local signal; no fixture reads a chess answer to calculate a synaptic update. These fixtures validate software math only.
3. **Recurrent integration and persistence audit.** Connect the kernel only to the justified existing edge compartments. Add inspection output for per-compartment eligibility, signed local drive, effective gains, saturation, MBON consequences and ranking margins, while retaining bounded logs. Extend the existing atomic resume contract to cover all new slow/fast physiological states and pending feedback receipts; check topology, sign, memory hashes and resource guards. Gate: a record-only replay preserves parameter hashes, and a permitted-learning replay changes only registered state and resumes identically.
4. **Pre-registered mechanism assay (future training authorization required).** On repeated cues with multiple associations, interleave acquisition, coexistence, reversal and delay conditions. The informative arm receives independently verified consequences on each teachable experience; matched absent, contingency-balanced shuffled, anti-correlated and disabled-plasticity arms are causal controls. Match input dose, timing and task exposure. Predeclare behavioral margin, preservation, reversal, saturation and resource thresholds. Gate: selective acquisition, retained coexistence and finite-budget reversal occur while plasticity remains enabled, and beat the controls on behavior, not only weight movement.
5. **Chess-loop integration and transfer (only after the assay).** Combine the mechanism with the already available separated-cue/adaptive verified-feedback design, changing one factor at a time. Re-audit cue identity, history/action credit, feedback certificates and unaided pre-feedback rankings. Then use untouched disjoint and counterfactual families; report unaided and fixed-search-budget choices separately. Gate: improvement survives controls and transfer without selecting checkpoints on final families.

The first deliverable is item 1, because implementing an equation before knowing whether its local polarity and target exist would only create a cleaner engineering story around an unsupported signal. Item 2 may expose an algebraic or implementation defect without running the fly. Items 3-5 require separate authorization before any prospective learner/graph run; this document itself authorizes none.

1. Pin the candidate compartment identities and source-supported polarity/timing. Resolve raw-rate/baseline availability and mapping gaps using existing data where possible. Specify permitted plastic edges/state, finite resource bounds and memory identities. Unknown proof remains no event.
2. Freeze a small mechanism prerequisite testing acquisition of A and B, coexistence after intervening lessons, contradictory-feedback reversal in both directions, long alternating exposure, graded delays, inactive-cue specificity within the declared branch and sensitivity to residual activity. Run informative experiences alongside absent, contingency-balanced shuffled, anti-correlated and disabled controls as applicable, with matched exposure/timing. None may be a standalone learning-progress claim.
3. Require selective **behavioral margins** and preserved prior choices, not just gain changes. Use current failed source-rule and depression-only branches as preserved comparators. Do not retune their old gates. All numerical thresholds and seed factors must be registered before results.
4. Verify sign/topology invariants and exact atomic resume with gains, transient neural state, traces, receptor/slow state and pending receipt. Keep serial sparse processing, 256 MiB heap, RSS/free-memory guards and duty 0.5 for any future graph experiment. No model or memory changes are hidden in the encoder/readout.
5. Only then integrate the new branch into the existing separated-cue plus adaptive verified-consequence loop, without changing representation, rule and readout simultaneously. Demonstrate retention with plasticity still available; then evaluate untouched disjoint and counterfactual families separately from fixed-budget search.

If step 1 cannot establish a physically realizable local bidirectional drive, there is no ready biological replacement. Report that specific blocker instead of training the current incomplete candidate longer or importing a solved policy. This specification identifies a defensible mechanism direction and concrete analytical defects; it does not claim the plasticity problem is solved.

## Provenance and access limits

Four Exa searches returned 20 result slots across local predictive rules and biological memory dynamics; primary candidates were inspected rather than treating search hits as validation. [Raw responses](../../../research/literature/feedback-specificity-2026-10-08/plasticity-source-evidence.jsonl) preserve article, supplement and appendix extracts. Access date: 2026-10-08.

Huang article results/methods and authors' README were inspected. The supplementary discussion was available as an eight-page PDF text layer. Appendix sections 3 and 5 were inspected as extracted text, but equation layout was garbled and PDF rendering failed; no exact equation transcription or visual-page coverage is claimed. Its parameters are fitted to fly recordings, and its reduced effective connections can include indirect effects; neither parameter table nor simplified circuit was imported.

Gkanias primary text was accessible through an eLife publisher mirror to a 100,000-character cap; full supplements were not audited. Pinned cached source confirms both modulatory signs and additional memory roles. Bennett primary text includes the explicit gradient derivation and proposed connectivity; it is a computational model, not a measured universal rule. Prior Handler/Manoim coverage remains bounded by the linked review. No new code was copied; Huang repository GPL-3.0-or-later and cached Gkanias license remain relevant to any future reuse.

Reviewed delayed-rule SHA256: `03225a0cb34a85fb4d5b583378ed05530d67056a2fc0ff6149e8111cd7abac6f`. Mapping SHA256: `1751d9a5c0ca048068c0e6501d795b3fcba1242662db461b688f495a92b05b1b`. [Mistake/pivot record](../../../research/journal/experiments/2026-10-08-plasticity-without-freezing.md).
