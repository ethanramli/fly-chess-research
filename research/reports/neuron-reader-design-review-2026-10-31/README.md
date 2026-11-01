# neuron-reader design review, 2026-10-31

**Name:** `neuron-reader`, chosen by the researcher as the replacement name for the conversational proposal “Readout v1”. **Status:** proposed component, not implemented or validated.

Requested reviewer: GPT-6.1 Sol, reasoning effort xhigh. This is one delegated AI review, not an independent experimental audit or a claim of independent error processes. Primary-source reading and code inspection are reported below. The parent checked the wiring-count denominator, legacy v5 readout, restart-plan wording and Eyes v1 status directly.

## Recommendation and limits

Specify the passive observation contract first. Do not treat the proposed signed move score as ready. This recommendation narrows the next design task; it does not amend the approved restart plan, apply F03/F04 corrections, select a memory mechanism or authorize a graph run. No `neuron-reader` source file exists from this work.

The proposed observation types remain MBON05, MBON27, MBON09, MBON07 and MBON06. They are five types, not five individual cells. Exact identities, sampling, state preservation and failure handling still need a specification. An eventual scalar chooser additionally needs source-supported coefficients, a complete pooling/selection equation and compatibility with the separately approved learning mechanism.

The full review below preserves all nine findings. Local evidence links have been made relative; source-line locators remain in their labels. Literature access date: 2026-10-31, by the delegated reviewer. No new externally sourced mechanism has entered experimental use.

## Full delegated findings

**Specify `neuron-reader` as a passive recorder now. Hold the scalar chooser until its signs, measurement contract and memory compatibility are resolved.** The five types are anatomically motivated observation targets; improved chess choices remain untested.

**Verified defects in the stated rationale**

1. **High — The previous comparison omits MBON07 and turns anatomy into a performance claim.**

   [Wiring output:10](../../../research/reports/restart-wiring-2026-10-30/wiring-count-output.txt) supports:
   - `(1632 + 1461 + 1115) / 5495 = 76.6%` for MBON05/27/09.
   - `(1688 + 1569) / 3793 = 85.9%` for MBON07/06.

   These denominators are **counted positive visual-KC→MBON synapses**, as [wiring-count.py:37](../../../research/reports/restart-wiring-2026-10-30/wiring-count.py) shows. They are neither activity fractions nor fractions of every outgoing visual-KC synapse.

   MBON07 already appears in [brain v4:6](../../../.codebase/src/puzzle-learning/coupled-stockfish-brain-v4.mjs) and [brain v5:8](../../../.codebase/src/puzzle-learning/coupled-stockfish-brain-v5.mjs). MBON07 plus MBON14 already accounts for `1903/3793 = 50.2%` of the counted KCab-p→MBON synapses.

   **Why it matters:** “~86% versus ~6%” misdescribes the later old readout. Recorded coverage also overstates *scored* coverage whenever unknown-valence types are excluded.

   **Smallest correction:** describe the proposal as **greater direct anatomical coverage**, name the exact legacy comparator, and reserve “improves” for a matched functional comparison.

2. **High — The existing usable-strength gate cannot validate this chooser as currently written.**

   [Restart plan:109](../../../documentation/design/research-goals/restart-plan-2026-10-30.md) uses checker-supervised decoder signs and gain corners of 0.2/1.8. [ReversalMemory:74](../../../.codebase/src/neural-learning/reversal-memory.mjs) initializes gains at 1; its negative-D update at [line 83](../../../.codebase/src/neural-learning/reversal-memory.mjs) cannot raise them above 1. [AlphaLobeMemory:111](../../../.codebase/src/neural-learning/alpha-lobe-memory.mjs) only depresses its alpha gains.

   The [existing correction draft:73](../../../research/reports/overnight-memory-plasticity-2026-10-31/pre-data-corrections.md) recognizes this, but [line 3](../../../research/reports/overnight-memory-plasticity-2026-10-31/pre-data-corrections.md) explicitly says nothing is applied.

   **Why it matters:** an oracle intervention can bound signal accessibility; it does not demonstrate endogenous learning or validate a fixed behavioral score.

   **Smallest check:** keep the recorder independent of that intervention. Before using the gate for a chooser, resolve its already documented gain-range and polarity issues prospectively. This review changes no gate.

**Underspecified choices**

