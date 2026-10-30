# Curriculum reasoning handoff

**2026-10-28: read [the written goal](reasoning-research-goal-2026-10-28.md) first, then the newest update at the end of this file.** The section below (24 October) is history.

## Current state - 24 October 2026 13:10

- **Who works on what:** a second model (Codex) executes the [fix-goal prompt](fix-goal-prompt-2026-10-24.md) and appends to the [ledger](fix-goal-ledger-2026-10-24.md); this session reviews against the ledger and raw artifacts. Do not edit files the other model's live runs pin.
- **Babysit:** Stage 1 runs end to end (train, resume, replay audit, evaluator, gate, diagnosis). Builders: `build-lichess-stage1-registration-v1.mjs` / `build-lichess-campaign-v1.mjs --mode smoke|full --revision N`. No default campaign installed (`curriculum-campaign-full-r5-superseded.json` preserved); bare `fly babysit` reports not_registered. Stages 2-12 readiness-blocked.
- **Policy B** (researcher): no G0 dependency; Stage 1 D7 deferred to Stage 2. G0 intermediate checkpoints pruned (results/audits/receipts kept; [record](../../research/reports/g0-checkpoint-pruning-2026-10-24/README.md)).
- **Learning:** v1 input cancelled lessons (86% same-board overlap). Revision 6+ uses `public-action-relative-cue-v1`: lessons take effect, but ReversalMemory (eta 0.5) erases them; smoke r6 shows no taught advantage in lesson choices. Active blocker: memory retention, then transfer (D2). Existing relational encoders (v1-v3, bound-ray) must be evaluated before new ones.
- **Live at 13:10:** smoke r6 audit (`runs/lichess-stage1-synthetic-v1-smoke-r6`, log `runs/stage1-smoke-r6-babysit-1.log`), launched from the reviewing session; the other model waits for it.
- Diagnostics: [Stage 1 learnability scripts](../../research/reports/stage1-learnability-diagnostics-2026-10-24/README.md). Narrative: [Stage 1 journal](../../research/journal/experiments/2026-10-23-babysit-stage1-end-to-end.md).

The sections below (23 October onward) are history; their "current" and "next" lists are superseded by the state above.

## Current objective - 23 October 2026

Finish the complete unattended `fly babysit` curriculum: own moves, certified
consequences, separately controlled Stockfish assistance, endogenous memory,
rehearsal, recovery, independent advancement and unfamiliar compositional tests.
Do not work on G0 or restart stopped source scans. Software completion and actual
learning/transfer are separate requirements. Goal remains active and unfinished.

## Current evidence

- `fly status`: `not_registered`, 0/12 accepted; default campaign JSON absent.
- No production graph or Stockfish training launched in this continuation.
- Coupled feedback v1 software suite: 79/79, exit0; receipt
  `runs/python-actions/20261023T132459-bd73fef7/completion.json`.
- v1 then found scientifically misaligned: child-value error was delivered on a
  different root/action cue. Constant-cue fixtures masked it. Preserved sources:
  `research/source-archives/babysit-coupled-feedback-software-v3-2026-10-23`.
- Feedback contract v2 implemented in `coupled-stockfish-brain.mjs` and session:
  root/action task pulse; direct `action:null` child-state prediction and value
  pulse; root error converted to child-side perspective; matching six-mode
  exposure, two pulse slots and atomic frame recovery. Search state value is
  distinct from action priors. No calibration or biological validity established.
- Focused v2 checks: 8/8, 6478.7503 ms; fixture
  `runs/coupled-feedback-fixture-d7b0c019-c4eb-46a2-878f-e46c941ec234`.
- Broader v4 checks completed: 79/79, exit0, 123284.3376 ms; config
  `python actions/babysit-state-cue-feedback-checks-v4.json`; unified exec session
  93682, action directory `runs/python-actions/20261023T134210-be916566`.
  Completion is confirmed; raw stdout and completion.json preserved. Sources
  archived in `research/source-archives/babysit-state-cue-feedback-software-v4-2026-10-23`.

## Implemented building blocks

