# Combination roadmap: the checks behind the design (2026-11-16)

**Serves:** Volume 3, *Reasoning*: chapters 4 (*Process*) and 5 (*Evidence*). **Status:** design evidence only. The boards are hand-built or built by a program from random construction. No graph ran, nothing was learned, and no real game, sealed game or locked set was read. These checks support the [roadmap proposal](../../../documentation/design/research-goals/combination-roadmap-2026-11-16.md); they are not a learning or reasoning result.

## The answer

The current combination test can be passed without combining anything, and a repaired test cannot.

- **Current test.** On one legal pair for each of its three groups, a fixed sum of the separate answers got every pair right for any positive weights. So did a rule that knows no chess idea: "fewer pieces on the board is better, then the larger capture".
- **Repaired test.** A flip pair is two boards that differ in one piece's square and have different best moves. On five hand-built boards and on 71 pairs built by a program, a rule that matches facts about the same piece (the "match step") got every board right. The best fixed sum of single-concept numbers got 2 of the 5 hand-built boards and none of the 71 program-built pairs.
- **A warning for later work.** The match step needs almost every fact right. When 1% of its yes-or-no facts are wrong, 87% of the program-built pairs stay right. At 5% wrong, 55% do.

## How to rerun

From the repository root, with Node v24.18.0 and chess.js 1.4.0, at commit `20a52606` plus this folder:

```sh
node research/reports/combination-roadmap-2026-11-16/checks/protocol-pairs.mjs
node research/reports/combination-roadmap-2026-11-16/checks/five-boards.mjs
node research/reports/combination-roadmap-2026-11-16/checks/more-concepts.mjs
node research/reports/combination-roadmap-2026-11-16/checks/random-positions.mjs          # about 30 minutes
node research/reports/combination-roadmap-2026-11-16/checks/generate-flip-pairs.mjs 30 20261116 > research/reports/combination-roadmap-2026-11-16/outputs/flip-pairs.json   # about 11 minutes; this one command rewrites the saved pairs
node research/reports/combination-roadmap-2026-11-16/checks/evaluate-flip-pairs.mjs research/reports/combination-roadmap-2026-11-16/outputs/flip-pairs.json
```

The scripts print to the screen and write no file themselves; only the redirect in the generator command saves anything. The saved outputs in [outputs/](outputs/) were made with these commands. All randomness uses fixed seeds. The generator was run twice with the same seed, and both runs gave the same 60 pairs and the same rejection counts; only the recorded seconds differed (161 and 476 in the saved file, 158 and 446 in the second run). Every chess score comes from the repository's own checker, `certifyLandingSquare` in [landing-square-certificate.mjs](../../../.codebase/src/search-and-feedback/landing-square-certificate.mjs), which was not changed.

## Words used here

- **Score of a move:** the worth of what it takes, minus the worth of the moved piece if the opponent can legally take that piece back on its landing square. Both parts are the checker's fields.
- **Reach record:** "the piece on this square can move to that square by its own way of moving". Worked out from board geometry only.
- **Pin record:** "the piece on this square may not go to that square, because its own king would be exposed". Worked out from board geometry only.
- **Match step:** a piece can take back only if its reach record says yes and its pin record for the same piece and square says free. If any piece can take back, the mover's worth is subtracted.
- **Single-concept numbers:** for one move, how many enemy pieces reach the landing square, how many enemy pieces are pinned, the worth taken and the worth moved. A **fixed sum** multiplies each by one weight and adds them.
- **Credit:** 1 when the top-scored move is the checker's best move. Tied top moves share the credit evenly.

## The checks

