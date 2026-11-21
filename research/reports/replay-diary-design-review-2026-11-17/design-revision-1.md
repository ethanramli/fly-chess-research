# A memory that helps the fly remember without doing its thinking: the replay diary (design, 2026-11-17)

**Status: design revision 1, written before any implementation or data. Nothing is built or launched. It needs the researcher's approval and strict review before building.** Serves Volume 3 (*Reasoning*), chapters 4 (*Process*) and 5 (*Evidence*); its no-memory comparison serves Volume 2 chapter 3 (*To Learn*); one failure branch serves Volume 4 chapters 2 (*Amnesia*) and 5 (*Evidence*). Goal set by the researcher on 2026-11-17: "The memory may help the fly remember. It must not supply the intelligence we later attribute to the fly." Computational memory is allowed; biological realism is not required.

## Read first: clues, limits and what this design cannot show

1. **The diary is an engineered aid.** It is a computer list, not a fly structure. Any result that uses it is a result for "the fly plus a disclosed diary" and belongs to Volume 3. A Volume 2 learning claim must come from the arm without the diary.
2. **It cannot create learning the fly's connections cannot do.** The diary only re-plays old lessons into the fly's own learning rule. If the fly cannot learn a lesson once, the diary has nothing to keep. In chess this is still unshown: the safe capture stayed below its rival on all three development boards after teaching ([stop report](../../../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md)), and the three-board feedback test is still awaiting approval.
3. **Replay is extra practice.** Each replay is another learning step on an old lesson. The diary is compared with arms that get the same number of extra steps on non-chess filler, and with an arm that gets the very same old-lesson replays at a different time (before the new lessons start), so extra practice alone cannot pass.
4. **Replay re-delivers the teacher's old verdict.** The teacher judged each lesson once, when the fly made that move. The diary repeats that judgement; it never asks the teacher again and never stores anything the fly did not receive. This changes the restart plan's feedback rule, which did not foresee repeated lessons, and needs the researcher's approval (section 11).
5. **The diary stores cases, not lessons.** Any general rule ("taking a defended piece is risky") must form in the fly's connections. The diary cannot store or supply one.
6. Chess ideas all come from one game, so a combination result is evidence inside chess only.

## 1. The problem in plain words

The fly learns by changing the strength of connections from its memory cells (Kenyon cells) to its output cells, when a dopamine cell fires after a move. Two things have gone wrong so far.