Stage 1/2 runtime and brain factories; shared checkpoint selection; task-outcome
shuffle; extra eight-block retention challenge; independent baseline/selected/post
retention observations; separate tested post-interference promotion artifacts;
next-stage memory loader uses tested post state rather than prechallenge state.
Earlier broader suites: 71/71 at
`runs/python-actions/20261023T123349-bdeeae22`; 45/45 at
`runs/python-actions/20261023T120555-c3c52b2f`. These are software fixtures only.

## Exact next work

1. v4 checks completed and archived. Source/archive/journal locations
   in [coupled feedback journal](../../research/journal/experiments/2026-10-23-babysit-coupled-feedback.md).
2. Matrix/CLI now implement a pinned completion phase before result.json:
   acquisition -> validation-only selection -> explicit eight-block retention
   delivery -> audit. Phase progress lives in matrix-state.json and survives
   resume into a new directory; failures stop with diagnosis. Stage 2 factory
   implements this training callback and no longer gives its evaluator a training
   callback. Independent selector/evaluator remains missing and preflight-gated.
   v5 software checks passed27/27, exit0, 86521.865 ms; action
   `runs/python-actions/20261023T134917-3f0d5223`; config
   `python actions/babysit-training-phases-checks-v5.json`.
   Sources archived under `research/source-archives/babysit-training-phases-software-v5-2026-10-23`. Journal:
   `research/journal/experiments/2026-10-23-babysit-training-phases.md`.
3. Stage 2 selector implemented in
   `.codebase/scripts/puzzle-learning/lichess-stage2-checkpoint-selector.mjs`:
   real bound panels, current16/earlier16/sentinels4, incoming mastery, earliest
   retained checkpoint, matched controls and sealed final. Focused3/3 pass.
   v6 passed13/13 (53324.4846 ms), archived before correcting status mapping.
   Missing candidates now yield unknown; measured shortfalls still gate-fail.
   v7 checks live: session67346, `runs/python-actions/20261023T135944-e00408d0`;
   do not edit pinned sources until terminal. Registered config:
   `python actions/babysit-stage2-checkpoint-selection-checks-v7.json`.
   Complete Stage 2 final evaluator (re-export selector) and repair Stage 1 evaluator: final `treatment`
   object lacks selectedChoices/lastChoices; D7 currently substitutes end-of-
   acquisition validation for interference and uses validation sentinels. This
   stub is invalid; do not claim readiness or weaken frozen retention gates.
4. Extend actual remaining stage task/verifier/runtime paths, eligible disjoint
   family data and complete campaign registration. Stages 3-12 remain missing.

## Runtime and discipline

Use `fly.cmd`, Python `%USERPROFILE%/.venv-class/Scripts/python.exe`; no bare Python.
Recurring execution uses registered Python actions; raw logs stay in action dirs.
Node tests need `--experimental-test-isolation=none --test-concurrency=1` here.
New work: <=2048 MiB RSS, >=256 MiB free; frozen limits stay fixed. Graph serial.
Preserve snapshots, source pins, gates, failures and final sealing. No new agents.
CIM listing was denied; ordinary Get-Process worked. v3 completion is authoritative;
unrelated node PID12268 observed, never killed/restarted. Do not infer live graph
state from a historical lock or stale PID. Record mistakes/pivots before moving on.

[Prior detailed handoff history](curriculum-reasoning-state-history-2026-10-23-before-state-cue-v2.md)
[Goal contract](curriculum-reasoning-goal.md) (latest scope correction supersedes G0-first history)

## 2026-10-23 late: Stage 1 end-to-end build (researcher delegated decisions)

Decisions, defects and mistakes: [journal](../../research/journal/experiments/2026-10-23-babysit-stage1-end-to-end.md).
- Data: synthetic <=6-piece FEN-rooted tasks from verified Lichess first-solution captures.
  Producer `.codebase/scripts/data/prepare-lichess-stage1-synthetic-families-v1.mjs`; auditor
  `audit-lichess-stage1-synthetic-families-v1.mjs`. Train/validation published in
  `research/data/lichess-stage1-synthetic-v1` (24 / 16 boards, balanced strata).
