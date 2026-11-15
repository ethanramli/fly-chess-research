# The combination test could not show combining; a roadmap is proposed (2026-11-16)

Volume 3, *Reasoning*: chapters 2, 4, 5 and 6. The researcher asked for a design, with no builds or runs, of the full path from safe-capture training to a credible test of the reasoning goal: can the system apply independently learned concepts from distinct families together on an unfamiliar chess problem? The work was done at commit `20a52606`. Nothing ran on the graph, nothing was learned, and no sealed game or locked set was opened.

Design: [combination roadmap](../../../documentation/design/research-goals/combination-roadmap-2026-11-16.md). Checks and saved outputs: [evidence report](../../reports/combination-roadmap-2026-11-16/README.md).

## What was found in the existing test

The [2026-11-03 protocol](../../../documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md) cannot show that ideas were combined.

1. **Adding is enough.** Its combined rule is "good if no legal recapture, or if the captured piece is worth at least the capturing piece". A fixed sum of those two yes-or-no answers ranks every good board above every bad board for any positive weights (check 1 in the evidence report).
2. **The pass rule cannot be met for the right reason.** The full fly must beat the fixed-sum system by 6 pairs. A fly that combined perfectly would tie it.
3. **A rule with no chess idea passes.** Twins are made by editing one square, so the bad pin twin and the bad recapture twin hold one more piece. "Fewer pieces is better, then the larger capture" got all three pair groups right.
4. **Ideas 1 and 2 are one fact.** Both are graded by the checker's `recaptures` field. A part that lists the opponent's legal replies answers every pin pair without a pin concept, because the move generator already drops a pinned piece's captures.

Evidence and limits: one hand-built legal pair per group, scored with the repo's checker. This shows that each shortcut can pass, not how often it would on a generated set. Another session's development audit, untracked in the working tree as `research/reports/combination-shortcut-audit-2026-11-16/`, reached the same findings on other boards. This entry does not depend on it and did not change it.

## Mistakes in my own design work

Recorded as required. Each was found by running the draft against the checker, before anything was written to the repository.

1. **My first "which attacker is pinned" board was wrong.** On `4k3/R2n4/1p1p4/4n3/N1p5/8/3N4/4R1K1 w - - 0 1` the three-concept match step chose rook takes knight on d7 (score 3). The black king takes back, and the checker says −2. Diagnosis: the three concepts do not cover a reply by the king. What changed: a board is eligible only if perfect records plus the match step give the checker's score on every legal non-king move, and king replies moved to a later milestone. The fixed board has a bishop on c8.
2. **My first "shared defender" boards let a simpler system pass.** The rook that could be captured also defended the second target. A fixed sum that was handed the legal-recapture answer then got both boards right. What changed: the targets were moved so that one piece defends both.
3. **My first pin record was too coarse.** "Pinned" as one yes-or-no per piece is wrong when the pinned piece takes along its own line. On `4k3/8/8/4r3/R3p3/8/8/6K1 w - - 0 1` after `a4e4` the checker says −4 and the coarse rule says +1. What changed: pin records are asked per piece and square.
4. **My first reply to the researcher left work undone.** I kept the checks in a scratch folder, tested only five hand-built boards, and ended with open questions. What changed: the checks and outputs are saved in the evidence report, a program now builds flip pairs and the claims were re-tested on them, and the open questions were settled as marked design choices.

## The proposed change of direction (not adopted)

Replace the twin pairs of the combination test with **flip pairs**: two boards that differ in one piece's square and have different best moves, built so that no sum of single-concept answers can follow the change. Build the system as **concept records and one match step**: separate memories for reach, pin and worth, a small table per candidate move, and one fixed rule over the table. Work in the order: perfect records with no learning, each concept alone, the learned concepts together on a locked set, kept-back combinations, then more concept families.

Why: the old test rewards adding, counting pieces and reading legal replies. The new test separates matching from adding on five hand-built boards and on pairs built by a program.

## What is unresolved

- **The match step is hand-written.** This conflicts with protocol rule 2, "no hand-written rule that combines ideas". A pass would support "the assisted system used separately learned concepts together", not "the fly worked out how to combine them".
- **Whether any memory key is accurate enough.** The match step needs nearly every record right. No learned memory has been tested on reach or pin questions.
- **Whether the fly's wiring adds anything.** Raw eye input and random features beat the fly's key in memory test v8.
- The review passes were made by the author alone, as the request specified, so they are not independent.

## Next test

If the researcher adopts the roadmap: build Milestone 1 (the test and the match step with perfect records, no graph) from the handoff on the design page. If not: the 2026-11-03 protocol stays as written, with the four findings above recorded against it.
