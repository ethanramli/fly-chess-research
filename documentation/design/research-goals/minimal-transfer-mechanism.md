# Mechanism contract for elementary transfer

2026-10-07 design work after researcher requested reasoning before further training. This refines [the target](minimal-consequence-transfer.md). No new graph run, plasticity change or assay result is produced. Existing all-dose sibling evaluation is terminal and audited:32 panels/1000 candidate certificate checks; every snapshot0/4.

## What the current rule can learn

For one unclipped edge, write c=-eta*D, where the current numerical guard gives0<=c<=1. The implemented equation becomes:

`g_next = (1-c)*g + c*(1-k)`.

This is an algebraic restatement of the existing rule, not a new biological claim. If c and k were fixed across repeated presentations, the edge would approach1-k rather than accumulate an unlimited preference. Actual activity depends on the current network state, and clipping/recurrence can change this behavior. More repetitions are therefore not equivalent to more useful information or an arbitrarily stronger learned rule.

Reward-channel depression of some KC-to-MBON01 efficacy can raise the fixed MBON12-minus-MBON01 score; punishment-channel depression of some KC-to-MBON12 efficacy can lower it. That is the intended direct pathway, not a guaranteed sign for the full recurrent circuit. Low-activity connections can recover under the same update, explaining why sparse input overlap alone does not determine behavioral specificity.

Persistent transfer requires a training update to change the *relative* scores of appropriate novel candidates in the useful direction. A first-order diagnostic is:

`delta_margin(x') approximately sum_e (dV(x'_good)/dg_e - dV(x'_bad)/dg_e) * delta_g_e`.

This approximation is a diagnostic of the model around a memory state, not a learning rule, fitted gradient, teacher parameter delta or proof of global behavior. The transfer effect depends on local activity, eligible edges and readout influence together. Similar token sets alone establish none of those three.

## Proposed bridge, held to a small scope

Keep the present mapped memory and fixed MBON readout for the first hypothesis. Do not simultaneously add a learned value head, new plasticity, long traces and a new search policy. A positive result can arise through an action preference; constant search value does not preclude that narrow result.

The candidate input should expose reusable *roles and geometry*, with explicit binding of which object belongs to which relation. For the capture/recapture task, a candidate-centered record includes actor/other side, piece identity, candidate origin and landing square, relative directions/distances of other pieces, and intervening occupancy. Such information must be obtained from the current board and candidate without querying the teacher's answer, future opponent replies or safety labels. Existing candidate-relative tokens cover some geometry; a new interface is justified only if a static information/binding audit identifies what they fail to retain.

Two essential distinctions must survive input projection: (a) an opposing slider's relation to the candidate landing square and (b) the occupancy of the path associated with *that same slider*. An unordered bag that disconnects these bindings could confuse which blocker belongs to which attacker. Conversely, a token named legal-recapture or unsafe-capture would supply the answer and is prohibited. A candidate-centered role interface is engineered structure and must be disclosed; a direct KC stimulus is not natural vision.

Any revised projection must have a predefined fixed budget, allocation and seed distribution, retain the declared role-binding information, and avoid winner-specific cells selected using outcomes. Do not pick an encoding seed for favorable test scores. Distinct patterns must be confirmed before graph learning; exact repeated cues under a built-in symmetry count only as input equivalence. Reusable task-bearing features plus changed, balanced nuisance features are necessary for the proposed transfer test.

During training, vary the nuisance features independently of verified consequences. Both aligned/unaligned opponents and blocked/unblocked paths occur across positive and negative examples, so no single feature alone identifies the outcome. Candidate actor, target location, material and distractors cannot remain label proxies. The memory is expected to associate conjunctions of relevant inputs with the experimental valence, while nuisance associations do not consistently reinforce one answer. Whether the fixed connectome and current plastic subset can implement that selectivity is an unresolved capacity question, not an assumption to bury in the protocol.

Immediate candidate replay plus verified consequence is sufficient to test this narrow hypothesis. Structured transition clips are useful for the eventual investigation/credit-assignment goal but not a logically necessary addition for the first context transfer. Likewise, recorded teacher explanations being absent from neural input is a gap relative to the broader goal, not proof that scalar-feedback learning cannot generalize.

## Design gates before another graph experiment

1. Specify one bounded consequence and independently construct balanced training, validation and untouched counterfactual families. Preserve legal history and task scope. Diagnostic two-choice selection is not the original all-legal success gate.
2. Trace exactly which public input variables distinguish outcomes and which vary independently. Check for target leakage, role-binding loss, projection collisions and accidental exact-cue reuse. Compare the existing encoder before proposing a replacement.
3. Provide a complete predicted chain: relevant input pattern -> measured KC activity -> eligible efficacy changes -> MBON margin in novel boards. State the predicted failure signature at each link. No learned biological mechanism is established merely by mapping the cells.
4. Freeze the test and control comparisons, including matched experience/valence shuffle, disabled plasticity, absent feedback, original versus reset/restored memory, and an input-binding disruption that preserves feature inventory. An engineered safe-capture heuristic is a capability baseline, not learned evidence. A memorization/nearest-cue baseline checks whether the effect exceeds exact or trivial cue reuse.
5. First positive milestone: one relation yields an acquired advantage across independent unfamiliar layouts and flips appropriately under consequence-changing counterfactuals, with no feedback during evaluation. Report uncertainty; no single lucky choice, inspected final set or automatic hyperbolic-learning claim.

