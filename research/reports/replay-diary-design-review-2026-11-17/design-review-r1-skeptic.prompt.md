ROLE: Scientific skeptic. Question you own: could a different mechanism produce the same results?
ASSIGNED DECISION-CRITICAL ASSUMPTION: the arms in section 7.2 (no diary, filler replay, same replays before B (yoked), shuffled-pulse diary, interleaved from start, learning off, lookup on the diary, simple learner with the diary) separate the main hypothesis (interleaved replay of the fly's own past lessons lets shared connections hold old and new lessons) from the rivals in section 6 (conflict, extra practice of anything, more practice of A at any time, re-exposure without the verdict, case recall, simpler learner), and none of these controls is biased for or against the diary.
HOW TO CHALLENGE IT: name a credible rival mechanism that every arm would pass, or a control that is unfair (for example: unequal reward and punishment balance after shuffling; the yoked control replaying entries when the fly's connections differ; filler pairings that themselves interfere; output-to-dopamine feedback during replay amplifying whatever the fly already prefers; the lookup bar using the best of three keys; the simple learner's update rule). For each, state what the main hypothesis and the rival predict and propose the smallest check where they differ. Also check whether stage 2's ideas A (legal recapture) and B (exchange value) can create interference at all under the transfer protocol's rejection rules, and whether the stated pass margins (32 of 48 pairs, above-chance retention 0.70, B learning at least 90% of the no-diary arm) can be met by a mechanism other than the one claimed. An observation that would overturn the assumption: a rival that passes every arm, or a control whose outcome is fixed by its construction.

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
