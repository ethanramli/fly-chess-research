# Restart plan (approved 2026-10-30; neuron-reader revision 2026-10-31)

**Status: APPROVED 2026-10-30, with the researcher's definition of reasoning (section 2). The read-only eye test (section 7) may run after the decoder check below. Training may not start until the memory rule (section 5) has separate approval. The numbers in section 7 may change only from the decoder check, before any graph data exists.** Old runs stay as "early development" history. Their results do not count as evidence for this plan. Background: [restart handoff](../../handoffs/restart-handoff-2026-10-30.md).

Numbers marked [choice] are engineering choices fixed before any data. They do not come from a source.

**Researcher-directed revision, 2026-10-31:** replace the conversational name “Readout v1” with `neuron-reader` and follow section 4A below. Build and verify passive recording first; specify the move score jointly with the separately approved memory mechanism. The [design review](../../../research/reports/neuron-reader-design-review-2026-10-31/README.md) supplies the reasons. The [exact plan before this revision](../../../research/reports/neuron-reader-design-review-2026-10-31/restart-plan-before-neuron-reader-update.md) is preserved. This revision changes the reader work order and contracts, not the numerical experiment gates, Eyes v1, memory selection or experiment permissions. The unresolved F03/F04 corrections remain separate pre-data decisions.

## 1. Research question

Can a model built on the real fly wiring (134,209 neurons, 2,700,513 edges) see a chess board through its modelled eyes, get feedback only on its own choices, and learn a chess fact that its input does not state? Can it then use that fact on new kinds of position?

The thesis under test: **the Fly first learns principles deeply, and later stages train reasoning on top of them.** Phase B (section 8) tests this directly. A success here is about this computer model. It does not show reasoning in a living fly.

## 2. Definition of reasoning

We count a result as reasoning evidence only if all four points are true:

1. The fact that decides the result is not in the input. The input gives piece positions only. It gives no attack, pin, legality or safety fact.
2. The Fly gets the fact from feedback on its own choices.
3. The Fly uses the fact on locked test positions, including new kinds of problem.
4. A simple learner with the same input and the same amount of practice fails on those positions.

First task: **safe capture**. The deciding fact is: "after this capture, can the opponent legally capture back?" This is one small relation, so a pass is a first step, not general reasoning.

**Researcher's definition (2026-10-30; this governs the project's reasoning claim).** Reasoning is "being able to apply many unrelated concepts to solve an unfamiliar problem". The researcher's example: some people see neuropsychology and computer science as unrelated, but someone with a high level of reasoning sees that an LLM can be designed with the brain's architecture.

What follows from this definition:

1. The four points above are now the test for **one learned concept**. They are necessary, but one concept is not reasoning. Phase A alone can never support a reasoning claim.
2. A reasoning claim needs Phase C (section 8): concepts learned separately, then combined by the Fly on an unfamiliar problem that was never taught as a combination.
3. The problem must not say which concepts apply. Seeing the link is part of the test.
4. **Limit we disclose:** chess concepts all come from one game, so they are less unrelated than the researcher's example. A chess pass is evidence inside chess. It does not show the cross-domain ability in the example.

## 3. Input

**Researcher accepted this vision input on 2026-10-30.**

1. Each photoreceptor looks at one square. We use Esposito's placement only (5,543 photoreceptors, 67-107 per square, stored in `.cache/full.npz`). We use none of his trained weights.
2. **Piece shape.** The earlier eye tests gave each square one brightness: mover, opponent or empty. That input had no piece type, so it could not contain the safe/unsafe answer. New rule: each piece type is a fixed small picture, drawn on the square. Each photoreceptor samples the picture at its stored position (`retina_uv`). Colour sets the brightness.
3. **Candidate move.** The eyes see the board after the move. The from-square and to-square are brighter, as on any chess website. This says which move is under test. It says nothing about the result.
4. Brightness, pictures and the brighter marks are fixed once, before the first test. The first test may not change them.
5. **Limits we disclose:**
   - Code still supplies the list of legal moves. This hides some legality information from the task, so the Fly never has to reject an illegal move.
   - The move mark is an external pointer.
   - The picture is not a measured model of fly vision.

