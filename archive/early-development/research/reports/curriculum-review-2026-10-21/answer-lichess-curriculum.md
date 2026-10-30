# Lichess curriculum and first transfer experiment for a connectome-constrained learner

## 1. Verdict and stage table

**Verdict:** The route from Lichess puzzles to chess foundations to a transfer test is worth keeping, but three changes are needed before it can produce a meaningful result. These are separate from the G0 receiver failure.

1. **The current encoder makes transfer impossible by design.** It hashes the whole `(seed, cue, action, cell)` tuple. An unseen position therefore lands on an essentially random set of Kenyon cells (KCs), so any "transfer" is just chance overlap. Repairing G0 does not fix this.
   - The input needs to become elemental: piece, colour relative to the side to move, and square, plus action tokens.
   - That input should drive neurons upstream of the KCs, so that any conjunctions come from the fixed connectome rather than from the encoder.
   - This changes the receiver, so it needs its own registered qualification (called **E0** below).
   - **Needs verification:** that these 120 gamma KCs receive structured upstream input in the released graph that can carry this drive.
2. **Evaluate the board after the move, not a hashed move cue.** Your rules allow the mechanical board transition to be supplied. So each candidate move is presented as the resulting board (plus action tokens), and the learner's readout acts as a fixed-sign evaluator of that board. This makes one learned evaluation reusable across move types, and it matches your plan for a static evaluator learning from multi-ply experience.
3. **Collapse the 12 topics into 3 active stages, 1 conditional stage, and a deferred set.** While plasticity covers only the 122 KC→MBON12 edges, "learning a relation" can only mean re-weighting fixed KC conjunctions. So a stage can be tested only if E0 shows, without labels, that KC activity carries the relevant relation. If it doesn't, a failure is about representation, not learning.

**Demonstrated so far:** the replay executes correctly, and synthetic acquisition and retention reached 8/8. **Everything below is a hypothesis.** Theme IDs come from memory and need checking against `puzzleTheme.xml`.

| Stage | What is learned (depends on) | Source filters / exclusions (verify IDs) | Unit / horizon | Teacher criterion | Strongest shortcut / control | Gate | What failure means |
|---|---|---|---|---|---|---|---|
| **S0** Receiver + encoder (prerequisite, unpassed) | Reversible association (G0′); relation structure present in KC activity (E0) | Synthetic only | Single frame | Exact (synthetic) | Shuffled and absent feedback; input-permutation control for E0 | New registered gates; old G0 stays failed | G0′: plasticity or timing problem. E0: representation problem. Neither proves a capacity limit. |
| **S1** Exchange consequence (S0) | Given the resulting board: is a piece en prise, and what is the bounded net material on the contested square? Includes reply-awareness (old topics 1+3). | Include `hangingPiece`, `oneMove`, `short`. Exclude `mate*`, `pin`, `skewer`, `discoveredAttack`, `xRayAttack`, `deflection`, `attraction`, `interference`, `clearance`, `intermezzo`, `sacrifice`. Themes only help sampling; the motif-sufficiency check decides. | All legal moves from the solver position; 3 plies, 5-ply stability check | Bounded worst-case material with a quiet leaf; otherwise unknown | Grab-the-biggest-piece heuristic (MVV-LVA); coordinate templates; nearest-neighbour on tokens | Useful choice above all controls on unseen families; S0 retained | Representation (if E0 is marginal) vs credit assignment vs training budget (see §5) |
| **S2** King consequence (S1) | Does this move mate? Does it allow mate in one reply? Check vs mate. | `mateIn1`, `backRankMate`, `smotheredMate`, other `*Mate` patterns; `mateIn2` only for allows-mate negatives | 1–2 plies | Exact: all opponent replies enumerated | Check-first heuristic; back-rank coordinate template | Same, plus S1 retention | Legal-move filtering already gives king legality; failure here concerns evaluating the board after the move |
| **S3** Two-consequence composition (S1+S2) | Interaction: a check that removes the opponent's answer to a second threat. This is the **first transfer experiment**, not ordinary training. | `fork`, `doubleCheck`, `exposedKing`, plus derived counterfactuals | 3 plies | Bounded material + mate | Additive S1+S2 scorer (§4) | §4 | Additive association rather than composition |
| **S4** Line relations (conditional on E0 showing ray structure) | Ray, blocker, pin and x-ray relations (old topic 5) | `pin`, `skewer`, `discoveredAttack`, `xRayAttack`, `capturingDefender`, `interference` | 3–5 plies | Bounded material | Same as S1 | Same pattern | Likely a representation limit; would need a registered new pathway |
| **Deferred** | Move order and sacrifice (old 6) need credit across plies or search. Positional topics (7–11) cannot be certified exhaustively and need the separately labelled engine-value condition. Topic 12 is the research endpoint. | Lichess coverage of positional ideas is poor (`quietMove`, `defensiveMove`, `zugzwang`, endgame tags at most) | — | Estimated only | — | — | — |

