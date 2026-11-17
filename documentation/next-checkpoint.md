# Next checkpoint

This is the handoff for continuing the research: read the current checkpoint first, then consult its linked evidence. The latest checkpoint below is dated 2026-11-15 (later the same day). Everything after the “Background and dated history” heading is retained chronology; old “Next” instructions there are historical and superseded. Artifacts outrank this file: if a newer `runs/*/manifest.json` disagrees, this file is stale (see `AGENTS.md`, "Continuing the research").

**Last updated:** 2026-11-17. The latest addendum records progress for Volumes 2 and 3.

## Current checkpoint: 2026-11-15, later the same day

- **Volume 2, chapters 3 and 5.** The 2026-11-14 three-board test stays inconclusive (check 3 failed on all 72 quiet learning-off lessons), and its five other runs stay paused.
- **Pivot, protocol written before data:** [three-board test with the reading before feedback](design/neural-learning/three-board-reading-before-feedback-2026-11-15.md). Each lesson reads the Kenyon cells in a pass without the pulse, then takes only the learning signal from the pulsed pass. The scale stays 0.014047. Check 3 is revised, check 5 gains the rule name, and checks 6 and 7 are new. The verdicts and cutoffs are unchanged. [Journal item 40](../research/journal/experiments/2026-11-07-fly-connections-memory.md#40-2026-11-15-pivot-read-the-kenyon-cells-before-feedback).
- **Built and tested on made-up inputs only:** `probe-wide-learning-v4.mjs`, `apply-three-board-rules-v2.mjs`, the shared rules, the offline check and the output-cell count. 16 new focused tests pass. Nothing has run on the real graph.
- **Next step, needs the researcher's approval:** make the fixed-weight recording, a graph run, and run the offline check against the saved quiet learning-off run. If the check answers "not ruled out", the six runs need a second approval. Commands are on the protocol page.
- Unchanged: the 2026-11-09 decision about the post-gate evidence is still open. Properties 1–3 remain unmet. The sealed test games remain unused.

## Addendum 2026-11-16: Volume 3 design proposal (no run, direction unchanged)

- **Volume 3, chapters 2, 4, 5 and 6.** A [roadmap](design/research-goals/combination-roadmap-2026-11-16.md) proposes replacing the combination test's twin pairs with flip pairs and building concept records with one match step. It is design only: its [checks](../research/reports/combination-roadmap-2026-11-16/README.md) use hand-built and program-built boards, no graph and no sealed games.
- **Needs the researcher's decision** before any build. If adopted, the first build is Milestone 1 on that page, which needs no graph run. The current checkpoint above is unchanged.

## Addendum 2026-11-16: Volume 3 benchmark built

- **Volume 3, chapters 4 and 5.** The researcher authorized the first benchmark build. The [flip-pair benchmark](../research/reports/combination-roadmap-2026-11-16/README.md#first-benchmark-build) compares a hand-written rule given correct reach, pin and material facts with shortcut rules on constructed positions.
- **Next Volume 3 step:** build the marked-squares view and separate lessons, then check whether the learned reach and pin facts hold on unfamiliar board families.

## Addendum 2026-11-17: All three stores work on open puzzles

- **Volume 3, chapters 4 and 5.** The [continuation report](../research/reports/combination-roadmap-2026-11-16/continuation-2026-11-17.md) records the graph pin probe (329/648), the three separate lessons, and the open-puzzle replay. The stores solved 60/60 in each run after covering all reach input shapes. A fixed sum of the same learned facts solved 0/60.
- **Before the locked test:** settle whether a repeated memory key counts as a repeat when the board is new. Record which controls the learner must beat and put the perfect legal-reply reference in the scoring checks. Keep the locked puzzles sealed while that decision is open.
- **Volume 2, chapters 3 and 5.** Approval for the runs was received. The safe-capture run is blocked by missing pinned calibration files and the quiet learning-off record. The graph and annotation hashes matched.

## Previous checkpoint: 2026-11-15

- **Volume 2, chapters 3 and 5.** The three-board feedback test is inconclusive: the quiet circuit's learning-off run failed required check 3 on all 72 lessons. During pulses, the cap at 0.014047 kept as little as 22.35% of a lesson's activity difference, below the 99% required. This is the researcher's report; the raw files are on the graph machine. **The other five runs are paused.** See [journal item 37](../research/journal/experiments/2026-11-07-fly-connections-memory.md#37-2026-11-15-check-3-failed-in-the-quiet-learning-off-run).
- **Built and tested on synthetic inputs:** the [pulse scale check](design/neural-learning/pulse-scale-check-2026-11-15.md). The recorder captures every legal move with no pulse, a reward pulse and a punishment pulse, with weights fixed. The offline report requires the full learning-off run for an exact match and shows how replacing just the pulsed cell readings changes the replayed gains. All 10 focused tests pass. [Independent review and fixes](../research/journal/experiments/2026-11-07-fly-connections-memory.md#39-2026-11-15-independent-review-of-the-pulse-scale-report).
- **Next step (superseded later the same day by the pivot above), needed the researcher's approval:** run the recorder and the report on the graph machine (commands on the design page). Then the researcher chooses a scale or a different fix, written as a dated protocol revision, before rerunning the six runs. The cutoffs stay unchanged.
- Unchanged: the 2026-11-09 decision about the post-gate evidence is still open. Properties 1–3 remain unmet. The sealed test games remain unused.

## Previous checkpoint: 2026-11-14

- **Volume 2, chapters 3 and 5.** A three-board feedback test is built and checked; its run awaits approval. It compares the current circuit with a quiet, rescaled circuit: zero drive, with Kenyon-cell activity read as `min(1, rate / 0.014047)`. It runs correct, swapped-label and learning-off conditions, with fresh memory per board. [Protocol](design/neural-learning/three-board-feedback-test-2026-11-14.md).
- **Newest run: the calibration replay.** It is complete, made no learner updates, and used no sealed games. Its manifest is dated 2026-11-14 12:04–12:05 UTC, and its local output is `runs/recreated-kc-calibration-2026-11-14` on the replay machine. It regenerated the item-25 cell readings. In the [check](../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md), the scale 0.014047 caps one cell on two moves in total, across two boards (corrected from "one move per board"). The worst move pair keeps 99.0003%. Codex reports rerunning the exact 6,046-connection weighting on the graph machine: at least 99% kept, and all three boards clear the starting-gap cutoff in both circuits.
- **Corrections recorded** in [journal item 33](../research/journal/experiments/2026-11-07-fly-connections-memory.md#33-2026-11-14-three-board-feedback-test-protocol-and-corrections-found):
  - item 26 swapped its drive labels
  - items 30–31 carried learned changes across boards
  - item 31's dopamine summary mixed rewards and punishments
- **Built 2026-11-14, not run:** `probe-wide-learning-v3.mjs`, the shared rules in `three-board-feedback-v1.mjs`, the rules script `apply-three-board-rules-v1.mjs`, and its focused tests. The decision rules now give one answer; the cutoff numbers are unchanged ([journal item 35](../research/journal/experiments/2026-11-07-fly-connections-memory.md#35-2026-11-14-three-board-feedback-test-built-rules-made-single-answer)). After Codex's review, values exactly on a cutoff are judged as written, and lesson records are checked against the board packet; 24 focused tests pass ([journal item 36](../research/journal/experiments/2026-11-07-fly-connections-memory.md#36-2026-11-14-two-bugs-in-the-tests-rules-code-fixed-after-codexs-review)).
- **Next step (superseded 2026-11-15), needed the researcher's approval:** run the six circuit-and-condition runs on the graph machine, serially (about two hours) or, with explicit approval, in parallel (about 20 minutes). Then apply the rules script. The commands are in the [protocol](design/neural-learning/three-board-feedback-test-2026-11-14.md#how-to-run-it-after-approval).
- **The 2026-11-09 decision is still open:** request independent review of the post-gate evidence, or close it as bounded development results. The proposal recommends closing it; the test does not depend on that evidence. No run should begin before the researcher decides. Properties 1–3 remain unmet. No full revision-4 run is recorded, and the sealed test games remain unused.

## Previous checkpoint: 2026-11-09

- **Volume 2, chapters 3 and 5.** The revision-4 predeclared single-shot capacity gate on the widened 6,046-gain mask failed: one of three boards had an exact win. A later sequential exact search found safe-capture settings on all three (3/3), but it was chosen after the gate failure and has not had independent review. It does not change the predeclared 1/3 failure. The earlier 2,096-gain result is only a linear-surrogate bound; exact-network capacity for that mask remains unresolved. The reward-only and valence probes still left the safe capture below the best other move on all three boards; the reward-only probe included an absent arm, while the valence probe was one arm with baseline scores only, and neither was independently audited. See the [stop report](../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md) and [dated journal](../research/journal/experiments/2026-11-07-fly-connections-memory.md).
- **No full revision-4 learning run is recorded.** The latest manifested run is the completed development dry run, which did not pass. The sealed test games remain unused. Properties 1–3 remain unmet; no reasoning result follows from these probes.
- **Decision awaiting the researcher:** choose whether to request independent review of the post-gate evidence or close these as bounded development results. No full revision-4 learning run is recorded; no transfer result exists, and no further run should begin before this decision.
- The dry-run step is spent and now paused. The exact as-run registration is preserved at `runs/fly-connections-memory-2026-11-08/fly-connections-memory-v1-dryrun/registration-as-run.json` (local run artifact; not tracked); its hash matches the dry-run manifest. Do not reuse the same run directory.

## Background and dated history (not current instructions)

The dated notes use the Python action paths recorded at the time. The [archive](../archive/README.md#retired-python-actions) links to the original tree for replay.

The notes below preserve earlier project state and action plans for provenance. Their dated “Next” items are not current directions; use only the current checkpoint above for the present handoff.

**Addendum 2026-11-05 11:55:** a missing control found: a random-capture rule scores 250.1 on the v6 test, above the interrupted full arm (130.9); see [journal](../research/journal/experiments/2026-11-05-memory-v4-v5.md). Report it beside the v6 result; do not change the v6 gate.

**Addendum 2026-11-05 11:23:** next step 1 done. v6 relaunched into `runs/engineered-memory-test-2026-11-05/engineered-memory-test-v6-r2` (pid 5728, started 04:22:39Z, 4 workers, manifest `running`). Steps 2 to 4 still open. Step 3 (full v5 audit) is queued in this session to start when pid 5728 exits (log `runs/engineered-memory-test-2026-11-05/audit-v5-full-r2.log`); not run alongside v6 because v6 workers abort below 1024 MiB free RAM (`memory-v6-worker.mjs:51`) and only about 3.1 GB was free.

**Addendum 2026-11-05 18:20:** v6-r2 died at 7/24 jobs with the session (see journal item 7). **v6-r3 runs detached** (PID 12540; `runs/engineered-memory-test-2026-11-05/engineered-memory-test-v6-r3`), expected about 22:30-23:00. Memory v7 (capture-only choice) is built, tested and registered paused (`python actions/engineered-memory-test-v7-step.json`); after v6-r3 ends, run its dry run (`engineered-memory-test-v7-dryrun-step.json`), audit the dry run, then launch v7 **detached** (as v6-r3). Then the v6 and v5 full audits. Long runs must always be launched detached.

## Goal

Complete the five-volume series **Can a Fly Play Chess?** Every piece of work supplies evidence for a named chapter. Chapters and their required content: [writings workspace](../research/literature/writings/README.md). Questions and evidence boundaries: [series plan](design/research-goals/five-volume-series.md).

**Active goal (2026-11-04 night):** [memory goal](design/research-goals/memory-goal-2026-11-04.md), memory only, Volume 2.

## Earlier checkpoint: 2026-11-05

- **2026-11-05 06:35, memory v6 stopped for a laptop shutdown at 6 of 24 jobs (interrupted, not evidence).** Seed 6101 partial (573 new positions): none 23.4, shuffled 19.2, eighth 86.9, quarter 83.0, half 98.2, full 130.9. Full beats none by +107.5, shuffled by +111.7 and quarter by +47.9 (bars 27, 27, >0); the bounds and the other two seeds are not computed. `runs/engineered-memory-test-2026-11-05/engineered-memory-test-v6/reconciled.json` records the stop; its manifest still says `running` (fatal stop).
- **2026-11-05, memory v5: does not pass; first learning by the fly's code.** Key K3 (position-centred KC); beats no memory in every seed on 150 fresh positions; full − quarter not established. [Report](../research/reports/engineered-memory-test-v5-2026-11-05/README.md). Its full independent audit was stopped unfinished at the shutdown (the dry-run audit passed 10/10).
- **2026-11-05, memory v4: does not pass; audited 8/8.** [Report](../research/reports/engineered-memory-test-v4-2026-11-05/README.md).

## Historical next steps (superseded 2026-11-09)

1. **Relaunch v6** into the fresh folder (about 4 h; the design is deterministic, so seed 6101 should reproduce exactly):
   `python actions/engineered-memory-test-v6-step.json`: set `"paused": false`, then `.fly.cmd --config "python actions/engineered-memory-test-v6-step.json" start engineered-v6`.
2. After it ends: `node --max-old-space-size=256 .codebase/scripts/neural-learning/audit-engineered-memory-test-v6.mjs --run runs/engineered-memory-test-2026-11-05/engineered-memory-test-v6-r2 --config "python actions/engineered-memory-test-v6-step.json" --workers 3`, then write the v6 report.
3. Rerun the full v5 audit: `node --max-old-space-size=256 .codebase/scripts/neural-learning/audit-engineered-memory-test-v5.mjs --run runs/engineered-memory-test-2026-11-05/engineered-memory-test-v5 --config "python actions/engineered-memory-test-v5-step.json" --workers 3` (start audits after the run is launched; the launcher's serial guard counts audits as experiment processes).
4. If v6 passes, the [memory goal](design/research-goals/memory-goal-2026-11-04.md) is met for Volume 2 (fly code plus a disclosed engineered memory). If not, diagnose from its curve and bounds.

- **Serves:** Volume 2, chapters To Learn and Evidence for Learning.

## Evidence map

What each volume still needs before it can be written. Update a row when evidence lands.

| Volume | Evidence still needed | Evidence so far |
|---|---|---|
| 1 Methodology | Provenance of the 64 GB estimate (not reproducible: one dense float32 matrix is 72.048 GB, [calculation](../research/literature/writings/01-methodology/04-memory-estimate-calculation.md)); the run behind "about 250 MB" (measured so far: v4 dry run 279 MiB with exact command, memory v2 330 MiB, v3 1,058 MiB; different workloads); confirmed acknowledgements | Design history and failures in the [archive](../archive/early-development/README.md); dated pivots in the [decision log](../research/project/decision_log.md); run manifests and reports |
| 2 The Classroom | A controlled learning result through olfactory input and verified puzzle feedback, with matched controls and retention | Engineering only: [engineered exact-cue memory](../research/reports/engineered-episodic-memory-2026-11-01/README.md) and its [one-seed live pilot](../research/reports/long-term-memory-v1-live-comparison-2026-11-01/README.md); failures: [memory test v1](../research/reports/memory-test-2026-11-03/README.md), [memory test v2 and pathway trace](../research/reports/engineered-memory-test-v2-2026-11-03/README.md); [seeing test](../research/reports/seeing-test-2026-11-03/README.md) (one piece pair) |
| 3 Reasoning | Transfer to unfamiliar combinations and counterfactuals, with memory and search aids, against matched lookup-only and no-memory controls | No reasoning result. Enabling work: [transfer protocol](design/research-goals/transfer-and-combination-protocol-2026-11-03.md), the engineered memory and live pilot (Volume 2 row), 572 practice positions in `runs/restart-data-2026-11-03/capture-choice-positions-v1/` |
| 4 The Limits of Biology | Measured memory overwrite by neuron; a formal proof bounded to the raw connectome model | [Memory interference diagnosis](../research/journal/experiments/2026-11-01-memory-interference-causal-diagnosis.md); [interference limits analysis](../research/reports/interference-limits-2026-11-02/README.md); v2 pathway trace (48-fold signal loss eyes to Kenyon cells) |
| 5 Chess | The core-concept curriculum (number not yet known); a style analysis for the Capablanca aim; a calibrated Elo method; pinned public checkpoints | [Elo calibration design](design/evaluation-and-performance/elo-calibration.md); puzzle and feedback designs; an untrained one-ply browser player (not the learned fly) |

## Addendum 2026-11-06 07:55

- v6-r3 **failed** at the 5-h wall guard with 21/24 jobs (journal item 10). The fix (12-h wall in the v6 and v7 runners; `--resume-from` in the v6 runner) was reviewed by Codex: LAUNCH OK (`research/reports/mistake-diagnosis-2026-11-04/peer-review-v6-resume-r1.md`).
- v7 dry run r1 was **interrupted** by a session exit (journal item 11).
- Running now, detached, in one chain: v7 dry run r2 → its audit → v6-r4. Logs: `runs/python-actions/detached/chain-v7dry2-v6r4-20261106T0750/`.
- Next: when the dry-run audit passes, launch the full v7 run detached (registration `engineered-memory-test-v7-step.json`, unpause it) after v6-r4 ends; then the v6 audit and report (disclose the resume), the v5 full audit, and the v7 audit and report.

## Addendum 2026-11-06 13:30

- **v6 passes its frozen gate** in all three seeds (v6-r4, resumed from r3; audit pending). Report: `research/reports/engineered-memory-test-v6-2026-11-06/README.md`. Limit: far below the random-capture rule (250.1), so not safe-capture judgement.
- **v7 full run running** since 13:18 (detached, PID 15916, about 5 h). Then the v7 → v6 → v5 audits run automatically (`runs/python-actions/detached/audits-after-v7-20261106T1325/`).
- Next: read the v7 verdict, write the v7 report against the memory goal, check the audit logs, and update the v6 report with its audit result.

## Addendum 2026-11-06 21:55

- v7 launch 1 was killed by a Windows shutdown at 15:00 (12/24 jobs). v7-r2 resumes it (Codex LAUNCH OK), running detached since 21:50, PID 9816; then the v7-r2, v6-r4 and v5 audits run in the same chain: `runs/python-actions/detached/v7r2-and-audits-20261106T2150/`.
- Do not shut down, restart, sleep or log off the laptop while it runs (about 3-4 h for v7-r2, then the audits).

## Addendum 2026-11-07 01:40

- v6 passes its frozen gate (audit pending); v7 does not pass (2/3 seeds; audit running). Reports in `research/reports/engineered-memory-test-v6-2026-11-06/` and `-v7-2026-11-06/`.
- Memory v8 (practise on every known capture of the 750 practice positions; test games 901-1200): proposal rev 2 approved with changes; code review round 2 LAUNCH OK. Registrations `python actions/engineered-memory-test-v8-step.json` and `-dryrun-step.json`.
- Queued detached (`runs/python-actions/detached/v8-chain-20261107T0135/`): after the v7 audit (PID 1520): v8 dry run → its audit → full v8 (only if the audit passes) → v6-r4 audit → v5 audit.
- Next: check the v7 audit, the v8 dry-run audit and the v8 verdict; write the v8 report against the memory goal.

## Addendum 2026-11-07 05:05

- v7 audit PASS (does not pass confirmed). **v8 passes** its frozen gate in all seeds (report `research/reports/engineered-memory-test-v8-2026-11-07/`). The v8 dry-run audit passed 10/10.
- Running detached since 05:00:52: `runs/python-actions/detached/v8audit-first-20261107T0510/`: v8 full audit → v6-r4 audit → v5 audit (journal items 23-24).
- Next: read `runs/engineered-memory-test-2026-11-07/engineered-memory-test-v8/audit.json`. If PASS and pinned, the written memory goal is met by v8: update the reports and tell the researcher. Keep the laptop on mains power, awake, not shut down.

## Addendum 2026-11-07 06:15

- **v8 audit PASS, pinned** (10/10). **The written memory goal is met by v8.** Volume 2, chapters 3 and 5.
- Still running detached: `runs/python-actions/detached/v8audit-first-20261107T0510/`: v6-r4 audit (started 06:13) → v5 audit. Next session: read their `audit.json` files and update the v6 report.
- Next research step needs the researcher's choice (no launch without approval): confirmatory replication, a better fly key, all-legal choice, or a move to another chapter.

## Addendum 2026-11-07 (handoff)

- **Read first:** [memory handoff](design/research-goals/memory-handoff-2026-11-07.md). v8 meets the old goal, not the claims. The requirement is now P1-P4 there.
- Last checkpoint: v8 audit PASS; claim gap documented ([discussion](../research/journal/discussions/2026-11-07-memory-claim-gap.md)).
- Next step (**needs researcher approval**): design the P2 chess test with the fly's own connections (learn A, learn B, test A, all legal moves; floor, shuffled, v8 ceiling). Then strict Codex review before any build.
- Still running detached: v6-r4 audit, then the v5 audit (`runs/python-actions/detached/v8audit-first-20261107T0510/`); records only.

## Addendum 2026-11-07: P1-P3 goal authorized

- **Volume 2, chapters 3 and 5.** The researcher has now authorized design, review, build, dry runs, full runs and audits serving P1-P3, with full CPU. This supersedes the approval wait immediately above. [Complete goal prompt](design/research-goals/memory-goal-prompt-2026-11-07.md); [working journal](../research/journal/experiments/2026-11-07-fly-connections-memory.md).
- Authoritative live-process inspection finds no graph run or memory audit. Newest accessible run manifest: engineered-memory v8, complete. V8's old gate pass is not P1-P3 evidence. V6-r4 has a published audit; v5 has no audit publication and its old chain is no longer live. Earlier running statements are stale.
- **Next:** source-check a stabilising mechanism from the 2026-11-01 decision, write the proposal and gates, obtain strict Codex review before building. Existing APL geometry/prototype work permits a declared approximate condition, not a claim of exact anatomy or a proven storage repair. No new learner run is registered or launched yet.
- Required P1-P3 outcome: fly synapses/DAN pathway, A-to-B retention >=0.70 with B acquisition/capacity/overwrites, and unseen-game all-legal improvement over learning-off and shuffled feedback in every seed, with an independent pinned audit. P4 remains outside this goal.

## Addendum 2026-11-07 12:55: first P1-P3 design rejected

- **SOURCE NO-GO**, strict Codex high-effort review, exit 0: [review and work report](../research/reports/fly-connections-memory-v1-2026-11-07/README.md). The first draft's cross-trial dopamine subtraction is extra-circuit; no numerical pass under that draft would establish P1. No new learner was built or launched.
- Source correction: Gkanias's gamma4 discharging circuit names PAM07, whereas the draft used PAM08. The pinned ontology distinguishes them. APL locality also needs an inhibition-strength-matched control; P2 pressure/correction, seed roles and exact runtime need revision.
- New source evidence: [Huang author-code applicability](../research/reports/fly-connections-memory-v1-2026-11-07/huang-source-applicability.md). Four exact files are acquired and pinned. The supplement is still unread; the source's effective negative weights and last-training switch cannot silently enter the primary fly model.
- **Next:** source-match a locally available teaching variable and revise the proposal before strict review round 2. No additional researcher permission is required within the authorized goal. Do not build the rejected draft. P1-P3 remains unmet; the source list is not exhausted merely by an inaccessible PDF.

## Addendum 2026-11-07: revision 2 under strict review

- [Revision 2](design/neural-learning/fly-connections-memory-v1-revision-2-2026-11-07.md) removes cross-trial subtraction and the omission gate; uses actual local KC/PAM07 rates with endogenous activity retained. Adds a strength-matched APL control, effective-write pressure, acquired-choice retention, explicit experimental reversal probes, real seeded tape variation and exact workload accounting. No new learner code or graph run.
- [Static source/root check](../research/reports/fly-connections-memory-v1-2026-11-07/source-evidence/pam07-source-check.json): 18 PAM07 roots retained; graph/annotation/ontology hashes freshly match their pins. Receptor dynamics and complete plastic masks are not established by this check.
- **Current wait:** strict review round 2, same Codex reviewer thread `01a1b486-dc1c-7322-be53-f1fd765416fe`, high effort, read-only. Logs and final result target in `research/reports/fly-connections-memory-v1-2026-11-07/design-review-r2.*`. The first SOURCE NO-GO remains authoritative until a later explicit allowance. Next: read the final verdict; build only if allowed, otherwise resolve/record its actual source/design gaps. Do not restart a live review because observation elapsed.

## Addendum 2026-11-07: BUILD ALLOWED, implementation wave 1

- Strict high-effort review round 2 completed, exit 0: [BUILD ALLOWED](../research/reports/fly-connections-memory-v1-2026-11-07/design-review-r2.md). No further source/design amendment is required before building revision 2. No experiment launch clearance yet; no P1-P3 result.
- Two small **Haiku xhigh** CLI tasks are in progress: local APL module/fixtures (`build-apl-*`, tool handle 75053) and PAM07 mapping/actual-endpoint extraction/fixtures (`build-teaching-*`, handle 7326). Prompts/results/logs in `research/reports/fly-connections-memory-v1-2026-11-07/`. File tools only, no graph launch or shared frozen-source edits. Check actual handles before restarting anything.
- **Next:** inspect generated files and run synthetic fixtures; finish compiler, task/tape/metrics, runner/persistence and independent auditor using scoped Haiku tasks. Then code review, detached informative/control dry run plus audit, and fully registered sealed confirmation plus audit. Complete source/data/mask hashes and exact pass/resource budgets remain prelaunch gates. One partial module or fixture pass cannot complete the goal.

## Addendum 2026-11-08: session start

- Old audits recorded: **v6-r4 audit PASS** (pinned, 8/8); **v5 audit interrupted**, not rerun (addenda in both reports).
- Fly-connections build: wave-1 modules pass 50/50 Node and 14/14 Python fixtures after a metrics fixture fix (journal item 11). Wave 2 (packet/tape, condition core) is being built by Haiku agents.
- Next: review wave 2, then build runner/persistence, independent auditor, baselines and the production APL package; strict code review; detached dry run plus audit; full run plus audit. P1-P3 still unmet; no run launched.

## Addendum 2026-11-08 20:40: fly-connections dry run running

- Code review r1: LAUNCH OK WITH REQUIRED CHANGES; all four BUILD items fixed (own-baseline gate P2.2b; off arm ranks at every checkpoint; mapping independently checked: PASS, 2,096 mask synapses, 18 PAM07; auditor's own bootstrap and wider replay). 135/135 tests. Journal items 13-14.
- **Dry run running detached** since 20:09:31: `runs/python-actions/detached/flyconn-dryrun-20261108T2009/` (runner PID 14840; registration `python actions/fly-connections-memory-v1-dryrun-step.json`, 51 pins; run dir `runs/fly-connections-memory-2026-11-08/fly-connections-memory-v1-dryrun`). The chain runs the independent audit after it. Dry run = plumbing and cost only (games 301-900), not evidence.
- Measured so far: about 0.46 s per pass with 6 parallel workers, so the full run as designed would take about 17 h. Next: read the dry-run audit, set full-run budgets (and any declared cuts) from its measurements, close the LAUNCH items, code review round 2, then the full run detached. Keep the laptop on mains power and awake.

## Addendum 2026-11-09 00:25: STOP for researcher decision

- **Volume 2, chapters 3 and 5.** Dry run complete (`runs/fly-connections-memory-2026-11-08/fly-connections-memory-v1-dryrun`, manifest `complete`, verdict "does not pass"; development data, not evidence). Its audit was still running at 00:21 (chain `runs/python-actions/detached/flyconn-dryrun-20261108T2009/`): read `audit.json` there next.
- Mechanism finding: the model's gamma KC code is dense and nearly uniform, so the source rule shifts all moves together. Codex diagnosis: STOP FOR RESEARCHER DECISION ([diagnosis](../research/reports/fly-connections-memory-v1-2026-11-07/diagnosis-r1.md)).
- **Needs approval:** choose (a) run the full test as registered (about 96 CPU-hours, about 16-20 h wall) for a confirmed negative result on this model, or (b) a new source-bounded redesign (KC sparsening calibrated before data, or visual gamma-d KCs), with new proposal and review. Either way, first split gate P2.2 by group (red criterion) and implement or drop the B-end test rankings consistently.
- Full registration not yet written; `python actions/fly-connections-memory-v1-dryrun-step.json` is spent (paused: false; do not rerun into the same directory).

## Addendum 2026-11-09 01:30: STOPPED, decision needed

- Dry-run audit: 9/10 PASS; pins FAIL only from my post-registration edits (journal item 19).
- Diagnostics (journal item 18): dense KC code comes from the trainer's uniform 0.01 drive; zero drive gives a sparse code but KC rates about 1,000 times too low for the rule; eye gain does not help.
- **STOPPED** under the goal's stop clause. [Stop report](../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md). **Needs approval:** authorize one disclosed engineering calibration (zero tonic drive plus a KC activity scale fixed from development activity), or record the negative result, or run the full test as registered.
- 2026-11-09 02:00: after the hook's ruling I continued with two more diagnostics (journal items 21-22): a KC-scale probe (all moves move together) and an oracle-gains construction (no gain setting found that makes a safe capture top; greedy, not a proof). Stop report updated. Still stopped for the researcher's decision; the strongest next step is the Volume 4 multi-rival bound.
- 2026-11-09 03:00: multi-rival oracle bound (journal item 24): at zero drive no gain setting of the 2,096 mask synapses makes a safe capture top on 2 of 3 dev boards (linear certificate, checked exactly). P1-P3 cannot be met by this mask with whole-board Eyes v2 input on those boards. Still stopped for the researcher's decision (stop report updated).
- 2026-11-09 05:00: revision 4 (widened source mask) passed design review with required changes, then **failed its predeclared exact capacity gate (1 of 3 boards)**; full build not started (journal items 26-28). Stopped; decision needed (stop report).

## Addendum 2026-11-09: post-gate capacity and valence probes

- After the single-shot gate failed, a sequential exact search found safe-capture settings on all three development boards (journal item 29). This does not change the predeclared gate result; the search method was selected after seeing the failure, and no independent review has assessed it.
- The reward-only probe (item 30) included an absent arm; the safe capture remained below its best rival. The valence probe (item 31) used one arm with baseline scores and six teaching passes; the top moves stayed unchanged and the safe-capture margin remained negative on all three boards. Neither probe had an independent audit.
- No full revision-4 learning run is recorded. The prior calibration question is superseded by these default-drive probes; the researcher decision in the [stop report](../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md) remains the next step.

## Addendum 2026-11-09: scope of the earlier capacity bound

- The 03:00 note above overstates journal item 24. Its negative dual bound applies to the linear surrogate for 2,096 KC-to-MBON05 gains; exact checks of tested settings lose, but the measured 2–15% fit error is not a global bound. This does not establish that all settings on the exact network lose.
- Journal item 29 uses a different, widened 6,046-gain mask and reports exact existence witnesses after the predeclared single-shot gate failed. The two mask results are not contradictory. The post-gate search remains unaudited, the predeclared gate remains failed, and no full run is authorized by these results. See the [stop-report correction](../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#correction-2026-11-09-capacity-mask-scope).

## Addendum 2026-11-09: separate eye-memory run status

The recovered eye-memory continuation is complete across seeds 4101–4106 (24 arm records), but its full independent audit is absent. The original parent manifest remains `running` for the interrupted first invocation; no matching process was live at inspection. The completed recovery manifest and its partial-run scope are described in the [memory-retention report](../research/reports/memory-retention-continuation-2026-11-01/README.md#status-correction-2026-11-09-recovered-six-seed-run). This is separate from the fly-connections stop above. No new run was launched.
