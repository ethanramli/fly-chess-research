# Pre-data corrections F03 and F04 (draft for the researcher)

2026-10-31. **Reviewable draft only. Nothing here is applied.** The restart plan, its test gates and all data are unchanged. Plan header: section 7 numbers may change only from the decoder check, before any graph data exists, and this draft asks for that decision. Findings: [weakness review](../research-weakness-review-2026-10-30/README.md).

## F03: "en passant recapture" cannot exist in this task

**Problem.** Plan section 8 lists "en passant recapture" as a new test kind. The task is: after this capture, can the opponent legally capture back on that square? Under FIDE Laws Article 3.7, en passant is available only immediately after a two-square pawn advance. That advance is not a capture, so a reply to a capture can never be en passant. Also, the certificate counts a recapture only when `reply.to === target`, and an en passant capture lands away from the pawn it removes.

**Checked.** [f03-check.mjs](corrections/f03-check.mjs), output [f03-check-output.json](corrections/f03-check-output.json), using the existing certificate code:

| Check | Result |
|---|---|
| En passant replies after a capture, in random playouts (23,865 positions, 95,289 captures) | **0** |
| Detector works: en passant replies seen after double pushes in the same games | 104 |

This confirms the logic on sampled positions and shows the detector can see en passant. The proof itself is the rule argument above, not the sampling.

**Proposed correction.** Replace the family with **"initial en passant capture, then an ordinary recapture of the capturing pawn."** Family counts stay as they are: 30 new-kind pairs across 5 kinds.

| Twin | FEN | Move | Certificate |
|---|---|---|---|
| Unsafe | `4k3/2p5/8/3pP3/8/8/8/4K3 w - d6 0 2` | e5d6 e.p. | failure, recaptures `c7d6`, target `d6`, verified |
| Safe | `4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2` | e5d6 e.p. | success, no recaptures, target `d6`, verified |

Both exemplars pass the producer and the separate checker, and leave the board unchanged.

**Points the researcher should know:**

1. These FENs are hand-built fixtures that show the family can exist. The real generator must take them from actual games with real history, since en passant depends on the previous move. That generator is not written.
2. The rendered image needs no change: the eyes see the board after the move, with the captured pawn gone from a third square.
3. Alternatives rejected: removing the family (shrinks the promised new-kind coverage), or redefining recapture to allow other squares (changes the task and both certificate files).
4. The certificate shares `chess.js` with its checker (finding F11), so this check does not independently validate the rules engine. The FIDE argument does that for this case.

**Check before accepting:** generator produces both twins from training-pool games, audited by the checker. Do not touch sealed examples, and generate before sealing.

## F04: the eye test measures less than its question, and its gain corner is unreachable

### Part 1: a "No" does not mean the information is absent

**Problem.** Ledger L125: the plan's linear L2 decoder stayed at chance on a made-up XOR-style signal at every strength up to s = 1.6. So "Graph at most 30/48" cannot mean "the brain's response lacks the answer".

**Proposed correction.** Keep the linear decoder as the gate, and narrow what the result means. Reason: the only way this project's memory can use KC activity is through KC-to-MBON gains, which is a bounded linear readout of KC activity. So linear access is the right question for this learner. A signal only a nonlinear decoder can see is not usable by this rule, on this readout. Changes in wording only:

| Plan row | Current meaning | Proposed meaning |
|---|---|---|
| Yes | Brain's response contains the answer | Answer is linearly readable from KC activity, in the sense this memory could use |
| No | Stop and talk | Stop and talk: **no linear access found.** Information may still exist in another form. Not evidence that the graph lacks it |

Optional addition, not required for the memory path: one report-only nonlinear decoder, with its own null and held-out evaluation, proven on the L125 XOR data before use. Report-only so it cannot rescue a failed gate.

Rejected: making a nonlinear decoder a gate. It would pass signals this memory rule cannot use.

Researcher decision needed: **accept the narrowed meaning.** Without it, a "No" gets over-read.

**A related risk for Phase C.** [combination-test-spec.md](combination-test-spec.md) item 7: the same linear limit may block conjunctions of concepts. This belongs with Phase C and does not change the eye test.

### Part 2: gain 1.8 cannot be reached

**Problem.** Plan section 7 sets KC-to-MBON gains to "the allowed limits (0.2 or 1.8)". But no rule on hand can reach above 1.

**Checked.** [f04-reachable-check.mjs](corrections/f04-reachable-check.mjs), output [f04-reachable-output.json](corrections/f04-reachable-output.json), 20,000 random frames per rule:

| Rule | Largest gain | Frames above 1 |
|---|---|---|
| `ReversalMemory` | 1 | 0 |
| `AlphaLobeMemory` | 1 | 0 |
| `local-gated-v1` | 0.99998 | 0 |

Analytic reason for `ReversalMemory`, from F04: with `a = -eta*dt*D` in [0,1], `g' = (1-a)*g + a*(1-k)`, a convex mix of `g` and a number at most 1. So `g <= 1` is invariant. `AlphaLobeMemory` only falls. `local-gated-v1` has `gMax = 1` by construction, and `gStar` is a convex mix of 0.2 and 1. Sampling supports this but the algebra is the argument.

**Proposed correction.**

1. Use limits **0.2 and 1.0**: for a KC whose decoder weight favours "safe", approach-side edge at 1 and avoid-side edge at 0.2. Opposite for "unsafe". Keep the 10% of tokens threshold, and apply the same corner to the tokens measure so the ratio stays comparable.
2. Label the result **"reachable-range upper bound, oracle signs"**. The decoder signs come from checker labels, so this is an intervention to measure signal strength. It is not learning, and it says nothing about whether the rule can get there.
3. Report every MBON separately. For KCg-d the avoid side (MBON05, 1632 synapses) outweighs the approach side (MBON32 and MBON35, 539 synapses), see [visual-pathway.md](anatomy/visual-pathway.md).
4. Name the sides. The plan's list (MBON05, 27, 09, 07, 06) does not say which is approach and which is avoid, and the corner needs that. The MBON27, 09, 07 and 06 assignments have no valence evidence read in this run. Proposal: gate on the γ2/γ4 pair and report the others without a gate.

**Effect on the pass mark.** Capping at 1 lowers the Graph and Tokens measures. If the gain range shrinks both proportionally, their ratio holds. That is an assumption until the eye test runs, because the graph is recurrent and nonlinear.

**Rejected:** keeping 1.8 as an explicit upper bound. It measures a state that the rule cannot reach, and F04 asks for attainable states first.

**Dependency.** If the researcher later approves a rule with `gMax` above 1, this limit changes with it, and the eye test must use the same limit. So the rule's range needs to be fixed before the eye test runs, which is the reason for this run's order pivot.

### What the correction does not fix

Other weaknesses in the review (F06, F07, F10) stay open. A proposed nonlinear same-input learner belongs to the comparator design, and a precision analysis for 48 pairs belongs to the registration.
