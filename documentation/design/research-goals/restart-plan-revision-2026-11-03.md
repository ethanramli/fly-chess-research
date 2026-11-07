# Restart plan revision, 2026-11-03: fixes for the peer-review problems

**Status: researcher-directed revision, 2026-11-03.** The researcher asked for every confirmed problem in the [peer review of 2026-11-02](../../../research/reports/overnight-peer-review-2026-11-02/ranked-problems.md) to be fixed, with the needed design decisions made and written down. This file records those decisions for the [restart plan](restart-plan-2026-10-30.md). It does not rewrite the plan. The plan text before this revision is in git commit `82af13f`.

What does not change:

1. The research question: can a simulated fly reason, meaning apply many unrelated ideas to solve an unfamiliar problem?
2. Every frozen number in the plan: the eye-test counts (section 7), the Phase A pass rules (section 9) and the reserved "EUREKA EUREKA" rule.
3. All earlier results, frozen code and frozen protocols. They keep their original meaning.

No training, brain-model run or sealed-data access is part of this revision.

Problems 2 and 3 (the result checker and the safety checks before training starts) were code defects. Their fixes are in the [fix report](../../../research/reports/overnight-peer-review-2026-11-02/fixes-2026-11-03.md). Problem 8 has its own protocol: [transfer and combination tests](transfer-and-combination-protocol-2026-11-03.md).

## Words used here

- **Eye input:** the list of currents sent to the fly's simulated light-sensing cells (photoreceptors) for one board and one proposed move.
- **Twin pair:** two boards where the same move has opposite correct answers. A pair is correct when the fly scores the move higher on the board where it is safe.
- **Stored memory:** every value that lasts between moves: connection strengths (called gains), activity traces, slow states, clocks, pending feedback receipts and any separate answer file.
- **Fingerprint:** a SHA256 code (a short value that changes if any input byte changes) computed over the complete stored memory.

## Problem 1: identical eye input for different correct answers

**Decision: all new tests use Eyes v2.** [Eyes v2](../chess-input/eyes-v2.md) is Eyes v1 plus a dim picture (brightness 0.25) of the piece removed by a capture, drawn on the square it was removed from. For en passant that is the passed pawn's square, not the landing square. Eyes v1 stays frozen for the earlier runs that used it.

Why this is enough for the safe-capture task: the correct answer depends only on (a) whether the move captured and (b) whether the opponent can then legally capture the moved piece on its landing square. A move that does not capture is always "not a safe capture". Fact (b) depends only on the board after the move, because the opponent's legal replies depend on that board and on rights that a capture cannot create (en passant needs a two-square pawn advance, and castling never captures). Eyes v2 shows the board after the move and now shows whether a piece was captured. So two moves with different correct answers cannot have the same Eyes v2 input in this task.

**Required check before any task set is used.** For every training, development and locked set, run `inputCollisions` from [eyes-v2.mjs](../../../.codebase/src/chess-input/eyes-v2.mjs) over every board, proposed move and certified answer. It must find zero groups with identical input and different answers. Items that collide are removed when the set is generated, before it is sealed, and the removed count is reported. If more than 5% of items collide [choice], stop and review the input design. For the locked set, the generator runs the check and prints only counts, so nobody reads the set.

Eyes v2 still does not show castling rights, en-passant rights or move history. A later task whose answer depends on them must pass the same collision check; if it fails, that task needs a new input version, not a silent change.

## Problem 4: memory changed between two move scores

**Decision: every future move chooser scores all proposed moves from one unchanged stored memory.** Learning updates happen only after the choice, while feedback for the chosen move is delivered.

1. Use `frozenScores` from [transfer-evaluation-v1.mjs](../../../.codebase/src/neural-learning/transfer-evaluation-v1.mjs). It checks the fingerprint after every score and scores the moves again in reversed order. Any memory change or any score that depends on move order stops the run with an error.
2. The fingerprint covers the complete stored memory, as section 4A point 3 of the plan already requires. A fingerprint of gains alone is not enough.
3. The independent audit repeats the reversed-order check from the saved records.
4. The completed small pilot of 2026-11-01 keeps its results, but its choices during practice are labeled "scored while memory changed". Its read-only tests did keep memory unchanged and are not affected.

The future chooser itself does not exist yet. This decision binds it when it is written.

## Problem 5: the eye test used an unreachable strength, and the move score was incomplete

