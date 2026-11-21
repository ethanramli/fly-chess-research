# A memory that helps the fly remember without doing its thinking: the replay diary (design, 2026-11-17)

**Status: design revision 5, written before any implementation or data. Nothing is built or launched. It needs the researcher's approval before building.** Revision 1 (preserved as [design-revision-1.md](../../../research/reports/replay-diary-design-review-2026-11-17/design-revision-1.md), git blob `62c72ba4`) was reviewed by three independent reviewers; all three returned "approve with required changes", and section 12 maps every required change to revision 2 ([design-revision-2.md](../../../research/reports/replay-diary-design-review-2026-11-17/design-revision-2.md), blob `5e22be79`). Revision 3 adds four small fixes from the lead's own recheck (section 12; preserved as [design-revision-3.md](../../../research/reports/replay-diary-design-review-2026-11-17/design-revision-3.md), blob `72fcbec9`). Revision 4 adds "The design on one page" after the researcher said "i dont see a design yet": the picture, the module's interface, the data, the practice loop, a worked example and the files to build. It restates sections 4.1 to 4.8; it adds no new rule. Revision 5 (section 12) fixes six gaps found in the lead's second read before the reviewers' round 2; revision 4 is preserved as [design-revision-4.md](../../../research/reports/replay-diary-design-review-2026-11-17/design-revision-4.md) (blob `99df41e4`). The reviewers' independent recheck of these revisions is pending: their round 2 stopped at the Codex usage limit. Serves Volume 3 (*Reasoning*), chapters 4 (*Process*) and 5 (*Evidence*). The no-diary arms serve Volume 2 chapter 3 (*To Learn*). A failure of the mixed-order arm feeds Volume 4 chapters 2 (*Amnesia*) and 5 (*Evidence*) only with a separate proof. Goal set by the researcher on 2026-11-17: "The memory may help the fly remember. It must not supply the intelligence we later attribute to the fly." Computational memory is allowed; biological realism is not required.

## Read first: clues, limits and what this design cannot show

1. **The diary is an engineered aid.** It is a computer list, not a fly structure. A result that uses it is **assisted retention** for "the fly plus a disclosed diary", in Volume 3. It does not meet Property 1 or Property 2 of the [memory handoff](../research-goals/memory-handoff-2026-11-07.md), which stay unmet; a Volume 2 claim must come from the arms without the diary.
2. **It cannot create learning the fly's connections cannot do.** The diary only re-plays old lessons into the fly's own learning rule. In chess, the fly has not yet learned a lesson: the safe capture stayed below its rival on all three development boards ([stop report](../../../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md)), and the three-board feedback test still awaits approval.
3. **Replay is extra practice of old lessons.** Controls give the same number of extra steps without chess content, the same old-lesson replays at a different time, and the same boards without the verdict, so extra practice alone cannot pass.
4. **Replay re-delivers the teacher's old verdict.** The teacher judged each lesson once. The diary repeats that judgement and never asks the teacher again. This amends the restart plan's feedback rule and needs approval (section 11).
5. **Stage 2 uses a teacher-chosen lesson tape.** To compare arms on identical lessons, every arm practises the same moves, chosen before any data by a seeded draw among moves with verified verdicts. This is a clue: the teacher chose what was practised. Stage 3 returns to the fly's own choices.
6. **Beating the controls does not prove concept combination.** Replay could train the fly's connections into a case classifier: a lookup of past boards stored in the weights rather than in the diary. The tests can only show the fly beat the specific case-recall and simple-learner controls listed in section 7.2; a different case classifier might match it.
7. Chess ideas all come from one game, so a combination result is evidence inside chess only.

## The design on one page

### Picture

```
PRACTICE (diary present)
                                                              ┌──────────── fly ────────────┐
 board ──► Eyes v2 ──► input for each legal move ──► score ──►│ choose move (own choice, or │
                                                              │ the fixed tape in stage 2)  │
                                                              └──────────────┬──────────────┘
                                         checker certifies that move only    │
                                         certificate ──► audit log (diary    │
                                         cannot read it)                     ▼
                                                                  pulse: reward / punish / none
                                                                             │
             ┌───────────────────────────────────────────────────────────────┘
             ▼
   teach(stimulus,pulse)◄────────────── the ONE lesson step, shared by real lessons and replays:
             │                          one forward pass with input + pulse together, dopamine
             │                          signal D, fly's own rule changes Kenyon-cell→output gains
             ▼
   diary.admit(stimulus, pulse) ──► receipt, state and diary saved together
                          │
                          ▼
   diary.nextReplay() ──► old (stimulus, pulse) ──► teach(old stimulus, old pulse)   (one per lesson)

TEST (diary absent)
   learner state only ──► score every legal move ──► choice is judged
```

### The module and its interface

One new module, `replay-diary`. Its interface has three operations and nothing else.

| Operation | Takes | Gives back | Invariants |
|---|---|---|---|
| `admit(lesson)` | The receipt of a lesson that delivered a pulse: `stimulus` (the input: photoreceptor indices and currents), `teaching` (dopamine group and current), `lesson_index`, `receipt_hash` | Nothing | Unknown events are refused. Any entry with the same `stimulus_hash` is removed first (correction). Then Algorithm R decides whether the lesson is kept and which entry it replaces. No field value other than `stimulus_hash` affects any decision |
| `nextReplay(lesson_index)` | The index of the lesson just taught | One stored `(stimulus, teaching)`, chosen uniformly at random among entries from earlier lessons, or nothing if there are none | Never looks at the stimulus to choose. Never returns more than one entry. Never returns a score, count or average |
| `state()` / `restore(bytes)` | — / saved bytes | The diary's bytes and random-stream states / a diary | Saved in the same atomic write as the learner state and receipt |