1. **When memory was put outside the fly, the memory did the thinking.** Memory v8 stored every verified capture and answered new boards with the outcomes of the three most similar stored boards. That is a nearest-neighbour classifier: a method that labels a new item with the labels of the closest stored items ([Cover and Hart 1967](https://doi.org/10.1109/TIT.1967.1053964)). It judged the moves; the fly only supplied the key. Raw input (383.2) and random features (362.6) beat the fly's key (349.3) with the same store ([v8 report](../../../research/reports/engineered-memory-test-v8-2026-11-07/README.md); `summary.json` reproduced on 2026-11-17: full 349.33, piece-value rule 294.67, all-legal 30.60 against 21.92 for random). In the 2026-11-01 live pilot, the fly's own scores still preferred the old answer after a reversal, and the external store overrode them ([live pilot](../../../research/reports/long-term-memory-v1-live-comparison-2026-11-01/README.md)).
2. **When memory was inside the fly, new lessons erased old ones.** Retention was 0.52 against the 0.70 requirement; in 3 of 6 informative seeds an unrelated old association was lost after a reversal; in one seed, six shared connections caused the loss ([memory handoff](../research-goals/memory-handoff-2026-11-07.md), section 2a).

So the memory must help with problem 2 without recreating problem 1.

## 2. Three rules that separate remembering from solving

A memory passes only if all three hold. Each one can be checked by an auditor who never reads the scores.

1. **Input rule: nothing enters that the fly did not experience.** Every stored field can be rebuilt, byte for byte, from the trial receipts of the fly's own practice: the board it saw, the move it chose, and the teaching pulse it actually received. No certificate, best move, other move's outcome, engine score, test or validation board, or chess rule enters.
2. **Output rule: nothing leaves towards a choice.** The memory has no path into move scoring. Its only output is a replayed lesson, delivered through the fly's own eyes and dopamine cells into the fly's own unchanged learning rule.
3. **Attribution rule: the fly is tested without the memory.** Every reported score is produced by a process that holds only the fly's connection strengths. The diary is not loaded, and the auditor checks this from the test process's input hashes.

Rule 3 is the strongest protection. A memory that is absent at test cannot judge test positions. It can still shape what the fly learns during practice, which is why sections 7 and 8 compare it with matched-practice and memory-only controls.

## 3. Seven designs compared

Each design was checked for a hidden way to do the fly's thinking.

| Design | What it does | Enters only permitted experience? | Can it judge or recommend moves? | Continued learning | Hidden shortcut found | Verdict |
|---|---|---|---|---|---|---|
| **Answer lookup store** (v8 line; "episodic control", [Blundell et al. 2016](https://arxiv.org/abs/1606.04460)) | Stores board and outcome; at decision time averages the outcomes of similar stored boards | Yes, if written from receipts | **Yes.** The averaging is a classifier | Separate slots; no overwriting, so it avoids the problem rather than solving it | The similarity measure and the outcome average are the judge | Rejected. Kept as the **memory-only control** |
| **Recall as extra input** | Finds similar past boards and feeds their stored activity back into the fly as extra input | Yes | **Indirectly.** The fly's connections learned past board → past outcome, so feeding back the past board reproduces the past outcome: the lookup store with an extra step | Same as above | Similarity search chooses which past case answers; outcomes pass through the fly's own connections | Rejected for now. Would need its own lookup-only comparison |
| **Replay diary** ([Lin 1992](https://doi.org/10.1007/BF00992699); [Rolnick et al. 2019](https://arxiv.org/abs/1811.11682); [McClelland et al. 1995](https://doi.org/10.1037/0033-295X.102.3.419)) | Stores the fly's own lessons; between new lessons, re-plays random old ones into the fly's own learning rule | Yes | **No path at decision time; absent at test** | Interleaving old and new lessons lets shared connections find settings that hold both, if such settings exist | Replay is extra practice; replay order could act as a teacher-chosen curriculum; stored board text could be read by chess code | **Recommended**, with the guards in section 5 |
| **Protected connections** ([Kirkpatrick et al. 2017](https://doi.org/10.1073/pnas.1611835114); [Zenke et al. 2017](https://proceedings.mlr.press/v70/zenke17a.html); [Benna and Fusi 2016](https://doi.org/10.1038/nn.4401)) | Keeps an "importance" number per connection and slows changes to important ones | Only if importance is computed from the fly's own local activity, not a supervised error | No | Protects old lessons by slowing change, so it can block correction; cannot help when two lessons need the same connection to move in opposite directions | The published versions compute importance from a supervised loss, which this fly does not have; the project already warns against renaming slow-reservoir and freezing ideas without a new prediction ([mechanism decision](../../../research/reports/memory-interference-diagnosis-2026-11-01/next-mechanism-decision.md)) | Runner-up, only if the diary's tests show a joint setting exists but replay cannot reach it |
| **Separate copies per lesson** (context gating, [Masse et al. 2018](https://doi.org/10.1073/pnas.1803839115)) | Uses a different set of cells or connections for each lesson group | Needs a lesson label at test | Indirectly: the label says which idea applies | Avoids overwriting by never sharing | The test would have to be told which idea applies, which the transfer protocol forbids | Rejected |
| **Imagined practice** ([Shin et al. 2017](https://arxiv.org/abs/1705.08690); pseudo-rehearsal, [Robins 1995](https://doi.org/10.1080/09540099550039318)) | A generator invents old-style boards to rehearse | **No.** Invented boards are not the fly's experience | The generator could hold chess structure | Can reduce forgetting without storage | Whatever the generator learned, or was built with, enters the fly | Rejected |
| **Bigger feature layer** | Adds many random feature cells in front of the store | Yes | Not by itself | Reduces overlap | This changes how boards are represented, which is where v8's gains came from (random features beat the fly's key) | Rejected as a memory; it is a representation change |

## 4. The recommendation: the replay diary

**One sentence:** the diary writes down each lesson the fly actually received, and between new lessons it makes the fly re-live one randomly chosen old lesson, through its own eyes and dopamine cells, so the fly's own connections relearn the old lesson alongside the new one. It is never consulted when the fly chooses a move, and it is removed before any test.

**Why this design.** Networks that learn by changing shared connections lose old learning when new material is practised in a block ([McCloskey and Cohen 1989](https://doi.org/10.1016/S0079-7421(08)60536-8)). Mixing old material back in reduces the loss ([Robins 1995](https://doi.org/10.1080/09540099550039318)). The complementary-learning-systems account goes further: a fast store of individual episodes that re-presents them to a slow learner lets the slow learner extract structure shared across many episodes, if learning is gradual and interleaved ([McClelland et al. 1995](https://doi.org/10.1037/0033-295X.102.3.419); [Kumaran et al. 2016](https://doi.org/10.1016/j.tics.2016.05.004)). In machine learning, a small replay buffer filled by reservoir sampling reduces forgetting without task labels ([Chaudhry et al. 2019](https://arxiv.org/abs/1902.10486); [Rolnick et al. 2019](https://arxiv.org/abs/1811.11682)). In flies, memory consolidation after training depends on dopamine-neuron activity ([Plaçais et al. 2012](https://doi.org/10.1038/nn.3055)) and is helped by sleep ([Donlea et al. 2011](https://doi.org/10.1126/science.1202249)). These fly studies motivate offline re-activation in general; they do not show that flies replay stored episodes, and this design does not claim they do.

The design matters for reasoning because any general rule the fly forms is then in its own connections, where the researcher's reasoning claim needs it. The diary only decides which old lessons the fly practises again.

### 4.1 What enters the diary

One entry per teaching event the fly actually received during practice, written after the online lesson and its receipt are saved.

| Field | Content | Why it is permitted |
|---|---|---|
| `board` | The board position exactly as shown to the eyes (FEN, plus the history the eyes need, which is none today) | The fly saw it |
| `chosen_move` | The move the fly itself chose, in UCI | The fly made it; Eyes marks it on the image |
| `pulse` | Which dopamine group was driven (reward: PAM07 and PAM02; punishment: PPL101 and PPL103, as in the [three-board test](three-board-feedback-test-2026-11-14.md)) and the current delivered | The fly received it |
| `lesson_index` | Order of the online lesson in the run | Bookkeeping |
| `image_hash` | SHA-256 of the photoreceptor input rendered at the original lesson | Lets replay prove the fly sees exactly what it saw |
| `receipt_hash` | SHA-256 of the trial receipt that delivered the online pulse | Lets the auditor rebuild the diary |

**Never written:** the checker's certificate or its reasons; whether the move was "safe"; the best move; any other move or its outcome; the fly's ranking or scores (they go to a separate diagnostic log that diary code cannot read); engine evaluations; validation or test boards; events whose verification was unknown (no pulse was delivered, so there is nothing to re-live).

### 4.2 What leaves the diary

Only a replayed lesson, and only during practice:

1. Pick one entry at random (seeded), uniformly among entries written before the current online lesson that are not superseded (section 4.5).
2. Render `board` with `chosen_move` marked through the frozen Eyes. Check the image hash equals `image_hash`; a mismatch stops the run.
3. Run the fly's forward pass with its current connections.
4. Deliver the stored `pulse` through the same dopamine cells as the original lesson.
5. Apply the fly's own learning rule, unchanged: same equation, rates, limits and step guard as online lessons.

The diary returns nothing else: no similarity search, no outcome counts or averages, no score. During move scoring, validation and test, diary code is not called. The teacher (checker) is never called during replay.

### 4.3 When replay happens

After every online lesson, exactly one replay [choice]. Reason: it interleaves old lessons at the finest grain, as the complementary-learning-systems account requires, and it fixes the extra practice at exactly one step per lesson, so the matched controls can copy it exactly. A larger ratio is a separate, later question. The first lesson of a run has no earlier entry and gets no replay; every replay arm skips the same steps.

### 4.4 Capacity and eviction

- Capacity: one quarter of the number of online lessons in the stage, rounded up [choice]. Reason: by the end, three of every four lessons have been evicted, so the test measures a memory under pressure, not a store that keeps everything (v8's store was never full: 2,509 of 4,096). Capacities of one sixteenth and of every lesson are run as a descriptive capacity curve.
- Eviction: reservoir sampling ([Vitter 1985](https://doi.org/10.1145/3147.3165)). When the diary is full, the n-th lesson replaces a random entry with probability capacity / n. Every past lesson then has the same chance of being kept, whatever its board, move or pulse. Variants that balance kept entries by class use outcome labels ([Chaudhry et al. 2019](https://arxiv.org/abs/1902.10486)) and are not allowed.
- Size: about 180 bytes per entry, so 4,096 entries take about 720 KiB, far inside the 2,048 MiB budget. Replay adds one forward pass per lesson, against roughly 30 forward passes to score all legal moves, so practice time rises by a few percent.

### 4.5 Correction

If the fly receives a new lesson for exactly the same board and move as an older entry, the older entry is marked superseded and is never replayed again. This uses an exact match of two stored fields only, at writing time; it never compares different boards. In chess this happens only in a reversal test or a shuffled-feedback arm, because a verified certificate gives the same verdict every time.

**Known limit:** if the meaning of a whole class of boards changes, older entries for similar but not identical boards keep replaying the old lesson and slow the correction. Stage 1 measures this cost.

### 4.6 Forgetting

Two kinds are reported separately:

1. **Diary forgetting:** entries evicted, by stage and by lesson group.
2. **Connection forgetting:** loss of an old lesson's score in the fly. For every learnable connection, record its net change during group A and during group B; count connections whose B change has the opposite sign to their A change ("overwritten connections"), and the share of A's changed connections that were overwritten.

The fly's own rule may also drift between lessons; that drift belongs to the fly and is reported with the no-diary arm.

### 4.7 Persistence

The diary, its eviction counter and its random-number state are saved inside every checkpoint, in the same atomic publication as the connection strengths they belong to (write a temporary file, flush, rename), with SHA-256 hashes in the checkpoint manifest. A lesson's entry and its connection update are published together, so a resume never has one without the other. Resume goes into a new directory, rebuilds inputs, checks their hashes and continues. Test and validation processes receive only the connection snapshot.

### 4.8 Shortcut audit: could the diary quietly do the thinking?

| Part | Possible shortcut | Guard |
|---|---|---|
| Encoding | FEN is a full symbolic board. If chess code read it, the diary could compute attacks or values | Only the Eyes renderer reads `board`. The diary module may not import the chess-rules library or the certificate module; a static check fails the build if it does |
| Encoding | Storing the pulse stores the teacher's verdict | The fly received exactly this pulse; storing it adds no information. Shuffled-pulse arm tests whether the remembered verdict, rather than re-exposure, matters |
| Retrieval | Choosing which old lesson to replay could teach (for example, replay the lessons the fly gets wrong) | Uniform random choice only. Choosing by error is "repeating puzzles because of errors", which the restart plan forbids |
| Eviction | Keeping more of one outcome class would be a curriculum | Reservoir sampling is blind to all fields |
| Dose | Replay adds learning steps | Filler replay and same-replays-before-B arms (section 7.2) |
| Timing | Replay settings chosen after seeing results | All settings are fixed here; a change makes a new version and a new claim |
| Test leakage | Diary consulted or loaded during testing | Test processes refuse a diary path; the auditor checks test input hashes; diary entries are compared against validation and test board hashes, which must not appear |
| Teacher | Replay asks the checker again, or the diary stores what the checker knows beyond the pulse | Replay never calls the checker; certificate fields are forbidden in the diary and the auditor scans for them |

## 5. Assumptions

Each one is marked as source-backed, engineering choice, or hypothesis.

1. **The fly can acquire a lesson online** (hypothesis for chess; shown for non-chess associations on 2026-11-01). If false, the diary has nothing to keep; the stage stops as uninterpretable.
2. **Forgetting comes from block practice, not from lessons that need incompatible connection settings** (hypothesis). The seed-4102 certificate shows that resetting the six shared connections to their resting values cannot hold both memories ([interference limits](../../../research/reports/interference-limits-2026-11-02/README.md)); it does not rule out other joint settings. The interleaved-from-start arm tests this.
3. **Re-living a lesson through the eyes and dopamine cells has the same kind of effect as the original lesson, given the current connections** (engineering; the eyes are frozen and deterministic; the dopamine response is recomputed, so it can differ from the original as the fly learns, which is the fly's own dynamics).
4. **Uniform reservoir sampling carries no chess knowledge** (source-backed property of the algorithm, [Vitter 1985](https://doi.org/10.1145/3147.3165); checked by the static import rule).
5. **Removing the diary at test removes all decision-time contribution of the memory** (true by construction; checked by audit). Its training-time contribution is bounded by the controls.
6. **Biological status:** the diary is a computational aid. Fly consolidation studies motivate offline re-activation; they are not evidence that this mechanism exists in flies.

## 6. Hypotheses and how to tell them apart

| Explanation | What it predicts |
|---|---|
| **Main hypothesis: interleaving.** Old lessons fade because new lessons are practised in a block; replaying old lessons during new learning lets shared connections settle where both work | Diary arm keeps A and still learns B. The same old-lesson replays done before B starts do not keep A as well. Interleaved-from-start keeps both |
| **Rival 1: conflict.** A and B need incompatible values on shared connections | Interleaved-from-start fails one group. The diary arm trades A against B: A rises only when B falls |
| **Rival 2a: extra practice of anything.** More learning steps help, whatever they contain | Filler replay (same number of steps, no chess content) matches the diary |
| **Rival 2b: more practice of A, at any time.** The diary works only because A gets more total practice | The same number of A replays, done before B starts, matches the diary |
| **Rival 3: re-exposure without the lesson.** Seeing old boards again helps, whatever the pulse | Shuffled-pulse diary matches the diary |
| **Rival 4: case recall explains apparent reasoning.** The fly only learned to repeat the answers of similar boards | The lookup control on the diary's own contents matches the fly on new kinds of problem |
| **Rival 5: the wiring adds nothing.** Any learner given the same diary does as well | The simple learner with the same diary matches the fly |

## 7. Tests, defined before any result

All stages use development sets only until the transfer protocol's locked sets are opened once in stage 3. Three runs per arm. Runs use **disjoint practice games**, so they are three samples rather than three orderings of one dataset; test sets are shared. Bootstrap: resample whole games 10,000 times with a fixed seed, as in the [transfer protocol](../research-goals/transfer-and-combination-protocol-2026-11-03.md). Every pass rule must hold in every run.

### 7.1 Stage 0: software checks (no fly graph)

1. Write rule: the diary rebuilt from receipts equals the saved diary byte for byte; a planted certificate field, a validation-board hash or an unknown-event entry is rejected.
2. Replay rule: replay calls Eyes, the forward pass, the dopamine input and the unchanged rule, in that order; it never calls the checker; it refuses a mismatched image hash.
3. Reservoir: over 100,000 synthetic lessons, kept-entry frequencies pass a chi-square test for uniformity at the 1% level; changing any field's value does not change which entries are kept.
4. Supersession: an identical board and move with a new pulse supersedes the old entry and nothing else.
5. Persistence: kill and resume at a random point; the resumed run's diary, connections and choices equal an uninterrupted run's.
6. Separation: the test runner refuses to start when given a diary; the diary module imports no chess-rules or certificate code.

### 7.2 Arms used in stages 1 and 2

All arms get the same online lessons in the same order, from the same seeds.

| Arm | What it is | What it rules out |
|---|---|---|
| **Diary** | Online lessons plus one uniform replay per lesson from the reservoir diary | (the system under test) |
| **No diary** | Online lessons only | Baseline; the Volume 2 arm |
| **Filler replay** | Same number of replay steps, each on a non-chess filler pairing (the transfer protocol's filler trials; in stage 1, a fixed separate set of arbitrary pairings never tested) | Rival 2a: extra practice of anything |
| **Same replays, before B** (yoked) | Takes the diary arm's own log of which old (A) entries it replayed during the B block in the same run, and replays exactly those entries, in the same order, at the end of the A block instead; B then runs with no replay. In stage 1, "before B" means before the reversal block | Rival 2b: more A practice at any time |
| **Shuffled-pulse diary** | Same entries and replay schedule; the pulses are permuted across entries once, at writing | Rival 3: re-exposure |
| **Interleaved from start** (stage 2 only) | All A and B lessons in one shuffled order, no diary | Upper bound for any replay order; Rival 1 |
| **Learning off** | Same lessons, no connection changes | Floor |
| **Lookup on the diary** | At test, scores each move by the outcomes of its three nearest diary entries (inverse-distance average; keys: raw photoreceptors, Kenyon-cell activity, and random features; the best key sets the bar) | Rival 4: memory-only control |
| **Simple learner with the diary** | A linear reader on raw photoreceptors with a reward-signed update, the same lessons, the same diary and replay | Rival 5: simpler-system control |

The lookup arm is the only arm that may read the diary at test. It shows what the diary's contents alone could achieve.

A control that replays only recent lessons was considered and dropped: during the B block it would add extra B practice, which speeds the loss of A, so the diary would beat it for the wrong reason.

### 7.3 Stage 1: the known forgetting failure, outside chess

**Question:** does the diary stop the measured loss of old associations, where the fly is known both to learn and to forget?

**Task:** copy the cubic-exit comparison exactly: six seeds, four arbitrary associations, its delays, reversal, marks R1 to R5 and the 0.70 retained-margin ratio ([specification](../../../research/reports/memory-retention-continuation-2026-11-01/cubic-exit-spec.md); [report](../../../research/reports/memory-retention-continuation-2026-11-01/README.md); original runs `runs/memory-retention-2026-11-01/eye-graph-memory-cubic-v1` and its `-recovery1` continuation). In that run, reversing one association in seed 4102 made an unrelated old association wrong (margin 0.140130 to −0.020325). Change only the arms in section 7.2. The run protocol freezes the copied values before any run.

**Limit:** this task uses the learner that produced the failure, not the current revision-4 chess learner. A stage 1 pass shows the diary can fix a measured forgetting failure; it does not show it works with the current learner. Stage 2 tests that.

**Measures:** each association's ranking after acquisition, after delay and after reversal; retention ratio as originally defined; the number of runs that lose an unrelated association during reversal; reversal success; overwritten connections.

**Pass (every run):**

1. Acquisition: every association ranked correctly after acquisition (the original requirement).
2. Retention: ratio at least 0.70 with the diary.
3. No unrelated loss: no untouched association lost during reversal with the diary.
4. Correction: the reversed association ranked correctly after the reversal block with the diary.
5. Not extra practice: the diary has a higher retention ratio than filler replay and than the same replays before the reversal, in every run.

**Reading the result:**

- All pass, and both practice controls lose an association or fall short of 0.70: re-living old lessons during new learning, not extra practice, prevents this forgetting.
- Retention passes but correction fails: the diary buys stability by blocking correction; record as a failure of the design.
- The interleaved-from-start arm also loses associations: the rule and representation cannot hold them together; record as a Volume 4 candidate limit and attempt a bounded proof.
- The fly fails acquisition: uninterpretable; stop.

### 7.4 Stage 2: learn idea A, then idea B, in chess

**Question:** does the diary keep a chess idea learned earlier while a second, conflicting-looking idea is learned?

**Ideas:** from the transfer protocol. **A = legal recapture** (a capture that can be legally recaptured and would lose material is bad). **B = exchange value** (a capture that can always be recaptured is good when the captured piece is worth at least the capturing piece). A punishes recapturable captures; B rewards some recapturable captures. The two are consistent under the protocol's combined rule, so a learner that keeps "can be recaptured" apart from "worth more" has no conflict. A learner whose connections mix the two features will be pushed back and forth. Whether this fly is pushed is unknown; the no-diary arm measures it.

**Practice:** 480 lessons of A, then 480 of B [choice, from the transfer protocol], using the protocol's training tasks, rejection rules and feedback rules unchanged. Lessons come only from the fly's own choices, with feedback from verified certificates through the dopamine cells; unknown gives nothing.

**Unit and denominator:** a development twin pair (two boards where the same move has opposite correct answers), 48 pairs per idea from 48 separate games. A pair is correct when the fly scores the move higher on the twin where it is good; ties count as wrong. Chance is 24 of 48.

**Required second measure (every arm, reported beside the first):** on development boards over **all legal moves**, the expected rate at which a verified safe capture is ranked first (ties split evenly). Boards where the top-ranked move's certificate is unknown are counted as unknown. If unknowns exceed 5% of boards, this measure is inconclusive.

**Pass (every run, diary arm, capacity one quarter):**

1. **A acquired:** at least 32 of 48 A pairs after the A block. Chance of 32 or more by guessing: 1.5%.
2. **A kept:** above-chance retention `(A after B − 24) / (A after A − 24)` at least 0.70. Reason: the project's retention requirement, applied only to the part above guessing, so a fly that forgets down to chance cannot look half-retained.
3. **B learned:** at least 32 of 48 B pairs after the B block.
4. **Learning not blocked:** B's pairs above chance with the diary at least 90% of B's pairs above chance without it [choice]. Reason: a memory that keeps A by stopping new learning fails the goal; 10% allows a small, stated cost.
5. **Better than no diary, filler replay and the same replays before B** on A after B, each with bootstrap lower limit above 0.
6. **Better than shuffled-pulse diary** on A after B, bootstrap lower limit above 0.

**Reading the result:**

- All pass: the diary keeps chess idea A while the fly learns B, beyond extra practice and re-exposure; Property 2 with a disclosed aid, for Volume 3.
- The no-diary arm also passes 1–3: there was no forgetting to fix at this dose; report it, and the diary claim says nothing.
- A or B not acquired: uninterpretable for memory; it is a Volume 2 learning failure.
- Interleaved-from-start fails: no joint setting is reachable; Volume 4 candidate.
- Capacity curve: if the benefit appears only when the diary keeps every lesson, the design reduces to "store everything" and does not scale; record as a failure under pressure.

### 7.5 Stage 3: transfer and combination

Use [Phase B and Phase C of the transfer protocol](../research-goals/transfer-and-combination-protocol-2026-11-03.md) unchanged, with three additions: the diary arm of each fly; the lookup on the diary arm; and the simple learner with the diary. Its margins apply to the additions: at least 6 more locked pairs than each, with bootstrap lower limit above 0, in all three runs. The fly is always tested with the diary removed. Each locked set is opened once.

A pass at Phase C step 2 (three ideas combined), with all audits passed, would be the first evidence for reasoning under the researcher's definition for **the fly plus a disclosed diary**, inside chess. Beating the lookup arm there is what shows that the fly, not the stored cases, did the work.

## 8. When the design fails

Each condition is fixed now. The first one met ends the claim it names.

1. **Leak:** any diary field cannot be rebuilt from receipts; any validation or test board appears in the diary; a test process loads the diary. The run is invalid, not a result.
2. **Nothing to keep:** the fly does not acquire A (stage 1 condition 1 or stage 2 condition 1). Uninterpretable for memory.
3. **Extra practice explains it:** the diary does not beat filler replay, or does not beat the same replays done before B.
4. **The remembered verdict is not needed:** the diary does not beat the shuffled-pulse diary. The diary then works by re-exposure; report that as a different, weaker mechanism.
5. **Stability blocks learning or correction:** stage 2 condition 4 fails, or stage 1 condition 4 fails.
6. **Does not work under pressure:** the benefit disappears at capacity one quarter.
7. **No joint setting:** interleaved-from-start fails. The memory cannot help; a Volume 4 limit is proposed.
8. **Retrieval explains apparent reasoning:** the lookup arm matches the fly on new kinds of problem or combinations.
9. **The wiring adds nothing:** the simple learner with the diary matches the fly.

## 9. What a pass would and would not show

- **Would show:** the fly's own connections can hold several chess lessons at once when old lessons are re-lived, with the memory absent whenever the fly is judged.
- **Would not show:** that the fly's learning rule resists overwriting by itself (the no-diary arm answers that); that flies replay memories; that the diary is the best memory; reasoning outside chess.

## 10. Working memory is a separate component

The researcher's Volume 3 note allows outsourcing working memory too. That is a different store: it would hold the fly's own activity within one decision, for example during a later look-ahead, and would be cleared after each decision. It would never hold outcomes from other decisions. It is out of scope here and needs its own design under the same three rules.

## 11. Decisions for the researcher

1. Approve the replay diary as the Volume 3 memory, or choose another design from section 3.
2. Approve replay as an amendment to the restart plan's feedback rule (section 4, item 5): replay repeats lessons the fly already received, uniformly and never because of errors, and never asks the teacher again.
3. Confirm the volume placement: diary arms in Volume 3; the no-diary arm in Volume 2; a proven no-joint-setting result in Volume 4.
4. Order: stage 2 needs the twin-pair generators, which do not exist yet, and a fly that acquires idea A. Stage 1 can be built first. The three-board feedback test and the 2026-11-09 decision remain open and are not changed by this design.

## Sources

Accessed 2026-11-17; metadata and abstracts checked, full texts not read unless stated.

- Benna, M. K., and Fusi, S. (2016). Computational principles of synaptic memory consolidation. *Nature Neuroscience*, 19, 1697–1706. https://doi.org/10.1038/nn.4401
- Blundell, C., et al. (2016). Model-free episodic control. arXiv:1606.04460. https://arxiv.org/abs/1606.04460
- Chaudhry, A., et al. (2019). On tiny episodic memories in continual learning. arXiv:1902.10486. https://arxiv.org/abs/1902.10486
- Cover, T. M., and Hart, P. E. (1967). Nearest neighbor pattern classification. *IEEE Transactions on Information Theory*, 13(1), 21–27. https://doi.org/10.1109/TIT.1967.1053964
- Donlea, J. M., Thimgan, M. S., Suzuki, Y., Gottschalk, L., and Shaw, P. J. (2011). Inducing sleep by remote control facilitates memory consolidation in *Drosophila*. *Science*, 332(6037), 1571–1576. https://doi.org/10.1126/science.1202249
- Kirkpatrick, J., et al. (2017). Overcoming catastrophic forgetting in neural networks. *PNAS*, 114(13), 3521–3526. https://doi.org/10.1073/pnas.1611835114
- Kumaran, D., Hassabis, D., and McClelland, J. L. (2016). What learning systems do intelligent agents need? Complementary learning systems theory updated. *Trends in Cognitive Sciences*, 20(7), 512–534. https://doi.org/10.1016/j.tics.2016.05.004
- Lin, L.-J. (1992). Self-improving reactive agents based on reinforcement learning, planning and teaching. *Machine Learning*, 8, 293–321. https://doi.org/10.1007/BF00992699
- Masse, N. Y., Grant, G. D., and Freedman, D. J. (2018). Alleviating catastrophic forgetting using context-dependent gating and synaptic stabilization. *PNAS*, 115(44), E10467–E10475. https://doi.org/10.1073/pnas.1803839115
- McClelland, J. L., McNaughton, B. L., and O'Reilly, R. C. (1995). Why there are complementary learning systems in the hippocampus and neocortex. *Psychological Review*, 102(3), 419–457. https://doi.org/10.1037/0033-295X.102.3.419
- McCloskey, M., and Cohen, N. J. (1989). Catastrophic interference in connectionist networks: The sequential learning problem. *Psychology of Learning and Motivation*, 24, 109–165. https://doi.org/10.1016/S0079-7421(08)60536-8
- Plaçais, P.-Y., et al. (2012). Slow oscillations in two pairs of dopaminergic neurons gate long-term memory formation in *Drosophila*. *Nature Neuroscience*, 15(4), 592–599. https://doi.org/10.1038/nn.3055
- Robins, A. (1995). Catastrophic forgetting, rehearsal and pseudorehearsal. *Connection Science*, 7(2), 123–146. https://doi.org/10.1080/09540099550039318
- Rolnick, D., Ahuja, A., Schwarz, J., Lillicrap, T., and Wayne, G. (2019). Experience replay for continual learning. *NeurIPS 32*, 350–360. https://arxiv.org/abs/1811.11682
- Shin, H., Lee, J. K., Kim, J., and Kim, J. (2017). Continual learning with deep generative replay. *NeurIPS 30*, 2990–2999. https://arxiv.org/abs/1705.08690
- Vitter, J. S. (1985). Random sampling with a reservoir. *ACM Transactions on Mathematical Software*, 11(1), 37–57. https://doi.org/10.1145/3147.3165
- Zenke, F., Poole, B., and Ganguli, S. (2017). Continual learning through synaptic intelligence. *Proceedings of ICML*, PMLR 70, 3987–3995. https://proceedings.mlr.press/v70/zenke17a.html