The plan's section 7 sets connection strengths to 0.2 or 1.8. Every inspected learning rule keeps strengths at or below 1 ([check](../../../research/reports/overnight-memory-plasticity-2026-10-31/pre-data-corrections.md)). The 2026-11-01 decision log says not to swap 1.8 for 1.0 silently. So section 7 stays as written and is recorded as **blocked: it cannot be run as written**. A new, separately numbered test replaces it for future use.

**Decision: Eye test v2.** It uses the proposal already written in the [prospective eLife protocol](elife-prospective-protocol-2026-11-02.md) (option A there), now adopted with these exact rules:

1. Same as section 7: 48 new twin pairs from 48 unrelated training-pool games; the same decoder, a standard linear classifier (L2 logistic regression, C = 1, standardized inputs, whole games left out); the same Graph, Raw eyes and Tokens comparisons; and the same count rules (Tokens below 44/48 is a pipeline fault; Graph at least 36/48 and at least Raw eyes + 6 to pass; Raw eyes at least 36/48 is a shortcut stop; Graph at most 30/48 is a stop). Input is Eyes v2.
2. **Reachable strengths only.** For each visual Kenyon cell (KC, the memory cells that receive the eye signal), take its decoder weight w from the training folds only. Strength setting "plus": gain 1.0 when w > 0 and 0.2 when w < 0. Setting "minus": the reverse. Cells with w = 0 keep gain 1.0. The gains are applied only to the listed KC-to-output connections of the five observed output-cell types (MBON05, MBON27, MBON09, MBON07, MBON06), in a diagnostic copy. Stored memory is restored and its fingerprint checked after every setting.
3. **Exact strength measure.** For a held-out twin pair p and output type t, let A be the mean final activity of that type's cells. D(p, t) = [A(safe, plus) − A(unsafe, plus)] − [A(safe, minus) − A(unsafe, minus)]. The pair's strength is the square root of the sum of D(p, t)² over the five types. M is the mean of pair strengths within each game, then the mean over games. No approach or avoid label is assigned to any type, because their behavioral signs are not established.
4. **Gate:** M(Graph) at least 0.10 × M(Tokens), the same 10% as section 7. M(Tokens) of zero or an invalid value is a failed measurement, not a pass.
5. **Meaning:** this is a sensitivity measure under reachable strengths with decoder-chosen directions (the decoder saw the checker's answers). It is not learning and it does not show that the fly's own updates reach these settings. All five type differences are reported separately.

**Decision: the move score for training (section 4A) is now complete except one evidence switch.**

1. score(move) = sum over the five types, in the fixed order MBON05, MBON27, MBON09, MBON07, MBON06, of c(type) × mean final activity of that type.
2. c(MBON05) = −1, because MBON05 is the only observed type with inspected avoidance evidence ([neuron-reader evidence table](../neural-learning/neuron-reader.md)). The other four are 0. MBON05 is switched on only if the separately approved memory test (section 4A point 2) shows that informative feedback moves MBON05-based margins in both directions against the absent, shuffled and plasticity-off controls. If it does not, no chooser exists and training does not start. No coefficient is fitted to answers.
3. Choice: all legal moves in sorted move-text order (UCI, the usual from-square to-square notation); choice probability proportional to exp(score / T). T = 0.1 × the standard deviation of the MBON05 mean activity over all Eye test v2 boards with memory unchanged. This uses no answers and is fixed in the run record before any choice data. The random generator is `mulberry32` with a seed made by combining the run seed and the trial number bit by bit (exclusive-or), as in the 2026-11-01 pilot.
4. Every move is scored with `frozenScores`. A missing or non-finite value stops the trial with an error; no move is chosen and no feedback is given.
5. **Implemented.** The score is computed by the existing `scoreNeurons` in [neuron-reader.mjs](../../../.codebase/src/neural-learning/neuron-reader.mjs) with the coefficient contract [move-score-contract-v1.json](../../../.codebase/src/neural-learning/move-score-contract-v1.json). The choice over all legal moves, the temperature rule and the seed rule are `chooseMove` and `choiceTemperature` in [move-chooser-v1.mjs](../../../.codebase/src/neural-learning/move-chooser-v1.mjs). The contract's review status is "awaiting-memory-compatibility", so `scoreNeurons` refuses it until the memory test's record is added. That refusal is the evidence switch in point 2.

**What still blocks this:** whether MBON05 can be switched on needs the memory test on the brain model, which this revision may not run. That is the only open part.

## Problem 6: the en-passant test group could not occur

The plan's section 8 lists "en passant recapture". After the fly's capture, the opponent cannot capture en passant, because en passant is allowed only right after a two-square pawn advance, and that advance is never a capture.

**Decision: replace the group with "the fly captures en passant; the opponent may then recapture the capturing pawn with an ordinary capture".** This follows the earlier written proposal ([pre-data corrections](../../../research/reports/overnight-memory-plasticity-2026-10-31/pre-data-corrections.md), where it was named F03).

1. The count stays: 30 new-kind pairs over five new kinds, 6 pairs each.
2. The safe-capture checker is unchanged. It checks replies that land on the capturing pawn's landing square, which is the right square for this group. A new test, [en-passant-capture-group.test.mjs](../../../.codebase/tests/search-and-feedback/en-passant-capture-group.test.mjs), builds both twins from real moves and shows that no reply to a capture is ever en passant in 266 sampled captures.
3. Eyes v2 shows the removed pawn on its real square.
4. Each example must come from real game history: the two-square advance must be the actual previous move in the source game. A board typed in with an en-passant square is rejected. If six valid pairs cannot be found, stop and ask the researcher before sealing; do not change the count or the group.

## Problem 7: the separate answer file gives exact matches only

The separate answer file (episodic consequence memory) answers only when a new eye input exactly matches a stored one. It cannot show learning that carries over to a new board.

**Decisions:**

1. The answer file is not part of the fly in any transfer or combination claim. Those tests score with brain memory only.
2. The answer file is kept as a comparison system, the **exact-recall store**. On a new board it has no answer, so it scores at chance.
3. Before scoring, `exactRepeats` must find zero test inputs identical to a training input. Any repeat is removed from transfer scores and counted.
4. **Where learning must come from.** The only lasting change the fly may use on a new board is the change in KC-to-output connection strengths made by the memory rule that the researcher approves under section 5, driven by verified feedback through the modeled dopamine cells while the chosen move's image is active. A new board can benefit only through the KC activity it shares with trained boards. That is a hypothesis for the test, not an assumption.
5. **Fair alternatives at the same practice:** the exact-recall store; **similar-board recall** (`similarBoardRecall`), which answers a new board with the answer of the most similar trained eye input; the simple learner on raw photoreceptors; plasticity off; and shuffled feedback. A transfer claim requires the fly to beat all of them. Beating similar-board recall shows the result is not explained by input similarity alone.

The exact memory equation is the section 5 decision. It is not chosen here, and no transfer test can start before it is approved.

**Correction, later on 2026-11-03 (researcher question):** decisions 1 and 4 above were too strict and are replaced by the rules below. They required transfer to come only from changes inside the fly's brain. On 2026-11-01 the researcher had already allowed engineered memory as a disclosed aid ("i dont care about cheating memory, as long as it can be a useful technique to find evidence for reasoning (though we have to cleraly state it in our lietarture ofc)"; [scope note](../../../research/reports/apl-locality-feasibility-2026-11-01/engineered-memory-scope-clarification.md)). The brain-only rule contradicted that permission. It is not needed to fix problem 7. Problem 7 needs only three things: exact recall must never count as transfer, the claim must name the system that produced it, and that system must beat fair alternatives.

Replacement rules:

1. Each transfer or combination test declares its memory condition before data. Either **brain memory only** (lasting change only in connection strengths, through the approved section 5 rule), or **FlyChess with engineered memory** (the brain plus a declared external store with a fixed retrieval rule over a fixed description of the input).
2. A result is reported for the system that produced it. An engineered-memory result is never described as a brain-only result.
3. The exact-recall store alone is always a comparison arm. On a new board it has no answer, so it cannot show transfer.
4. An engineered-memory condition must also beat the same retrieval rule on raw eye input, on random or rewired features, with no memory, and with mismatched memory, at the same budget. These are the comparisons in the [eLife protocol](elife-prospective-protocol-2026-11-02.md). Beating them shows that the brain's response is what makes retrieval useful on new boards.
5. Both conditions keep every other rule: frozen scoring, zero exact repeats, locked sets opened once, and no memory writes during tests.

**Does this change the reasoning-first scope?** No. The question stays the same: can the simulated fly, alone or with a disclosed engineered memory, apply many unrelated ideas to unfamiliar problems? The correction removes a restriction that the researcher had not asked for. It does not lower any pass score. A brain-only result would be a stronger claim about the fly's own mechanism. An engineered-memory result would be evidence about the complete system.

## Links

[Fix report](../../../research/reports/overnight-peer-review-2026-11-02/fixes-2026-11-03.md) · [Transfer and combination protocol](transfer-and-combination-protocol-2026-11-03.md) · [Restart plan](restart-plan-2026-10-30.md) · [Current status](../../current-status.md)
