# Lead's recheck of the round 1 findings (2026-11-17, not independent)

The three reviewers' round 2 stopped at the Codex usage limit ("try again at 11:16 PM") before writing anything; their logs are in [round2-usage-limit/](round2-usage-limit/). Problem Solving allows the lead to run the checks when the group is unavailable, with the loss of independence disclosed. This is that check. It is not a substitute for the reviewers' own round 2, which is queued to run after the limit resets.

## Disposition of each round 1 finding against revision 3

| Finding | Disposition | Reason |
|---|---|---|
| Peer 1: invisible move counters | Resolved for the design | The diary stores the delivered input; identity is the input hash; stage 0 check 3 tests it |
| Peer 2: receipts and teaching path | Resolved for the design | Four-step lesson boundary; one-pass delivery matching the current learner; auditor replays every update. Building must still show the receipts exist |
| Peer 3: stage 1 copy | Resolved for the design; exact formulas open | Contract fixed in 7.3; the stage 1 protocol file must freeze the per-seed formulas and seed list before any run |
| Peer 4: controls | Resolved | Moved timing keeps every replay; fixed tape; exact case-recall and learner rules |
| Peer 5: computability (launch) | Open until launch | Game manifest with eligibility counts and worked boundary examples are required before launch (section 11 item 5) |
| Skeptic 1: margins, refresh, all-legal | Resolved, with one limit | Kept-share rule, low-point snapshots, sawtooth log, all-legal threshold. Limit: a pass at the low point shows A survives one new lesson after the last replay, not that it survives long without replay |
| Skeptic 2: moved timing and own choice | Resolved | Fixed tape; logged dopamine factors and update sizes; descriptive feedback-cut arm |
| Skeptic 3: shuffle and filler | Resolved in revision 3 | Revision 2's shuffle still changed per-block counts; revision 3 permutes within each block |
| Skeptic 4: mixed order is not proof | Resolved | Feasibility witness only; Volume 4 needs a separate proof |
| Skeptic 5: control specification | Resolved | Exact rules; nonlinear-feature learner; tuning on the learner's own first block |
| Foundational 1: case classifier in the weights | Narrowed, open by nature | Full-history case recall and a random-feature learner added; a case classifier outside these controls cannot be excluded, and the claim wording says so |
| Foundational 2: rankings need not mean solving | Resolved | Offset-cancelled pairs and all-legal measure required |
| Foundational 3: failure is not a ceiling | Resolved | As skeptic 4 |
| Foundational 4: relabelling Property 2 | Resolved | Assisted retention, Volume 3; Properties 1 and 2 unmet |
| Foundational 5 (optional) | Adopted | Removal is this design's restriction |

## New problems found in revision 2 (fixed in revision 3)

1. The event-shuffled arm permuted pulses across the whole run, so per-block pulse counts could change, contrary to its own description.
2. Unknown-verification trials were not said to skip the diary and replay.
3. Sawtooth checkpoints were not said to be taken before the replay and scored without the diary.
4. The all-legal measure's boards and the learners' tuning block were not named for every stage.

## Strongest remaining hypothesis and its rival

- **Strongest hypothesis:** if the fly can acquire a chess idea at all, interleaved replay of its own lessons will keep that idea while a second idea is learned, beyond extra practice, timing and re-exposure.
- **Credible rival:** replay keeps old ideas by refreshing a case classifier in the connections, and the fly's apparent combinations are case recall not covered by the listed controls.
- **What separates them:** on stage 3's new kinds of problem and unseen combinations, the twin-pair design makes similar-board recall give both twins the same answer. The rival predicts the fly scores near the full-history case-recall and random-feature controls there; the hypothesis predicts it beats them by the protocol's margin.

## Counterexample check

A run could pass stages 1 and 2 while the fly holds only a refreshed case table: both stages test retention on development twins of the practised kinds, which case recall in the weights can serve. That is why stages 1 and 2 support only **assisted retention**, and any reasoning wording waits for stage 3 against the case-recall and learner arms.

## Second read, before the reviewers' round 2 (revision 5)

While the reviewers waited for the usage limit to reset, the lead read revision 4 again as a hostile reviewer and fixed six gaps, listed in section 12 of the design. The most important: section 7.2 claimed identical online lessons for all arms while letting stage 1 arms choose for themselves, so the stage 1 controls would have seen different lessons. Every added stage 1 arm is now yoked to the diary arm's choices. Revision 4 is preserved as [design-revision-4.md](design-revision-4.md) (blob `99df41e4`); revision 5 is blob `0c71bb4d`. The reviewers' round 2 prompts now point at revision 5 and list every edit since revision 2.

## Solo deep-in-thought pass (revision 6)

The researcher asked for Problem Solving at deep-in-thought, solo, while the reviewers wait. This is that pass. It is not independent.

**Numbers rebuilt from raw records.**

1. Cubic-exit run (`runs/memory-retention-2026-11-01/eye-graph-memory-cubic-v1-recovery1/records.jsonl`): all five original marks pass on six-seed medians (delay ratio 0.7199). Per seed, the delay ratios are 0.7566, 0.5941, 0.6832, 0.8118, 0.8714 and 0.4203. After the reversal, seeds 4102, 4105 and 4106 each lose one unrelated association; no seed loses an old item at the end of learning. Seed 4102's item 3 margin goes from 0.140130 to -0.020325, matching the design's quote. The run took 6,157 s at 299 MiB peak.
2. v8 (`summary.json`): full store 349.33, piece-value rule 294.67, all-legal 30.60 against 21.92.
3. Eyes v2 input size, graph-free, 83 moves on three boards: 1,644 active photoreceptors on average, at most 1,955, so 13-16 KiB per diary entry.
4. Stage 2 work: about 72,000 forward passes per run, 216,000 for three runs, about 22.5 hours at 0.375 s per pass. Revision 5 understated this as 15-20 hours.
5. Chance of 32 or more of 48 pairs by guessing: 1.47%.

**Three critique briefs, run by the lead.**

- *Peer (could two teams compute the same verdict?):* bootstrap seed, lower-limit definition and tie tolerance were missing; development boards were not said to be disjoint from the tape; runs that stop early had no rule. All specified in revision 6, with a worked example at the exact cutoffs.
- *Scientific skeptic (could another mechanism give the same result?):* the filler, no-pulse and event-shuffled controls changed replays during the A block, so they would learn A less well, and the diary could beat them on learning rather than keeping. Revision 6 makes every replay control change only old-lesson replays, so each starts B in exactly the diary arm's state.
- *Foundational (does a pass answer the question?):* stage 1 asked the diary to stop delay losses that occur with no lessons and so no replays, which is outside its mechanism; a working diary would have failed. Revision 6 scopes the delay as "not worse", and counts benefits only after new learning. The diary's link to reasoning is now stated: it keeps earlier ideas alive so the fly can combine them; the combining is the fly's.

**Counterexample tried.** A diary that only made A stronger before B (overlearning) would pass a comparison against no diary. It cannot pass against the moved-timing arm, which gets the same old-lesson replays before B; that is why the moved-timing comparison is required.

**Remaining open points (for the reviewers).** Stage 2's order is not counterbalanced (stated as a limit). Whether ideas A and B interfere at all in this fly is unknown (the prerequisite handles it). A case classifier outside the listed controls cannot be excluded (stated in the claim wording).