- Final chain: curator v2 (final split, seeded prefilter) -> `python actions/stage1_synthetic_data.py`
  (fetch v6, bind, produce final, audit). Final contents are never printed.
- Then: `build-lichess-stage1-registration-v1.mjs --mode smoke|full`, then
  `build-lichess-campaign-v1.mjs --mode smoke|full` (writes step config + campaign JSON).
- G0 receiver unpassed: training allowed, acceptance impossible; Stage 1 D7 explicitly unavailable.
- Next: smoke campaign via `fly babysit --curriculum "python actions/curriculum-campaign-smoke.json"`,
  test interruption/resume, then the full campaign with bare `fly babysit`.
- 2026-10-24 03:05: smoke revisions r1-r3 exposed runtime/evaluator defects (journal). Current
  smoke is r4 (`python actions/curriculum-campaign-smoke-r4.json`; each fix = new `--revision`).
  r4 was interrupted and resumed by the babysit into `runs/lichess-stage1-synthetic-v1-smoke-r4-resume-0001`
  (resumed block log carries the full receipt prefix).
- 2026-10-24 04:50: smoke r4 finished end to end: audit published (full replay true), campaign
  stopped `gate-failed` (D2, validation 0/16 at block 8; final sealed). Evaluator now adds
  diagnosis-only `trainingByBlock`. Full-r2 default campaign renamed `-full-r2-superseded.json`.
- 2026-10-24: memory handoff now finds a resumed predecessor's selected checkpoint (17/17 tests).
  Stage 2 deliberately not built: unreachable until Stage 1 can be accepted (receiver/G0 + D7 =
  researcher decision); it lacks lesson preparer, data, reviews, evaluator, registration.
- 2026-10-24 ~10:00: full-r5 PAUSED on purpose at r1:informative block 21 (receipts showed no
  learning of taught boards; resumable but superseded). Researcher adopted POLICY B (no G0
  dependency; Stage 1 D7 deferred to Stage 2) - see principles-curriculum addendum.
- Cause found: v1 cue gives same-board moves 86% identical input; success channel reaches ~1.6 cells.
  New `public-action-relative-cue-v1` (revision 6+ registrations; builder `--revision 6`).
- LIVE: smoke r6 via `fly babysit --curriculum "python actions/curriculum-campaign-smoke-r6.json"`
  (log `runs/stage1-smoke-r6-babysit-1.log`). Check taught-board learning with receipts
  (scratchpad `target-gap.mjs`/`training-choices.mjs` pattern) and the audit diagnosis.
- Earlier (superseded) full run, ~04:57: full run, revision 5, bare `fly babysit --interval 300` (background shell;
  log `runs/stage1-full-r5-babysit-1.log`; run `runs/lichess-stage1-synthetic-v1-full-r5`; step
  `python actions/lichess-stage1-synthetic-v1-full-r5-step.json`). 18 lineages x 32 blocks, ~2 days
  train + ~13 h audit. Do not edit any file pinned in that step file while it runs. If the shell
  dies, rerun the same bare `fly babysit` (it resumes into `...-full-r5-resume-NNNN`).

## 2026-10-24 fix goal: documented stop on task 1 (Claude Code, 18:55)

Goal: [fix-goal prompt](fix-goal-prompt-2026-10-24.md); every step is in the [ledger](fix-goal-ledger-2026-10-24.md) (L001-L013+). Smoke r6 audit: gate-failed D2, informative training boards 4 -> 1/24 vs controls 3-7/24 (`runs/lichess-stage1-synthetic-v1-smoke-r6/audit.json`).

**What was tried (task 1, training boards only, full graph, replica r1):** retention probe = from scratch, one lesson (failure then success event) on board A, then one lesson on each of 10 other training boards; A's certified-move rank after every lesson; 4 A boards (one per stratum, wrong at scratch) x eta 0.5/0.2/0.1/0.05/0.02. Three registered conditions, Python actions `python actions/stage1-retention-probe-v1-step.json`, `-v2-no-stockfish-step.json`, `-v3-mover-value-step.json`.