3. **High — A complete source-resolved behavioral sign table is missing.**

   Existing code illustrates the distinction: [ReversalMemory:98](../../../.codebase/src/neural-learning/reversal-memory.mjs) explicitly separates negative modulatory polarity from negative reward. The [source register:444](../../../research/literature/source-solution-register.md) describes −MBON07 as an engineered depression-based readout convention.

   The inspected primary material supports the following narrower conclusions:

   | Type | Evidence established in this review | Scoring implication |
   |---|---|---|
   | **MBON05** | Single-type activation supports avoidance in Aso’s assay. [Aso 2014, Results/Figs. 2–3](https://elifesciences.org/articles/04580) | A negative contribution has behavioral support, with assay limits. |
   | **MBON06** | MBON05+06 coactivation drives avoidance; inspected text does not isolate MBON06’s contribution. [Aso 2014, Video 2/Table 2](https://elifesciences.org/articles/04580) | A separate fixed sign remains insufficiently resolved here. |
   | **MBON07** | Activation inhibits identified UpWiNs; reward conditioning reduces its response. [Aso 2023, Fig. 4/Results](https://elifesciences.org/articles/85756) | Supports a negative contribution to that pathway, not a universal behavioral or chess sign. |
   | **MBON09** | Aso’s activation drivers group MBON08/09; their composition varies across flies. [Aso 2014, Fig. 2 legend](https://elifesciences.org/articles/04580), [Shuai 2025, Fig. 11](https://elifesciences.org/articles/94168) | A clean isolated approach sign was not established. |
   | **MBON27** | Li identifies visual specialization and proposes a possible avoidance-steering role; the atypical-cell function remains a hypothesis there. [Li 2020, atypical MBONs/Discussion](https://elifesciences.org/articles/62576) | **Unknown**; acetylcholine prediction cannot supply “approach.” |

   **Why it matters:** neurotransmitter identity, fast synaptic polarity, DAN reinforcement and plasticity direction cannot substitute for behavioral valence.

   **Smallest fix:** attach the exact assay, manipulation, cell group and evidence strength to each proposed coefficient. Keep unresolved cells recorded and unscored. These findings do not establish that stronger evidence is absent from all later literature.

4. **High — “Individual activity” lacks a numerical measurement contract.**

   [SparseTrainer:74](../../../.codebase/src/supervised-baselines/trainer.mjs) implements finite-step rate dynamics. It can reset initial activity, uses a rectified saturating activation at [line 108](../../../.codebase/src/supervised-baselines/trainer.mjs), and returns head predictions at [line 119](../../../.codebase/src/supervised-baselines/trainer.mjs). The old reader instead samples endpoint `h[steps]` in [brain v5:53](../../../.codebase/src/puzzle-learning/coupled-stockfish-brain-v5.mjs).

   **Why it matters:** endpoint activity, time average, baseline-subtracted response and head prediction are different observables. Rectifying baseline differences would also discard suppression.

   **Smallest fix:** specify the sampled array/window, initialization, baseline treatment, precision, step count and finite-value rules. Pin normalization, recurrent scale, bias, leak and saturation. Call the result **model rate activity in declared units**, not spikes, Hz or biological duration without calibration.

5. **High — Candidate evaluation needs an explicit boundary between transient activity and lasting memory.**

   [MappedPuzzleBrain:59](../../../.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs) fingerprints memory before candidate assessment and checks it afterward. [SparseTrainer:87](../../../.codebase/src/supervised-baselines/trainer.mjs) resets activity when no initial state is supplied. Meanwhile, [Gamma4Memory:59](../../../.codebase/src/neural-learning/mushroom-body.mjs) advances persistent traces and time.

   **Why it matters:** candidate order could affect scores if activity carries over; resetting too much could erase the very memory being measured. Advancing a future slow-state mechanism during inspection could also change learning state without a weight update.

   **Smallest fix:** define a common transient starting state for candidate comparisons, preserve the complete lasting state, copy measurements before reused arrays change, and prohibit observation/update/clock advancement during recording unless separately specified. Later verification should check unchanged fingerprints and candidate-order invariance.

6. **Medium — Five type names do not identify the observation population.**

   The existing [cell-resolved report:12](../../../research/reports/memory-retention-continuation-2026-10-31/feedback-path-feasibility-v1.json) reports **14 cells**: 2/2/4/4/2 for MBON05/27/09/07/06. Static annotation inspection agrees.

   Hemisphere selection is consequential: [mushroom-body.mjs:28](../../../.codebase/src/neural-learning/mushroom-body.mjs) documents MBON05’s contralateral dendrites. Its left-soma annotation also has differing curated and predicted transmitter labels at [annotation line 36883](../../../.cache/flywire-annotations-v2.1.0.tsv).

   **Why it matters:** one arbitrary representative, all cells, and a soma-side subset produce different readers.

   **Smallest fix:** freeze a root-ID roster with graph indices, annotation revision, soma side and anatomical receiving side where established. Preserve uncertain labels; do not silently drop cells or rewrite graph signs.

7. **Medium — “No fitted weights” does not specify aggregation or selection.**

   [mbon-readout.mjs:2](../../../.codebase/src/neural-learning/mbon-readout.mjs) averages populations; [AlphaLobeMemory:151](../../../.codebase/src/neural-learning/alpha-lobe-memory.mjs) applies equal coefficients to type means. Summing individual cells would instead give four-cell types twice the representation of two-cell types. The [restart plan:51](../../../documentation/design/research-goals/restart-plan-2026-10-30.md) additionally requires seeded stochastic choice at fixed temperature.

   **Why it matters:** cell pooling, normalization and score scaling change preferences and exploration even without fitted coefficients. A common baseline offset cancels in pairwise ranking but does not create a calibrated good/bad zero.

   **Smallest fix:** state one complete equation and its missing-data behavior, then specify temperature, seed, ties and numerical tolerance. Preserve individual observations beside aggregates. Keep candidate preference distinct from position value.

**Untested risks**

8. **High — Compatibility with the separate memory mechanism is unproved.**

   The memory anatomy proposal names MBON32/35 as its approach side at [visual-pathway.md:38](../../../research/reports/overnight-memory-plasticity-2026-10-31/anatomy/visual-pathway.md), while [line 49](../../../research/reports/overnight-memory-plasticity-2026-10-31/anatomy/visual-pathway.md) explicitly leaves their valence unresolved. Neither is in this five-type reader.

   **Why it matters:** independently plausible recorder and memory designs need not form a usable learning system. After unknowns are excluded, a complementary pathway for lowering versus raising preference has not been established. This does **not** mean scores must straddle zero to rank moves.

   **Smallest prospective check:** reconcile observed cells with the separately approved memory targets. Then test whether supported feedback pathways produce both appropriate directions of candidate-margin change within reachable states. Do not change the fixed observation set or the other session’s mechanism silently.

9. **Medium — Useful signal and an end-to-end Eyes chooser remain untested.**

   [Eyes v1:40](../../../documentation/design/chess-input/eyes-v1.md) states that the frozen renderer has not run through the full graph. Earlier weak/saturating signals used another rendering. More direct synapses do not establish candidate discrimination under normalized recurrent dynamics.

   Legacy integration also needs care: [brain v5:53](../../../.codebase/src/puzzle-learning/coupled-stockfish-brain-v5.mjs) hardcodes the old aggregator; [brain v3:53](../../../.codebase/src/puzzle-learning/coupled-stockfish-brain-v3.mjs) encodes a null action, whereas [Eyes v1:85](../../../.codebase/src/chess-input/eyes-v1.mjs) requires a legal candidate.

   **Smallest prospective check:** specify a clean candidate-recording path rather than modifying frozen callers. In later authorized evaluation, compare readers on identical Eyes inputs, snapshots and compute, reporting individual responses, saturation, margins and ties.

**Scope and verdict:** inspected the requested instructions, restart/Eyes documents, readout and memory implementations, relevant caller/factory paths, current status, weakness review, decoder code/results, wiring scripts/results, source register, archived memory report and current static anatomy evidence. Browsed selected primary text and legends from Aso 2014, Li 2020, Aso 2023 and Shuai 2025. No files changed; no tests, training, graph propagation or graph recount ran. One metadata query failed from shell quoting and succeeded via stdin. An initial PDF screenshot request timed out; figure panels were not visually audited.

**Recording-only specification: ready to write with the explicit contracts above. Scalar chooser: not ready.** Parent’s smallest next action: record the passive-reader scope and the corrected anatomical comparison.


## Parent correction and next design task

The earlier statements that the old readout was nearly blind, that the proposed reader would prevent a failure caused by the observation choice, and that its choices would remain near random were stronger than the evidence. The later legacy reader includes MBON07. The percentages count positive visual-KC-to-MBON synapses within the counted population, not transmitted activity or all visual-KC output. Neither useful discrimination nor improvement has been measured with frozen Eyes v1. Excluding unknown-valence types from a future score also reduces scored coverage below recorded coverage.

The next bounded task is to write a passive-reader contract: pin the complete cell roster and identity hashes, the sampled model-rate observable and units, transient initialization, preservation of the complete persistent state, copied output and finite/missing-data behavior. A later implementation should verify unchanged state and candidate-order invariance before any functional comparison. This review does not prescribe a new memory rule, anatomical sign or numerical gate.

[Decision and mistake record](../../journal/experiments/2026-10-31-neuron-reader-design-review.md) · [Current status](../../../documentation/current-status.md)

## Researcher-directed plan update, 2026-10-31

The researcher subsequently requested an edit to the actual plan. [Restart plan section 4A](../../../documentation/design/research-goals/restart-plan-2026-10-30.md#4a-neuron-reader-observation-first-then-a-justified-move-score) now defines the recorder, scalar-score prerequisites and build order. This supersedes the earlier recommendation-only state for planning purposes; implementation and validation remain pending. The [exact prior plan](restart-plan-before-neuron-reader-update.md) is preserved at SHA-256 `5a61c183cd98b2f152d227b5b8716b47ff6f0c776e2da4c92ea04b391f64d834`. Its relative links retain their original base, `documentation/design/research-goals/`; the snapshot is not rewritten. Existing experiment numbers and F03/F04 proposals are unchanged.
