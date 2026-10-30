# 2026-10-24: Stage 1 memory retention fix (fix goal task 1)

Work under [the fix-goal prompt](../../../documentation/handoffs/fix-goal-prompt-2026-10-24.md); every change and run is also in [the review ledger](../../../documentation/handoffs/fix-goal-ledger-2026-10-24.md). Background: [Stage 1 end-to-end journal](2026-10-23-babysit-stage1-end-to-end.md) (2026-10-24 sections) and [learnability diagnostics](../../reports/stage1-learnability-diagnostics-2026-10-24/README.md).

## Problem carried over

With `ReversalMemory` (`dg = eta*D*(k+g-1)`), eta 0.5 and task pulses with D about -1, every pulse in a compartment moves every inactive synapse halfway back toward gain 1, so a board's lesson is erased by a few unrelated lessons. Smoke r6 (action-relative cue): one success pulse lifts the certified move, often to rank 1, but informative lesson-start choices were 8/32 against 7-9/32 for every control.

## Retention probe design (predeclared before any run, 12:50)

- Script `.codebase/scripts/puzzle-learning/stage1-retention-probe.mjs`; protocol `research/data/lichess-stage1-synthetic-v1/stage1-retention-probe-v1-protocol.json`; Python action `python actions/stage1-retention-probe-v1-step.json` (`fly --config ... start probe`, then `status`/`watch`/`report`). Output only under `runs/stage1-retention-probe-v1`.
- Learner: exactly the smoke-r6 registration (full graph, replica r1 seed, action-relative cue, coupled task + Stockfish pulses, existing r6 Stockfish review cache read-only); only `learner.memory.eta` changes, in memory. `ReversalMemory` itself is unchanged.
- Training boards only. A boards: one per stratum, the first panel by ID whose unaided scratch choice is wrong. Interference: 10 other training boards in a seeded order, the same for every eta.
- One lesson = the planner's pair (highest-scored failure, then highest-scored success), each a full informative event. A's certified-move rank is measured after every lesson.
- Decision rule (from the prompt): the largest eta in {0.5, 0.2, 0.1, 0.05, 0.02} keeping A correct after all 10 interfering lessons in at least 3 of 4 probes. If none passes: a new rule class only with registered primary-literature support, otherwise stop.
- Limits stated in advance: one replica, four A boards; a probe "pass" can also arise if interference itself happens to make A correct (no no-own-lesson control); the acceptance test is the six-arm smoke, not this probe.
- Not run yet at the time of writing: the r6 independent audit (PID 16364) is still live and graph work is serial.

## Smoke r6 outcome (audit published 13:14)

`runs/lichess-stage1-synthetic-v1-smoke-r6/audit.json`: gate-failed (D2), full replay and memory continuity verified. Validation at block 8: 3/16. Informative training boards: 4/24 at block 0, **1/24 at block 8**; controls at block 8: outcome-only 5/24, absent 3/24, disabled 4/24, shuffled 3/24, stockfish-shuffled 7/24. The taught arm ended below its own scratch level and below every control on the boards it was taught. This is consistent with (does not prove) the erasure diagnosis: within-lesson effects are strong, but each later pulse pulls the earlier boards' gains back, and the net drift can push a board's certified move down. One replica and 8 blocks; no transfer conclusion beyond D2's measured shortfall.