| eta | v1 with Stockfish | v2 no Stockfish phase | v3 mover-value cue (r7) | correct after own lesson |
|---|---|---|---|---|
| 0.5 | 0/4 | 1/4 | 1/4 | 3/4 |
| 0.2 | 0/4 | 1/4 | 0/4 | 3/4 |
| 0.1 | 0/4 | 1/4 | 0/4 | 3/4 |
| 0.05 / 0.02 | 0/4 | 0/4 | 0/4 | 0/4 |

Needed: >= 3/4 at some eta. None passes. The lesson takes effect at eta >= 0.1, then the punished scratch favourite returns within 1-3 other lessons (not later at smaller eta); below 0.1 one lesson no longer changes the choice. 21-27 of A's ~29 cue cells are also driven by the other boards' lessons (generic capture/mover/vector tokens 40/41 cells, relative-piece tokens 53/75). Literature check for the one allowed rule variant (slower dopamine-only recovery): not supported for immediate memory in the modeled compartments (Aso and Rubin 2016; Berry et al. 2012) - not implemented. Report: `research/reports/stage1-retention-probe-2026-10-24/README.md`.

**Built for reviewer finding 2 (kept, tested, not yet trained in a smoke):** `public-action-relative-cue-v2`, `CoupledStockfishBrainV3`, brain/runtime factory v2, registration `stage1-smoke-r7` (eta 0.5). Measured on these boards: the registered Stockfish target (W + D/2)/1000 is saturated for 289/390 training moves; on 12/24 boards every move is on one side of 0.5 (9 boards lost after every move); under the mover cue the Stockfish pulse opposed the verified task outcome in 207/440 events.

**Decisions needed from the researcher:**
1. Memory/representation (blocks tasks 1, 3, 4): (a) allow an input-representation change (task-3 class: conjunction tokens, or the existing relational/bound-ray encoders per the 13:10 reviewer addendum) before task 1 acceptance, judged by the same retention probe - my recommendation, because the measured failure is shared cue cells; (b) register a consolidation mechanism (needs a timing model; only spaced-training evidence exists); (c) switch to the G0 `RateTimingMemory` receiver; or (d) stop Stage 1 with this receiver.
2. Stockfish teaching and D9: with an absolute value target on decisive synthetic positions Stockfish cannot separate moves on half the boards, so D9 (+10/64 over outcome-only and shuffled) looks unreachable. Options: a relative target (move's expected score against the board's alternatives) as a new teaching contract; less decisive Stage 1 positions; or Stockfish for position value/search only with D9 deferred for Stage 1.
3. Board `s1syn-train-f3-blocked-p0a` is never acquired, even right after its own lesson (certified move stays 7/7): input or readout limit, unresolved.

**Next while waiting:** task 2 (babysit safety: early stop, cooperative pause, planner cap, detached launcher), allowed by the order rule because task 1 is recorded as failed. No training run without a decision.

### Update 19:35: task 2 complete; documented stop stands

- **Task 2 done** ([journal](../../research/journal/experiments/2026-10-24-babysit-safety-features.md), ledger L014-L020): registration revision 8 adds a registered informative-arm early stop and a rehearsal-planner cap; runner v2 pauses at block boundaries for `fly pause` / `fly pause --curriculum PATH`; `fly detach --curriculum PATH [--interval N]` starts the babysit outside the agent session (this session runs in a Windows job object; that is what killed full-r5). Verified on the real graph with `python actions/curriculum-campaign-smoke-r8.json`: detached start, deliberate pause after block 3, detached resume into `runs/lichess-stage1-synthetic-v1-smoke-r8-resume-0001`, early stop before block 6 (`gate-failed`, counts 4, 7, 2, 8, 4, 6, 6). Tests: Node 76/76 (relevant suites), Python 12/12 + 32/32 + 5/5.
- **How to run long jobs from now on:** build a revision >= 8 registration/campaign, then `fly detach --curriculum "python actions/curriculum-campaign-<id>.json"`; pause with `fly pause --curriculum ...`; resume with the same `fly detach` command. Logs: `runs/python-actions/detached/`.
- **Still stopped (task 1), decisions needed:** the three numbered decisions in the section above (memory/representation; Stockfish target for D9; never-acquired board). Tasks 3 and 4 need task 1 to pass; task 5 needs Stage 1 accepted. No experiment is running and none should start before those decisions.