| # | Question | Result | Saved output |
|---|---|---|---|
| 1 | Can a fixed sum, or a rule with no chess idea, pass the current test's pairs? | Yes. Both got the pin pair, the recapture pair and the value pair right. The rule "no legal recapture" alone got the pin and recapture pairs. | [protocol-pairs.txt](outputs/protocol-pairs.txt) |
| 2 | Are the five hand-built boards sound? | Yes. Each is legal and has one best move. The match step equals the checker on every legal non-king move (25, 25, 14, 14 and 15 moves). | [five-boards.txt](outputs/five-boards.txt) |
| 3 | What do simpler systems choose on those boards? | Best fixed sum over 4,459 weight settings: 2 of 5. Fixed sum given the checker's own legal-recapture answer: 4 of 5. Pin removed: 2. Reach removed: 2. Worth removed: 3.11. Fewest enemy replies: 1. Taking one concept's records from the flip partner flips the choice. | [five-boards.txt](outputs/five-boards.txt) |
| 4 | Which boards fool a narrower design? | Four trap boards: a pinned piece that takes along its line, a reply by the king, a double check, and a guarded square. | [five-boards.txt](outputs/five-boards.txt) |
| 5 | Does the same match step work with two more concepts? | Yes, on five boards: guard for king replies (including a guard that is itself pinned) and check answer. | [more-concepts.txt](outputs/more-concepts.txt) |
| 6 | How often does the three-concept match step equal the checker on ordinary positions? | On 4,000 positions from random play (117,487 non-king moves): 98.7% of moves, and every move on 71.8% of positions. The misses are replies by the king (740), checks where a king rule would fix the score (682), and discovered or double checks (104). With a rule for the king added: 99.9% of moves and 98.7% of positions. The geometry reach labeller agreed with chess.js on every move. | [random-positions.txt](outputs/random-positions.txt) |
| 7 | Can a program build flip pairs? | Yes. 30 "shared defender" pairs from 6,142 tries in 161 seconds, 11 of them with a third board. 30 "which attacker" pairs from 161,489 tries in 476 seconds; most tries fail at once because the pieces do not fit on the board. 26 candidates passed every other rule and failed only rule 5 below. | [flip-pairs.json](outputs/flip-pairs.json) |
| 8 | Do the claims hold on the program-built pairs? | Match step: 71 of 71 pairs. Best fixed sum over 7,680 weight settings: 0 of 71 pairs and 51.1 of 142 boards when fitted on the same boards; 0 of 38 kept-back pairs when fitted on the other half of the families. Fixed sum given the checker's legal-recapture answer: 31 of 71. Pin removed: 11. Reach removed: 0. Worth removed: 24. Five simple rules: 0 each. With 1%, 2%, 5% and 10% of records wrong, 87%, 76%, 55% and 35% of pairs stay right. | [flip-pairs-evaluation.txt](outputs/flip-pairs-evaluation.txt) |

### The five hand-built boards

| Board | FEN | Best move | Next best |
|---|---|---|---|
| Which attacker is pinned, king e8 | `2b1k3/R2n4/1p1p4/4n3/N1p5/8/3N4/4R1K1 w - - 0 1` | d2c4 (+1) | 0 |
| Which attacker is pinned, king h7 | `2b5/R2n3k/1p1p4/4n3/N1p5/8/3N4/4R1K1 w - - 0 1` | a4b6 (+1) | 0 |
| Shared defender pinned, king e8 | `4k3/5p2/4n3/6b1/3r3P/8/8/3RR1K1 w - - 0 1` | d1d4 (+5) | h4g5 (+3) |
| Shared defender free, king f8 | `5k2/5p2/4n3/6b1/3r3P/8/8/3RR1K1 w - - 0 1` | h4g5 (+2) | 0 |
| Shared defender elsewhere, knight e7 | `5k2/4np2/8/6b1/3r3P/8/8/3RR1K1 w - - 0 1` | d1d4 (+5) | h4g5 (+3) |

### How the program builds a flip pair (check 7)

It places a line piece, a defender and the black king in one line at random, puts two black pieces on squares the defender reaches, and puts two white pieces where they can capture them. Then it moves the black king off the line to make the second board. A pair is kept only if all of these hold:

1. Both boards are legal and nobody is in check.
2. The match step gives the checker's score on every legal non-king move of both boards.
3. Each board has one best move, it wins material, and it leads the next move by at least one pawn.
4. The two boards have different best moves.
5. The two best moves have the same difference in single-concept numbers on both boards. This is the rule that makes adding fail, so the "0 pairs" result for fixed sums follows from it. The count of candidates that failed only this rule is in the output.

For a third board, the defender is moved to a square from which it reaches neither target.

### What the record-error rows mean (check 8)

