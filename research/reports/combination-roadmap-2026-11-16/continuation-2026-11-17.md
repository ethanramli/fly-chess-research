# Separate lessons and the open-puzzle replay

**November 17, 2026. Volume 3, Reasoning, chapters 4 and 5.** The separately taught pin, reach and piece-value stores solved all **60 open puzzle pairs** in each of three runs after the reach lessons covered every input shape. Adding up the same learned facts solved **0/60** in a grid of 6,561 weight settings. The hand-written matcher uses the facts about each individual piece to decide whether that piece can take back. This result covers the [published development puzzles](outputs/first-benchmark-build.json).

## Separate lesson results

| Lesson and input | Correct on fresh boards |
|---|---:|
| Pin, original absolute board view | 324/648 |
| Pin, absolute board view on the later matched families | 330/648 |
| Pin, board centered on the marked piece | 357/648 |
| Pin, fixed fly graph activity | 329/648 |
| Pin, raw eye currents | 324/648 |
| Pin, random features | 312/648 |
| Pin, learned axis patterns | 648/648 |
| Pin, rook and bishop on the same board with a different target | 286/286 |
| Reach, before extending the lessons | 1,077/1,080 |
| Reach, after extending the lessons | 1,080/1,080 |
| Piece worth, learned from piece identity | 225/225 |

Centering translated every piece and both marks together. It raised the number of pin pairs solved from 10/324 to 43/324 on the matched families. The graph comparison held the weights fixed and read 5,177 Kenyon cells. The fly, raw eye and random conditions used the same nearest-example memory settings, each with correct-label, shuffled-label and empty-store controls. None of those three inputs reached the 90% redesign line.

The stronger pin input gives the learner the nearest visible piece on either side of each axis and whether the marked target lies between them. It supplies much of the geometry. The memory learns which patterns occur on the pinned side of the lessons. Shuffling labels or scrambling the axes dropped performance to around half. The reach input uses piece type, displacement and intervening occupancy. The teacher labels two boards for each of 195 supported input shapes. The worth store learns a value for the observed piece type.

## What changed the open replay

| Training run | Initial learned stores | Perfect reach substituted | Learned stores after reach coverage | Best fixed sum after coverage |
|---|---:|---:|---:|---:|
| First | 8/60 | 60/60 | 60/60 | 0/60 |
| Second | 31/60 | 60/60 | 60/60 | 0/60 |
| Third | 24/60 | 60/60 | 60/60 | 0/60 |

Every failed pair in the initial replay contained an unanswered reach question. Once the lessons covered the missing shapes, the rebuilt stores gave the correct answers to all 14,941 pin questions, all 14,941 reach questions and all 3,814 worth questions per run on the open puzzles. The best fixed sum used the counts of reaching and held pieces plus material values. It chose 40 of 120 individual boards correctly and solved zero complete pairs in each run.

## Decision before the locked test

The audit found zero lesson-to-probe family overlaps, including after reflection, colour swap or a single-piece edit. At retrieval, all **1,080 of 1,080** reach probes reused an exact input key from a lesson. The four-axis collection matched a lesson exactly on **448 of 934** pin probes. The experiment shows that the engineered stores can reuse familiar geometric patterns on fresh boards. The protocol still needs to say whether its no-repeat rule applies to complete board inputs or to the keys the memory reads. Requiring unseen keys preserves the stricter claim and makes the current learner a baseline.

The [roadmap](../../../documentation/design/research-goals/combination-roadmap-2026-11-16.md) also lists the perfect legal-reply reference in a gate that asks the learner to beat every comparison by six pairs. The dated protocol should identify that perfect reference as a scoring ceiling and name the controls that the learner must beat. It should also record that the matcher is hand-written. **The locked puzzles remain sealed.**

## Safe-capture run and provenance

The separate safe-capture run stopped during preflight. The graph and annotation hashes matched. The pinned calibration inputs are incomplete. The run also needs the quiet learning-off record or an exact replay. See the [safe-capture protocol](../../../documentation/design/neural-learning/three-board-reading-before-feedback-2026-11-15.md).

The numbers above were recorded in the November 17 local run manifests and checked against predictions and, for the combination replay, one-at-a-time substitutions. All 40 focused tests passed. The work used benchmark commit `90f1395`. The local implementation commits were `3a162caf` and `713e05de`. This report records the checked results and the decision at the locked-test boundary. The run code and raw logs are separate from this documentation commit.