## 2026-10-25 researcher decisions: fix goal resumed

The researcher chose (1a) an input-representation change before task 1 acceptance, judged by the registered retention probe on training boards (evaluate relational v1-v3 and bound-ray first, then a new versioned encoder if needed); (2) a relative Stockfish teaching target for D9 as a new registered condition; (3) no special handling for f3-blocked-p0a. Next: no-graph token-overlap comparison of encoders on training boards, then a retention probe with the best candidate. Progress in the [ledger](fix-goal-ledger-2026-10-24.md) from L023.

## 2026-10-25 memory fix: alpha1 reward store (r10)

Researcher delegated the fix. The Gkanias LTM branch is unbuildable on the >=5-synapse graph; the alpha1 store (r10) is registered and tested. Probes v4 (L027), v5 (L031) and spaced v6 (L033) ended 2026-10-26 with no eta passing; in v6 the punished move always came back. Pivot (deviation from the predeclared stop, under the researcher delegation): aversive alpha3 store, registration r11 (L034). Spaced probe v7 was started 05:40 (PID 18136, `runs/stage1-retention-probe-v7-spaced-alpha-three`, L035). **2026-10-27: found interrupted after its eta 0.5 lineage (4/20), no result.json; eta 0.5 retained 3/4 but the result is unpublished; probable cause: launched with `fly start`, not detached (L037).** 2026-10-27 diagnosis (surrogate and literature, no graph run): [report](../../research/reports/stage1-memory-literature-and-surrogate-2026-10-27/README.md), ledger L038. Open decisions: D2 data/feature path, Stockfish target for D9, whether the restrained store stays in the teaching path; next checks are listed in the report. If v7 chooses an eta: journal it, decide the smoke block count (8 or a predeclared 16), then run the acceptance smoke via `fly babysit`. If not: the memory path stops (documented stop B) and is reported, with no further mechanism. Ledger L035+.

## 2026-10-27 researcher decisions and step 1: representation ceiling (no graph)

Researcher decisions 2026-10-27 (decision log): representation first, meaning a no-graph test of whether any allowed input code supports held-out-family transfer before more memory work or graph runs; outcome-only teaching for Stage 1 encoder and memory work; a relative Stockfish target later as its own condition for D9 (frozen). Step 1 is done: [report](../../research/reports/stage1-representation-ceiling-2026-10-27/README.md), ledger L039. On held-out training families, a perfect-memory perceptron is at chance for every allowed description: v4, untagged and mover-tagged variants, relational-v3, bound-ray and rays score 0-2.6/12 twin pairs both right (chance 2.7), with or without fact pairs, and their curves stay below chance up to 5 families. An attack map (restricted) reaches 18.6/24, or 20-21/24 and 8-9/12 pairs when each attacker is marked as on a clear line with its own king. Its curve still rises at 5 families. **Decision needed from the researcher:** (a) allow an attack-map input, with or without the king-line mark, as an engineered perception feature, and whether to add training families; or (b) keep allowed inputs, in which case D2 transfer is not expected from any memory fix. No graph run until decided; the v7 rerun waits on this choice.

Update 2026-10-27: the researcher chose option A (attack map with the king-line mark). Outcome-only teaching; training families undecided. Work order: encoder `public-attack-map-cue-v1` with tests, surrogate check of the r11 learner with it (training rows only), then a registered graph probe launched detached. Ledger L040+.

