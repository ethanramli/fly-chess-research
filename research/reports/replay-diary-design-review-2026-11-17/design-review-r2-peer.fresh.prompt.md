You are a new session continuing a review you began in another session (that session is not available). Below are (A) your round-1 instructions, (B) the round-1 review you wrote, and (C) your round-2 instructions. Act as the same reviewer, holding the same assigned assumption.

===== (A) YOUR ROUND-1 INSTRUCTIONS =====
ROLE: Peer reviewer. Question you own: could someone reproduce this design's tests and defend its wording?
ASSIGNED DECISION-CRITICAL ASSUMPTION: the three rules in section 2 (input, output, attribution) together with the write and read contracts in sections 4.1-4.8 are complete and auditable, so that no information beyond what the fly actually received reaches the fly's connections or any reported score; and every pass rule in section 7 is fully specified (unit, eligibility, denominator, unknown handling, horizon, seeds) so that two careful teams would compute the same verdict.
HOW TO CHALLENGE IT: trace the proposed write path against the actual code that renders boards through the eyes, delivers dopamine pulses and records lesson receipts (start from .codebase/src/chess-input, .codebase/scripts/neural-learning/probe-wide-learning-v3.mjs and three-board-feedback-v1.mjs, and the transfer protocol's checker landing-square-certificate.mjs). Look for any field, side channel or process path through which non-experienced information (certificate content, other moves' outcomes, validation or test boards, chess rules) could reach replay, the connections or a score. Check whether stage 1 can really copy the cubic-exit task (does that task have the items, phases and margins the design assumes, and can the arms be added?), whether "disjoint practice games per run" is feasible with the existing data, and whether every pass rule is computable as written. An observation that would overturn the assumption: a concrete leak path, or a pass rule that two careful teams could compute differently.

You are an independent strict reviewer. Review only: do not edit, create, delete or commit files, do not run experiments or graph simulations, and do not start subagents or other reviewers. Reading files and running read-only commands (grep, git log, small node/python scripts that only print) is allowed.

Repository: C:\Users\ethan\Documents\fly-chess-research (a research project: a Drosophila-connectome-constrained model that learns chess from verified feedback).

The researcher's goal, verbatim:
"Design a new memory system that the simulated fly can use to learn from experience and potentially support reasoning. Computational memory is allowed; biological realism is not mandatory.
The memory may help the fly remember. It must not supply the intelligence we later attribute to the fly.
1. Define what enters and leaves memory. Every stored item must come from the model's permitted experience. No hidden chess knowledge, future outcomes, test answers or privileged teacher information.
2. Keep remembering separate from solving. Storage and retrieval are allowed. The memory must not independently evaluate positions, recommend moves, perform chess search or supply prewritten concepts. Examine whether its encoding or retrieval quietly does any of those things.
3. Support continued learning. Specify capacity, interference, forgetting, correction and persistence. Test whether learning something new preserves useful earlier memories.
4. Make the scientific claim defensible. Document assumptions, justify design choices, and define tests before seeing results. Include memory-only and simpler-system controls that could reveal whether retrieval alone explains apparent reasoning.
5. Design before implementation. Compare plausible designs, challenge their hidden shortcuts, and recommend one with explicit failure conditions. Do not assume improving v8 is the answer."
The researcher's definition of reasoning: "being able to apply many unrelated concepts to solve an unfamiliar problem".

The proposal under review (revision 1, git blob 62c72ba462e156f15d4f2ddcd4cc13f51697fdfe):
  documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md
Context to read as needed:
  AGENTS.md (project rules: feedback quality gate, controls, disjoint families, plain-words writing)
  documentation/design/research-goals/memory-handoff-2026-11-07.md (Properties 1-4 and the v8 limits)
  documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md
  documentation/design/research-goals/restart-plan-2026-10-30.md (sections 2 and 4: reasoning definition, feedback rule)
  documentation/design/neural-learning/three-board-feedback-test-2026-11-14.md (current learner and teaching pathway)
  research/reports/engineered-memory-test-v8-2026-11-07/README.md
  research/reports/long-term-memory-v1-live-comparison-2026-11-01/README.md
  research/reports/memory-retention-continuation-2026-11-01/README.md and cubic-exit-spec.md
  research/reports/memory-interference-diagnosis-2026-11-01/next-mechanism-decision.md
  Code under .codebase/src (chess-input for the eyes, neural-learning, search-and-feedback) and .codebase/scripts.

Return markdown with:
1. VERDICT: APPROVE, APPROVE WITH REQUIRED CHANGES (building allowed after the changes), or REJECT.
2. The assumption you were assigned, and your disposition: confirmed for the tested scope, changed (state the revision), or open (state the next check).
3. Numbered findings, most severe first. Each: severity (required-BUILD = must change before building; required-LAUNCH = must change before any run; optional), the claim challenged, evidence (file:line or quoted text), consequence if true, and the smallest revision or check that would settle it. Mark anything you could not verify as a hypothesis.
4. The strongest sentence the design, if executed as written, could support.
Be concrete and brief. Do not pad. Do not repeat the proposal back.