Addendum 2026-10-31: [Eyes v1](../chess-input/eyes-v1.md) implements and freezes this section before any test. One correction to point 2: point sampling gave identical input for some piece pairs on some squares, so each photoreceptor reads the mean ink over a small viewing cell. Thresholds and gates are unchanged.

## 4. Feedback rule

1. The Fly scores every legal move through its eyes. We record this ranking first.
2. The Fly chooses from its own scores, with a fixed random seed and a fixed temperature [choice]. It needs some randomness, or it may never try other moves.
3. The independent checker verifies the chosen move only. A safe capture gives a reward pulse. An unsafe capture or a quiet move gives a punishment pulse. Unknown gives no pulse.
4. The pulse goes through the modelled dopamine neurons while the chosen move's image is active. No code changes a weight directly.
5. **Not allowed:** hints, labels, teaching of moves it did not choose, showing the right move, repeating puzzles because of errors, or planning lessons from its errors. The puzzle order is fixed and hashed before training.
6. We report two things separately: the checker's full proof, and the small signal the Fly actually gets (good or bad, one step ahead). The signal is a narrow test. It is not an explanation.

## 4A. neuron-reader: observation first, then a justified move score

**Focused repair plan, 2026-10-31:** [neuron-reader module design](../neural-learning/neuron-reader.md) maps every review finding to its specific fix and check. It gives the two-function interface, exact 14-cell roster, sampling/pooling rules, coefficient decisions and acceptance checks. Use that document for reader implementation; this section retains the experimental order and permissions.

**Current state:** Eyes v1 is frozen. `neuron-reader` is planned, not implemented. The five observation types are anatomically motivated; useful signal and better choices have not been demonstrated. Recording activity is a prerequisite, not completion of the move chooser.

**Implementation addendum, 2026-10-31:** the [reader build](../../../research/reports/neuron-reader-build-2026-10-31/README.md) now implements the sampler, explicit scoring function and streamed candidate path. Focused software and static identity checks pass; report the full regression's terminal state in that report. No production coefficient contract or full-graph result exists. The original planning state above is historical; the source/compatibility and experiment prerequisites below still apply.

### Passive recording contract [choice]

1. **Pin the cells.** Observe MBON05, MBON27, MBON09, MBON07 and MBON06. Existing static evidence identifies 14 cells, respectively 2/2/4/4/2; verify and freeze the exact root IDs, graph indices, annotation revision/hash, soma sides and established receiving sides before graph use. Retain uncertain transmitter labels. A missing, duplicate or changed mapping is an error, not permission to pick a replacement cell.
2. **Pin the measurement.** Read each cell's final `model.h[model.steps][index]` after the existing finite-step rate dynamics. Copy these values before scratch arrays are reused. Keep every individual value and an arithmetic mean within each type; do not sum cell populations of unequal sizes. Record the model/snapshot hash, numerical precision, step count, normalization, recurrent scale, bias, leak and saturation. Use raw endpoint model-rate units: no fitted head, baseline subtraction, further clipping, data-fitted normalization or claim of Hz/biological duration.
3. **Preserve state while comparing candidates.** Start every candidate from the same zero transient activity, with the same complete persistent snapshot. Preserve gains/weights, traces, slow state, pending receipts, learning clocks and the real board/history. Candidate observation must not call a teaching update or advance persistent time. Verify complete state fingerprints before and after; a weight-only hash is insufficient. Resetting transient activity does not erase lasting memory.
4. **Bind and validate the output.** Bind each record to the exact board/history identity, candidate UCI, Eyes v1 identity, graph/model/reader identities and persistent snapshot. Return copied per-cell activities, per-type means and diagnostic zero/saturation counts. Missing/nonfinite values or identity/state mismatches fail the measurement. Do not invent a zero score, a random fallback or a partial ranking. The passive reader emits observations, not a move score.
5. **Verify before graph use.** Software fixtures must establish exact roster selection, endpoint sampling, independent copied outputs, rejected invalid data, unchanged complete persistent state/board and candidate-order invariance under the same snapshot. Label fixture evidence separately from full-graph response. Reuse the existing simulator; no new learner, dependency or training mechanism is needed for recording.

### Scalar move-score contract: unresolved until reconciled with memory