The retention probe (scratch 4/24 correct, identical to r6's block 0, as expected for the same seed and initial memory) started at 13:16.

## Pivot: reviewer finding 2 read late; probe extended (14:45-15:00)

Mistake: the goal file gained two binding reviewer addenda at 13:10 and 13:20; I had read it at about 12:40 and only re-read it at 14:45 after noticing its modification time. No work had contradicted them, but probe v2/v3 were added late. Finding 2 asks, before judging the memory fix, for the probe with and without the Stockfish phase, and for a child-position cue in the move's own token family.

- **Probe v2 (no Stockfish phase):** `stage1-retention-probe-v2.mjs` (new file; v1 is pinned by its run) runs the registered `outcome-only` mode: the Stockfish frame is presented with no DAN pulse, so exposure and presentation counts match v1. Same A boards, interference and etas.
- **Mover-value cue (registration revision 7):** `public-action-relative-cue-v2` encodes a child position (one that has a last public move) with the move's `act:*` tokens, anchored at the landing square from the mover's side and excluding the moved piece, so it equals the move cue minus the captured-piece token. `CoupledStockfishBrainV3` reads the child value and delivers the Stockfish error in the mover's (= root actor's) perspective; side-to-move cues behave exactly as in v2 (tested). Design choice (mine): the child cue includes the last move's mover/capture/vector tokens as well as relative pieces, to maximize sharing with the move cue; the consequence is that the value pulse acts almost like a Stockfish-graded action lesson. Probe v3 runs the informative condition on this learner.
- **Interim v1 evidence (eta 0.5, 0.2, 0.1: 0/4 retained each).** After its own lesson A is correct (except `f3-blocked-p0a`, which its own lesson never lifts), but the punished scratch favourite returns within 1-3 interfering lessons, and not later at smaller eta. A no-graph analysis (`research/reports/stage1-retention-probe-2026-10-24/cue-crosstalk.mjs`) shows 21-27 of A's ~29 action-cue cells are also driven by the interfering lessons' moves (capture-type cells 16/16, mover 10/10, vector 14/15, relative pieces 53/75); the signed overlap correlates with A's rank change (r = 0.27). Hypothesis (not yet tested): cross-board overlap of generic action tokens rewrites A's cells, and because both A's imprint and this cross-talk scale with eta, lowering eta cannot fix it.

## Probe results v1 and v2 (15:33, 17:12)

| eta | v1 with Stockfish: retained / acquired | v2 no Stockfish: retained / acquired |
|---|---|---|
| 0.5 | 0/4 / 3/4 | 1/4 / 3/4 |
| 0.2 | 0/4 / 3/4 | 1/4 / 3/4 |
| 0.1 | 0/4 / 3/4 | 1/4 / 3/4 |
| 0.05 | 0/4 / 0/4 | 0/4 / 0/4 |
| 0.02 | 0/4 / 0/4 | 0/4 / 0/4 |

"Acquired" = A correct right after its own lesson; "retained" = still correct after 10 interfering lessons. No eta meets the 3/4 rule in either probe. Removing the Stockfish phase changes only `f0-pin-p0a` (final rank 2 -> 1); the other boards end at the same rank, so the Stockfish phase is not the main cause of forgetting here. Below eta 0.1 a single lesson no longer changes A's choice at all, so the tested eta range has no middle ground: either the lesson takes effect and is overwritten, or it does not take effect. The cross-talk diagnostic on v2 (200 lessons) gives the same picture as v1 (signed-overlap vs rank-change r = 0.22; mean +0.92 when A worsened, -2.55 when it improved). `f3-blocked-p0a` is never acquired: its certified move stays last (7/7) even right after its own success lesson.

Results: `runs/stage1-retention-probe-v1/result.json` (SHA-256 `e7c34b0d...16d6`), `runs/stage1-retention-probe-v2-no-stockfish/result.json` (`6dd4efc7...e25f`). v3 (mover-value cue, revision 7) started 17:12.

## Probe v3 and the task 1 outcome (18:47)