Overload (part of old topic 4) folds into S3 or S4 counterfactuals. It is not a separate stage.

## 2. Worked first two stages

No FENs are given here. Every fixture below is **unverified** until it passes the checks in step 3.

### Stage 1 pipeline: exchange consequence

1. **Get the position and its history.** Stream the CSV and apply the first listed move to reach the solver's position. Replay the source game to recover castling, en passant, the 50-move counter and repetition history. If the replay fails, drop the puzzle.
2. **Build the candidate pool.**
   - Use all legal moves in the solver's position.
   - Also take non-puzzle positions from the same source game (a few plies earlier) for "no tactic here" cases. These sit in the same lineage family as the puzzle.
3. **Simplify the board for the bounded diagnostic (six-piece cap).**
   - Remove pieces with no attack or defence relation to the contested square.
   - Re-verify everything after each removal: both kings present, the side not to move is not in check, the focal and reference moves are legal, and the required replies still exist.
   - Recompute all labels on the simplified board. Removing a piece can change a pin or a defence.
   - Mark derived boards as having no history, so they support no repetition claims. Record the parent hash.
4. **Certify each candidate move.**
   - Full-width minimax over 3 plies (mover, reply, mover), with a quiet leaf required: no capture worth ≥1 pawn unit available at the leaf. If the leaf is not quiet, the label is UNKNOWN.
   - Where the node budget allows, recheck at 5 plies. If the labels disagree, use UNKNOWN. If the budget runs out, use UNKNOWN.
   - Material values 1/3/3/5/9 are a declared convention.
   - Labels, from the mover's perspective:
     - WIN: worst case ≥ +1.
     - LOSS: the opponent can force ≤ −1.
     - NEUTRAL: both bounds certified strictly between those.
     - UNKNOWN: no teaching event.
   - If either side has mate within the horizon, the position moves to the S2 pool.
5. **Motif-sufficiency check.** A restricted teacher (static exchange evaluation on the contested square only) must match the full bounded search. If it doesn't, another motif is involved, so exclude the position. This handles puzzles that look early but secretly need later knowledge.

**Lesson types:**

| Type | Example | Target |
|---|---|---|
| Positive | Capture an undefended piece | WIN |
| Tempting failure | Queen takes a pawn defended by a pawn | LOSS |
| Safe quiet | No WIN exists; any NEUTRAL move is acceptable; moving onto an attacked square is LOSS | Counters the "there's always a tactic" bias |
| Consequence-changing counterfactual | Add or remove **one** defender of the target → WIN becomes LOSS or NEUTRAL | Single-resource change |
| Irrelevant variation | Move a non-interacting piece and re-verify the labels are unchanged | Invariance |
| Two-resource change | Only as a 2×2 design: both single changes plus the double change | Isolates each resource |

**Acceptable action:** any move in the highest certified class. A position is scored on all legal moves only if every legal move is certified. With six pieces or fewer this should usually be achievable, but the yield needs measuring. Otherwise, score only certified two-choice comparisons.

**Private teacher information** (never enters neural input): the certificate, refutation line, exchange evaluation, themes, rating and lineage. **Public input:** the elemental board after the move, action tokens, and history flags relevant to the task.

### Stage 2: king consequence

