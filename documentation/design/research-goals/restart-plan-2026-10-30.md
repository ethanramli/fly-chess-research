# Restart plan (draft for researcher approval, 2026-10-30)

**Status: DRAFT. Not approved. Nothing here authorizes an experiment.** Old runs stay as "early development" history. Their results do not count as evidence for this plan. Background: [restart handoff](../../handoffs/restart-handoff-2026-10-30.md).

Numbers marked [choice] are engineering choices fixed before any data. They do not come from a source.

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

## 4. Feedback rule

1. The Fly scores every legal move through its eyes. We record this ranking first.
2. The Fly chooses from its own scores, with a fixed random seed and a fixed temperature [choice]. It needs some randomness, or it may never try other moves.
3. The independent checker verifies the chosen move only. A safe capture gives a reward pulse. An unsafe capture or a quiet move gives a punishment pulse. Unknown gives no pulse.
4. The pulse goes through the modelled dopamine neurons while the chosen move's image is active. No code changes a weight directly.
5. **Not allowed:** hints, labels, teaching of moves it did not choose, showing the right move, repeating puzzles because of errors, or planning lessons from its errors. The puzzle order is fixed and hashed before training.
6. We report two things separately: the checker's full proof, and the small signal the Fly actually gets (good or bad, one step ahead). The signal is a narrow test. It is not an explanation.

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
4. **Store memory where the eyes reach.** KCg-d synapses go to MBON05 (30%), MBON27 (27%) and MBON09 (20%). KCab-p synapses go to MBON07 (45%), MBON06 (41%) and MBON14 (6%). The old readout gets MBON12 (about 0%), MBON01 (5%) and MBON14 (6%), so it would be close to blind to the eyes. Only MBON07 stays useful.
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

"EUREKA EUREKA" stays reserved until these gates and the independent audit pass.

## 10. What you need to check

1. Section 2: is the definition right?
2. Section 3: do you accept piece pictures and the brighter move mark? They were not in your original wording.
3. Section 4: do you accept the fixed choice randomness and the punishment for quiet moves?
4. Section 5: do you accept "decide the memory rule later", with gamma compartments as an option?
5. Sections 7-9: do you accept the numbers?

## 11. Component audit and rebuild list (added 2026-10-30 18:14)

**Broken or weak:**

1. Input: tokens did the chess thinking.
2. Old eye test: no piece types.
3. Readout: MBON12, MBON01 and MBON14 barely receive visual KCs.
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
2. Readout chosen from the wiring.
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