v3 (revision 7: Stockfish value on the move's own cue, mover perspective) retained 1/4 at eta 0.5 and 0/4 at every smaller eta; acquisition is unchanged (3/4 at 0.5-0.1, 0/4 below). Across all three probes no eta keeps A correct in 3 of 4 probes, so **task 1b cannot choose an eta: task 1 is recorded as failed** (full table and diagnosis in the [probe report](../../reports/stage1-retention-probe-2026-10-24/README.md)).

Task 1c: the only allowed alternative is a separately registered rule with slower dopamine-only recovery, backed by primary literature. Aso and Rubin 2016 report that DAN activation without odor reduces immediate memory in four of five DAN sets (the alpha1 compartment resists), and that one-day memory after spaced training (MB099C, which includes PPL1-gamma2alpha'1, and MB630B) resists it; Berry et al. 2012 report that DAN activity after training drives forgetting. For immediate memory in the compartments we model this supports the existing fast recovery, not a slower one; slower erasure is supported only for another compartment or after consolidation, which is a different mechanism with timing semantics our lesson counts do not have. In addition, the probe evidence points to cross-board cue overlap, which a slower recovery would not remove. Per the prompt: STOP the memory path and ask the researcher.

New finding on Stockfish teaching (reviewer finding 2): on these synthetic decisive boards the registered absolute value target is saturated for 74% of legal moves and the same side of 0.5 for every move on half the boards; under the mover-value cue the Stockfish pulse opposed the verified task outcome in 47% of events and gave both moves of a lesson the same sign in 83% of lessons. Judgement (mine): with this target Stockfish mostly teaches "this position is won/lost", which cannot discriminate moves; improving unaided choices (D9) would need a relative target (for example the move's expected score against the board's alternatives) or less decisive positions. That is a teaching-contract decision for the researcher, recorded in the handoff.

Decisions needed are listed in the [handoff](../../../documentation/handoffs/curriculum-reasoning-state.md). Next (allowed by the order rule because task 1 is recorded as failed): task 2, babysit safety features; tasks 3-5 stay blocked.

## 2026-10-25 pivot: researcher decisions after the task 1 stop

The researcher chose the input-representation path for memory (decision 1a), a relative Stockfish target (decision 2) and no special handling for f3-blocked-p0a. Pivot: task 1 continues by changing the cue, not the memory rule. ReversalMemory, eta options and the probe protocol stay as registered; any new encoder is a new file and registration revision. Next test: count how many of a probe board's discriminating tokens (in the certified or punished move cue but not both) are also produced by the 10 interfering lessons, for each existing encoder, training rows only, no graph.

## 2026-10-25 correction: input-first recommendation weakened by new evidence

Mistake (mine, analysis): I recommended the input-representation path because 21-27 of a board's cue cells are shared with other boards, without first checking the sign of that sharing or the size of passive recovery. Evidence: v1 interference is net helpful at cell level (52 harmful vs 63 helpful pushes), signed overlap correlates weakly with rank change (r 0.21-0.22), and the logged DAN factors imply an inactive synapse keeps 2e-4 of a lesson after 10 lessons at eta 0.5 and 0.25 at eta 0.1, while eta <= 0.05 does not flip the choice. Diagnosis (hypothesis): the registered rule and compartment pair cannot hold one-shot lessons over 10 others; input can only reduce the active-cell part. Literature: the modeled compartments are restrained short-term stores in the source model (Gkanias et al. 2022); fast compartments hold about one association (Aso and Rubin 2016). Probe v4 continues as agreed; next decision if it fails is the memory mechanism. Full list: [build weakness audit](../../reports/build-weakness-audit-2026-10-25/README.md).

## 2026-10-25 pivots: Gkanias LTM branch abandoned; alpha1 reward store registered (r10)

Researcher instruction 2026-10-25: "fix it, you decide exactly what to do", after the build weakness audit.

1. Tried: the source model's charging-to-LTM branch (pinned circuit.py lines 150-155: PAM-beta'2a potentiates KC->MBON-beta2beta'2a, PPL1-gamma2alpha'1 potentiates KC->MBON-alpha'1, w_c2m 0.3). Implemented as `incentive-ltm-memory.mjs` with tests (6/6 with ReversalMemory tests), then mapped on the real graph: MBON15 (alpha'1) has 0 KC input edges, MBON02 has 3 alpha'beta' KC edges (`research/reports/incentive-ltm-mapping-2026-10-25/mapping.json`). Diagnosis (measured): `.cache/full.npz` keeps only connections with >= 5 synapses (minimum edge weight 5; 2,700,513 edges), which removes most KC->MBON connections; MBON15 cells keep 6-14 input edges in total. Abandoned before any graph run; the module stays unchanged as evidence (its hash is in the mapping report). Building it would need a graph with weaker connections, which changes released topology and needs a researcher decision.
2. Pivot: the alpha1 compartment, which the graph wires fully (MBON07: 4 cells with about 640-690 inputs each, mostly alpha/beta KCs; PAM11: 8 per side) and which has primary support for the missing property: alpha1 memory resisted reduction by DAN activation alone, holds at least two associations and resists replacement (Aso and Rubin 2016); PAM-alpha1/MBON-alpha1 are required for appetitive long-term memory (Ichinose et al. 2015); short- and long-term reward DANs are distinct (Yamagata et al. 2015). Register entry 2026-10-25. Implementation: `alpha-one-memory.mjs` (restrained ReversalMemory unchanged + alpha1 depression without recovery), cue v4 (adds one alpha/beta KC per token), brain v4 (PAM11 with verified task-success pulses only; readout minus mean(MBON07)), factories v4, registration r10. Mapping: 2,550 alpha1 edges, 1,577 KCs, no overlap with restrained pools (`research/reports/alpha-one-mapping-2026-10-25/mapping.json`). Real-graph mechanics check (`research/reports/alpha-one-mapping-2026-10-25/mechanics-check.mjs`): task reward drives PAM11 factors -0.99 and changes 188 alpha1 edges (min gain 0.51); a non-task reward pulse reaches PAM11 only by network leak (factor -4e-5), so alpha1 changes by about 1e-5 there, not exactly zero.
3. Predeclared before any v5 result: retention probe v5 = probe v4 protocol on r10 (informative, eta 0.5/0.2/0.1/0.05/0.02, choose the largest eta with A correct after 10 other lessons in >= 3/4). If no eta passes, run a spaced probe v6 on the same 4 A boards: A taught three times, each followed by 5, 5 and then 10 other training-board lessons (20 distinct interfering boards), and the same 3/4 criterion after the final 10; this tests the long-term-memory claim under the repetition the sources require (spaced training for LTM), and a v6-only pass is reported as such, not as one-shot retention. If neither passes, stop and report.

Record-keeping slip (same minute): this entry and the handoff note were first written through a shell string in which backticks were command-substituted, blanking the file names above and executing the probe-v5 start command inside the handoff text; that command failed ("Unknown job: probe\"") and started nothing (no run directory or state file; process list checked). File names restored immediately; ledger L026.

## 2026-10-26 probe v4 (tag cue, r9) result: no eta passes

Probe v4 finished at about 00:24 (8,706 s, peak RSS 379 MiB): retained 0/4 at every eta; acquired 2/4 at eta 0.5 and 0.2, 1/4 at 0.1, 0/4 below. Ranks (scratch / after own lesson / after 10 others, of legal moves):

| board | v3 (cue v2) eta 0.5 | v4 (cue v3) eta 0.5 | v4 eta 0.2 |
|---|---|---|---|
| f0-pin-p0b | 2 / 1 / 2 of 21 | 7 / 1 / 9 | 7 / 1 / 7 |
| f3-blocked-p0a | 7 / 6 / 6 of 7 | 2 / 1 / 2 | 2 / 1 / 2 |
| f5-absent-p0a | 2 / 1 / 2 of 7 | 7 / 4 / 5 | 7 / 7 / 7 |
| f0-pin-p0a | 2 / 1 / 1 of 21 | 13 / 3 / 11 | 13 / 7 / 12 |

Reading: the tag cue changes which boards start near the top (f3-blocked-p0a, never acquired before, now starts 2nd and is acquired at eta 0.5-0.1) but makes the other three start far lower, so one lesson moves them less; whatever is acquired is still lost after 10 other lessons. This is the result the 2026-10-25 correction predicted: the input change alone does not fix retention. Result `runs/stage1-retention-probe-v4-tag-cue/result.json` (SHA-256 `9eb52a69...3f61`). Limit for the next step: r10 keeps the tag cue (cue v4 = cue v3 plus alpha/beta pool), so probe v5 is matched to v4 for the memory change and inherits v4's weaker starting ranks. Next: probe v5 (predeclared rule above).

Mistake (mine, documentation, found 2026-10-26 00:35): the `comparison` field of the probe v4 and v5 protocols was copied from probe v3 and says "action cues and initial memory are identical to revision 6". That is false for v4 (tag cue, revision 9) and v5 (cue v4, revision 10). Both protocols are pinned by their runs, so they are not edited. The claim did not affect the procedure: the A-board rule is re-applied to each probe's own scratch assessment, and v4 selected the same four A boards as v1-v3 (scratch correct 3/24 under cue v3 vs 4/24 under cue v2). The v5 A boards are checked when its scratch file is written. Correct reading: v4 and v5 share boards, interference order and etas with v1-v3, but their action cues differ from revision 6.

## 2026-10-26 probe v5 (alpha1 store, r10) result: no eta passes; spaced probe v6 runs per the predeclared rule

Probe v5 finished at about 02:01 (5,685 s, peak RSS 386 MiB; A boards equal v1-v4, scratch correct 3/24): retained 0/4 at every eta; acquired own lesson 3/4 at eta 0.5, 2/4 at 0.2, 0/4 below.

| board | v4 (no alpha1) eta 0.5: scratch / own / final | v5 (alpha1) eta 0.5 | v5 eta 0.2 |
|---|---|---|---|
| f0-pin-p0b (of 21) | 7 / 1 / 9 | 11 / 1 / 5 | 11 / 1 / 9 |
| f3-blocked-p0a (of 7) | 2 / 1 / 2 | 2 / 1 / 2 | 2 / 1 / 2 |
| f5-absent-p0a (of 7) | 7 / 4 / 5 | 7 / 3 / 4 | 7 / 5 / 5 |
| f0-pin-p0a (of 21) | 13 / 3 / 11 | 10 / 1 / 4 | 10 / 3 / 4 |

Reading: at eta 0.5 the alpha1 store keeps part of the lesson (final ranks 4-5 against scratch 10-11 on the two 21-move boards, where v4 fell back to 9-11), but not the top choice. Below eta 0.2 one lesson again does not move the choice. Result `runs/stage1-retention-probe-v5-alpha-one/result.json` (SHA-256 `583cd938...50fe`).

No-graph diagnostic (scratchpad script, not a repository artifact; cue v4 cell assignments from the pinned mappings, eta 0.5 probes): the alpha1 cells of A's certified move are hit by the interfering success lessons about as often as those of its alternatives (alternatives with more hits: 0/20, 2/20, 1/6, 0/6), so alpha1 cross-talk does not obviously explain the loss. Hypothesis (untested): one alpha1 depression (gain to about 0.5) is too small, alone, to keep the certified move on top once the restrained trace has recovered; repeated teaching would deepen it towards the 0.2 floor. That is what v6 tests. Also noted: the counterfactual pairs f0-pin-p0a / f0-pin-p0b share the same two candidate moves with opposite answers (h4g5 vs g7f7), and each is in the other's interfering set; since alpha1 has only depression on success, it can separate them only through context tokens.

Decision (predeclared 2026-10-25): v5 chose no eta, so spaced probe v6 runs (`stage1-retention-probe-v6-spaced-protocol.json`, ledger L030). If it also chooses no eta, task 1 stops and is reported.

## 2026-10-26 spaced probe v6 (alpha1, r10) result: no eta passes; the punished move returns

Probe v6 finished at about 05:24 (12,168 s, peak RSS 390 MiB; A boards equal v1-v5, scratch correct 3/24). A taught three times, gaps 5, 5, 10 other boards. Retained (unique top after the final 10) 1/4 at eta 0.5, 0.2 and 0.1, 0/4 at 0.05 and 0.02; correct at the end of the first and second gaps 0/4 at every eta. Ranks at eta 0.5 (after own lessons / at the end of each gap): f0-pin-p0b [1,1,1] / [9,2,2] of 21; f3-blocked-p0a [1,1,1] / [3,2,1] of 7 (retained); f5-absent-p0a [3,3,2] / [5,4,4] of 7; f0-pin-p0a [1,1,1] / [5,3,3] of 21. Repetition helps (final ranks 2, 1, 4, 3 against v5's one-shot 5, 2, 4, 4) but does not reach the 3/4 rule. Result `runs/stage1-retention-probe-v6-spaced/result.json` (SHA-256 `f3c87ed4...5b3c`).

Diagnostic (no graph; from the probe files): in every failed probe at eta 0.5 and 0.2 (6 of 6), A's final choice is a move that A's own failure lessons punished (f0-pin-p0a: g7d4; f0-pin-p0b: g7d4; f5-absent-p0a: g5f4). Reading (hypothesis, supported by the mechanism): the alpha1 store keeps only the reward side of a lesson; the punishment side lives only in the restrained PPL103 -> MBON12 compartment, whose DAN-driven recovery erases it, so the punished move climbs back above the certified move. f5-absent-p0a is in addition never acquired (rank 2-3 right after its own lessons).

## 2026-10-26 pivot: aversive alpha3 long-term store (r11) instead of the predeclared stop

Deviation (mine, recorded before any new run): the 2026-10-25 rule said "if neither [v5 nor v6] passes, stop and report". I am not stopping, because the researcher delegated the fix ("you decide exactly what to do") and v6 names one specific missing component that has direct primary support and is wired in the pinned graph. The stop rule is moved to the end of the next test (below). The researcher may veto this; r10, v5 and v6 stay as recorded.

Mechanism: add the PPL1-alpha3 -> MBON-alpha3 compartment as an aversive long-term store, the punishment counterpart of alpha1. Sources (register entry 2026-10-26): Aso and Rubin 2016 (PPL1-alpha3 alone, MB630B: one pairing gave barely detectable immediate memory; 10 trainings at 15-min intervals gave 1-day and 4-day memory; 1-day memory after spaced training was not significantly reduced by unpaired DAN activation; MB058B, alpha'2 plus alpha2, gave no 4-day memory, so alpha2 is not added); Wu et al. 2017 (protein synthesis in MBON-alpha3 during the first 12 h after spaced training is required for aversive LTM; MBON-alpha3 output is required for LTM retrieval). Graph (scratchpad read-only counts on `.cache/full.npz`): MBON14 (FBbt_00100238) 4 cells with 2,159 same-side alpha/beta KC input edges; PPL106 (FBbt_00110320) 2 cells, outputs 8 edges to MBON14 and 9 to alpha/beta KCs (PAM11 outputs 56 to MBON07); 72-83% of the MBON07 KC pool also feeds MBON14, so cue v4 drives alpha3 without an encoder change.

Implementation plan: new module (alpha1 plus alpha3 depression without DAN-alone recovery, restrained ReversalMemory unchanged), PPL106 co-stimulated only with verified task-failure pulses (as PAM11 with task-success pulses), readout + mean(MBON14) under the registered convention that MBONs of aversive-DAN compartments read as approach (as MBON12); new brain v5, factories v5, registration r11. Approximations, stated in advance: (1) the source's slow acquisition (one pairing barely detectable) is not modeled: alpha3 uses the shared eta and the alpha1 rule; (2) the resistance to DAN-alone reduction was measured after spaced training and a day of consolidation, while the model gives it from the first pairing; lesson counts are not biological time (AGENTS.md); (3) the MBON14 readout sign is the project's convention, not a measured MBON-alpha3 valence.

Predeclared before any r11 result: probe v7 = probe v6's spaced protocol on r11 (same A-board rule, gaps 5/5/10, interference boards and order, etas, 3/4 rule after the final 10). v7 is matched to v6 except for the alpha3 store. If v7 chooses an eta, journal it and run the acceptance smoke; if it chooses none, the memory path stops and is reported to the researcher, with no further mechanism.

Predeclared at 05:44, before any v7 result (fix goal 1d allows a predeclared 16-block smoke when 8 blocks are too few): a smoke block teaches two boards with two events each (smoke r6 receipts, `runs/lichess-stage1-synthetic-v1-smoke-r6/r1%3Ainformative/attempt-001/block-01/receipts.jsonl`: 4 event-start receipts on 2 panels), so 8 blocks give 16 board-lessons in total. v7 tests retention only after three spaced teachings, and acceptance needs at least 6 more of 24 training boards correct at the last checkpoint. Therefore, if v7 chooses an eta, the acceptance smoke is registration revision 12 = the r11 learner with the chosen eta, `maxBlocks` 16 and the early-stop window scaled with the block count (3 of 8 -> 6 of 16); all six arms; acceptance as in fix goal 1d, unchanged. The full run stays 32 blocks.

## 2026-10-27 probe v7 interrupted; literature pass and no-graph surrogate

What happened: probe v7 (launched 2026-10-26 05:40, L035) stopped after 4 of 20 lineages; last file 06:23:16; stdout ends at completedLineages 4, stderr empty, exitCode null; no result.json. The eta 0.5 lineage retained 3/4 (f5-absent-p0a not, rank 4/7, also never correct after its own lessons). Mistake: a 3.4 h probe was started with `fly start` from the agent session, although L018 had shown that the session's job object kills such processes and `fly detach` only wraps `fly babysit` (cause is a hypothesis, not verified). Ledger L037.

What was tried (no graph run, no pinned file changed): a direct-path linear surrogate of the r11 learner, validated on the recorded v7 pulses, plus mechanism, representation and control screens on training boards only; static readout and feedback measurements; a literature pass (five subagents, quotes not verbatim). Full numbers, scripts and sources: [report](../../reports/stage1-memory-literature-and-surrogate-2026-10-27/README.md).

Findings (diagnostic, partly hypothesis): v7 retention needs A's own lessons in the surrogate (no-own-lesson control 0/4); the r11 learner plateaus near 12/24 training boards under rotation and shows no held-out-family transfer (2/24 = scratch); a supervised perceptron on the same tokens reaches 10/24 held out, so D2 looks representation-limited; removing restrained recovery raises fit (18/24) but lowers probe retention (1/4), unresolved; 74/182 v7 Stockfish pulses oppose the verified outcome; MBON01 input is 13% plastic; MBON07 -> PAM11 is negative in the pinned graph (sign convention unverified).

Corrections: the never-acquired board finding for f3-blocked-p0a (answer.md Q6) holds only for revisions before r10; in v5-v7 the board is acquired. answer.md's claw threshold theta = 2 of 7 conflicts with Gruntman and Turner 2013 (more than half of the claws must be active).

Next (not started; needs decisions): verify the sign convention; surrogate test of a claw-threshold cue; relative Stockfish target from the existing cache; raw KC -> MBON01 counts; rerun probe v7 detached with a no-own-lesson arm and a second replica; register sources before any experimental use.

## 2026-10-27 step 1: representation ceiling (no graph run)

Researcher decisions the same day: representation first, and outcome-only teaching for Stage 1 encoder and memory work (decision log).

What was tried: a perfect-memory perceptron (supervised comparison baseline, never part of the Fly), alone and with all fact pairs. It was trained on 5 training families and tested on the 6th, for each of 6 allowed and 6 restricted move descriptions plus an oracle harness check. Training rows only. Full numbers: [report](../../reports/stage1-representation-ceiling-2026-10-27/README.md).

Result: every allowed description is at or below chance on held-out families. Twin pairs both right: 0-2.6 of 12 against a chance of 2.7. Their curves stay below chance up to 5 families. An attack map, which is restricted, reaches 18.6/24. Marking each attacker that stands on a clear line with its own king raises this to 20-21/24 (8-9/12 pairs), and its curve still rises at 5 families. The oracle gives 24/24.

Mistake (analysis): the earlier perceptron figure (10/24 held out, report 2026-10-27 surrogate) was presented to the researcher next to the D2 analogue without the chance level. 10/24 is chance (random capture 11.3/24), so under v4 the held-out score is chance, not partial transfer. A second limitation of board-level scores: with twin pairs, a learner that ignores the swapped piece gets one twin right, so board accuracy hides this. The twin-pair score is now reported.

Diagnosis (partly hypothesis): exact-offset facts rarely repeat across families (79% of deciding v4 facts are unseen in training), and an offset alone does not say whether a piece can reach the landing square.

Next: a researcher decision on an attack-map input (restricted), with or without the king-line mark, and on more training families. No graph run until decided.

## 2026-10-27 option A: attack-map cue, surrogate pivot and probe v8

Researcher decision: option A, with outcome-only teaching (decision log). What was tried, in order (details: [report](../../reports/stage1-attack-map-cue-2026-10-27/README.md)):

1. **First encoder draft** (move tag, task token, one KC per token per pool) on the r11 surrogate. It failed: 6-8/24 on held-out training families and 0/4 on the retention probe. Teaching only on errors did not rescue it (5-6/24).
2. **Diagnosis** (measured in the surrogate). Capacity was not the limit: an idealized learner working within the reachable gain ranges fits 24/24. The obstacle is the scratch weight of each cell. Its spread across cells is about 5 times the learnable range, so facts that are never or rarely taught keep a random push larger than anything learned.
3. **Pivot**: a coarse capture-or-quiet tag, so facts recur across families, and 20 KCs per token, so the scratch pushes average out. Over 5 random cell wirings this gives a mean of 19.6/24 held-out boards and 8.4/12 twin pairs, about the perfect-memory ceiling found in step 1. With 3 cells, results ranged from 10 to 21/24 depending on the wiring. The first promising result (21/24) came from the luckiest wiring.
4. **Read-only full-graph checks**: with gains learned in the surrogate, the full graph makes the same choice as the surrogate on all 24 boards, including held-out families (21/24, 9/12 pairs). Graph KC activity and DAN factors are within about 7% of the surrogate's assumptions.
5. **Launch**: registered r12 and launched probe v8 (outcome-only, otherwise the v7 protocol) detached. PID 5748 runs outside the session's job object.

Limits:
- One replica and one graph.
- The settings were chosen on the same training families the held-out numbers come from.
- The graph check did not run the graph's own lesson sequence.
- The attack map is restricted information given to the Fly.
- Probe v8 measures retention but cannot separate it from transfer (predeclared). Transfer evidence must come from a registered run with controls and validation families.

Next: read probe v8 when it finishes. If it chooses an eta, register the Stage 1 smoke for r12 with matched controls; the informative arm and D9 still wait on the relative Stockfish target. Decide on training families with the researcher.

## 2026-10-27 22:55 probe v8 result (plan P1)

Probe v8 (attack-map cue, r12, outcome-only) chose **eta 0.2** under its predeclared rule. Retained A boards (of 4) at eta 0.5/0.2/0.1/0.05/0.02: 2/3/3/3/3. This is the first retention probe to pass (v1-v7: at most 1/4 published, and v7 was unfinished). Ledger L045; summary table: [v1-v8 summary](2026-10-27-stage1-memory-probes-v1-v8-summary.md).

- The failing board f0-pin-p0a ties at the top. Its certified capture and a failing capture get identical attack-map tokens, so this is a measured limit of the cue for pins.
- At eta 0.02 the A boards are not learned from their own first lesson but are correct after lessons on other boards. That is within-training transfer, the predeclared reason this probe does not separate retention from transfer.
- Limits: one replica, four training boards, settings chosen on the same training families. Not a gate result. Next: plan P2 (reproducibility), then P4 with eta 0.2.

## 2026-10-27 23:45 smoke r13: early stop, diagnosis, stop S2 (plan P5-P6)

Smoke r13 (outcome-only, attack-map cue, eta 0.2) learned fast: the informative arm went from 0 to 20 of 24 training boards in two blocks, against 4 to 1 for the Stockfish-taught r6. It then flipped between 20 and 7 and was stopped by the registered early-stop rule at 20, below D1's 22. Diagnosis ([report](../../reports/stage1-smoke-r13-2026-10-27/README.md)):
- Collapses follow punishments of safe quiet moves. Those moves share the attack-map token `att:none` with safe captures (measured coincidence; mechanism hypothesis).
- 2 training boards tie by construction under the cue (pin limit), so D1 has zero margin.
- The surrogate does not reproduce the collapse size (open).

Mistake: one diagnosis command also read the validation rows (ledger L050). The result is unused. Stop S2: a cue v2 decision is needed (separate quiet and capture attack facts; true pin information; or a slower eta).