- **Labels (all exact by enumeration):**
  - MATE: opponent is in check with zero legal replies.
  - ALLOWS-MATE: some opponent reply mates.
  - Otherwise, fall back to the S1 class.
  - Ordering: MATE > WIN > NEUTRAL > LOSS ≈ ALLOWS-MATE (declared ordering).
- **Counterfactuals:**
  - Vacate a flight square, so mate becomes only check.
  - Add a defender of the mating square.
  - Allow an interposition.
- **Tempting failures:** non-mating checks that lose the checking piece. These overlap with S1, so use them only after the S1 gate.
- **Quiet controls:** check available but no mate. This defeats a check-first heuristic.
- **Retention:** S1 validation sets are re-assessed at every S2 checkpoint.

### Teaching signal

- **Primary arm:** scalar valence per assessed candidate, delivered in that candidate's own episode, so credit stays action-specific to the extent overlapping KCs allow.
- **Optional, separately labelled arm:** consecutive frames showing the board after the move, then the board after the refutation. This tests whether eligibility traces carry credit across frames, which is a temporal-credit hypothesis, not an assumption.

## 3. Campaign loop and bounded pilot

```text
for stage in registered_stages:
  require prior_gates_passed and E0_passed
  sched = Scheduler(train_families[stage] only)      # validation/final never visible to the scheduler
  while not stop():
    block = sched.pick(errors_on_train(informative_arm),
                       rehearsal_quota(all_prior_stages))   # cumulative rehearsal
    for arm in [informative, absent, shuffled, disabled]:   # yoked to the same public sequence
      for item in block:
        choice = assess_unaided(arm, item, plasticity=OFF)  # log before any feedback
        log(choice, margins, receipt_hash)
        if certified(item): deliver(arm, item)   # shuffled: permuted valences, same timing
                                                 # absent: no pulse; disabled: pulse, no update
    every K blocks: checkpoint_verified(); eval(validation[stage] + validation[prior])
    if gate_met(validation, controls, retention): mark_ready_for_review(); break
  # sealed final set: one run, human-authorised, after registration
```

**Yoking caveat:** the adaptive sequence is tailored to the informative arm's errors, which favours that arm. The pilot should also include one non-adaptive, pre-scheduled informative arm to measure how big that bias is.

**Four separate counts:**

| Count | What it is |
|---|---|
| Board exposures | Presentations |
| Candidate assessments | Unaided scored choices |
| Teaching events | Certified pulses delivered |
| Independent families | Lineage clusters |

The unit of inference is families × seeds.

**Lineage grouping before any split:** use union-find over source game, puzzle ID, exact FEN, derived parent, transformation orbit (mirror, translation, colour flip), and a structural signature (attacker, defender and target types plus relative geometry). Splits are made at the cluster level.

**From two-choice tasks to all-legal choices:**
1. Two-choice tasks (certified best vs certified worse) until the two-choice gate passes.
2. Then all legal moves on fully certified positions.
3. Report useful-choice rate, rank of the best certified move, and the rate of choosing UNKNOWN moves (reported, not scored).
4. A positive margin contrast does not count if the chosen move is wrong.

**Stops:**

| Type | Triggers |
|---|---|
| Scientific | No validation improvement over a registered number of blocks; retention below the earlier-stage gate; shuffled arm within the registered margin of informative |
| Resource | RSS > 2048 MiB; free memory < 256 MiB |
| Integrity | Identity or hash mismatch; replay divergence; any attempt to read the final set |

- **Recovery:** after resource stops, Python may resume from the last verified checkpoint into a fresh directory. Integrity stops need review.
- **What can run unattended:** within-stage campaigns and evaluations. **What cannot:** any change to the encoder, thresholds, rule, timing or stage set; stage advancement; final-set runs.

**Pilot (2 seeds, S1 only, two-choice) should measure:**
- Validation learning curve per family and per exposure.
- Seed-to-seed variance.
- Informative-minus-shuffled effect size on useful choices.
- Retention decay per later teaching event.
- Margin distribution relative to the tie tolerance. Current margins of about 1e-4 make this essential.
- Certification yield and UNKNOWN rate.
- RSS and runtime per exposure.