**What the interface deliberately lacks.** There is no `query(input)`, no "find similar", no "what happened last time", and no score. Nothing can ask the diary about a board. That absence is the design: the only path out of the diary leads back into `teach`, the same lesson step the fly uses for real lessons, and the test runner never constructs a diary at all.

### The data

| Field | Size | Meaning |
|---|---|---|
| `stimulus` | a few thousand (index, current) pairs, about 16 KiB | Exactly what the fly's photoreceptors received for the move, including the move highlight and the dim captured piece |
| `stimulus_hash` | 32 bytes | SHA-256 of `stimulus`; the experience's identity |
| `teaching` | a few bytes | Which dopamine cells were driven (reward: PAM07 and PAM02; punishment: PPL101 and PPL103) and the current (0.75 today) |
| `lesson_index` | 4 bytes | When the lesson happened |
| `receipt_hash` | 32 bytes | Links the entry to its receipt, so an auditor can rebuild the diary |

Capacity: one quarter of the stage's lessons (stage 2: 240 entries, about 4 MiB).

### The practice loop

```
for each lesson n:
    stimulus = Eyes(board, move)                     # move: the fly's own choice, or the tape's
    pulse    = checker(board, move)                # certificate goes to the audit log only
    if pulse is unknown: continue                  # no lesson, no entry, no replay
    teach(stimulus, pulse)                         # fly's rule changes its own connections
    diary.admit(receipt)
    save receipt + learner state + diary together  # one atomic write
    if this is a test point: test(copy of learner state)        # before the replay; no diary
    old = diary.nextReplay(n)
    if old: teach(old.stimulus, old.teaching); log dopamine and update sizes
```

`teach` is the existing lesson step of `three-board-feedback-v1.mjs` (lines 85–103), taken out into one function so that real lessons and replays cannot differ: `h = forward(stimulus + pulse)`, dopamine signal `D` from the dopamine cells' rates, then each learnable gain `g ← clip(g + ETA · D · (k + g − 1), 0.2, 1.8)`. Stage 1 uses the cubic-exit task's own lesson step in the same place.

### Worked example (capacity 2)

| Lesson | Diary before | What admission does | Diary after | Replay (random among earlier entries) |
|---|---|---|---|---|
| L1 | — | not full: keep | L1 | none (no earlier entry) |
| L2 | L1 | not full: keep | L1, L2 | L1 |
| L3 | L1, L2 | full; draw j from 0–2, gets 1, which is below 2: replace slot 1 | L1, L3 | L1 (L3 is the current lesson) |
| L4 | L1, L3 | draw j from 0–3, gets 3: not kept | L1, L3 | L3 |
| L5 (same board and move as L1) | L1, L3 | same `stimulus_hash` as L1: remove L1, then not full: keep | L3, L5 | L3 |
| L6 | L3, L5 | draw j from 0–5, gets 4: not kept | L3, L5 | L5 |

Whether a lesson was a reward or a punishment never enters any step of this table.

### What would be built (after approval)

| File | Job |
|---|---|
| `.codebase/src/neural-learning/replay-diary-v1.mjs` | The module above |
| `.codebase/src/neural-learning/replay-diary-v1.test.mjs` | Stage 0 checks |
| A shared `teach` step | The lesson step taken out of `three-board-feedback-v1.mjs` into a new versioned file, leaving the frozen original untouched |
| Stage 1 adapter | Wraps `run-eye-graph-memory-cubic.mjs` with the diary and the new arms |
| `audit-replay-diary-v1.mjs` | Rebuilds every diary from receipts and replays every update |

## 1. The problem in plain words

The fly learns by changing the strength of connections from its memory cells (Kenyon cells) to its output cells, when a dopamine cell fires during a move's image. Two things have gone wrong so far.