Update 2026-10-27 18:45: option A is built.
- **Built:** encoder `public-attack-map-cue-v1` (capture-or-quiet tag, attack tokens, 20 KCs per token), factory v6 and registration r12.
- **Running:** probe v8, detached as PID 5748, not in any job. Run directory `runs/stage1-retention-probe-v8-attack-map`; launcher log `runs/python-actions/detached/probe-v8-20261027T114301-01eaf13a.log`. Check status with `fly --config "python actions/stage1-retention-probe-v8-attack-map-step.json" status`.
- **On recovery:** first check the PID and `result.json`. Do not restart because a wait expired.
- **After v8:**
  1. Re-run `screen.mjs`, `capacity.mjs` and `variants.mjs` in the attack-map report to confirm identical output; they now import the preserved draft encoder.
  2. Journal the v8 result.
  3. Register the r12 smoke with matched controls.
- **Still waiting:** the informative arm and D9 wait on the relative Stockfish target. Training families remain the researcher's decision.

Ledger L040.

Update 2026-10-27 19:20: the builder supports r12. Before an r12 smoke can be registered, the researcher must choose the Stockfish arm. In the measurement, the regret signal rewards 19 of 28 unsafe captures and the absolute target opposes 13 of 24 certified moves (ledger L042, options listed there). Probe v8 is still running.

Update 2026-10-27 19:45: Stockfish teaching set aside (researcher). From now on, follow [the Stage 1 outcome-only plan](stage1-outcome-only-plan-2026-10-27.md) and its Progress list. Ledger L043.

Update 2026-10-27 22:55: probe v8 finished, eta 0.2 chosen (L045). Plan P1 done; continuing with P2, P4, the mechanics check and P5.

Update 2026-10-27 23:00: P2 and P4 done; P5 r13 smoke launched detached (babysit 10196, train node 1508; run `runs/lichess-stage1-synthetic-v1-smoke-r13`; log `runs/python-actions/detached/babysit-20261027T155623-d71ca254.log`). On recovery, check these PIDs, the babysit log and `audit.json` before acting. Ledger L047-L049.

Update 2026-10-27 23:45: DOCUMENTED STOP S2 under the outcome-only plan. Smoke r13 was early-stopped (counts 0, 7, 20, 19, 7, 20). The diagnosis report is `research/reports/stage1-smoke-r13-2026-10-27/README.md`. Researcher decision needed on attack-map cue v2: (a) separate quiet and capture attack facts, (b) true pin information, (c) a slower eta, (d) a longer window, which is not recommended. No process is running. Ledger L050-L051.

Update 2026-10-28 14:40: S2 resolved by the researcher. Attack-map cue v2 = (a) quiet and capture attack facts in separate cells, plus (b) a true pin flag; eta stays 0.2 (no probe v9). The agent's [written goal](reasoning-research-goal-2026-10-28.md) now governs barriers: research, locate the weakest component, fix it, test it. No process is running. Next: encoder v2 with tests, then a surrogate screen on training rows, factories v8, registration r14, a read-only graph check, and smoke r14 launched detached. Ledger L052.
Update 2026-10-28 21:00: smoke r14 (cue v2) informative arm 8,18,24,23,24,24,22,24 on training boards; controls and audit running in runs/lichess-stage1-synthetic-v1-smoke-r14-resume-0001 (log runs/python-actions/detached/babysit-20261028T134212-fb420515.log). On recovery: check PID 12172 / the log, then audit.json. Ledger L053-L055.

Update 2026-10-28 23:55 - LIVE: full Stage 1 run full-r14 (3 replicas x 4 arms x 32 blocks, cue v2, eta 0.2, no early stop). Launcher 5888, training 15400; log runs/python-actions/detached/babysit-20261028T155147-3a9302bf.log; run runs/lichess-stage1-synthetic-v1-full-r14; campaign `python actions/curriculum-campaign-full-r14.json`. Smoke r14 validation-only audit: informative 15/16, controls 0/2/0 (ledger L061).
On recovery:
1. Check the PIDs, the log and `fly status --curriculum "python actions/curriculum-campaign-full-r14.json"`.
2. If dead with no audit.json, rerun `fly detach --curriculum "python actions/curriculum-campaign-full-r14.json"` (it resumes). Do not restart a live run.
3. When audit.json exists, report D1-D8 per gate. Say EUREKA only if the independent audit accepts every replica.
While it runs, only no-graph work: the eye route (input v3) is planned as a read-only graph check after this run, because graph work is serial.