These set the confirmatory number of families and seeds via a power calculation against a pre-registered minimum effect size.

## 4. First reasoning/transfer experiment

**Relations learned separately:** S1 (en prise, bounded exchange) and S2 (check, mate, allows-mate). **Held out entirely:** every family where one move both checks and attacks a second target. That covers royal forks and check-plus-attack moves by any piece type.

**The crux.** A fork is close to additive (check value + attack value), so solving forks proves little on its own. The test has to include **interaction counterfactuals**: each single feature is unchanged, but the combination fails.

**Test sets (all from held-out families):**

| Set | Content | Correct behaviour |
|---|---|---|
| T1 Coordinate transfer | S1/S2 relations translated or mirrored | Same labels |
| T2 Role recombination | Familiar relation, piece type in a role never trained | Same labels |
| T3 Composite | Safe checking move that also attacks an undefended or under-defended piece | Prefer it (certified WIN) |
| T4 Reversal | Check still present, target still attacked, checker still safe, **but** the check can be answered by a king move or interposition that also defends or blocks the target | Reject (NEUTRAL) |
| T5 Irrelevant / salient-irrelevant | Distant non-interacting piece moved; or target defended where the exchange still wins (e.g. a knight taking a defended rook) | Label unchanged |

**Simpler baselines** (computed teacher-side or fitted, and labelled as comparisons):
- Material greed (MVV-LVA).
- Check-first.
- Additive scorer: the true S1 features plus the true S2 features, summed. This is the key baseline.
- Nearest-neighbour template over elemental tokens.
- Supervised backprop on the same tokens.

**Curriculum comparison** (relevant exposures matched; same families except where noted):
- Staged: S1 then S2.
- Interleaved: S1 and S2 mixed.
- Direct: trained on composites drawn from training families, with total exposures matched.

Within the staged arm, run informative, absent, shuffled and disabled.

**What a pass supports:** T3 and T4 pair-flip accuracy (prefers T3, rejects its T4 twin) above the additive baseline and above all control arms, with T5 invariance and S1/S2 retention intact. That would support **static, consequence-sensitive composition over fixed conjunctions** in this model. It would not support internal planning, general reasoning, or fly cognition.

**Falsifying outcomes:**

| Result | Interpretation |
|---|---|
| T1/T2 pass, T3 at baseline | No composition |
| T3 passes but T4 matches the additive model | Additive association |
| Shuffled ≈ informative | Not consequence-sensitive |
| Staged ≈ direct ≈ interleaved | No curriculum benefit (composition may still be present) |

**Separating composition from planning.** Planning would need extra evidence, for example accuracy that depends on internal recurrent time without external search, or on counterfactual depth beyond the trained horizon. That is out of scope here.

**Literature checks before claiming novelty** (search topics, no citations asserted): compositional generalisation and curriculum benefit in small networks; mushroom-body associative learning models and KC expansion coding (**confirm** that gamma KCs actually show conjunctive coding); connectome-constrained task models; concept-acquisition studies in chess-playing networks.

## 5. Next decision and essential blockers

**Immediate step: one registered diagnostic on seeds 20261011 and 20261012.**
- A factorial partial reset before reversal: reset g only, e only, S/L only, the event counter only, and pairs of these. This separates the factors that whole-memory reset changes together.
- Log the actual per-frame k and r waveforms at the 122 edges, replacing the rectangular calculation.
- Record margins against the tie tolerance.
- Separately, register and run seed 20261013 under the original frozen G0 protocol.
- Old gates stay unchanged.

**Conditional decision 1 (receiver).**
- If one component explains the retained-fail / reset-pass pattern: register a repaired receiver G0′ with new gates.
- If none does, or margins sit at the tie scale: the issue is margin and readout scale rather than memory state. Register a readout-scale or timing qualification before any repair, and don't pick a fix before its controls are designed.

**Conditional decision 2 (representation, E0).**
- Drive elemental tokens upstream through the real graph.
- Test, without labels, whether KC pattern similarity follows shared S1 relations more than an input-permutation control does.
- **If yes:** run the S1 pilot.
- **If no:** S1 can't