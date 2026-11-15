# Can a simple rule pass the three-idea test? A development audit (2026-11-16)

**Serves:** Volume 3, Reasoning: chapter 4, Process, and chapter 5, Evidence. **Status:** development only. The boards are hand-built; no sealed game, locked set, learner, graph or paused memory run was touched. No rule in the protocol was changed.

## The answer

Yes, if the twin boards are built the way the [protocol](../../../documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md#c2-ideas-1-2-and-3) describes them. In the pin pairs and the recapture pairs, the bad twin gets one extra piece: a piece that blocks the pin, or an extra attacker. So one rule that knows none of the three ideas gets every pair right: "the board with fewer pieces is better, and when the counts are equal, the capture that takes more is better". On the development pairs it scored 2/2 in each of the three groups. That meets the overall score (at least 44 of 60) and the per-group score (at least 15 of 20) at full marks. The fix is small. Build each twin by moving a piece rather than adding one, so both twins hold the same pieces. With that change the rule scored 0 of 7 on the same-pieces pairs.

Three more problems turned up. A fixed sum of the separate concept answers is the combined rule itself, so a fly that truly combines the ideas can never beat it by 6 pairs. The recapture group can be passed by counting attackers, without knowing which captures are legal. And the checker calls a pawn safe when it can be taken en passant.

**Recommendation:** revise the three-idea test before anyone builds its generator. Nothing has spent a locked set yet, so every fix below is cheap now.

## How to rerun it

From the repository root:

```sh
node --max-old-space-size=256 .codebase/scripts/search-and-feedback/audit-combination-shortcuts.mjs --out research/reports/combination-shortcut-audit-2026-11-16/results.json
node --test .codebase/tests/search-and-feedback/combination-shortcut-audit.test.mjs .codebase/tests/search-and-feedback/landing-square-certificate.test.mjs
```

Recorded on 2026-11-16 with Node v24.18.0 and chess.js 1.4.0, from commit 20a52606 plus this change. The first command prints the table below and writes every pair, certificate, board feature and score to [results.json](results.json). The second ran 20 tests, and all 20 passed: 11 new tests and the checker's own 9. The checker file was unchanged. Its SHA-256 is `283d36c383ec70632b97d30561b1951adfa7b3239835fddaafe33beda6dbe2fe`.

Code: [combination-shortcut-audit.mjs](../../../.codebase/src/search-and-feedback/combination-shortcut-audit.mjs) (boards, controls, scoring) · [script](../../../.codebase/scripts/search-and-feedback/audit-combination-shortcuts.mjs) · [tests](../../../.codebase/tests/search-and-feedback/combination-shortcut-audit.test.mjs).

## How the checker decides each idea

`certifyLandingSquare` plays the move, lists every legal enemy capture of the moved piece on its landing square (`recaptures`), lists the attackers that cannot legally capture (`pinnedAttackers`, left empty when the enemy is in check), and records `moverValue` and `capturedValue`. `combinedAnswer` says good when `recaptures` is empty, or when the move captures something worth at least the capturing piece.

| Idea | What decides the answer | What labels the pair |
|---|---|---|
| 1. Legal recapture | `recaptures` is empty | `recaptures` |
| 2. Pin | `recaptures` is empty (the same field) | `pinnedAttackers` |
| 3. Exchange value | `capturedValue >= moverValue` | `moverValue`, `capturedValue` |

Ideas 1 and 2 have one answer: "can the enemy legally take the piece on its landing square?" A rule that applies idea 1 with the full chess rules already gets every pin pair right (the "recapture only, legal" row below). The two ideas differ only in which boards they are trained on: idea 1 training rejects boards where a pin changes the answer. The protocol already says that chess ideas all come from one game. This audit adds that ideas 1 and 2 are the same fact.

Before scoring anything, the audit checks every pair in two ways. First, every board must load as a legal position, and the side not to move must not be in check. Second, the checker must call the good twin good and the bad twin bad, and must show the facts the pair's group requires, such as "pinned attacker on both twins". A pair that fails either check stops the audit (tested).

## The boards

White moves on every board, and the move is the same on both twins. "Same pieces" means both twins hold the same number of pieces and the same material for each side.

| Pair | Group | Move | Good twin | Bad twin | Same pieces |
|---|---|---|---|---|---|
| pin-file | pin, as written | a5d5 | `4k3/8/4b3/R2n4/8/8/8/4R1K1 w - - 0 1` | `4k3/8/4b3/R2np3/8/8/8/4R1K1 w - - 0 1` | no |
| pin-diagonal | pin, as written | e2e4 | `7k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1` | `7k/8/5n2/8/4p3/2P5/1B2Q3/6K1 w - - 0 1` | no |
| recapture-file | recapture, as written | a5d5 | `4k3/8/4b3/R2n4/8/8/8/4R1K1 w - - 0 1` | `4k3/8/2p1b3/R2n4/8/8/8/4R1K1 w - - 0 1` | no |
| recapture-diagonal | recapture, as written | e2e4 | `7k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1` | `4r2k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1` | no |
| value-file | value | a5d5 | `4k3/8/2p1b3/R2r4/8/8/8/4R1K1 w - - 0 1` | `4k3/8/2p1b3/R2n4/8/8/8/4R1K1 w - - 0 1` | yes |
| value-diagonal | value | e2e4 | `4r2k/8/5n2/8/4q3/8/1B2Q3/6K1 w - - 0 1` | `4r2k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1` | yes |
| pin-file-matched | pin, matched pieces | a5d5 | `4k3/8/4b3/R2n3p/8/8/8/4R1K1 w - - 0 1` | `4k3/8/4b3/R2np3/8/8/8/4R1K1 w - - 0 1` | yes |
| pin-diagonal-matched | pin, matched pieces | e2e4 | `7k/8/5n2/8/4p3/P7/1B2Q3/6K1 w - - 0 1` | `7k/8/5n2/8/4p3/2P5/1B2Q3/6K1 w - - 0 1` | yes |
| pin-pawn-moves-reversed | pin, moves reversed | a4d4 | `4k3/8/8/4p3/R2n4/7r/8/K3R3 w - - 0 1` | `4k3/8/8/4p3/R2n4/4r3/8/K3R3 w - - 0 1` | yes |
| recapture-file-matched | recapture, matched pieces | a5d5 | `4k3/2p5/4b3/R2n4/8/8/8/4R1K1 w - - 0 1` | `4k3/8/2p1b3/R2n4/8/8/8/4R1K1 w - - 0 1` | yes |
| recapture-diagonal-matched | recapture, matched pieces | e2e4 | `1r5k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1` | `4r2k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1` | yes |
| recapture-king | recapture, king defence | b4d5 | `8/8/4kn1R/3p4/1N2P3/8/8/6K1 w - - 0 1` | `8/8/4kn1R/3p4/1N6/8/P7/6K1 w - - 0 1` | yes |
| idea1-training | idea 1 training | a5d5 | `4k3/8/8/R2n4/8/8/8/6K1 w - - 0 1` | `4k3/8/2p5/R2n4/8/8/8/6K1 w - - 0 1` | no |
| idea2-training | idea 2 training, as written | b4d6 | `4k3/4b3/8/8/1B6/8/8/4RK2 w - - 0 1` | `4k3/4b3/8/8/1B6/8/4P3/4RK2 w - - 0 1` | no |
| idea2-training-matched | idea 2 training, matched pieces | b4d6 | `4k3/4b3/8/8/1B6/8/P7/4RK2 w - - 0 1` | `4k3/4b3/8/8/1B6/8/4P3/4RK2 w - - 0 1` | yes |
| idea3-training | idea 3 training | a5d5 | `4k3/8/2p5/R2r4/8/8/8/6K1 w - - 0 1` | `4k3/8/2p5/R2n4/8/8/8/6K1 w - - 0 1` | yes |
| quiet-pawn-attacker | quiet safety | g1f3 | `4k3/8/8/8/8/8/8/4K1N1 w - - 0 1` | `4k3/8/8/8/4p3/8/8/4K1N1 w - - 0 1` | no |

The first six pairs follow the three-idea test's wording for its three groups. The pin and recapture groups of the two-idea test have the same form, so the first four pairs cover it too. The "matched pieces", "moves reversed" and "king defence" pairs are the proposed fixes. The training pairs show that the protocol allows a pair for each idea on its own. The idea 2 "as written" pair uses the checker's own test boards.

## The controls

A pair is correct only when the good twin scores strictly higher, so a tie is wrong, as in the protocol. "Board only" controls receive the board and the move and nothing else; they never see a certificate (tested). Some of them use the full chess rules (legal moves); the rule column says which. **Oracle** controls read the checker's answer fields, which the fly never sees. They are not shortcuts available to the fly; they show what the fields contain.

Each cell is pairs correct out of pairs in the group. The last column scores the override comparison described in finding 4.

| Control | Sees | Rule | pin, as written | recapture, as written | value | pin, matched | pin, moves reversed | recapture, matched | recapture, king defence | idea 1 training | idea 2 training, as written | idea 2 training, matched | idea 3 training | quiet safety | override |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| piece value | board only | captured value minus mover value | 0/2 | 0/2 | **2/2** | 0/2 | 0/1 | 0/2 | 0/1 | 0/1 | 0/1 | 0/1 | **1/1** | 0/1 | wrong |
| recapture only, attacked | board only | -1 if any enemy piece attacks the square (pins ignored) | 0/2 | 0/2 | 0/2 | 0/2 | 0/1 | 0/2 | 0/1 | 1/1 | 0/1 | 0/1 | 0/1 | 1/1 | right |
| recapture only, legal | board only, full rules | -1 if the enemy can legally capture on the square | **2/2** | **2/2** | 0/2 | **2/2** | **1/1** | **2/2** | **1/1** | 1/1 | 1/1 | 1/1 | 0/1 | 1/1 | right |
| attacker count | board only | minus the number of enemy attackers (pins ignored) | 0/2 | **2/2** | 0/2 | 0/2 | 0/1 | **2/2** | 0/1 | 1/1 | 0/1 | 0/1 | 0/1 | 1/1 | right |
| attackers minus defenders | board only | defenders minus attackers (pins ignored) | 0/2 | **2/2** | 0/2 | 0/2 | 0/1 | **2/2** | **1/1** | 1/1 | 0/1 | 0/1 | 0/1 | 1/1 | right |
| fewer pieces | board only | minus the number of pieces on the board | **2/2** | **2/2** | 0/2 | 0/2 | 0/1 | 0/2 | 0/1 | 1/1 | **1/1** | 0/1 | 0/1 | 1/1 | right |
| material balance | board only | own minus enemy material | 1/2 | **2/2** | 0/2 | 0/2 | 0/1 | 0/2 | 0/1 | 1/1 | 0/1 | 0/1 | 0/1 | 1/1 | right |
| enemy mobility | board only, full rules | minus the number of legal enemy replies | **2/2** | **2/2** | 0/2 | **2/2** | 0/1 | 0/2 | 1/1 | 1/1 | 1/1 | 1/1 | 0/1 | 1/1 | right |
| fixed sum of concept scores | board only, full rules | [not attacked] + [no legal recapture] + [captured value at least mover value], each 0 or 1 | 2/2 | 2/2 | 2/2 | 2/2 | 1/1 | 2/2 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | right |
| fixed sum, graded value | board only, full rules | as above, but the value term is captured minus mover value | 2/2 | 2/2 | 2/2 | 2/2 | 1/1 | 2/2 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | **wrong** |
| attackers, moves and value | board only, full rules | 100 x (captured minus mover) minus 10 x attackers minus enemy replies | **2/2** | **2/2** | **2/2** | **2/2** | **0/1** | **2/2** | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | wrong |
| piece count plus value | board only | (captured minus mover) minus 10 x pieces on the board | **2/2** | **2/2** | **2/2** | **0/2** | **0/1** | **0/2** | **0/1** | 1/1 | 1/1 | 0/1 | 1/1 | 1/1 | right |
| oracle: recaptures field | oracle | 1 if `recaptures` is empty | 2/2 | 2/2 | 0/2 | 2/2 | 1/1 | 2/2 | 1/1 | 1/1 | 1/1 | 1/1 | 0/1 | 1/1 | right |
| oracle: pin label field | oracle | 1 if `pinnedAttackers` is not empty | 2/2 | 0/2 | 0/2 | 2/2 | 1/1 | 0/2 | 0/1 | 0/1 | 1/1 | 1/1 | 0/1 | 0/1 | wrong |
| oracle: combined answer | oracle | 1 if `combinedAnswer` is good | 2/2 | 2/2 | 2/2 | 2/2 | 1/1 | 2/2 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | right |
| oracle: fixed sum | oracle | [`recaptures` empty] + [captured value at least mover value] | 2/2 | 2/2 | 2/2 | 2/2 | 1/1 | 2/2 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | right |

These are development pairs, two or fewer per group. They show which rules *can* pass which kind of pair. They are not estimates of how often a rule would pass a generated set.

## What the results mean

### 1. Counting pieces passes all three groups as written

**What succeeded.** "Piece count plus value" knows nothing about recaptures, pins or exchanges. It got all 6 pairs in the three groups as written. "Fewer pieces" alone got the pin and recapture pairs as written (4/4), and also the idea 2 training pair built from the checker's own test boards.

**What allowed it.** The protocol makes the bad pin twin by blocking the pin line and the bad recapture twin by adding an attacker. Both add a piece. In the value group, the two twins hold the same number of pieces, so the value term decides. In the fly's input, adding a piece adds a lit square. A readout that counts lit squares is about as simple as a readout can be. If the training twins are built the same way, training rewards the same count. The idea 2 pair above shows this.

**What catches it.** Move the changed piece instead of adding it, so both twins hold the same pieces and material. In the pin, moves reversed and recapture pairs below, "piece count plus value" scored 0/7 ("matched pieces", "moves reversed" and "king defence"). The audit's `samePieces` check is the proposed generator rule. It flags all four pin and recapture pairs as written and passes all seven same-pieces pairs.

### 2. Counting enemy moves reads the pin

**What succeeded.** "Enemy mobility" got every pin pair, including the matched-pieces ones. Combined with an attacker count and the value ("attackers, moves and value"), it got every pair in all three groups, as written and with matched pieces, without any rule about pins.

**What allowed it.** A pinned piece loses its moves, so the board with the pin usually gives the enemy fewer legal replies. This rule needs the full chess rules, which the fly's input does not state. So it is not simple for the fly. It still shows that the pin group can be passed by a side effect of the pin instead of the pin's effect on the recapture.

**What catches it.** In the pin-pawn-moves-reversed pair, a black rook blocks the pin on e3 in the bad twin. In the good twin it stands on h3, where it has more moves. The enemy then has 18 legal replies on the good board and 15 on the bad one. Both mobility rules got it wrong, while the legal-recapture rule got it right. A share of the pin pairs should reverse the move count like this, or the generator should report the enemy-move count and show it does no better than chance on the pin group.

### 3. The recapture group does not need legal moves

**What succeeded.** "Attacker count" ignores pins and legality, and it got all four recapture pairs, as written and with matched pieces. In each pair the bad twin has one more attacker, because that is how the protocol flips the answer.

**What this means.** The protocol's necessity rule says a system without the idea gets the pair wrong. That is false for the recapture group. Within the three-idea test's rules, we found only two ways to flip a recapture twin while a pinned attacker stays on both boards. One is to add or move a free attacker, which changes the attacker count. The other is to let the enemy king attack a square that is defended in one twin, which changes the defender count. The king-defence pair defeats "attacker count" but falls to "attackers minus defenders". We reasoned this case by case. It is not a proof. In the full test, the pin group still blocks attacker counting: "attacker count" plus value would get the recapture and value groups but not the pin group, which comes to 40 of 60, below 44. So this does not pass the whole test, but the recapture group alone cannot show that the fly knows which captures are legal. Pins are the only part of the test that requires it.

### 4. A fixed sum of the separate answers is the combined rule

**What succeeded.** Both fixed sums, the board-only one and the oracle one, got every pair in every group.

**Why that must happen.** The combined rule says good if any idea says good. Take a fixed sum of 0-or-1 concept answers. On a bad board every answer is 0, so the sum is 0. On a good board at least one answer is 1, so the sum is at least 1. The sum therefore ranks every good board above every bad board, in any comparison, twin or not. No test of these answers can tell it from the combined rule.

**What this does to the margin rule.** The three-idea test requires the full fly to beat every other system by at least 6 pairs, including the fixed-sum system. That system adds up the move scores of the three flies that each learned one idea. If those single-idea flies answer the test boards correctly, the sum is correct too, and a full fly that truly combines the ideas cannot beat it. Its result line, "the combination can be explained by a fixed addition of separate scores", would then be printed for a fly that combined perfectly. Beating the sum tells us that training on all ideas together helped more than adding up separately trained scores. It does not show combination beyond addition. Tying the sum does not show that the fly failed to combine.

**Where a sum can be caught.** A sum with a *graded* value term can be caught, but only by comparing two different boards that differ in two facts. The override comparison does this:

- Good board: a queen takes an undefended pawn (`4k3/8/8/3p4/8/8/8/3QK3 w - - 0 1`, d1d5).
- Bad board: a rook takes a knight that a pawn recaptures (`4k3/8/2p5/R2n4/8/8/8/6K1 w - - 0 1`, a5d5).

"Fixed sum, graded value" gives the queen move 1 + 1 + (1 - 9) = -6 and the rook move 0 + 0 + (3 - 5) = -2. So it prefers the bad move. The 0-or-1 sum and the combined answer choose correctly. Twin pairs never make this comparison, because a twin pair changes only one fact.

### 5. The checker calls a pawn safe that can be taken en passant

After e2-e4 on `4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1`, the d4 pawn can take it en passant (d4xe3). The checker reports `success` with no recaptures, because the capture lands on e3, not on the landing square. This matches the protocol's literal wording, "on its landing square", but the pawn is not safe. It matters for the quiet-move transfer task, whose first new kind is "the only attacker is a pawn". The generator should reject a two-square pawn step that an enemy pawn can take en passant, or the checker should count those captures. The test records the present behaviour and does not change the checker.

### 6. A wording conflict

The three-idea test says "every board is a capture where a pinned enemy piece attacks the target square", but the bad twin of each pin pair has no pinned attacker by design. The generator needs a single written rule for this.

## Which positions defeat which shortcut

| Shortcut | Defeated by |
|---|---|
| piece value | every pin and recapture pair (both twins capture the same piece, so it ties) |
| recapture only, attacked | every pair in the three groups (the pinned piece still attacks, so it ties) |
| recapture only, legal | the value pairs (both twins are recaptured) |
| attacker count | all pin pairs, the value pairs and recapture-king |
| attackers minus defenders | all pin pairs and the value pairs |
| fewer pieces, piece count plus value | all same-pieces pairs (matched pins, moves reversed, matched recaptures, king defence) |
| material balance | pin-diagonal (the blocker is White's), the value pairs, all same-pieces pairs |
| enemy mobility, attackers moves and value | pin-pawn-moves-reversed; mobility alone also loses the matched recapture pairs and the value pairs |
| fixed sum, graded value | only the override comparison |
| fixed sum of 0-or-1 concept scores | nothing: it is the combined rule |

## Recommendation for the existing test

Do not build the three-idea generator from the current wording. Revise it first, by a dated protocol change and before any locked set is made:

1. **Same pieces in every twin.** Make each pin and recapture twin by moving a piece, not adding one, and reject pairs that fail `samePieces`. This closes the concept-free pass in finding 1.
2. **Run these controls as part of the generator audit.** The concept-free controls (fewer pieces, piece count plus value, material balance) and the move-count controls must score no better than chance on their groups. Some pin pairs should reverse the enemy-move count. This catches findings 1 and 2.
3. **Say what the recapture group tests.** Either describe it as "an extra free attacker" and not legal recapture, or add king-defence pairs and the attackers-minus-defenders control. Credit legality to the pin group only (finding 3).
4. **Rethink the margin rule against the fixed-sum system.** Report that system as a description, not a pass rule. Or state plainly that beating it means "joint training beat separately trained scores", not "the fly combined ideas". If the aim is to separate combination from a graded sum, add override comparisons between boards that differ in two facts. A 0-or-1 sum cannot be separated from the combined rule by any test (finding 4).
5. **Handle en passant in the quiet-move task** (finding 5), and **fix the "every board" wording** (finding 6).
6. **Disclose that ideas 1 and 2 are one fact** taught on two kinds of board. Count them as two ideas only in that sense.

The two-idea test shares the first four pairs' form, so recommendations 1 to 3 apply to it too.

## Focused science review

This was a focused review before a decisive protocol is committed to. Track: science. Records inspected: the protocol, the checker and its tests, `pairGate`, and this audit's results. There are no run records, because nothing ran.

| Worksheet row | Points at risk | Evidence | Check that would change it |
|---|---|---|---|
| Variables and controls (8) | Most of the row | A concept-free rule passes all three groups as written (finding 1). The recapture group's necessity claim is false (finding 3). | A generated development set where the concept-free controls score at chance on every group |
| Sufficiency for the conclusion (5) | Up to the whole row | The margin rule against the fixed-sum system cannot separate a combining fly from added single-idea scores (finding 4) | A revised rule, or override comparisons, that give a different outcome for a combining fly and for a graded sum |
| Testability (4) | 1 to 2 | Ideas 1 and 2 share one answer, and the wording conflict in finding 6 | Revised wording that names one decision rule per group |
| Study and collection design (7) | 1 | The generator rules do not say how twins are made, and en passant is unhandled | Written generator rules that pass `samePieces` and the en passant rejection |

The strongest supported sentence: on hand-built development boards, the three-idea test as written can be passed by a rule that counts pieces and compares the captured value, and twins with the same pieces stop that rule. The decision this permits: revise the test's pair rules and its margin rule before any generator or locked set is made.

**Review loop (solo, no independent reviewers).** Two challenges were checked. First, do the boards follow the protocol's wording? They do. The wording describes blocking the pin and adding an attacker, and real game positions would have to be edited the same way to make twins with the same move. A generator could choose to move pieces instead, but nothing in the protocol requires it. Second, is finding 4 a hole or the intended comparison? Both. The protocol meant the fixed-sum system to catch a hand-written combination. Because the combined rule is itself a fixed sum of 0-or-1 answers, the comparison can only be won when the single-idea flies fail on the test boards. The text above was narrowed to say that.

**Not checked here:** whether any learner would actually pick up these shortcuts; how often they would succeed on a generated set; and the similar-board-recall and simple-learner systems, which need eye inputs.
