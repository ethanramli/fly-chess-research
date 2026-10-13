# Forcing investigation and positional learning

2026-10-11 completion addendum: the [full twelve-stage curriculum](../puzzle-learning/principles-curriculum.md) now specifies operational lesson targets, definitions of done, feedback/credit pathways, controls and cumulative retention. This earlier discussion is preserved. The new specification is a design deliverable; no lesson is marked learned and required integrations are unresolved.

Date: 2026-10-11, Asia/Jakarta. Researcher hypothesis and implementation proposal; no policy change, new learner, graph run or experiment authorization. This makes the existing [piece-relationship goal](../research-goals/piece-relationships-and-selective-investigation.md) concrete and extends the earlier [Capablanca review](../../../research/literature/feedback-quality-deep-review-2026-10-08/review.md#capablanca-and-a-lean-calculation-budget).

The researcher proposes learning elementary principles, then combining them in unfamiliar situations. Their desired chess behavior is to investigate forcing moves and use positional improvements when a sound tactical opportunity is not found. Puzzle exposure alone does not establish learned recognition or compositional transfer.

## Chess principles and their limits

These are conditional guides to investigation, not an exhaustive account of grandmaster cognition or universal axioms. The implementation details below are engineering proposals.

| Principle | Observable relationships to expose | Consequence to learn and exception to test |
|---|---|---|
| Attend to the opponent's threats | Check status, attack rays, blockers, pieces under attack, available legal replies | A developing move can fail because an urgent threat requires defense. A counterattack can sometimes be the defense. |
| Investigate forcing moves | Checks, captures, promotions, newly created attacks; actual defensive replies | A forcing move is useful only if its consequences survive defense. Include unsound captures, sacrifices and checks. |
| Activate an ineffective piece | Blocked lines, available routes, accessible squares, targets and defensive duties | Freeing a blocked piece can enable a useful continuation. Moving that piece is not the only way to help it; moving a blocker may work. |
| Coordinate pieces | Support relationships, shared targets, blocked routes, defenders with multiple duties | Joint participation can enable an outcome neither piece achieves alone. Geometric support does not guarantee a legal recapture. |
| Manage weaknesses | Pawn structure, exposed king, attackable pieces/squares and access routes | Repair, defend or compensate for a weakness; exploit or create an opponent weakness. A doubled pawn or exposed square is not automatically decisive. |
| Restrict the opponent and preserve useful options | Enemy routes, pawn breaks, exchange possibilities and changes of game phase | Compare restricting an enemy piece with activating one's own. Exchanges, pawn advances and king activity depend on context. |

Source basis: GM Bryan Smith explains prioritizing checks, captures and threats during calculation, including checking replies at later branches ([article](https://www.chess.com/article/view/forcing-moves-part-1)). Capablanca discusses development, coordinated attacks, exploiting weaknesses, restraining opposing pieces and pawn holes ([primary book](https://www.gutenberg.org/cache/epub/33870/pg33870-images.html), sections 6, 21-24, 31-33). Thomas Willemze gives a concrete worst-piece manoeuvre in Carlsen-Vaculik, including preparing an outpost and removing its defender ([publisher excerpt](https://www.newinchess.com/media/wysiwyg/product_pdf/9200.pdf), printed pages 9-10). The worst-piece prescription is supported here as modern instruction, not attributed as a verbatim Capablanca rule.

## Avoid a binary tactics/position switch

Do not use `if (checksOrCaptures.length) playTactic(); else improveWorstPiece();`. A losing check can exist in an otherwise quiet position; a winning preparatory move can be quiet. Check the opponent's forcing replies after every proposed positional move. A bounded search that finds no tactic reports only that none was found within its budget, not that none exists.

Order investigation with forcing moves first while keeping quiet alternatives reachable. Do not automatically select the highest forcing-priority score. A positional candidate may also threaten something; the categories can overlap. For the first causal learning assessment, retain every legal candidate under a declared supported bound and fail explicitly on unsupported positions. Candidate-limited search is a separate measured condition with omission accounting.

## Mapping into the actual code

| Existing path | Current responsibility | Smallest proposed use/change |
|---|---|---|
| [delta-forcing-candidates.mjs](../../../.codebase/src/search-and-feedback/delta-forcing-candidates.mjs) | Tags checks, captures, new attacks and board deltas; bounded shortlist with quiet reserve | Reuse for investigation tags. Its numeric priority is a handcrafted ordering, not learned value. Promotion tagging, urgent defensive coverage and role-aware quiet candidates would need separate checks before adoption. |
| [relational-chess-cue-v3.mjs](../../../.codebase/src/chess-input/relational-chess-cue-v3.mjs) | Candidate-relative board geometry, legal actions, history and declared task context | Begin with the existing representation. Add bounded, label-blind relation facts only if a preregistered comparison identifies a missing distinction. No `goodMove`, teacher score or `worstPiece` answer token. |
| [mapped-puzzle-brain.mjs](../../../.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs) | Frozen-memory action assessment, verified replay and local updates | Record unaided all-legal ranking before feedback. Its search adapter returns neutral leaf value zero, so it cannot currently support meaningful learned positional leaf evaluation. |
| [monte-carlo-puzzle-search.mjs](../../../.codebase/src/search-and-feedback/monte-carlo-puzzle-search.mjs) | Separate history-preserving hypothetical search with fixed bounds | Preserve the existing search for supported tasks. It currently validates bounded forced-mate objectives; generic positional play is not supported by changing a task string. |
| [consequence-value-readout.mjs](../../../.codebase/src/neural-learning/consequence-value-readout.mjs) | Experimental fixed reference-relative MBON contrast | Preserve the [failed unfamiliar-board result](../../../research/reports/consequence-value-feasibility-v1-2026-10-10/README.md). This is an uncalibrated valence prototype, not an accepted general position evaluator. |
| [verified-sequence-feedback.mjs](../../../.codebase/src/search-and-feedback/verified-sequence-feedback.mjs) and [feedback quality gate](../puzzle-learning/feedback-quality-gate.md) | Certificate-bound feedback and earlier-choice evidence | Reuse declared proof/receipt contracts; independently recheck each exact history/action/criterion. Unknown produces no event. Earlier quiet-move credit needs an explicit temporal mechanism and audited linkage, not only prose. |

The [bound-ray encoder](../../../.codebase/src/chess-input/bound-ray-relational-cue.mjs) currently requires a capture in its one-reply task. It is not a drop-in quiet-position encoder. Preserve its original failed experiments; do not broaden frozen task contracts in place.

## What belongs in code versus learned memory

Code can calculate public observations: a bishop's ray is blocked by a friendly pawn, a legal move removes that blocker, or two pieces geometrically attack the same square. Neither attacked-square counts nor raw mobility are complete tactical-safety tests: pins, recaptures, obligations and future replies matter.

The learner must acquire the significance of these observations through the existing declared physiological memory. Do not reward `mobilityAfter > mobilityBefore` or use `score = mobility + coordination - weaknesses` as the primary learned evaluator. Those are possible separately declared handcrafted baselines. Such a score would encode our preferences and can reward abandoning a defender or exposing the king. The teacher supplies certified experiences, not neural parameter deltas.

There is no single reliable `worstPiece(board)` based only on legal-move count. A nearly immobile piece may perform essential defense; a highly mobile piece may contribute nothing useful. Start by teaching a specific obstruction/consequence relationship. Contextual piece usefulness and plan selection are later learned capabilities, not arbitrary assigned prices.

Conceptual decision contract, not executable code or implemented API:

```text
legal actions -> frozen-memory unaided ranking
             -> bounded investigation of forcing and quiet alternatives
             -> choices evaluated against the opponent's replies

training only:
exact experience -> independently checked consequence certificate
                 -> declared bounded neural teaching pathway
                 -> local persistent adaptation + atomic pending receipt
```

Teacher explanations can name the principle for the research record. Existing neural receivers do not learn the meaning of that prose automatically. Keep teacher knowledge unavailable during unaided evaluation, and measure engineered search separately with matched computation.

## First implementable experiment

Proposed next step: prepare a small new **quiet activation prerequisite** family, not a whole positional evaluator.

1. Construct development positions where a quiet root move frees a blocked rook or bishop and permits an independently provable bounded mating continuation against every required defense. Require that the root action is neither check nor capture; document whether it creates an immediate threat. Another family can later require a genuinely quiet multi-move manoeuvre.
2. Construct changed-support or changed-blocker counterfactuals where that same-looking quiet action fails the identical bounded criterion. Vary irrelevant locations within training; reserve disjoint relational compositions and new families for frozen testing. Do not invent certificates for schematic examples.
3. Generate/recheck all-legal criterion coverage offline under proof-node/time bounds. Unknown proof suppresses teaching. A certificate establishes this bounded consequence only; it does not prove the move is globally best or the position otherwise contains no tactic.
4. Reuse an encoder that accepts legal quiet actions and existing verified lesson/sequence machinery. Before graph use, verify whether the neural receiver can bind the root action to the certified later payoff with persistent credit; frame delivery alone is insufficient.
5. Freeze a fresh protocol with informative, absent, matched-shuffled and disabled-plasticity arms, matched exposures/timing, source identities, original-memory reset/restoration, retention and pending-receipt recovery. Compare a principles-first schedule with a matched mixed schedule only after this prerequisite passes. No numeric gate or dose is selected from old final results.
6. Measure retained all-legal choices and adverse interference, then unfamiliar and counterfactual consequences with frozen learning. Report unaided versus fixed-budget searched choices separately. Preserve an untrained/geometric baseline to check whether the input interface already solves the task.

This bridges a positional action to a narrow delayed tactical payoff. Passing would not establish broad quiet-position judgment, master-level play, biological validity or compositional reasoning by itself. Later positional feedback needs a declared verifiable outcome/task horizon; Stockfish evaluations remain a separately registered estimate-teaching condition, never consequence certificates. No graph run is launched by this note.

## Source evidence

Access date: 2026-10-11. Coverage: retrieved HTML text and publisher PDF text; not full-game independent analysis, observed human cognition, or a visual PDF audit. Short excerpts preserve the specific source basis; existing 2026-10-08 Capablanca raw evidence remains untouched.

- Capablanca, *Chess Fundamentals*, section 6: "The main thing is to develop the pieces quickly." Sections 21-24 and 31-33 were additionally inspected for coordination, restraint and weaknesses.
- GM Bryan Smith, *Forcing Moves, Part 1*: "a forcing move is either a check, a capture, or a threat." The article also describes a missed defensive rook move and a later missed forcing capture.
- Thomas Willemze, *What Would You Play?*, publisher excerpt, printed page 9: "focus on improving your worst-placed piece first!" Pages 9-10 connect the manoeuvre with outposts and defender removal.

These excerpts support instructional principles. Conditional interpretation, feature selection, proof-family construction and the curriculum/control design are researcher/assistant hypotheses; the sources do not provide a fly plasticity mechanism, candidate-count setting or proof of grandmaster mental algorithms.

## 2026-10-11 addendum: opponent plans and adversarial replies

Researcher clarification: selective calculation must investigate the opponent's moves and plans, not only rank one's own candidates. The researcher supplied a quotation attributed to Carlsen as motivation; its attribution is not verified or used as external evidence. This extends the contract above without changing code, frozen experiments or the accepted learner.

Final commitment follows adversarial investigation. An initial preferred move is a hypothesis, not confidence that the move is sound. For every investigated candidate, apply it on the history-preserving hypothetical board, then select replies from the opponent's perspective: forcing counterplay, defenses that neutralize our threat, and quiet moves that remove support, restrict our pieces or prepare a pawn break. Repeat candidate selection after each actual simulated move for the side now on turn. Do not simulate an illegal pass or flip the turn field to manufacture a reply position.

```text
our candidate
  -> opponent's strongest plausible refutations/counterplans
     -> our responses
        -> opponent's responses, within the shared budget
  -> revise or reject our initial plan
```

The guiding comparison is which candidate leaves the best outcome against the strongest reply found, rather than which has the most attractive cooperative continuation. A minimum over inspected opponent replies is provisional; it is not the true worst case over unexamined legal replies. Quiet defenses remain reachable, and unresolved threats trigger bounded widening rather than increased certainty. Keep depth, nodes, neural presentations, elapsed time and memory bounded; resource exhaustion does not certify safety, a draw or absence of refutation. A neural score gap and search visits are not calibrated confidence.

Current Monte Carlo search already alternates players and changes value perspective on backup. It also samples replies and selects the returned move by visits/prior; it is not an implemented exhaustive minimax guarantee or a reliable opponent-plan detector. Its existing forcing shortlist can omit quiet defenses. Reuse this search path rather than add a speculative second engine. Plan-aware quiet coverage, useful learned leaf evaluation, and a tested stopping/uncertainty contract remain proposed capabilities.

Add development fixtures where an attractive forcing move is refuted by a quiet defense, and where activating our piece lets the opponent exploit an abandoned duty. Also include positions where preventing an opponent pawn break is preferable to direct activation. Freeze unfamiliar/counterfactual families before training. Measure reply omission separately from wrong valuation or insufficient depth; independently certified teacher feedback must include the relevant defensive coverage. Ordinary selective search may inspect a subset, while the teacher's consequence certificate must satisfy its complete declared proof scope. No chosen weak opponent line can certify success. Unaided prediction remains recorded before search/feedback, memory stays frozen during investigation, and informative learning/control/persistence gates remain unchanged.

## 2026-10-11 addendum: recommended curriculum entry point

Ordering refinement: the quiet activation family above is the first proposed bridge to positional learning, not the first lesson of the entire curriculum. Start with the already specified [capture/recapture relationship](../research-goals/minimal-consequence-transfer.md): can the capturing piece be taken on the opponent's next legal turn? The existing certificate enumerates those replies; it measures immediate recapturability only, not whether a move is good, whether the opponent must recapture, or whether a sacrifice is justified. Legal movement rules are supplied by the symbolic chess interface, not newly learned visual perception.

The [previous capture-retention assay](../../../research/reports/capture-retention-assay-v3-2026-10-07/README.md) failed its transfer gates. The apparent 5/8 accuracy was an unchanged action preference tied with controls, and its nominal seeds were not behaviorally independent. Preserve this evidence. Before any replacement study, review the unresolved relation-to-memory-to-choice contract with new development evidence, fresh untouched final families and genuinely distinct declared replications; do not repeat the frozen assay unchanged or tune on its final cases. Existing verified feedback/local physiology remain the learning boundary.

| Stage | Relationship or skill | What builds on the prior stage |
|---|---|---|
| 1 | Capture, defense and immediate recapture | Differentiate the same-looking action when a blocker or defender changes its immediate consequence. |
| 2 | King threats and immediate mating consequences | Distinguish a check from mate; retain available defenses and quiet escapes. |
| 3 | Short forcing combinations | Use opponent replies to compare double attacks, defender removal and discovered attacks; introduce supported delayed credit explicitly. |
| 4 | Quiet activation and coordination | Free a constrained piece or prepare support for a verified later consequence, while preserving defensive duties. |
| 5 | Weaknesses, restriction and multi-move plans | Compare repairing a weakness, restraining counterplay and preparing a pawn break under a declared feedback horizon. General positional value needs additional validated feedback/evaluation infrastructure. |
| 6 | Unfamiliar composition and integrated play | Combine previously taught relationships in disjoint situations and abandon a plan when a counterfactual breaks its preconditions. |

This is a proposed training order, not evidence that mastery of individual stages automatically yields composition. Opponent moves are present from stage 1. Each stage includes positive/negative cases, retention of earlier skills, independently certified feedback and matched controls. Advance only after preregistered acquisition/retention/unfamiliar/counterfactual gates pass; immediate repair and exposure count do not establish mastery. A preliminary bounded candidate-pair mechanism assay may precede all-legal integration checks; selective play and separate omission audits remain distinct. Preserve a cumulative validation set for earlier criteria without turning frozen final families into rehearsal data.

Primary-source scope: Capablanca begins his book with simple mating endings to demonstrate piece power (section 1, HTML text rechecked 2026-10-11), not with the capture-retention ordering proposed here. Our narrower starting point follows this model's unresolved computational prerequisites; it is not claimed to be Capablanca's literal syllabus. No stage is launched or marked complete by this addendum.