If the input audit fails, repair its specified deficiency once in a separately pinned interface. If it passes but useful KC/edge/readout coupling cannot be demonstrated, investigate that specific link; do not default to more repetitions. If the simple relation transfers, next require a new composition or task context with the same frozen memory before claiming broader reasoning. Keep the full puzzle-search goal active throughout.

Status: causal design and local-rule algebra are complete. The read-only bound-ray screen now shows the relation input reaches active mapped KC cells, while the fixed untrained MBON readout still fails the paired choice gate. The next discriminating step is a frozen one-pass feedback test with informative, absent, shuffled, and disabled controls, comparing the two cues under equal exposures. Use current validation only as development evidence; prepare an untouched final family before any transfer claim. This test would address learned consequence preference only; Monte Carlo search and full puzzle reasoning remain later gates.

Bounded static check completed: [six blocker pairs](../../../archive/early-development/research/reports/minimal-transfer-input-check-2026-10-07/README.md) all preserve outcome-changing distinctions as different stimulation patterns. Coordinate-bearing tokens can retain object/ray binding before projection; loss of binding is a hypothesis, not a demonstrated fact. Projection drops many changed features, but no exact alias occurred here. An encoder replacement is not yet justified by this check. Follow-up implementation now adds a separate [capture-retention task contract](../puzzle-learning/capture-retention-task.md), receiver-checked one-reply certificates and relational cue v3. This resolves task-name plumbing only; cue sufficiency, actual activity/readout coupling and all learning/transfer gates remain open.

The [frozen v2 position family](../../../archive/early-development/research/data/capture-retention-transfer-v2/README.md) now varies the candidate squares and tests an unseen diagonal attacker on final panels. Its independent input audit reports zero exact cue collisions and 3–7 shared KC indices per train/final pair (mean4.33/14). These metrics make shared input coding plausible but do not establish response or compositional binding. The dataset package still lacks a full-connectome assay protocol.

## New v3 diagnostics: collision and effective variation

The post-run blocker replay adds a specific alias: the active te-05/e2e6 blocker token and an unrelated tr-07/e1e5 success token both map to KC124. That edge changed locally and the right candidate margin moved in the correct direction, but remained positive. This supports a collision/interference hypothesis without isolating its causal contribution.

The frozen v3 model-seed factor was behaviorally inert because the adapter uses direct KC stimulation and direct MBON readout. A separate static audit of eight **cue-projection** seeds on train/validation only produces distinct deterministic KC maps at the same 14-cell/21-current budget. Average within-panel direct KC overlap varies, but overlap is not a valid winner-selection metric and no neural training was performed. Thus the concrete next design is to distinguish input-map variants from neural initializations, predeclare all projection maps as an experimental factor (or keep one fixed and make a single-system claim), and evaluate on newly generated final families. Keep plasticity, graph, readout and teacher feedback fixed in that first comparison. The old te-01/te-05 pair is now development-only. This is a protocol direction, not a validated solution.

## Candidate-bound relation prototype after v3

The user restated the full requirement: improve useful learning per experience through bounded Monte Carlo investigation, verified error/consequence feedback tied to responsible choices, persistent endogenous adaptation, and unfamiliar choices under matched search budgets. The current teacher can identify omissions, uninvestigated alternatives, verified defenses and cutoffs, but the current receiver still reduces each verified board/action experience to the cue plus a binary experimental reinforcement channel. The written explanation is not parsed or delivered as neural state.

The v3 replay exposed a plausible blocker-feature alias at KC124. In response, a separate [bound-ray cue](../chess-input/bound-ray-relational-cue.md) binds the candidate landing square to aligned sliders and geometrically intervening pieces, without supplying an outcome or legal-recapture flag. Static train/validation checks show those relation inventories survive the fixed cue budget and change projected inputs. This is a deliberate engineered input, not a biologically validated vision pathway. The greater within-panel overlap may represent useful shared structure or harmful interference; there is no neural evidence yet.

This is not a completed cure. The next experiment must use a new frozen protocol and fresh untouched final families, preserve the connectome/rule/readout/teacher, and compare matched controls under equal exposure and search budgets. It must measure the entire relation-to-activity-to-edge-to-choice chain. The broad Monte Carlo and consequence-credit objective remains active; passing this microtask alone would be only a first transferable component.
