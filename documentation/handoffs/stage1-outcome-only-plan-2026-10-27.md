# Stage 1 outcome-only plan (attack-map cue), 2026-10-27

Goal prompt to use: **"Follow documentation/handoffs/stage1-outcome-only-plan-2026-10-27.md rigorously, step by step, until its finish line or a stop condition."**

After any context reset, read this file, then the Progress list at the end, then the newest ledger entries in `documentation/handoffs/fix-goal-ledger-2026-10-24.md`, then check live processes before acting.

## Decisions in force (researcher, 2026-10-27; decision log)

1. **Representation:** option A. The Fly gets the attack-map cue (`public-attack-map-cue-v1`, registration r12+). It is engineered input, and every claim must say so.
2. **Teaching:** outcome-only. Stockfish teaching is set aside as a failed experiment ([journal](../../research/journal/experiments/2026-10-27-stockfish-teaching-set-aside.md)).
3. **Gates:** Stage 1 is judged on the original frozen D1-D8 (`curriculum-stage-acceptance.mjs`; D7 deferred to Stage 2 under policy B), with no threshold changed. D9 tests Stockfish assistance and does not apply while Stockfish is excluded.
4. **Not decided; do not act on them:** extra training families, any change to the cue's facts, reintroducing Stockfish.

## Standing rules (AGENTS.md has the full set)

- **Records.** For every change or run, write a ledger entry (L043 onward) giving time, files, command, pass counts, run directory, hashes, key numbers with artifact paths, and open issues. Record every mistake and pivot in the journal and decision log, and keep current status and `curriculum-reasoning-state.md` in step. Never edit earlier entries; correct them with addenda.
- **Code.** New behaviour goes in new versioned files; never edit a file pinned by an existing run. Run the touched test suites after every code change. No commits unless the researcher asks.
- **Graph runs.** Run them one at a time. Use `node --max-old-space-size=256 --cpu-duty 0.5`, stay at or under 2048 MiB RSS and keep at least 256 MiB free. Launch long jobs detached (`fly detach --curriculum ...`, or `curriculum.launch_detached` for a single step file) and confirm the process is not in a job object. Never restart a job just because a wait expired.
- **Data.** Training rows only for diagnosis and selection. Validation is used only by the registered audit or checkpoint selection, and final families stay sealed until selection is frozen.
- **Reporting.** Give the researcher short plain-language updates at each milestone.

## Steps

**P1. Finish probe v8.** It is running detached (PID 5748; `runs/stage1-retention-probe-v8-attack-map`) and a background watcher waits for `result.json`.
- Done when `result.json` is read and journaled, and the ledger, status and handoff are updated.
- Rule (predeclared): if `chosenEta` is null, the memory path stops. Report to the researcher (stop condition S1). Otherwise carry the chosen eta into P4.
- If the process dies without a result: record it, read stderr and the logs, and find the cause. Relaunch into a new directory (`...-v8b`) only for an external cause such as a killed session.

**P2. Reproducibility check** (after P1; graph runs one at a time). Re-run `screen.mjs`, `capacity.mjs` and `variants.mjs` (the three `variants.mjs` invocations recorded in L040) from `research/reports/stage1-attack-map-cue-2026-10-27/`, then compare with the saved `*-results.jsonl`.
- Done when they match, or any difference is recorded and explained.
- Also add a ledger addendum: L042's time should read about 19:05, not 19:20.

**P3. Build the Stockfish-free Stage 1 path** (engineering; new versioned files only). Requirements:
- the treatment arm gets verified task pulses only;
- controls are absent, disabled and shuffled, at matched exposure and timing, with scratch as block 0;
- no Stockfish signal is delivered (amended 20:50: the pinned review cache is still read, because the three-frame session binds every event to its panel review, as the outcome-only arm always did; no engine signal changes memory; ledger L044);
- gates come from the frozen D1-D8 module, with D9 reported as "not applicable (Stockfish set aside 2026-10-27)";
- early stop and the rehearsal planner work as in r11.