Each yes-or-no record was flipped at random with a fixed probability, 300 times per setting, and the match step chose again. The rows show how often both boards of a pair were still right. The errors are independent here. Real memories may fail in patterns, so these rows set a starting bar and do not predict a result.

## Limits

- **Constructed boards.** The hand-built boards were made to show the point. The program-built pairs follow two templates. Neither is a sample of real positions.
- **Random play is not real play.** Check 6 uses positions from random legal moves, which have more loose pieces and stranger king positions than games do.
- **Rule 5 selects the pairs.** The fixed-sum result on program-built pairs is true by construction. What the run adds is that such pairs can be built at a workable rate and that the match step, the removals and the simple rules behave as on the hand-built boards.
- **No learner was tested.** "Pin removed" and the other removals use perfect records. They predict what a learned system should do; they are not measurements of one.
- **One reply, one square.** The score ignores other pieces left hanging and longer exchanges. The checker also calls a pawn safe when it can be taken en passant, because that capture lands on another square.
- **Not independently reviewed.** The same author wrote the design and the checks.

## Files

- [checks/lib.mjs](checks/lib.mjs): the two geometry labellers, the records, the match step and the call to the checker.
- [checks/protocol-pairs.mjs](checks/protocol-pairs.mjs), [checks/five-boards.mjs](checks/five-boards.mjs), [checks/more-concepts.mjs](checks/more-concepts.mjs), [checks/random-positions.mjs](checks/random-positions.mjs), [checks/generate-flip-pairs.mjs](checks/generate-flip-pairs.mjs), [checks/evaluate-flip-pairs.mjs](checks/evaluate-flip-pairs.mjs)
- [outputs/](outputs/): what each command printed.

Related: [roadmap proposal](../../../documentation/design/research-goals/combination-roadmap-2026-11-16.md) · [journal entry](../../journal/discussions/2026-11-16-combination-roadmap.md) · [protocol under review](../../../documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md)

## First benchmark build

This software check serves Volume 3, *Reasoning*, chapters 4 (*Process*) and 5 (*Evidence*). The [benchmark command](../../../.codebase/scripts/search-and-feedback/README.md#flip-pair-benchmark) runs the prepared fixture or builds fresh development pairs. It gives the match step correct facts from chess geometry. Learning how to supply those facts is the next step.

Two reviewers checked the chess rules and shortcut controls independently:

- Chess.js 1.4.0 normally searches opponent replies while adding checkmate notation to generated candidates. The benchmark suppresses that notation check and keeps the same candidate coordinates and successor positions. A test observes chess.js's internal move generator to catch searches on the opponent's turn. A separate replay on 220 positions, including 110 with Black to move, verified the candidate list and found no opponent reply search by the matcher.
- Four saved pairs labelled “shared defender: pinned or free” free the defender for only one of the two candidates. They remain in the historical replay and are marked in the output. The fresh generator requires the same defender to be freed on both landing squares. The hand-built attacker pair caught a reversed pin transition while tightening the check. The corrected direction requires the first defender to be freed and the second defender to be newly pinned.

Equal feature differences force every fixed-weight linear sum of the four raw counts and values to order the two alternatives the same way on both boards. The best move reverses, so a fixed sum cannot uniquely choose both. Pair selection deliberately requires that equality. Nonlinear feature transforms and other untested shortcuts remain outside the proof.

The [saved check](outputs/first-benchmark-build.json) used Node 24.22.1, chess.js 1.4.0, and seed `20261117`. It checked **7,146 legal non-king moves** across 256 distinct benchmark boards. Every move score agreed with the landing-square checker.

| Fresh pair type | Accepted | Candidate attempts | Match step | Fixed sum |
|---|---:|---:|---:|---:|
| which attacker is pinned | 20 | 90,809 | 20/20 | 0/20 |
| shared defender: pinned or free | 20 | 8,846 | 20/20 | 0/20 |
| shared defender: free or elsewhere | 20 | 3,094 | 20/20 | 0/20 |

The saved 71 pairs reproduce the original match and shortcut results. The four separate traps document a capture along the pin line and where king captures, guards, or a second check require more rules. The generated positions and scores are development evidence for the benchmark.
