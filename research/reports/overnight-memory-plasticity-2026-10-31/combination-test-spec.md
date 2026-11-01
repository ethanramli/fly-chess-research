# Later combination test (written only; not run, not approved)

2026-10-31. Proposal for the Phase C addendum in restart plan section 8. It runs only after Phases A and B pass and the researcher approves its own addendum. Two concepts is the smallest probe. It does not test "many unrelated concepts", and chess concepts are not unrelated in the researcher's sense.

**Concept 1, safe capture.** After this capture, can the opponent legally capture back on that square? Trained on capture-only boards where no check is involved.

**Concept 2, pin-blocked recapture.** A piece that seems to defend a square cannot legally move there, because moving would expose its own king. Trained on non-capture boards through a different consequence: "does this quiet move put a piece on a square a pinned enemy piece appears to attack, and is the piece still safe there?" The checker proves the consequence by enumerating legal replies. No training puzzle contains a capture whose safety depends on a pin.

**Unfamiliar condition.** A capture whose target square is watched only by a pinned enemy piece. Concept 1 alone sees a defender and calls it unsafe. Concept 2 alone has never scored a capture. Only both together give: "defended in appearance, not legally, so safe". The twin board moves the pinning piece off the line, so the same capture becomes unsafe. The twins differ in the pin geometry, and neither twin's answer is given by the capture geometry alone.

**What is withheld.** Attack, pin and legality facts are not in the input. No puzzle says which concepts apply, and nothing marks a test board as a combination item. The legal-move list stays code-supplied (a disclosed limit): it exposes legality for the mover, not for the opponent's reply.

**Fixed interface and readout.** Same rendering, move mark, memory rule and MBON readout as Phase A, frozen before Phase C. No new readout, no concept selector, no context signal.

**Counterfactual probes.** On each locked pair: (1) remove the pinning piece; (2) move the pinned defender off the line but keep it attacking the target; (3) add a second, unpinned defender; (4) remove the only defender. Each probe has a checker-proved answer and each changes which concepts are needed.

**Comparison arms, matched practice, same seeds and order:**

| Arm | Memory |
|---|---|
| Full | Trained on 1 and 2 |
| A-only | Trained on 1; matched number of unrelated-task trials in place of 2 |
| B-only | Trained on 2; matched unrelated trials in place of 1 |
| Naive | Same exposure with feedback absent |
| Shuffled | Same exposure with matched shuffled feedback |
| Same-input simple learner | Nonlinear learner on raw photoreceptors, same trials and feedback |

**Predictions that separate the explanations:**

| If the Full arm is... | Then... |
|---|---|
| Better than A-only, B-only and all others on pairs and on probes 1, 2 and 3 | Evidence of combined use inside this model on this task. Reported as two concepts |
| Equal to its best single arm | No combination: one concept explains it |
| Good on training-like boards, near chance on probes | Memorized examples or surface features |
| Equal to the simple learner | The task does not need the connectome route, or the learner found the relation itself |

The Full arm must also score the opposite answer on twin boards. A general preference for one kind of capture passes neither twin consistently.

**Accidental combined exposure.** The training generator must reject any training board where the certificate's result depends on a pin, for concept 1, and any capture at all, for concept 2. The rejection counts are reported. This needs code that does not exist.

**Missing before this could run:**

1. Phase A's learned concept: not achieved.
2. The visual route: the eye test has not run.
3. A working memory rule on the real graph: not tested. Fixture results do not count.
4. Phase B: not run.
5. Concept 2's task, generator and checker: not written. The pin-consequence certificate needs its own design and audit under the feedback quality gate.
6. Numbers: pair counts, thresholds and practice budgets are deliberately not set here. The researcher's Phase C addendum fixes them before data.
7. Whether a two-compartment linear KC-to-MBON readout can express a conjunction of two relations at all. The earlier decoder check showed that a linear decoder misses XOR-style relations (ledger L125), and "pinned or not" against "defended or not" is an XOR-like conjunction. If it cannot, this test fails for a reason unrelated to memory. **This is the first thing to check, on synthetic data, before investing in the rest.**

## Dated review correction, 2026-10-31

The assertion above that Concept 1 alone sees a defender and therefore calls the capture unsafe is an untested assumption. Concept 1's stated target is **legal** recapture; legal recapture already contains the pin exception. Excluding pin cases from its training does not prove what an A-only learner will infer on those cases. Preserve this original design, but do not interpret an A-only failure as logically required or a Full advantage as proof of two separate internal concepts.

Before running a later version, define separate mastery probes for each learned relation and demonstrate the candidate readout can express the required response combinations without an oracle concept selector. Compare Full against the strongest A-only/B-only arms, memorization and same-input simple learner with matched total practice, initialization and feedback opportunities. A Full advantage would support a benefit of the additional curriculum; causal evidence of combined internal use additionally requires the approved ablation/counterfactual design. No such concepts, probes or ablations exist yet.

The earlier "XOR-like" description is a warning about representation, not a proved formal equivalence. A conjunction can be linearly readable if earlier circuit dynamics supply suitable interaction features; this must be checked on the actual fixed interface rather than assumed impossible from a verbal description. The [capacity diagnostic](readout-bound-spec.md) proves a different, specific linear conflict in the current memory fixture and does not establish a Phase C impossibility theorem.

Counterfactual boards must be independently certified. Removing or moving a defender/pinning piece does not automatically flip every valid position's consequence. Reject invalid mutations and report unknown consequences as unknown. This remains a written proposal, with no puzzle generation, final-set access or Phase C launch.