Expected pieces: a matrix runner v3 (condition set and protocol name), runtime factory v7 (accepts the outcome-only protocol), an acceptance evaluator variant (treatment is the registered schedule condition; D1-D8 only), and builder support. Reuse existing code wherever it already works.
- Done when unit tests cover condition selection, gate evaluation without D9, and rejection of Stockfish conditions, and the touched suites pass.
- Before P5, run a real-graph mechanics check of factory v7 (one informative event: task pulse delivered, third frame with no channel). It runs after P1 because graph work is serial.

**P4. Register r13 smoke.** r12 with the P1 eta, the P3 protocol and conditions, 1 replica and 8 blocks, as an engineering smoke. Write the smoke protocol (copied from the r11 smoke protocol, with the question, teaching, controls and gate text updated) and build the step and campaign with `build-lichess-campaign-v1.mjs`.
- Done when `plan` shows every pin verified.

**P5. Run the smoke.** Launch detached (`fly detach --curriculum "python actions/curriculum-campaign-smoke-r13.json"`), confirm the process is not in a job object, record PIDs and logs, and start a background watcher.
- Done when the audit is written, or the run stops with a recorded reason.

**P6. Read the smoke audit.** Report D1-D8 per gate with numbers, plus training curves and control comparisons.
- If every gate except deferred D7 passes in the replica, go to P7.
- If the run is early-stopped or any gate fails, diagnose using the run's own records and no-graph training-row tools, and write a report. Engineering bugs may be fixed under a new revision and the smoke rerun once. Anything that needs a mechanism, cue, data or gate change is stop S2.

**P7. Register and run full Stage 1.** The same protocol at full scale: 3 replicas and 32 blocks, as in the full-r5 registration. Register r13 full and launch detached, with the time estimate taken from the smoke's measured pace. Then read the independent audit.
- If it accepts Stage 1 (D1-D8 with D7 deferred, every replica), say "EUREKA EUREKA" per AGENTS.md and report.
- If not, diagnose as in P6 and stop (S2).

## Finish line

P7's audit is read, journaled and reported (accepted or not), or a stop condition is reached and documented.

## Stop conditions (document, report in plain language, then wait for the researcher)

- **S1:** probe v8 chooses no eta.
- **S2:** the next step would need a change to the cue's facts, the memory mechanism, the gates, the data splits or training families, or would reintroduce Stockfish.
- **S3:** the same failure (a resource guard or a crash) happens twice, or a pinned file of a completed run has a defect.
- **S4:** the researcher asks to stop or changes direction.

## Progress (update as steps finish)

- [x] P0 decisions recorded, Stockfish write-up, this plan (2026-10-27, ledger L043)
- [x] P1 probe v8 result: eta 0.2 chosen (L045)
- [x] P2 reproducibility check and L042 time addendum (L046, L047: all five outputs identical)
- [x] P3 Stockfish-free path with tests (L044; 285/285 suite; the graph mechanics check is still pending)
- [x] P4 r13 smoke registered (L048; mechanics check passed; plan 39/39 pins)
- [x] P5 smoke run: early-stopped gate-failed at 23:11, training counts 0, 7, 20, 19, 7, 20 (L050)
- [x] P6 smoke diagnosed: no defect; cue-level causes; **STOP S2** (L051; report research/reports/stage1-smoke-r13-2026-10-27/README.md)
- [ ] P7 full Stage 1

## Addendum 2026-10-28: S2 resolved, written goal

The researcher chose attack-map cue v2 ((a) separate quiet and capture attack facts, plus (b) a true pin flag), with eta kept at 0.2 (no probe v9). Stop rule S2 is superseded by the [written goal](reasoning-research-goal-2026-10-28.md): at a barrier the agent researches, locates the weakest component and fixes it within that file's limits, instead of only waiting. Steps P4-P6 repeat for revision 14 (cue v2), then P7. Ledger L052.

- [x] P4' cue v2, factories v8, r14 smoke registered (L053)
- [x] P5' smoke r14 run (resumed after a system crash; L054-L058)
- [x] P6' smoke r14 read: validation-only audit, informative 15/16 vs controls 0/2/0 (L061)
- [ ] P7 full Stage 1: full-r14 launched 2026-10-28 23:55 (L061)