===== (B) YOUR ROUND-1 REVIEW =====
**VERDICT: APPROVE WITH REQUIRED CHANGES.** Building is allowed after the required-BUILD findings are resolved.

**Assigned assumption:** the experience boundary is complete and auditable, and every pass rule determines one reproducible verdict. **Disposition: changed.** Revision 1 contains a concrete information path outside the visible experience and several rules that permit different implementations or verdicts.

Read-only review of the matching revision; no graph simulations or file changes.

1. **required-BUILD — Invisible board metadata can change replay.**  
   **Claim challenged:** only experienced information affects the connections. The [design stores full FEN and supersedes by exact board/move equality](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:61). The [renderer](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/chess-input/eyes-v1.mjs:82) does not display move counters. A graph-free check confirmed that identical positions with counters `0 1` and `17 9`, using `e2e3`, produce identical eye input. Nevertheless, section 4.5 treats them as different memories. Thus invisible counters determine whether an older lesson remains eligible, changing future teaching.  
   **Smallest revision:** use the experienced stimulus identity for supersession and overlap checks; keep reconstruction metadata unavailable to selection. Verify that changing invisible metadata cannot change the replay tape.

2. **required-BUILD — The existing teaching path does not provide the promised receipt contract.**  
   **Claim challenged:** stored lessons demonstrably came from the fly’s own choices. The [packet generator selects two safe and two unsafe moves using certificates](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-packet-v1.mjs:95); [the learner teaches those prescribed moves](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/three-board-feedback-v1.mjs:81). Its lesson records contain no original image hash or per-lesson unaided choice binding. Also, [the actual forward pass combines visual and dopamine stimulation](/C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/probe-wide-learning-v3.mjs:89), whereas section 4.2 describes a forward pass followed by pulse delivery. These are not automatically equivalent.  
   **Consequence:** reusing this route could reproduce teacher-selected practice or different neural dynamics while claiming the proposed contract.  
   **Smallest revision:** specify a separate choice/teacher/receipt boundary, exact stimulation timing, and an auditor that reconstructs the delivered input and update. An import ban alone cannot verify caller-supplied data.

3. **required-BUILD — Stage 1 cannot be copied “exactly” under the stated contracts and gates.**  
   The task does have four associations, delay and reversal. However, its [input path injects frozen, normalized Kenyon-cell codes](/C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs:74), and its [teaching current depends on the current prediction](/C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs:160). Neither matches the generic Eyes/pulse description without an explicit adapter. Persistence also needs traces and reservoir states, not merely connection strengths.  
   Its [original gates aggregate across six seeds](/C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs:224). The recovered retention gate passes at **0.7199**, while individual seed medians include **0.5941, 0.6832 and 0.4203**. “Original ratio” and “every run” therefore yield different verdicts.  
   **Smallest revision:** publish a stage-specific contract defining six seeds versus three runs, complete state, replay insertion points and per-item/per-seed formulas. Remove the stage-1 interpretation invoking an arm explicitly restricted to stage 2. Failed interleaved training must mean “this schedule failed,” not “no joint setting exists.”

4. **required-BUILD — The controls do not yet isolate their named explanations.**  
   In [section 7.2](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:162), “same replays before B” moves only replayed **A** entries; the diary can also replay **B** entries during B. Total teaching is therefore not fully matched. “Pulses permuted across entries once, at writing” supplies no executable causal permutation and conflicts with storing only the pulse that entry actually received. “Same online lessons” also needs reconciliation with each changing learner choosing its own moves.  
   **Smallest revision:** define exact control tapes and their provenance exceptions, matching exposure and timing explicitly. Specify the lookup distance, zero-distance/tie handling, feature seeds, and the simple learner’s update and selection rules. Otherwise weak or differently trained controls could determine the attribution claim.

5. **required-LAUNCH — Several scores and sampling rules remain noncomputable uniquely.**  
   [Section 7](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:147) leaves these consequential choices open: the denominator below the 5% unknown threshold; mixed known/unknown top ties; boards without safe captures; reservoir admission versus replay order; and seeds for choices, eviction, replay and shuffling. The reservoir chi-square check lacks a repeated-sampling scheme. For all-legal scoring, [the checker rejects king moves and distinguishes recapture status from the combined value answer](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/search-and-feedback/landing-square-certificate.mjs:13); those cases need explicit scoring rules.  
   **Feasibility remains open:** 1,200 training-pool games exist, but the old v8 practice set contains 750 positions from only 198 games. Neither establishes sufficient eligible, disjoint practice sets for this design.  
   **Smallest check:** freeze a metric specification with worked boundary cases and game manifests, including eligibility/rejection counts, horizons and all seeds, before launch.

**Strongest defensible positive sentence:** “For this implementation and these tasks, replay training improved retention of earlier learned rankings while allowing later learning, with the diary absent during scoring.”

