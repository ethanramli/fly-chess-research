# Restart handoff (2026-10-30 17:12)

Written for a fresh session at the researcher's request. It is a handoff, not an experiment registration. AGENTS.md still applies.

## Why the project is restarting

Under attack-map cue v2, the Fly never saw the board. An encoder turned each legal move into a few tokens (for example `act:capture|att:q:pin`). KC cells were chosen by token name only, and each assessment starts from a zeroed state, so the Fly's response was a fixed function of its token set. In training, 390 actions collapse to 33 token sets built from 28 tokens. A simple token lookup transfers to a held-out family on 23/24 boards. The encoder did the chess thinking, and Stage 1 "transfer" measured token recurrence.

Evidence:
- [response report](../../archive/early-development/research/reports/maturity-review-response-2026-10-30/README.md)
- [Codex maturity review](../../archive/early-development/research/reports/research-maturity-review-2026-10-30/README.md)
- [Codex code review](../../archive/early-development/research/reports/codebase-weakness-review-2026-10-30/README.md)

## Researcher decisions (2026-10-30; decision log entry 15:34)

1. Restart the evidence from a clean, pre-registered design. Keep every old run, report and failure as "early development" history; delete nothing.
2. New input: the board shown to the modelled eyes. Use the photoreceptors with Carlo Esposito's retina placement only, never his backprop-trained weights. No engineered chess-fact tokens.
3. Feedback only on what the Fly itself chose. No hints during puzzles, no teaching of moves it did not choose, and no lesson scheduling from its errors.
4. Target: eLife-grade evidence.
5. Reasoning needs one more condition: the fact that decides the consequence must not be given in the input. The Fly must acquire it from feedback.

## What the researcher thinks (their words, 2026-10-30)

- The original thesis still stands: the Fly first learns certain principles deeply, then later stages train reasoning on top of them. The restart must test this thesis honestly, not drop it.
- "the trick is to give feedback based on what the fly figured out. and then seeing if the fly improves from the feedback. not giving hints while its doing puzzles."
- They want the real connectome to do the work: "less connectome, more code" was their complaint about the old design. Eyes should carry the board into the brain, like cesp's model does, but without backprop weights.
- They suspected the old high scores were too good, and now see them as misleading. The old data "would result in confirmation bias".
- They agree with Codex that the old evidence is biased and uncalibrated, and they want eLife-grade work.
- Memory: they asked whether weights can be frozen. Freezing alone stops new learning, so the fix needs a rule that can go both up and down, backed by fly literature.
- They are disappointed. Do not oversell results. A clean negative result is acceptable and must be reported honestly.

## Priority order for the next session

1. Write the plan first: the question, the definition of reasoning and the pass/fail rules. The researcher approves it before any experiment.
2. Run the read-only eye test: does the brain's response to the eye input contain the safe/unsafe answer?
3. If yes: fix the memory rule, make and lock fresh test puzzles, then train with own-choice feedback only.
4. If no: stop and decide with the researcher. Do not force a result; consider another input route or report the limit.

Never: train before the plan is approved, add hints or labels that do the thinking, or look at the locked test puzzles early.

## Open items (not yet decided)

- **Memory rule.** The alpha1/alpha3 stores can only depress, down to a floor of 0.2, so long training exhausts them. Freezing alone stops new learning. Check the literature for bidirectional (strengthening) plasticity at KC-MBON synapses before building anything.
- **Showing a candidate move to the eyes.** One option is to show the board after the move.
- **Eye signal strength.** Measured 2026-10-29: the eye signal reaches KCs at under 1% of the cue drive, saturates, and boards are partly alike (correlation about 0.4) ([eye-route report](../../archive/early-development/research/reports/stage1-eye-route-2026-10-29/README.md)).
- **Fresh locked test puzzles,** prepared before any training. They should include new kinds of problems, not only new positions.
- **r15.** Stopped by the researcher at 17:15 (ledger L112); its audit was never published. A pacing bug turned laptop sleep into long rests (journal 2026-10-30-audit-stall-after-laptop-sleep). Its training result is kept as old-design development data.

## Suggested first steps

1. Write the restart plan as one short document for the researcher to check: question, operational definition, input, feedback rule, memory rule, comparators, locked test design, and pass/fail rules fixed in advance.
2. First test, read-only, training puzzles only: when the Fly looks at a board through its eyes, does its brain activity contain the safe/unsafe answer? Use the same simple decoder for every comparator: eyes through the full graph, eyes without the graph, and the old tokens as a positive control. If the answer is not there, training cannot help.

## Tools that work (checked 2026-10-30)

- Verified connectome: 134,209 neurons and 2,700,513 edges.
- Sparse graph simulator and certificate checker.
- Replay audit.
- Babysit: hardened, with exclusive lock, retries and guard confirmation.
- Recovery witness (exactly-once on 3 replicas).

Future-run fixes already exist in new versions:
- runner v6 (sleep-safe pacing);
- matrix v3 and block v3 (resume fixes);
- data audit v2 (separation checks);
- source-closure pinning.

Ledger entries L094-L111 record the details.