The intended fixed equation is `score(move) = sum over types [c(type) * mean endpoint activity(type, move)]`, with `c` in {-1, 0, +1} [choice]. Coefficients remain unset. Before using this score:

1. **Resolve each coefficient from evidence.** Record the source, exact cell/driver population, assay/manipulation, observed effect and limits. Behavioral valence, transmitter/fast-edge polarity, dopamine teaching sign and plasticity direction are different things. Unknown behavioral signs remain recorded with coefficient 0. Require at least one justified nonzero coefficient; do not fit coefficients to checker labels, Stockfish scores or sealed positions. A behavioral interpretation from a fly assay does not establish innate chess value.
2. **Match the memory mechanism.** Check which observed cells the separately approved memory rule can actually change, and which model states it can reach. Verify that informative feedback can both raise and lower the relevant candidate margin against absent, matched-shuffled and disabled-plasticity controls in the separately declared memory test. Two numerical score signs are not required for ranking. If the reader misses needed memory targets, write an explicit revised roster and source rationale before data; do not silently add cells or alter the other session's mechanism.
3. **Freeze the full chooser.** Before candidate-choice data, pin the nonzero coefficient table, equal type-mean pooling, score units, temperature, seed/PRNG, deterministic candidate ordering, tie/numerical tolerance and invalid-data behavior. Fix numeric values prospectively in the run manifest, not after seeing responses. Keep candidate preference distinct from calibrated position value. The section 7 supervised decoder is a diagnostic and does not supply the deployed score's coefficients.
4. **Measure benefit, then claim it.** In an authorized, preregistered comparison, use identical Eyes inputs, memory snapshots, initial conditions and computation for the named legacy reader and `neuron-reader`. Report per-cell/type responses, saturation, margins, ties and scored versus merely observed coverage. Anatomical counts alone cannot pass this comparison or establish chess improvement. Neither an oracle intervention nor an immediate retry establishes endogenous learning or transfer.

### Build order and stopping points

1. **Next: pin the observation manifest and implement passive `neuron-reader`.** Use a new small module and clean Eyes candidate-recording path; leave frozen legacy callers and the memory session's owned files intact.
2. **Finish the software checks above.** Publish the implementation identity and fixture results. Do not mark a recorder-only result as a finished move chooser.
3. **Prepare the read-only eye protocol.** Resolve the already documented F03/F04 decisions, including the declared scope and feasible gain range of the usable-strength intervention, before registering that test. Source/coefficient research may proceed alongside this work. Passive recording and diagnostic decoding do not require a finalized deployed chooser or prior memory-rule selection; those would create a circular dependency with section 5. No new score or replacement numerical gate is selected by this revision.
4. **Run the authorized read-only eye test only after its prerequisites are met.** Inspect authoritative processes first and keep graph runs serial. Its question is whether Eyes v1 carries a usable task signal. Keep observations, supervised diagnostic decoding and a fixed behavioral chooser distinct; report the exact legacy comparator used. This revision launches no graph work.
5. **After an eye-test pass, finalize the score with the separately approved memory rule.** Freeze the scalar/selection contract above and perform the separately approved real-route memory test. Informative feedback and matched controls must establish acquisition, retention and reversal before the existing chess training/transfer phases. Preserve the researcher approval boundary for the memory rule and the locked final tests. The source/target investigation can proceed earlier; this step is final selection, not a demand to stop the other session's development assays.

## 5. Memory rule

**Not decided. We choose it only if the first test passes, and you approve it before training.**

