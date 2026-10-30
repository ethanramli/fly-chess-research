# Fushiki's four papers: implications for current roadblocks

2026-10-07, Asia/Jakarta. Source-grounded assessment, not a validated replacement learner. [Access evidence](../../archive/early-development/research/reports/fushiki-literature-review-2026-10-07/access-evidence.json) records coverage and restrictions. [Raw development-receipt summary](../../archive/early-development/research/reports/fushiki-literature-review-2026-10-07/receipt-summary.json) is independent arithmetic on six failed reviews and one positive replay, without graph inference. [Proposed next study](../../documentation/design/neural-learning/compartment-memory-diagnostics.md) separates diagnostics from mechanism changes.

## What Dr Fushiki actually advised

[Email](https://mail.google.com/mail/u/#all/1a1127ee4d66de84), received October 7 at 01:34 Jakarta time: distinguish dopamine populations by targets, learning rules and inputs; compare separate versus shared signals on acquisition and reversal. He suggested the papers below, particularly Aso and Rubin. He offered possible future discussion and introductions, without confirming ongoing mentorship. This is methodological advice, not endorsement of our current mapping, equations or chess claims.

The email answered an October 4 project description. The project has since passed a separately frozen balanced two-valence association test and one single-seed familiar-puzzle acquisition test. The current implementation already has separate PAM02/PPL103 stimulation and per-edge memory. Its remaining limitations include shared kinetics, coarse compartment masks, endpoint-only feedback, returning previously corrected mistakes, delayed attribution and disjoint transfer.

## 1. Aso and Rubin, 2016: strongest biological guide

[Dopaminergic neurons write and update memories with cell-type-specific rules](https://pmc.ncbi.nlm.nih.gov/articles/PMC4987137/), eLife 5:e16135, DOI 10.7554/eLife.16135.

Read full main text, Methods, Figures 1–5 and included supplement captions through PMC; publisher page was challenged. Not inspected: videos, confocal stacks or apparatus PDF.

Optogenetic manipulation separates memory components across mushroom-body compartments. Acquisition, retention, unpaired-stimulation effects and replacement of older associations differ. PPL1-gamma1pedc supports rapidly updated memory, whereas PAM-alpha1 can preserve multiple associations. Timing changes the behavioral effect of a single DAN type. Combining these compartments produces conflicting memories whose behavioral expression changes over time.

**Project inference:** two named teaching channels do not imply two physiologically distinct memory processes. Our gains use the same eta, bounds and recovery equation across groups. Test whether the reduced mechanism preserves useful corrections under unrelated teaching and can reproduce independently sourced compartment differences.

**Limits:** the paper does not identify the molecular mechanism generating these differences or prescribe our exact update equation. Its clearest fast/stable comparison is not our PPL103/PAM02 pair. Some measurements activate multiple DAN types. Do not transfer its timescales to those released neuron identities, infer that every compartment has distinct kinetics, or interpret CPU rest as consolidation.

## 2. Jiang and Litwin-Kumar, 2021: feedback and recovery tradeoffs

[Models of heterogeneous dopamine signaling in an insect learning and memory center](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009205), DOI 10.1371/journal.pcbi.1009205.

Read publisher main text, Methods and figure captions, including supplemental reversal caption. Extracted equations lose notation; no equation is implemented from that extraction. Separate supplement files and model code were not inspected.

The model combines dopamine-gated KC-to-MBON plasticity, timing traces and recurrent output/feedback circuitry. Basic association can succeed without recurrence; extinction and second-order conditioning require recurrence in their tested architectures. Prediction-error structure appears across the DAN population. For continual learning, non-specific potentiation prevents widespread depression but can shorten memory lifetime.

**Project inference:** test the balance between recovery and maintaining earlier corrections, and inspect mapped feedback responses during omission. This supports diagnostics of our rebound, not deleting recovery wholesale or fabricating an omission pulse. Preserve individual DAN activity in future diagnostic records instead of assuming the group mean contains all relevant information.

**Boundary:** recurrent/external/readout weights and biases are optimized by gradient descent, using RMSprop, before the local-plasticity test phase; the model is not our released full connectome. Its successful behavior does not show an unoptimized fixed circuit will acquire the same capability. Importing that optimization as our learner would violate the current objective; it could only be a labeled engineering comparison.

## 3. Dabney et al., 2020: useful distinction, lower immediate priority

[A distributional code for value in dopamine-based reinforcement learning](https://www.nature.com/articles/s41586-019-1924-6), DOI 10.1038/s41586-019-1924-6. [Published PDF mirror](https://princetonuniversity.github.io/NEU-PSY-502/_static/pdf/Class%208/Dabney2020.pdf).

Read published PDF main results and Methods plus publisher extended-data captions. Publisher main body is restricted. Separate Supplementary Information and raw OSF data/code were not inspected; extraction has column/equation artifacts.

Mouse VTA recordings support different optimistic/pessimistic reward predictions and asymmetric prediction-error responses. Their combined activity can encode a reward distribution; noise alone does not reproduce the tested pattern. Distributional diversity concerns different predictions about the same reward, rather than separate positive/negative feedback channels.

**Project inference:** preserve response heterogeneity when measuring teaching signals; later, probabilistic consequence tasks could test whether a population contains uncertainty information. Current binary certified-mate fixtures do not provide the needed outcome distribution.

**Limits:** mouse evidence does not assign expectiles to FlyWire DAN identities. No quantile heads, distributional DQN or teacher-calculated TD parameter deltas are proposed as a biological fix. This paper does not solve delayed chess credit merely because its abstract algorithm can represent multi-step returns.

## 4. Litwin-Kumar and Turaga, 2019: anatomy constrains, physiology remains unknown

[Constraining computational models using electron microscopy wiring diagrams](https://www.sciencedirect.com/science/article/abs/pii/S0959438818302174), DOI 10.1016/j.conb.2019.07.007. [Author-hosted published PDF](http://lk.zuckermaninstitute.columbia.edu/pdf/litwin-kumar_constraining_2019.pdf).

Read author PDF main text, Table 1 and Figure 1 caption; cross-checked publisher snippets. PDF column extraction is imperfect. Historical statements about available connectomes describe 2019, not current dataset completeness.

The review explains why a wiring diagram does not uniquely determine synaptic efficacy, cellular excitability, neuromodulatory action or plasticity. Multiple dynamical models can satisfy connectivity and behavior. Additional physiology and perturbation measurements help distinguish them.

**Project inference:** retain graph identities and signs, but explicitly test uncertain local rules, masks and readout assumptions. A per-edge gain can be an engineering representation; its persistence and correct graph placement alone do not validate a physiological mechanism. Require source-mapped perturbation predictions in addition to chess success.

**Limits:** the review discusses function-based optimization as one modeling method. It does not establish that such fitting is needed for our objective or authorize replacing endogenous learning. It provides a validation framework, not a ready-made remedy for the observed rebound.

## What the existing evidence says about the current bottleneck

Read live `reversal-memory.mjs`, `dual-valence-interface.mjs`, `dual-valence-puzzle-brain.mjs` and `mbon-readout.mjs` in their new topic folders. The learner has 870 eligible existing edges in four hemisphere/type groups. Gains persist per edge. DAN responses differ across cells, but each group's positive excess rates are averaged into one fixed-negative modulatory factor. All groups share one update configuration. KC and DAN activity are sampled at the endpoint; no delayed eligibility is retained. The choice interface is a fixed mean(MBON12) minus mean(MBON01), not learned strategic evaluation.

Six already-published smothered development receipts exactly reproduce the saved local equation (maximum residual zero). After the first update, later events include net recovery on 28, 48, 51, 70 and 85 edges. All six direct teaching channels are PPL103. PAM02-group changes account for at most 0.0653% of absolute gain-change magnitude in this prefix. Therefore a large cross-valence update leak is not supported by this snapshot; within-channel recovery, propagated cue activity and output ranking deserve attention together.

The saved ranking prefix shows the rejected c4b4 score dropping from 0.020617 to 0.008704, then returning to 0.013035 and 0.015752 during other reviews. This is descriptive association with recovery, not a causal demonstration. An earlier separate intervention study prevented only one of five revivals and produced no correct move. That failure remains evidence against a simple recovery-only cure.

Authoritative process inspection found PID 4688 running the original smothered acquisition invocation. This review does not modify its pinned sources, outputs, protocol or gates, and reports no final outcome. The six-event diagnostic is development-only; it cannot select a final-test checkpoint or support transfer.

## Latest published positive-event evidence

The active run published its first fixed-schedule successful c4g8 replay during this review. Independently reconstructing this seventh receipt confirms zero active KC entries across the 84 PAM02-associated eligible edges and zero changes on those edges, although PAM02 is directly stimulated. All 39 gain changes occur in PPL103-associated groups. Starting gains are one, so zero KC activity leaves no depression or recovery term on the positive edges for this particular replay.

The existing input-only preflight reports the original sacrifice cue has 0/14 cells in the PAM02-eligible pool; balanced has 7/14, at the same total current 21. All 32 balanced cues have at least seven eligible positive-pool cells, versus 11 original cues with zero. This is more specific evidence for an actionable engineering bottleneck than the earlier recovery correlation. It does not show balanced neural activation or a rescued choice. Balanced variants previously failed acquired-repair acceptance on other fixtures, so general success must not be assumed.

The adaptive phase published eight failed experiences; its shuffled valence sequence is therefore degenerate. The fixed schedule includes positive experience, but its absent/shuffled/disabled controls currently replay adaptive experiences. Consequently neither fixed-schedule improvement nor projected membership alone would establish causal acquisition.

**Updated priority:** after terminal controls and audits, compare original versus existing balanced projection on a fresh, separately frozen development protocol with identical direct-positive and negative experiences and matched controls for each exposure schedule. Measure positive eligible activity/updates, all-legal successful-choice acquisition and reset/restoration. Keep rule, readout and released graph fixed. This targets a measured cue-to-plasticity gap and follows Fushiki's target-specificity advice; the balanced hash projector itself is an engineering choice, not a mechanism provided by a paper.

## Decision

Use Fushiki's advice first to test whether a symbolic cue reaches the mapped target of its teaching channel, then diagnose preservation versus overwriting of memory and specify timing/omission tests. Retain the current experiment and original failures. After it is terminal, run the separately controlled original/balanced input comparison and existing pinned recovery intervention as distinct experiments. Only then propose a source-supported compartment/timing mechanism, with fresh acquisition, retention, reversal and controls before fresh chess-learning and transfer gates. No learning fix is claimed or installed by this reading review.