===== (C) ROUND-2 INSTRUCTIONS =====
Lead's ledger for your round-1 findings (peer reviewer):
1. Invisible FEN counters changed supersession: fixed. The diary now stores the delivered input (Eyes v2 stimulation, or stage 1's injected code), not board text; supersession and all identity use the input hash; stage 0 check 3 tests that invisible details cannot change the replay tape (sections 4.1, 4.5, 7.1).
2. Teaching path and receipts: fixed. Section 4.1 defines a four-step lesson boundary (choice, teacher, delivery, receipt) with certificates only in an audit log the diary cannot open; delivery is one forward pass with input and pulse together, as probe-wide-learning-v3.mjs lines 89-91; the auditor recomputes the delivered input and update for every replay in development runs (stage 0 check 2). The certificate-selected path is used only for stage 2's declared teacher-chosen tape.
3. Stage 1 copy: fixed. Section 7.3 contract: adapter around run-eye-graph-memory-cubic.mjs, six seeds, injected normalized codes stored as the stimulus, prediction-scaled teaching recomputed at replay from the stored valence, complete state including the task's slow store, per-seed versions of marks R1-R4 (stricter than the medians, reported beside them), a stage 1 protocol file to freeze formulas and seeds before any run; the mixed-order arm is removed from stage 1.
4. Controls: fixed. Moved timing keeps every replay and moves only earlier-block entries' replays; event-level shuffle; stage 2 uses one fixed tape for all arms; exact case-recall and learner rules in 7.2.
5. Computability (LAUNCH): mostly fixed in 7.4 (unknowns, ties, king moves, ineligible boards, quiet moves), 4.4 (Algorithm R), 4.8 (seed streams), 7.1 check 5 (chi-square scheme). Game manifest with eligibility counts and worked boundary examples are listed as required before launch (section 11 item 5).

Round 2. Same rules as round 1: review only; do not edit, create, delete or commit files; do not start subagents or other reviewers; read-only commands are allowed.

The proposal is now revision 2, git blob 5e22be792b2f49cb69628c702863fdaacef25c84, at the same path:
  documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md
Revision 1 (the text you reviewed) is preserved at research/reports/replay-diary-design-review-2026-11-17/design-revision-1.md (blob 62c72ba4). Section 12 of revision 2 maps every round-1 finding from all three reviewers to its change. All required findings were adopted; none was declined. The lead's ledger for YOUR findings is below.

Check only:
(a) each of your round-1 findings: mark it RESOLVED, or STILL OPEN with the reason and evidence;
(b) new problems introduced by the changed text (sections 2, 4.1-4.9, 6, 7.2-7.5, 8, 11). Do not re-review unchanged text unless a change makes it wrong.

Return markdown:
1. VERDICT: APPROVE, APPROVE WITH REQUIRED CHANGES (building allowed after the changes), or REJECT.
2. One line per round-1 finding: number, RESOLVED or STILL OPEN, reason.
3. New findings only, most severe first: severity (required-BUILD, required-LAUNCH, optional), claim, evidence (file:line), consequence, smallest fix.
4. The strongest sentence the current revision, executed as written, could support.
Be brief.

Update before this round ran: earlier attempts stopped at usage limits on two accounts. Since then the lead has made further edits, all recorded in section 12 of the design and in research/reports/replay-diary-design-review-2026-11-17/lead-recheck-round2.md. Review revision 7, git blob 8d1fc4f2c5b8717d9ad325b06c9ba2a6a51bf991, at the same path. Earlier revisions are preserved in the review folder as design-revision-2.md to design-revision-6.md.
- Revision 3: four small fixes from the lead's own recheck (event-level shuffle within each block, unknown trials, sawtooth snapshots, named boards and tuning block).
- Revision 4: adds the section "The design on one page" (picture, module interface, data, practice loop, worked example, files to build). It should restate sections 4.1-4.8 without adding rules: check that it does, and that its interface really has no path from the diary to move scoring.
- Revision 5: six fixes from the lead's second read (stage 1 arms yoked to the diary arm's choices; supersession disclosure; moved-timing placement after the earlier block's snapshot; replay persistence; stage 3 diary across phases and filler trials; stage 2 arm count).
- Revision 6: the lead's solo deep-in-thought pass. The replay controls change only replays of old lessons (entries from earlier blocks), so through the first block each is in exactly the diary arm's state; stage 1's delay condition is "not worse", because raw records show delay losses happen with no lessons and so no replays; plus runtime, entry size, bootstrap seed, tie tolerance, disjoint development boards, early-stopped runs, a worked example, order limit.
- Revision 7: the scientific skeptic's round 2 (design-review-r2-skeptic.md in the review folder): a new "no old replays" arm (the diary arm with old-lesson replays skipped) is the reference for filler damage, the forgetting prerequisite and the benefit conditions; the all-legal measure keeps every eligible board in the denominator and comparisons must survive the worst case for the diary on unknown boards; the simple learners' learning-rate sweep is removed because a rate only rescales scores.
Check all of these edits too. Your verdict should be on revision 7 as a whole.
