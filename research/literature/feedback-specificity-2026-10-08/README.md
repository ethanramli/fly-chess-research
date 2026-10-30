# Feedback specificity: a concrete repair candidate, without training

2026-10-08. Research and saved-artifact analysis only. No graph inference, training, engine run, physiological replacement or final-family inspection occurred. Exa returned 40 result slots across eight searches in four areas: representation/local plasticity, model assumptions, MiMo, and Stockfish. These were 40 distinct URLs, not 40 independent studies; mirrors and irrelevant results were excluded from the synthesis. Primary-source extracts and access limits are preserved in [source evidence](source-evidence.jsonl).

**Recommendation: combine the existing separated action-context cues with the existing adaptive current-error teacher, while explicitly measuring selective promotion and preservation.** The latest saved screen suggests separation already enables a selective positive response, but its fixed lessons target an obsolete mistake under the new encoder. This combination is an untested repair candidate, not a demonstrated solution. A receptor-level redesign is a conditional follow-up, not the first patch justified by the present evidence.

## What the actual artifacts change

The historical adaptive run used overlapping public cues and eight lessons; its completed independent audit found no correct final choices. The newer conjunction screen uses two encoders at equal eight-cell/current-12 dose and four lessons. It has a saved terminal result, but no independent `audit.json` was present when inspected. Its protocol explicitly fixes Qe6/Qh7 lessons rather than adapting to the new encoder's choice. Those differences prevent attributing a cross-run result purely to representation or teaching policy.

The new conjoined encoder initially selects **Kf6**, not Qe6. Its teacher still presents **Qe6, Qh7, Qe6, Qh7**. After these lessons, Qh7 outranks Qe6, but Kf6 remains the top failure:

| Saved conjoined informative comparison | Before | After |
|---|---:|---:|
| Qh7 score minus Qe6 score | -0.00192805 | +0.00328737 |
| Qh7 score minus Kf6 score | -0.00490733 | -0.00421466 |
| All-legal selected action | Kf6, failure | Kf6, failure |

The two Qh7 reward events yield selective lifts of approximately **0.0004520** and **0.0002768** relative to the median score change of 24 other legal moves, beyond the no-channel trajectory. With the contemporary baseline encoder, the same metrics are about **0.0000000386** and **0.0000000374**. This is evidence in saved outputs of positive discrimination under the conjoined condition; the older claim that feedback only demotes errors does not describe every later condition. It is not proof of durable acquisition or transfer.

The first Qe6/Qh7 eligibility-vector cosine is about 0.84359 under baseline and 0.00001997 under conjunction. However, the number of shared positive eligible-edge entries increases from 26 to 38. Tiny recurrent tails and duplicate KC identities across different edges make support counts alone misleading. These are consecutive-event traces, not an independently controlled fixed-memory comparison.

[Reproducible arithmetic](analyze-saved-receipts.mjs) and [hash-bound output](saved-receipt-analysis.json) verify receipt hashes, protocol/result identity, memory continuity and candidate ordering using existing JSON only. They do not independently replay neural dynamics or certificates. Later event contrasts compare diverged informative/control memories, so they are trajectory contrasts, not isolated causal pulse effects.

## The smallest repair worth specifying

Keep the present learner equation, released graph and fixed readout for the first comparison. Reuse `createConjoinedPublicMateFrameEncoder`, the current-error selection logic in `run-adaptive-mate-error.mjs`, and the existing certificate/sequence receiver. Do not modify frozen sources or resume old memories under changed identities.

For each bounded training block:

1. Rank **all legal actions at the current memory under the actual encoder**. If the unique chosen action has a verified failure, teach that action. In the current conjoined fixture this starts with Kf6, not historical Qe6. Ties, missing proof or exhausted verification must follow a predeclared rule; unknown provides no pulse.
2. Pair it with a separately verified successful alternative and deliver each as its own certified sequence with its own action tag. Do not select or force neural cells from the answer. The teacher supplies experiences and consequences, never gain deltas.
3. Re-rank after the completed pair. Record Qh7/other certified successes versus the strongest **current** failure, not just versus the taught old mistake. Retain every legal action at assessment. Measure positive promotion, error demotion and prior-choice preservation separately.
4. Recheck earlier learned training contexts after intervening lessons. A changed top move is not success; a single repaired puzzle is not retention or transfer. Use existing certified preservation rehearsal as a separately budgeted experience, with the same exposure in all controls. If there is no independently demonstrated learned sentinel, report that limitation instead of inventing retention evidence.

Prepare a fresh equal-budget comparison of fixed versus adaptive lessons under the same conjoined encoder, initialization, dose and rule. Repeat the informative schedule exactly in each causal control, including the informative teacher's selection-assessment exposures. A predetermined cap must include target selection, full legal rankings, replay frames, preservation checks and independent audit. Do not quietly compare four fixed lessons to eight adaptive lessons. Archive old results and label the new comparison as a new version.