1. **When memory was put outside the fly, the memory did the thinking.** Memory v8 answered new boards with the outcomes of the three most similar stored boards. That is a nearest-neighbour classifier, which labels a new item with the labels of the closest stored items ([Cover and Hart 1967](https://doi.org/10.1109/TIT.1967.1053964)). Raw input (383.2) and random features (362.6) beat the fly's key (349.3) with the same store ([v8 report](../../../research/reports/engineered-memory-test-v8-2026-11-07/README.md); `summary.json` rechecked 2026-11-17: full 349.33, piece-value rule 294.67, all-legal 30.60 against 21.92 for random). In the 2026-11-01 live pilot the external store overrode the fly's own scores ([live pilot](../../../research/reports/long-term-memory-v1-live-comparison-2026-11-01/README.md)).
2. **When memory was inside the fly, new lessons damaged old ones.** In the cubic-exit run, reversing one association in seed 4102 made an unrelated old association wrong (margin 0.140130 to −0.020325), and per-seed retention ratios included 0.4203, 0.5941 and 0.6832 although the six-seed aggregate passed at 0.7199 ([report](../../../research/reports/memory-retention-continuation-2026-11-01/README.md)).

The memory must help with problem 2 without recreating problem 1.

## 2. Three rules that separate remembering from solving

The first two apply to any memory under this goal. The third is this design's own restriction, chosen because it makes the attribution question easier. Other allowed Volume 3 memories may be consulted during decisions; each would then need its own lookup-only comparison at decision time.

1. **Input rule: nothing enters that the fly did not experience.** Every stored field can be rebuilt, byte for byte, from the receipts of the fly's lessons: the input it actually received and the pulse it actually received. No certificate, best move, other move's outcome, engine score, test or validation board, chess rule or invisible board detail enters.
2. **Output rule: nothing leaves towards a choice.** The diary has no path into move scoring. Its only output is a replayed lesson, delivered as the same input and pulse into the fly's own unchanged learning rule.
3. **Removal rule (this design's restriction): the fly is tested without the diary.** Every reported fly score comes from a process that holds only the fly's learner state. Removal shows the diary cannot judge the test position directly. It does not show where the fly's ability came from; sections 6 and 7 address that.

## 3. Seven designs compared

Each design was checked for a hidden way to do the fly's thinking.

| Design | What it does | Enters only permitted experience? | Can it judge or recommend moves? | Continued learning | Hidden shortcut found | Verdict |
|---|---|---|---|---|---|---|
| **Answer lookup store** (v8 line; "episodic control", [Blundell et al. 2016](https://arxiv.org/abs/1606.04460)) | Stores input and outcome; at decision time averages the outcomes of similar stored inputs | Yes, if written from receipts | **Yes.** The averaging is a classifier | Separate slots, so it avoids overwriting rather than solving it | The similarity measure and outcome average are the judge | Rejected. Kept as the **memory-only control** |
| **Recall as extra input** | Finds similar past inputs and feeds them back into the fly as extra input | Yes | **Indirectly.** The fly learned past input → past outcome, so feeding back the past input reproduces the past outcome | Same as above | Similarity search picks which past case answers | Rejected here. Allowed in Volume 3 only with its own decision-time lookup control |
| **Replay diary** ([Lin 1992](https://doi.org/10.1007/BF00992699); [Rolnick et al. 2019](https://arxiv.org/abs/1811.11682); [McClelland et al. 1995](https://doi.org/10.1037/0033-295X.102.3.419)) | Stores the fly's own lessons; after each new lesson, re-plays one random old lesson into the fly's own learning rule | Yes | **No path at decision time; absent at test** | Interleaving can let shared connections find settings that hold old and new lessons, if such settings exist | Replay is extra practice; replay could train a case classifier into the weights; selection could act as a curriculum; stored board text carried invisible details | **Recommended**, with the guards in section 4 |
| **Protected connections** ([Kirkpatrick et al. 2017](https://doi.org/10.1073/pnas.1611835114); [Zenke et al. 2017](https://proceedings.mlr.press/v70/zenke17a.html); [Benna and Fusi 2016](https://doi.org/10.1038/nn.4401)) | Keeps an "importance" number per connection and slows changes to important ones | Only if importance comes from the fly's own local activity | No | Protects old lessons by slowing change; can block correction | Published versions compute importance from a supervised error this fly does not have; the project already warns against renaming slow-store and freezing ideas without a new prediction ([mechanism decision](../../../research/reports/memory-interference-diagnosis-2026-11-01/next-mechanism-decision.md)) | Runner-up |
| **Separate copies per lesson** ([Masse et al. 2018](https://doi.org/10.1073/pnas.1803839115)) | Uses different cells or connections for each lesson group | Needs a lesson label at test | Indirectly | Avoids overwriting by never sharing | The test would be told which idea applies, which the transfer protocol forbids | Rejected |
| **Imagined practice** ([Shin et al. 2017](https://arxiv.org/abs/1705.08690); pseudo-rehearsal, [Robins 1995](https://doi.org/10.1080/09540099550039318)) | A generator invents old-style inputs to rehearse | **No** | The generator could hold chess structure | Reduces forgetting without storage | Whatever the generator holds enters the fly | Rejected |
| **Bigger feature layer** | Adds random feature cells in front of a store | Yes | Not by itself | Reduces overlap | Changes the representation, which is where v8's gains came from | Rejected as a memory |

## 4. The recommendation: the replay diary

**One sentence:** the diary records the exact input and pulse of each lesson the fly received, and after each new lesson it makes the fly re-live one randomly chosen older lesson, so the fly's own connections practise the old lesson alongside the new one. It is never consulted when the fly chooses, and it is removed before any test.

**Why this design.** Networks that learn by changing shared connections lose earlier learning when new material is practised in a block ([McCloskey and Cohen 1989](https://doi.org/10.1016/S0079-7421(08)60536-8)); mixing old material back in reduces the loss ([Robins 1995](https://doi.org/10.1080/09540099550039318)). The complementary-learning-systems account adds that a fast store of single episodes, re-presented gradually and interleaved, lets a slow shared learner extract structure common to many episodes ([McClelland et al. 1995](https://doi.org/10.1037/0033-295X.102.3.419); [Kumaran et al. 2016](https://doi.org/10.1016/j.tics.2016.05.004)). A small replay buffer filled by reservoir sampling reduces forgetting without task labels ([Chaudhry et al. 2019](https://arxiv.org/abs/1902.10486); [Rolnick et al. 2019](https://arxiv.org/abs/1811.11682)). Fly memory consolidation after training depends on dopamine-neuron activity ([Plaçais et al. 2012](https://doi.org/10.1038/nn.3055)) and is helped by sleep ([Donlea et al. 2011](https://doi.org/10.1126/science.1202249)); these motivate offline re-activation in general and are not evidence that flies replay stored episodes.

Any general rule the fly forms is then in its own connections, where the reasoning claim needs it. The diary only decides which old lessons are practised again. Whether that produces combinable lessons or a case classifier in the weights is a test question (section 7), not an assumption.

### 4.1 The lesson boundary and what enters the diary

A lesson has four steps with separate records. The diary is written only from step 4.

1. **Choice.** The fly scores the candidates from unchanged memory and chooses (own-choice stages), or the tape names the move (stage 2). Record the unaided ranking and its hash.
2. **Teacher.** The checker certifies only the move practised. Its certificate goes to an **audit log** that diary code cannot open.
3. **Delivery.** One forward pass with the move's input and the teaching pulse applied together, as the current learner does (`probe-wide-learning-v3.mjs`, lines 89–91, where eye stimulation and dopamine stimulation enter the same pass), then the learning rule's update.
4. **Receipt.** Written atomically after the update is saved.

| Diary field | Content | Why permitted |
|---|---|---|
| `stimulus` | The exact input the fly received for the move, as delivered: for chess, the Eyes v2 photoreceptor stimulation list (index, current); for stage 1, the injected Kenyon-cell code | The fly received exactly this |
| `stimulus_hash` | SHA-256 of `stimulus` | Identity of the experience |
| `teaching` | The external teaching input delivered: which dopamine group (reward: PAM07 and PAM02; punishment: PPL101 and PPL103) and current, or in stage 1 the valence the task's teaching function received | The fly received it |
| `lesson_index` | Order of the lesson | Bookkeeping |
| `receipt_hash` | SHA-256 of the receipt | Lets the auditor rebuild the diary |

**Not stored in the diary:** board text (FEN), move counters and any other detail the eyes do not show; the certificate or its reasons; whether the move was good; the best move; other moves and their outcomes; the ranking and scores; engine values; validation or test inputs; lessons whose verification was unknown (no pulse was delivered). Board text and certificates stay in the audit log for analysis and auditing only.

Storing the delivered input instead of the board removes the leak the peer review found: two boards that differ only in invisible move counters produce identical eye input, so they are now the same experience. It also removes any need for chess code in the diary. An entry is about 16 KiB (a few thousand photoreceptor values), so even a diary holding every lesson of stage 2 (960 entries) needs about 15 MiB.

### 4.2 What leaves the diary

Only a replayed lesson, and only during practice:

1. Pick one entry uniformly at random among entries written before the current lesson and not superseded, using the replay random stream (section 4.8).
2. Run one forward pass with `stimulus` and the stored teaching input applied together, exactly as in step 3 of the lesson boundary. Where a task computes part of the delivered current from the fly's present state (stage 1's prediction-scaled teaching level), that part is recomputed at replay, as it would be online; the stored external valence is not changed.
3. Apply the fly's own learning rule, unchanged: same equation, rates, limits and step guard.
4. Log the dopamine factor per output type, the number of connections changed and the summed absolute change.

The diary returns nothing else: no similarity search, no outcome counts, no score. The checker is never called during replay.

### 4.3 When replay happens

After every online lesson, exactly one replay [choice]. Reason: it interleaves old lessons at the finest grain and fixes the extra practice at one step per lesson, so controls can match it exactly. A trial whose verification was unknown delivered no pulse, so it is not a lesson: it gets no entry and no replay. The first lesson has no earlier entry and gets no replay; every replay arm skips the same step. All fly test snapshots, including the sawtooth checkpoints, are taken **after an online lesson and before its replay**, so the test sees the fly at the low point of any refresh cycle, not just after an old lesson was re-practised. Snapshots are scored by the test function, which receives a copy of the learner state and no diary.

### 4.4 Capacity and eviction

- Capacity: one quarter of the stage's online lessons, rounded up [choice]. Reason: by the end, three of every four lessons have been evicted, so the test measures a memory under pressure, not a store that keeps everything (v8's store was never full: 2,509 of 4,096). Capacities of one sixteenth and of every lesson are run for the diary arm only, as a descriptive curve.
- Eviction: reservoir sampling, Algorithm R ([Vitter 1985](https://doi.org/10.1145/3147.3165)). For the n-th admitted lesson: if the diary is not full, append; otherwise draw j uniformly from 0 to n − 1 with the reservoir stream and, if j is below capacity, replace slot j. Without supersession, every past lesson then has the same chance of being kept, whatever its input or pulse. A supersession (section 4.5) frees a slot that the next lesson fills directly, which gives that lesson a slightly higher chance of being kept; this happens only when the same input repeats, so in chess only in reversal tests, and every occurrence is logged. Class-balanced variants use outcome labels ([Chaudhry et al. 2019](https://arxiv.org/abs/1902.10486)) and are not allowed.

### 4.5 Correction

Before admitting a lesson, any entry with the same `stimulus_hash` is removed, whatever its pulse. Supersession depends only on whether the fly received exactly the same input before, never on the verdict. In chess this matters only in reversal tests, because a verified certificate gives the same verdict every time.

**Known limit:** if the meaning of a whole class of inputs changes, entries for similar but not identical inputs keep replaying the old lesson and slow the correction. Stage 1's reversal measures this cost.

### 4.6 Forgetting

1. **Diary forgetting:** entries evicted or superseded, by stage and by lesson group.
2. **Connection forgetting:** for every learnable connection, its net change during the old block and during the new block; the count whose new-block change has the opposite sign ("overwritten connections"), and the share of the old block's changed connections overwritten.

### 4.7 Persistence

The complete learner state is saved at every checkpoint: connection strengths, eligibility traces and any slow stores the learner keeps (stage 1's learner has a reservoir state), the diary, the reservoir counter and every random-stream state. One lesson's update, receipt and diary admission are published together in one atomic write (temporary file, flush, rename), with SHA-256 hashes in the checkpoint manifest, so a resume never has one without the others. The replay that follows is published in its own atomic write (its update, its log entry and the random-stream states) before the next lesson starts, so a resume restarts at a lesson boundary. Resume goes into a new directory after checking input hashes. Test and validation processes receive only the learner state, never the diary.

### 4.8 Random streams

Each run seed derives separate streams by SHA-256 of the seed and a label: `tape`, `choice`, `reservoir`, `replay`, `shuffle`, `filler`, `features`. One stream never feeds another's decisions, so, for example, admitting a lesson cannot change which entry is replayed next except through the diary's contents.

### 4.9 Shortcut audit: could the diary quietly do the thinking?

| Part | Possible shortcut | Guard |
|---|---|---|
| Encoding | Board text carries invisible details (move counters) that changed supersession in revision 1 | The diary stores the delivered input only; stage 0 check 3 shows invisible details cannot change the replay tape |
| Encoding | Storing the pulse stores the teacher's verdict | The fly received exactly this pulse. Whether the verdict, rather than re-exposure, matters is tested by the no-pulse and event-shuffled arms |
| Weights | Replay trains a case classifier into the connections | Case-recall controls on the full lesson history and on the diary, and learners on raw and on random nonlinear features with the same diary (section 7.2); attribution is limited to beating those controls |
| Retrieval | Choosing which lesson to replay could teach (replay the lessons the fly gets wrong) | Uniform random choice only. Choosing by error is "repeating puzzles because of errors", which the restart plan forbids |
| Eviction and supersession | Keeping more of one outcome class, or dropping entries by verdict | Algorithm R is blind to all fields; supersession uses only input identity; stage 0 check 4 changes verdicts alone and shows the diary and replay tape do not change |
| Dose | Replay adds learning steps | Filler, moved-timing and no-pulse arms; logged update sizes |
| Feedback loop | Output-to-dopamine connections could make replay amplify whatever the fly already prefers | Dopamine factors logged per replay; a descriptive arm cuts those connections during replay passes only |
| Timing | Settings chosen after seeing results | All settings are fixed here; a change makes a new version and a new claim |
| Test leakage | Diary consulted or loaded during testing | Test processes refuse a diary; the auditor checks test input hashes; validation and test stimulus hashes must not appear in the diary |
| Teacher | Replay asks the checker again, or the diary stores what the checker knows | Replay never calls the checker; certificates stay in the audit log |

## 5. Assumptions

1. **The fly can acquire a lesson** (hypothesis for chess; shown on non-chess associations on 2026-11-01). If false, there is nothing to keep and the stage stops as uninterpretable.
2. **Some forgetting comes from block practice rather than from lessons that need incompatible connection settings** (hypothesis). The seed-4102 certificate shows only that resetting six shared connections to their resting values cannot hold both memories ([interference limits](../../../research/reports/interference-limits-2026-11-02/README.md)).
3. **Re-living a lesson has the same kind of effect as the original lesson, given the current state** (engineering). The input and external pulse are identical; the dopamine response and update are recomputed and can differ, which is the fly's own dynamics and is logged.
4. **Algorithm R carries no chess knowledge** (property of the algorithm; checked by stage 0).
5. **Removal stops decision-time help only.** Training-time help is bounded by the controls, not by removal.
6. **Biological status:** a computational aid, loosely motivated by offline consolidation; not a claim about flies.

## 6. Hypotheses and how to tell them apart

| Explanation | What it predicts |
|---|---|
| **Main hypothesis: interleaving.** Replaying old lessons during new learning lets shared connections settle where both work | Diary keeps A and still learns B, measured at the low point of the replay cycle. Moved-timing, filler and no-pulse arms keep less A |
| **Rival 1: conflict.** A and B need incompatible values on the shared connections | Diary trades A against B. The mixed-order arm also fails one group (a failed schedule, not proof of conflict) |
| **Rival 2a: extra practice of anything** | Filler replay matches the diary |
| **Rival 2b: more A practice, at any time** | The moved-timing arm matches the diary |
| **Rival 3: re-exposure without the verdict** | The no-pulse arm matches the diary |
| **Rival 4: refresh, not joint storage.** Each new lesson damages A and the next replay restores it | A is good straight after replays and poor straight after new lessons: a large sawtooth in the logged checkpoints, and failure at the low-point snapshot |
| **Rival 5: case classifier.** The fly's connections became a lookup of past inputs | Case-recall controls on the full history, or a learner on random nonlinear features with the same diary, match the fly on new kinds of problem |
| **Rival 6: the wiring adds nothing.** Any learner with the same diary does as well | A learner on raw or random features matches the fly |

## 7. Tests, defined before any result

All stages use development sets until stage 3 opens the transfer protocol's locked sets, once. Bootstrap: resample whole games 10,000 times with a fixed seed, as in the [transfer protocol](../research-goals/transfer-and-combination-protocol-2026-11-03.md). Every pass rule must hold in every run or seed.

### 7.1 Stage 0: software checks (no fly graph)

1. **Write rule:** the diary rebuilt from receipts equals the saved diary byte for byte; a planted certificate field, a validation stimulus or an unknown-event entry is rejected.
2. **Delivery:** replay applies `stimulus` and the teaching input in one forward pass with the unchanged rule, never calls the checker, and the auditor recomputes the delivered input and the resulting update for every replay in development runs.
3. **Invisible details:** two boards differing only in move counters give the same `stimulus_hash`; a run fed either produces the identical replay tape.
4. **Verdict blindness:** two lesson streams identical except for their pulses produce the same admitted entries, the same evictions and the same replay order, under the same seeds.
5. **Reservoir:** 1,000 independent seeds, each a stream of 100,000 synthetic lessons into capacity 100. The share of seeds keeping each stream position, pooled into 100 equal bins, passes a chi-square test of uniformity at the 1% level.
6. **Persistence:** kill and resume at a random point; the resumed run's state, diary, replay tape and choices equal an uninterrupted run's.
7. **Separation:** the test runner refuses to start when given a diary; the diary module imports no chess-rules or certificate code.

### 7.2 Arms

Every comparison arm receives **identical online lessons** to the diary arm (same inputs, same pulses, same order). Stage 2 does this with a fixed tape. In stage 1 the diary arm makes its own choices, as in the original task, and each added arm is **yoked** to them: it receives the diary arm's chosen input and pulse at every trial instead of choosing. The task's four original arms keep their own choices and serve only to reproduce the original marks. The case-recall arms and the two learners are run in stage 2 as descriptive results and are decisive only in stage 3.

| Arm | What it is | What it rules out |
|---|---|---|
| **Diary** | Online lessons plus one replay per lesson (section 4) | (the system under test) |
| **No diary** | Online lessons only | Baseline; the Volume 2 arm |
| **Filler replay** | Same number of replay steps, each on a non-chess filler pairing (the transfer protocol's filler trials; in stage 1, a fixed set of arbitrary pairings never tested) | Rival 2a |
| **Moved timing** | Copies the diary arm's replay log from the same run. Every replay is kept. For each block (stage 1: each item block and the reversal; stage 2: A and B), the replays made during that block of entries from earlier blocks are moved, in the same order, to the end of the block before it, after that block's test snapshot and before the next block starts; replays of the current block's own entries stay where they were | Rival 2b |
| **No pulse** | The same replay log, replayed with the same inputs but no external teaching pulse | Rival 3 |
| **Event-shuffled** | The same replay log; within each block, the teaching inputs delivered at that block's replay events are randomly permuted across those events, so each replay keeps its time but gets another event's pulse from the same block. Pulse counts, amplitudes and timing per block are unchanged | Re-exposure with wrong verdicts |
| **Mixed order** (stage 2 only) | All A and B lessons in one shuffled order, with one filler step per lesson so its update count matches the diary arm, no diary; scored only at the end | A feasibility witness only: success shows a joint setting is reachable; failure means only that this schedule failed |
| **Learning off** | Same lessons, no connection changes | Floor |
| **Feedback cut** (descriptive) | Diary arm with output-to-dopamine connections silenced during replay passes only | Whether replay amplifies existing preferences |
| **Case recall** | At test, scores each candidate from stored lessons (exact specification below), in two versions: the final diary, and the **full history** of every lesson | Rival 5 |
| **Raw-feature learner with diary** | Simple learner (below) on raw photoreceptor input, same lessons, same diary and replay | Rival 6 |
| **Random-feature learner with diary** | Same learner on fixed random nonlinear features | Rivals 5 and 6 |

**Case recall, exact rule.** Keys, all fixed before data with the `features` stream: (a) raw input vector; (b) Kenyon-cell activity from the fly's untrained state; (c) random features: a fixed random projection of the raw input to as many units as there are Kenyon cells, keeping the k largest, where k is the fly's mean number of active Kenyon cells on development inputs at the untrained state. Each key is scaled to unit length; distance is Euclidean. A candidate's score is the inverse-distance-weighted mean of the pulse signs (+1 reward, −1 punishment) of its 3 nearest stored lessons, weight 1 / (d + 10⁻⁹); if any stored lesson is at distance below 10⁻¹², the score is the mean sign over those exact matches only. Ties and tie tolerance follow the fly's scoring. The bar is the best of the three keys in each version, chosen per stage on the final result: this favours the control.

**Simple learners, exact rule.** Score = w · φ(x), with w starting at zero. On each lesson or replay with pulse sign s: w ← w + η s φ(x) / (‖φ(x)‖² + 10⁻⁹). φ is the raw input or the random features above. η is chosen from {0.01, 0.03, 0.1, 0.3, 1} by the learner's own online accuracy on the stage's first training block (the share of its lessons whose sign it predicted correctly before updating). This uses no held-out data and favours the control.

### 7.3 Stage 1: the known forgetting failure, outside chess

**Question:** does the diary stop the measured damage to old associations, where this learner is known both to learn and to forget?

**Contract.** Reuse the cubic-exit task's harness (`run-eye-graph-memory-cubic.mjs`; [specification](../../../research/reports/memory-retention-continuation-2026-11-01/cubic-exit-spec.md)) through an adapter. Six seeds, as the original. Four items learned in sequence, each a choice between two injected, normalized Kenyon-cell codes; one unknown trial in eight; then the delay with noise; then reversal of item 0. Teaching level is the task's prediction-scaled function (`TONIC + (pulse − TONIC) × scale`), recomputed at replay from the stored valence and the present prediction. Replay is inserted after each feedback trial in every phase that has feedback; the delay has none. The task's own arms (informative, absent, shuffled, disabled) are kept; the arms of section 7.2 except mixed order, case recall and the learners are added. Complete state includes the task's slow store. A stage 1 protocol file freezes the adapter, the exact per-seed formulas below and the seed list before any run.

**Per-seed pass (every seed, diary arm):**

1. **Acquired:** each item, right after its own block, chosen correctly by the greedy choice and with normalized margin at least 0.20 (the original first mark, per seed).
2. **Old items kept:** at the end of learning, every earlier item still chosen correctly, and the median ratio of its margin to its own post-block margin at least 0.5 (second mark, per seed).
3. **No unrelated loss after reversal:** the reversed item chosen correctly with margin at least 0.15, every other item still chosen correctly, and their median margin ratio to the delay test at least 0.8 (third mark, per seed, with the added every-item condition).
4. **Kept over the delay:** every item correct after the delay and median margin ratio at least 0.7 (fourth mark, per seed).
5. **Not extra practice:** in every seed, the diary keeps at least as many items correct at each test as the moved-timing, filler and no-pulse arms. In every seed where the no-diary arm showed damage, the diary also beats each of those three arms at the test where the damage occurred: more items correct, or, with equal counts, a higher median margin ratio. A seed where no-diary showed no damage cannot show a benefit and is not required to.

The original six-seed median marks are reported beside these for every arm. Per-seed rules are stricter than the original medians, so they are a new test, not a change to the old gate.

**Prerequisite:** the no-diary informative arm must show damage in at least one seed (an item lost, or a ratio below its mark). The original run did; if this rerun does not, stage 1 cannot test the diary.

**Reading the result:** all pass and every practice control fails condition 5 → re-living old lessons during new learning, not extra practice, prevents this damage on this learner. Retention passes but the reversed item fails → the diary blocks correction: a design failure. Acquisition fails → uninterpretable. **Limit:** this is the older learner, not the current revision-4 chess learner.

### 7.4 Stage 2: learn idea A, then idea B, on a fixed chess lesson tape

**Question:** with identical lessons in every arm, does replay keep a chess idea learned first while a second idea is learned?

**Ideas** (from the transfer protocol): **A = legal recapture**; **B = exchange value**. A punishes recapturable captures that lose material; B rewards recapturable captures of a piece worth at least the capturer. They are consistent under the protocol's combined rule, so interference happens only if the fly's connections mix the two features. Whether they do is unknown; the no-diary arm measures it.

**Tape:** before any data, the `tape` stream draws 480 A lessons, then 480 B lessons, from the protocol's training pools under its rejection rules, each a (board, move) whose verdict is verified, with the certificate's pulse. Every arm practises this tape. Teacher-chosen practice is a disclosed clue (Read first, item 5).

**Unit and denominator (twin pairs).** A development twin pair is two boards where the same move has opposite verified answers; 48 pairs per idea, from 48 separate games. A pair is correct when the fly scores the move higher on the good twin; ties count as wrong. Chance is 24 of 48. A second, **offset-cancelled** version scores each twin by the move's margin over the best other legal move on that board; a pair is correct when that margin is higher on the good twin. This removes any score added equally to every move on a board.

**All-legal measure.** On the 192 development twin boards of the stage (96 per idea) that have at least one verified-good legal move (boards with none are excluded before testing and counted), take the fly's top-scoring moves within the tie tolerance. The same all-move scores give the offset-cancelled pairs. Good means a capture that is good under the protocol's combined rule; a quiet move is not good. King moves and moves the checker cannot certify are unknown. The board scores the share of tied top moves that are good. A board whose tied top set contains an unknown move is counted as unknown and left out of the denominator. If more than 5% of eligible boards are unknown, the measure is inconclusive and so is the stage.

**Snapshots:** after the last A lesson (before its replay), and after the last B lesson (before its replay). Sawtooth log: during B, every 48 lessons, the A twin pairs are scored just before and just after that lesson's replay.

**Prerequisite (forgetting exists):** in the no-diary arm, A's kept share (condition 2 below) or net retention (condition 3) is below 0.70. Otherwise there is no forgetting to repair, and the stage says nothing about the diary.

**Pass (every run, diary arm, capacity one quarter):**

1. **A acquired:** at least 32 of 48 A pairs after A. Chance of 32 or more by guessing: 1.5%.
2. **A kept, pair by pair:** of the A pairs correct after A, at least 70% still correct after B. Reason: the project's 0.70 retention requirement, applied to the pairs actually learned, so gains on other pairs cannot hide losses.
3. **A kept, net:** `(A after B − 24) / (A after A − 24)` at least 0.70, so guessing cannot look like retention.
4. **B learned:** at least 32 of 48 B pairs after B.
5. **Learning not blocked:** B pairs above chance with the diary at least 90% of those without it [choice]: a memory that keeps A by stopping new learning fails the goal; 10% allows a small, stated cost.
6. **Offset-cancelled:** conditions 1 to 4 also hold on the offset-cancelled pairs.
7. **Beats the practice controls:** more A pairs correct after B than no diary, filler, moved timing, no pulse and event-shuffled, each with bootstrap lower limit above 0. If the filler arm itself lost more A than no diary (lower limit above 0), filler damaged learning; that comparison is then reported as uninformative and the others decide.
8. **Useful choices:** all-legal measure after B above learning off, bootstrap lower limit above 0.

**Reading the result:** all pass → replay keeps chess idea A while B is learned, beyond extra practice, timing, re-exposure and wrong verdicts: assisted retention, Volume 3. Large sawtooth with a low-point failure → refresh, not joint storage. Mixed order succeeds but the diary fails → a joint setting is reachable and this replay schedule does not find it. Mixed order fails → this schedule failed; a Volume 4 limit needs a separate bounded proof or exact search over the permitted connection strengths, as in the revision-4 capacity checks. Capacity curve: a benefit only when the diary keeps every lesson means the design does not work under pressure.

**Planning estimate:** 11 fly arms (the nine graph arms of section 7.2 plus the diary at capacities one sixteenth and every lesson) × 3 runs; with the all-legal measure only on the diary, no-diary and learning-off arms, roughly 15–20 hours of single-process graph time at about 0.37 s per forward pass (the v8 rate), less with workers inside the 2,048 MiB budget. The dry run measures the real figure.

### 7.5 Stage 3: transfer and combination, on the fly's own choices

Use [Phase B and Phase C of the transfer protocol](../research-goals/transfer-and-combination-protocol-2026-11-03.md) unchanged, on the fly's own choices. For each fly arm of the protocol (Phase-A, fresh, shuffled, single-idea and two-idea flies) add a version with a diary, and add the case-recall arms (diary and full history) and both learners with the diary. Each diary belongs to one fly and travels with its learner state across phases; its capacity is one quarter of that fly's total planned lessons across all its phases, fixed before data. The protocol's filler trials carry feedback the fly receives, so they are lessons and enter the diary like any other. The fly is always tested with the diary removed. Each locked set is opened once.

A **reasoning claim for the fly plus diary** at Phase C step 2 (three ideas) requires, in all three runs, with every audit passed:

1. the protocol's own pass scores;
2. the same scores on the offset-cancelled pairs;
3. at least 6 more locked pairs than each added arm, bootstrap lower limit above 0 (the protocol's margin);
4. the all-legal measure on the locked boards above learning off, the case-recall arms and both learners, each with bootstrap lower limit above 0.

Its wording is then limited to: the fly with a disclosed replay diary combined three separately taught chess ideas on unfamiliar problems better than the listed case-recall and simple-learner controls. A case classifier not among those controls is not ruled out. Failing any of 1 to 4 leaves reasoning unsupported, whatever stages 1 and 2 showed.

## 8. When the design fails

1. **Leak:** a diary field cannot be rebuilt from receipts; invisible details change the replay tape; a validation or test input appears in the diary; a test process loads the diary. The run is invalid.
2. **Nothing to keep:** the fly does not acquire the first lessons. Uninterpretable.
3. **No forgetting to repair:** the no-diary arm already keeps A. The stage says nothing about the diary.
4. **Extra practice explains it:** the diary does not beat filler replay (unless filler is shown damaging) or the moved-timing arm.
5. **The verdict is not needed:** the diary does not beat the no-pulse arm.
6. **Refresh only:** the diary fails at the low-point snapshot.
7. **Stability blocks learning or correction:** stage 2 condition 5 fails, or stage 1's reversed item fails.
8. **Does not work under pressure:** no benefit at capacity one quarter.
9. **Case recall or a simple learner explains it:** a case-recall or learner arm matches the fly in stage 3.

## 9. What a pass would and would not show

- **Would show:** with lessons re-lived during new learning, the fly's own connections held several chess lessons at once, with the diary absent whenever the fly was judged, beyond the listed controls.
- **Would not show:** that the fly's rule resists overwriting by itself; that the fly formed combinable concepts rather than a case classifier not tested here; that flies replay memories; reasoning outside chess; Property 1 or Property 2.

## 10. Working memory is a separate component

The researcher's Volume 3 note allows outsourcing working memory. That store would hold the fly's own activity within one decision, for example during a later look-ahead, and be cleared after each decision. It would never hold outcomes from other decisions. It needs its own design under the input and output rules, with its own decision-time lookup control.

## 11. Decisions for the researcher

1. Approve the replay diary as a Volume 3 memory, or choose another design from section 3.
2. Approve replay as an amendment to the restart plan's feedback rule: replay repeats lessons already received, uniformly, never because of errors, and never asks the teacher again.
3. Approve stage 2's teacher-chosen lesson tape as a disclosed development mechanism test.
4. Confirm placement: diary arms in Volume 3 as assisted retention; no-diary arms in Volume 2; any Volume 4 limit only with a separate proof.
5. Order: stage 1 can be built first. Stage 2 needs the twin-pair generators, which do not exist yet, a game manifest showing enough eligible boards for three disjoint practice sets (1,200 training-pool games exist; v8 used 750 positions from 198 games), and worked scoring examples for the boundary cases above. The three-board feedback test and the 2026-11-09 decision remain open and are unchanged.

## 12. Changes from revision 1 (review round 1)

Reviews: [folder](../../../research/reports/replay-diary-design-review-2026-11-17/README.md). Every required change was adopted; none was declined.

| Finding | Change in revision 2 |
|---|---|
| Peer 1: invisible FEN move counters changed supersession | Diary stores the delivered input, not board text; supersession by input hash; stage 0 check 3 |
| Peer 2: existing teaching path selects moves by certificate, has no receipts, and delivers input and pulse in one pass | Section 4.1 lesson boundary; one-pass delivery; auditor recomputes every replay; teacher-chosen tape disclosed for stage 2 only |
| Peer 3: stage 1 cannot be copied as written | Stage 1 contract: adapter, six seeds, injected codes, recomputed prediction-scaled teaching, complete state, per-seed rules, original medians reported; mixed-order arm removed from stage 1 |
| Peer 4 and skeptic 2: moved-timing arm dropped new-block replays; own-choice arms see different lessons | Moved timing keeps every replay; stage 2 uses one fixed tape; dopamine factors and update sizes logged; feedback-cut descriptive arm |
| Peer 4 and skeptic 5: lookup and simple learner unspecified | Exact case-recall and learner rules; nonlinear random-feature learner added |
| Peer 5: scores and sampling not uniquely computable | All-legal measure with unknowns, ties, king moves and ineligible boards defined; Algorithm R and random streams; chi-square scheme; game manifest and worked examples required before launch |
| Skeptic 1: margins hide losses; refresh rival; all-legal had no threshold | Kept-share rule; low-point snapshots and sawtooth log; all-legal threshold |
| Skeptic 3: shuffle changed per-event pulse balance; filler may interfere | Event-level shuffle; no-pulse arm; filler damage check |
| Skeptic 4, foundational 3, peer 3: a failed mixed order is not a limit | Mixed order is a feasibility witness only; a Volume 4 limit needs a separate proof |
| Foundational 1: replay could train a case classifier into the weights | Full-history case recall and random-feature learner; attribution narrowed |
| Foundational 2: twin rankings need not mean solving | Offset-cancelled pairs and all-legal measure required for any claim |
| Foundational 4: "Property 2 with a disclosed aid" relabelled an old requirement | Renamed assisted retention; Properties 1 and 2 stay unmet |
| Foundational 5 (optional): removal is not a necessary boundary | Adopted: removal is this design's restriction |

**Revision 3: the lead's own recheck** (the reviewers' round 2 hit the Codex usage limit before writing anything; this recheck is not independent):

1. The event-shuffled arm permuted pulses across the whole run, which changes pulse counts per block although revision 2 said it did not. Now permuted within each block.
2. Unknown-verification trials: stated that they are not lessons, so they get no entry and no replay.
3. Sawtooth checkpoints: stated that they too are taken before the replay and scored without the diary.
4. The all-legal measure's boards are now named (the 192 development twin boards), and the learners' tuning block is named for every stage.

**Revision 5: the lead's second read, before the reviewers' round 2** (not independent):

1. Section 7.2 said stage 1 arms get identical online lessons yet choose for themselves. Now every added stage 1 arm is yoked to the diary arm's choices; the original four arms only reproduce the original marks.
2. Supersession frees a slot, which slightly favours the next lesson in reservoir sampling. Now disclosed and logged (section 4.4).
3. Moved-timing replays are placed after the earlier block's test snapshot, so that snapshot is comparable across arms.
4. A replay's own update is published in its own atomic write before the next lesson (section 4.7).
5. Stage 3 now says each diary travels with its fly across phases, with capacity one quarter of that fly's planned lessons, and that the protocol's filler trials enter the diary as lessons.
6. Stage 2's arm count is corrected to 11, the mixed-order arm is scored only at the end, and case recall and the learners are descriptive in stage 2 and decisive in stage 3.

## Sources

Accessed 2026-11-17; bibliographic records checked against Crossref or the venue; abstracts read, full texts not read.

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