1. **Today's problem.** The alpha1/alpha3 rule is `dg = eta*D*k`, with `D` never positive. Gains only fall, to a floor of 0.2 ([code](../../../.codebase/src/neural-learning/alpha-lobe-memory.mjs)). The older gamma-side rule has a recovery term, `dg = eta*D*(k+g-1)`, so a gain can recover toward 1 but cannot pass it.
2. **What the literature shows** (details and read limits in the [source register](../../../research/literature/source-solution-register.md)):
   - Handler et al. 2019: two dopamine receptors direct "either synaptic depression or potentiation", depending on the order of odour and dopamine. Figure legends name gamma4/gamma5. I read the abstract and legends only.
   - Berry et al. 2018: one dopamine neuron pair (gamma2alpha'1) lowers and then restores the MBON response.
   - Gkanias et al. 2022 (a model): `dW = d*(k + W - 1)`, which can go up or down. This is the candidate equation.
   - Aso and Rubin 2016: alpha1 is the store most resistant to change. Alpha3 needs many repeats. Unpaired dopamine reduces memory in other compartments.
3. **Finding.** I found direct evidence for strengthening in other compartments, not in alpha1 or alpha3. Fly literature does not support simply making the alpha stores two-way. An untested option is to use gamma compartments, because KCg-d cells (295 visual KCs) carry 2/3 of the visual KCs. We must first check which MBONs they reach.
4. **Limits.** I could not read the Handler or McCurdy full text, and I read only part of Gkanias.
5. **Hard rule.** No two-way rule enters training until the source register has its source, compartment and trigger. Any positive `D` must come from a modelled, source-backed trigger, not from the teacher.

**Proposed solution (added 17:50; untested).** Wiring numbers come from [the wiring count](../../../research/reports/restart-wiring-2026-10-30/wiring-count-output.txt).

1. **Do not add strengthening.** Value is approach side minus avoid side, so weakening the opposite side already raises value. Felsenberg et al. 2018 report two opposing memory traces existing together in extinction. Our feedback comes after the image, which is forward timing, so depression is also the expected direction.
2. **Stop the floor with slow recovery.** Use the existing equation `dg = eta*D*(k+g-1)`, where inactive KCs recover toward 1 when dopamine fires. Old evidence: this erased a one-lesson trace in about 10 lessons. So each compartment gets its own recovery rate, fast in gamma and slow in alpha. Aso and Rubin support different rates per compartment, but give no numbers we can copy. The rates are a free choice and must be fixed on development data only.
3. **Let real wires limit learning.** The graph has 480 direct MBON-to-dopamine edges. MBON14 to PPL106 (118 synapses) and MBON12 to PPL103 (102) are excitatory, so learning should lower the later dopamine and slow itself. MBON07 to PAM11 (83) is inhibitory, so learning should raise later dopamine; this may fit the consolidation loop in Ichinose et al. 2015. Today's pulse is at the top of its range (dopamine factors about -1), so these wires may have no room to act (hypothesis). Bennett et al. 2021 model this idea as prediction error. I read the abstract only, and their connections are partly proposed, not measured.
4. **Store memory where the eyes reach; correct the comparator (2026-10-31).** Among counted positive visual-KC-to-MBON synapses, MBON05/27/09 receive 4208/5495 (76.6%) from KCg-d; MBON07/06 receive 3257/3793 (85.9%) from KCab-p. Later legacy v4/v5 readers already include MBON07 as well as MBON14, accounting for 1903/3793 (50.2%) of the latter counted population. These are anatomical counts, not fractions of all visual-KC output, transmitted activity or demonstrated choice quality. The earlier near-blindness inference is withdrawn. Observe the five proposed types under section 4A; choose scored cells only with behavioral evidence and memory compatibility. [Full correction](../../../research/reports/neuron-reader-design-review-2026-10-31/README.md).
5. **Test memory before chess.** Use simple non-chess patterns on the real graph. Measure how many associations it holds, interference, reversal and retention over many lessons, against the published behaviour in section 5.2. If this fails, we do not train on chess.

## 6. Comparators

**Read-only test (section 7), all with the same decoder and the same items:**

| Name | What it is | Why |
|---|---|---|
| Graph | Eyes through the full graph, all 5,177 KCs | Main measure |
| Raw eyes | Photoreceptor pattern, no graph | Does the graph add anything? |
| Tokens | Old cue-v2 tokens | Positive control: the pipeline must find a known answer |
| Shuffled wiring | Same counts and signs, wrong wiring. Run only if Graph passes | Is it this wiring? |

**Training (only after approval and a pass):** all arms use the same seeds, puzzles and timing.

1. Informative: own-choice feedback.
2. No feedback.
3. Matched shuffled feedback.
4. Plasticity off.
5. Shuffled wiring with feedback.
6. Eyes straight to KCs, no graph, same memory rule.
7. Simple learner on raw photoreceptors, same exposure and feedback.

Arms 2-4 test feedback. Arms 5-6 test the connectome. Arm 7 tests shortcuts. A fixed chess rule gives the ceiling and does not compete.

## 7. First test: read-only, after approval

**Question:** does the brain's response to the eye input contain the safe/unsafe answer?

1. No learning. We check that the memory fingerprint does not change.
2. Data: 48 new twin pairs from 48 unrelated training-pool games. In each pair the same capture is safe on one board and unsafe on the other. The old 12 pairs are too few (a false pass at 9/12 has a 7% chance). The old sealed sets stay closed.
3. Decoder: L2 logistic regression, C = 1, standardized inputs [choice]. We train it with whole games left out. A pair is correct if the safe board scores above the unsafe board. Chance is 24/48.
4. **Usable strength.** A decoder can find signals too weak to use (the eye signal is about 5% of cue drive in visual KCs). So we also take the decoder's signs, set the real KC-to-MBON gains to the allowed limits (0.2 or 1.8), and measure the MBON score difference through the graph. It must reach 10% of the same measure under tokens [choice]. The MBONs measured are the eye-route set in section 5 (MBON05, 27, 09, 07, 06), not the old readout. Correction 17:50: the first draft did not say which MBONs.

**Pre-data limitation recorded 2026-10-31:** item 4 is preserved as the original numerical gate, not silently repaired. The inspected old rules initialized at gain 1 cannot reach 1.8, and diagnostic decoder signs do not establish behavioral score signs. Its [F04 correction draft](../../../research/reports/overnight-memory-plasticity-2026-10-31/pre-data-corrections.md) remains unapplied. Resolve this separately before launch. An oracle gain/sign intervention can measure an engineering accessibility bound; it cannot validate the section 4A chooser, demonstrate endogenous learning or replace the frozen-memory diagnostic. This plan update changes no threshold or comparator pass rule.

| Result | Rule (all fixed now) | Action |
|---|---|---|
| Pipeline fault | Tokens below 44/48 | Fix the pipeline; result does not count |
| **Yes** | Graph at least 36/48, and at least Raw eyes + 6, and usable strength met | Continue to the memory rule |
| **Shortcut** | Raw eyes at least 36/48 | Stop: the task does not hide the fact |
| **No** | Graph at most 30/48 | Stop and talk. Report it honestly |
| **Grey** | Anything else | Stop and talk. No tuning |

At chance, 36/48 has a 0.04% chance. If the true rate is 80%, 36/48 passes 85% of the time.

After a stop, we may not change the rendering and retest without your approval. Any new try gets a new version number and a record, and we report it as a further attempt.

## 8. Locked test design and training phases

**Locked test:**

1. Made before any training, from games hash-split apart from the training pool. It excludes every game in old experiments.
2. 60 twin pairs from 60 unrelated games: 30 use old pair kinds; 30 use **new kinds**, listed publicly now: a defender revealed by the capture; a defender that the capture itself blocks or removes; en passant recapture; a recapture only by the king; a recapture only by a promotion move.
3. Code generates the set and the checker certifies it. It prints only counts and a hash. **Nobody reads it, including me.** You keep the file outside the project and hand it over once, for the final run.
4. One final run only. If a bug appears after it opens, that set is spent and we make a new one.

**Phase A (principle):** train with own-choice feedback on training-pool puzzles. Choose the snapshot using a separate development set only. Then freeze everything and run the locked test.

**Phase B (the thesis):** only if Phase A passes. Before Phase B runs, you approve one addendum with a new task and its own locked set. Compare, at equal practice: Fly with Phase A memory; Fly starting fresh; Fly with Phase A exposure but shuffled feedback. **The thesis is supported only if the Phase A memory Fly beats both others on the new task's locked set.** If not, we report that the thesis failed in this test.

**Phase C (combining concepts; added 2026-10-30 from the researcher's definition; outline only).** Only if Phases A and B pass. Before it runs, the researcher approves one addendum that fixes the items below and its numbers.

1. Choose concepts that differ as much as chess allows, for example safe capture and a checkmate pattern. Train each on its own puzzle set, with no puzzle that needs both.
2. Lock a new test set where the right move needs all of the concepts together, and no puzzle says which ones.
3. Compare, at equal practice: the Fly with all concepts; each Fly with only one concept; a fresh Fly; a Fly with shuffled feedback; and the simple learner.
4. Combination is supported only if the all-concepts Fly beats every other arm. A score no better than its best single-concept arm means no combination.
5. Two concepts is the smallest test, not "many". We report the number of concepts combined, and we do not claim more.

## 9. Pass and fail rules for Phase A

Three learner runs differ by puzzle order and choice seed. **They are not three flies.** Each rule must hold in all three.

1. **Main:** at least 44/60 pairs correct. (At chance: 0.02%. At a true 80%: passes 92%.)
2. **New kinds:** at least 22/30. (At chance: 0.8%. At a true 80%: passes 87%.)
3. **Better than every comparator:** at least 6 more pairs than each of arms 2-7, with the game-level bootstrap 95% lower limit above 0.
4. **Real choice:** among all legal moves, the Fly picks a safe capture on more boards than each arm, with the same bootstrap limit above 0.
5. **Retention:** with the snapshot frozen and the training set re-scored after all other training ends, no criterion falls more than 10% [choice].
6. **Audit:** an independent replay confirms every feedback event, the checker's certificates, and the file hashes.

**Results:**

- All six pass: evidence for a learned relation in this model, on this task. Wider claims need further tests.
- Rule 1 or 2 fails: no reasoning claim.
- Rule 3 fails on arm 7 (simple learner matches): the task did not need the connectome.
- Rule 3 fails on arm 5 or 6: feedback worked, but we cannot credit this wiring.
- We do not lower any limit, and no new try can use the same locked set. All outcomes get reported.

"EUREKA EUREKA" stays reserved until these gates, the Phase C gates and the independent audit pass. Correction 2026-10-30: the first draft reserved it for Phase A only, which the researcher's definition does not support.

## 10. What you need to check

**Answered 2026-10-30: the researcher gave the definition in section 2 and approved the rest.** The list below is kept as the record of what was asked.

1. Section 2: is the definition right?
2. Section 3: do you accept piece pictures and the brighter move mark? They were not in your original wording.
3. Section 4: do you accept the fixed choice randomness and the punishment for quiet moves?
4. Section 5: do you accept "decide the memory rule later", with gamma compartments as an option?
5. Sections 7-9: do you accept the numbers?

## 11. Component audit and rebuild list (added 2026-10-30 18:14)

**Broken or weak:**

1. Input: tokens did the chess thinking.
2. Old eye test: no piece types.
3. Reader: the earlier comparator omitted MBON07 in later v4/v5 readers. Visual-path anatomical coverage motivates observation, but behavioral signs, numerical measurement and memory compatibility remain unresolved. Follow `neuron-reader` in section 4A; the original near-blindness claim is withdrawn (2026-10-31).
4. Memory: alpha gains only fall; the other store erases a lesson in about 10 lessons.
5. Pulse: at the top of its range, with small changes on untaught channels.
6. Teacher: the old planner saw all answers and used the Fly's errors.
7. Test puzzles: 3 puzzle types, 8 final families, reused final set.
8. Pass rules: they did not say where the thinking must happen.
9. Learner code: 8 stacked versions, with an unused Stockfish step.
10. Time: each look starts from zero activity, with no clock, so real retention is not measured.

**Keep:** verified wiring, simulator, certificate checker, replay audit, recovery tools.

**Rebuild for ISEF and eLife standard:**

1. Eyes and move mark (accepted).
2. `neuron-reader`: verified passive recording first, then a source-supported fixed score reconciled with the memory mechanism (section 4A).
3. Memory and pulse (section 5).
4. Biology check against published fly results, before chess.
5. Fixed puzzle order, no planner.
6. New puzzle generator, new kinds, sealed test set.
7. Comparators in section 6.
8. One new clean learner, not an extension of v8.
9. Sensitivity test for the 5 optic-lobe neurons with uncertain labels (15 edges), now on the eye route.
10. Modelled rest period, or a plain statement that retention is not measured.
11. Public, dated pre-registration before data.
12. Clean release: one command per figure; large raw data in a data archive.
13. Proper novelty search.
14. ISEF: the student explains every equation, discloses AI help, and checks the entry-year rules and any approval needed before data collection.