This can repair the immediate mismatch between what the learner currently gets wrong and what the teacher reviews. It may still fail because the output bias is large, updates interfere, or the representation fails to generalize. No training was authorized or performed in this review.

## What the biological literature adds

**Discrimination must survive the entire pathway.** Lin et al. experimentally connected KC/APL feedback inhibition to sparse coding and discrimination of similar odors. This supports examining neural activity separation, not just distinct input tokens. It does not prescribe eight active KCs or authorize changing FlyWire wiring. [Lin et al., 2014](https://www.nature.com/articles/nn.3660).

**Local reinforcement specificity has additional mechanisms.** Manoim et al. found that KC axonal mAChR-B signaling suppresses calcium/cAMP responses and protects the value of an unreinforced odor. The important analogy is protection against inappropriate cross-stimulus learning, beyond merely providing different inputs. Detailed effects were particularly examined in gamma KC axons; they cannot simply be assigned to the project's alpha-prime/beta-prime PAM02 reward mask. [Manoim et al., 2022](https://www.cell.com/current-biology/fulltext/S0960-9822(22)01451-8).

**Distinct input patterns need not produce distinct single-cue MBON outputs.** Modi et al. found discrimination information in KC activity even when isolated MBON responses generalized; the order and identity of available stimuli affected memory specificity. This makes the fixed independent-candidate MBON subtraction another hypothesis to inspect if the minimal combined teacher fails. It does not validate an engineered pairwise comparator. [Modi et al., 2023](https://elifesciences.org/articles/80923).

**A generic dopamine pulse does not specify the physiological update.** Handler et al. demonstrated timing- and receptor-dependent depression/potentiation. Yamada et al. found activity-dependent cAMP-associated depression and cGMP-associated potentiation, with subtype differences. These motivate compartment-specific bidirectional dynamics, not arbitrary negative reinforcement rates, universal omission recovery or a hand-tuned learning rate. [Handler et al., 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC9012144/); [Yamada et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11068490/).

The current delayed update, away from clipping, is:

`g_next = (1-e) + (g-(1-e)) * exp(-eta * d * dt)`

Here `e` is the decaying root-action tag and `d` is measured group DAN excess. When `e=0`, `g<1`, and `d>0`, a previously depressed edge recovers toward one despite no current tag. That is intentional in this source-derived comparison, not proof of a coding bug. Stronger feedback amplifies movement toward `1-e`; it does **not** mathematically guarantee improvement in the correct-action margin. Existing recovery-removal failures rule out treating deletion of recovery as an established repair.

If combined cue/teacher correction fails, first localize whether useful information is lost in eligibility, channel-specific gain changes, or the fixed readout. Then consider source-supported local modulation or comparison-dependent readout as **separate factors**. Before modeling mAChR-B, resolve the mapped KC subtypes, available KC-to-KC contacts and receptor/compartment evidence. The current coarse mapping lacks receptor identity and synapse-coordinate compartment annotation. Preserve graph signs: inhibitory biochemical modulation cannot be implemented by silently flipping all cholinergic connection signs. A bounded added receptor state would be an explicit physiological hypothesis, with its own source and memory contract.

Do not replace the current rule with the earlier depression-only eligibility proposal: it already failed the specified synthetic equal-dose reversal test. Nor should the teacher optimize neural parameters to maximize the measured margin. The evaluation statistic measures whether endogenous learning works; it is not a permitted external update rule.

## Why MiMo and Stockfish have not supplied the missing guarantee

MiMo uses executable reward checks, partial credit and policy optimization on a pretrained language model. Borrow criterion verification and informative problem selection. Its gradient-based policy update supplies credit assignment that the present biological approximation does not inherit from copying the reward format. Partial reward for checking the king must not masquerade as solving mate. [MiMo report, sections 3.2-3.3](https://arxiv.org/html/2505.07608).

Stockfish's NNUE training explicitly optimizes a value loss against evaluation/game-result targets. A more accurate target alone cannot make our local update minimize that loss. Its own documentation also distinguishes score conversion, targets and optimization. Preserve authorized engine-assisted value teaching as a declared separate condition after establishing a matching neural value output and perspective. A centipawn score is neither a mate proof nor a biological dopamine measurement. [Official NNUE guide](https://official-stockfish.github.io/docs/nnue-pytorch-wiki/docs/nnue.html#loss-functions-and-how-to-apply-them).

Predictive learning is itself mechanistically unsettled: Zhao et al. compare target-driven and error-driven circuit models. This supports explicitly specifying a prediction/readout/update relationship, not asserting that every DAN must encode a numerical reward prediction error. [Zhao et al., 2021](https://www.nature.com/articles/s41598-021-85841-y).

## Correct the control, not just its name

There is a factual correction to the historical summary: the saved adaptive permutation and all eight hash-checked shuffled receipts preserve **6/8 labels (75%)**, not 4/8. Qh7 still receives positive feedback 3/4 times, Qe6 negative feedback 2/3 times, and Kh6 negative feedback 1/1. This particular schedule plainly retains action/consequence contingency. The raw files remain unchanged; the [journal](../../journal/experiments/2026-10-08-feedback-specificity-research.md) records the correction.

A completely swapped balanced binary schedule is useful as an **anti-correlated control**. It tests reversed instruction, not absence of informative contingency. Roughly 50% label agreement can be expected under a balanced independent null; requiring zero agreement would reject a legitimate null. Therefore retain separate questions:

| Condition | What it tests |
|---|---|
| Informative | Correct consequence-linked feedback |
| No external channel | Exposure and endogenous activity; plasticity can still occur |
| Disabled plasticity | Effects without persistent gain updates |
| Contingency-balanced shuffled/yoked | Same cue/timing/pulse budget but no systematic cue-outcome association |
| Fully swapped | Learning under deliberately reversed contingencies |

Predeclare shuffle construction, cue/task strata, pulse counts/magnitudes and a contingency audit. With very small or odd per-cue counts, exact balance can be impossible. Use a predetermined matched schedule or multiple prespecified permutations and report the remaining imbalance. Never choose a shuffle because its measured performance is weak. This is an experimental-design recommendation, not a new biological claim.

## What remains unproved and the stopping rules

The next candidate must jointly pass useful all-legal correction, preservation across intervening lessons, causal reset/restoration and control separation before unfamiliar/counterfactual testing. Freeze numerical criteria, finite budgets, projection-seed replications and validation rules before any future run. Do not cherry-pick input seeds or keep repeating until one passes. Use only training evidence for adaptive selection, validation for bounded checkpoint selection, and untouched final families once.

Completely decorrelating absolute move hashes can help memorization while harming reusable structure. The existing conjoined encoder is a mechanism probe, not an established transfer representation. Prior relational and bound-ray failures remain relevant. Later transfer must include changed consequences despite similar appearance and preserved consequences under changed coordinates; no arbitrary hash feature or teacher-derived safety flag can substitute for that test.

The present recommendation is concrete and falsifiable: **separated cues plus current-error correction, with measured solution promotion and preservation**. If that fails under the frozen budget, the next decision depends on where selectivity is lost; research does not justify more repetitions by default or promise that a new receptor equation will solve chess.

## Source access and provenance

All access dates: 2026-10-08. These are primary experiments, author reports or official technical documentation. Search results were discovery material; citation counts, search ranking and provider summaries were not treated as validation.

| Source | Coverage actually accessed | Adaptation / status |
|---|---|---|
| Lin et al. 2014, Nature Neuroscience | Publisher/indexed abstract and PubMed abstract/figure text; no complete methods audit | Neural sparsity/discrimination criterion; existing graph untouched |
| Manoim et al. 2022, Current Biology | Exa publisher extraction through results on axonal calcium and cAMP, capped at 45,000 characters; direct web request 403; supplements not reviewed | Conditional receptor-specific locality investigation, not implemented |
| Modi et al. 2023, eLife | eLife publisher mirror abstract/results/figure text, 45,000-character cap; canonical URL challenged | Conditional comparison/readout investigation, not implemented |
| Handler et al. 2019, Cell | PMC text through results and beginning of discussion, 45,000-character cap | Timing/bidirectionality constraints; exact chess mapping unsupported |
| Yamada et al. 2024, Journal of Physiology | Indexed PMC abstract/key points; fetched text also includes references, not complete methods | Activity and subtype constraints; no imported equation |
| MiMo team, 2025 report | Official repository and arXiv HTML, especially sections 3.2-3.3 | Verified criteria/teacher selection only; no gradient learner transplant |
| Stockfish NNUE guide | Official documentation, loss/target sections | Explain target-versus-update distinction; no engine run |
| Zhao et al. 2021, Scientific Reports | Publisher abstract and model/results text, 45,000-character cap | Alternative predictive mechanisms; no settled RPE claim |

The 40 search-result URLs include duplicate studies at different locations and additional model papers not used to justify implementation. [Raw search/fetch responses](source-evidence.jsonl) preserve that distinction. Supporting project files remain the original [adaptive report](../../../archive/early-development/research/reports/adaptive-mate-error-v1-2026-10-08/README.md), [conjunction protocol](../../../archive/early-development/research/data/mate-conjoined-input-v1/protocol.json), [saved conjunction result](../../../archive/early-development/research/reports/mate-conjoined-input-v1-2026-10-08/result.json), [delayed rule](../../../.codebase/src/neural-learning/delayed-reversal-memory.mjs), [sequence receiver](../../../.codebase/src/puzzle-learning/delayed-lesson-brain.mjs), and [failed depression-only prerequisite](../../../archive/early-development/research/reports/selective-credit-prerequisite-v2-2026-10-08/README.md).

2026-10-08 plasticity follow-up: [where this can fail and a bidirectional mechanism specification without frozen learned weights](../../../documentation/design/neural-learning/bidirectional-plasticity-without-freezing.md). This adds analytical limitations and physiological research; it does not run training or make the earlier curriculum recommendation a solved plasticity claim.
