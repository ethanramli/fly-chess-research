# Why plasticity has not become reliable chess learning

Evidence review completed 2026-10-10, Asia/Jakarta. This is the requested diagnosis of the code and methodology, using predecessors' completed runs. It does not claim that the learner has been repaired or that transferable reasoning has been demonstrated.

**The model already exhibits computational plasticity, including some useful familiar-puzzle learning. What remains unresolved is converting that adaptation into reliable choices that survive continued experience and transfer when the board changes.** The evidence identifies several concrete limitations; it does not identify one universal cause or prove that the goal is impossible.

The strongest counterexample to “plasticity cannot work” is the audited adaptive contrastive run: verified feedback changed an initially wrong all-legal choice to a certified solution, while absent, shuffled and disabled controls remained wrong. A later shared-memory experiment retained two successful familiar choices together. Both results used the existing local mechanism; neither needed imported chess weights or a fitted answer-producing decoder. Their subsequent transfer failures matter equally.

## What the previous runs actually established

Each row concerns its own mechanism and protocol. Passing an execution audit means the reported experiment was reconstructed within the audit's scope; it does not mean its learning hypothesis passed.

| Experiment | What went well | What failed or remained unresolved |
|---|---|---|
| [Gamma4 association v1](research/reports/association-validation-v1-2026-09-30/report.json), [audit](research/reports/association-validation-v1-2026-09-30/audit.json) | Persistent changes, reset/restoration and wiring checks passed; reversal choices 6/6. | Acquisition choices only 3/6; full acceptance failed. |
| [Gamma4 association v2](research/reports/association-validation-v2-2026-09-30/report.json), [audit](research/reports/association-validation-v2-2026-09-30/audit.json) | Acquisition 6/6. | Reversal 3/6; full acceptance failed. Changing that protocol did not cure the mechanism generally. |
| [Recovery comparison](research/reports/recovery-comparison-v1-2026-10-05/README.md) | All seven computational association gates passed, including 6/6 reversal and causal reset. | Different cells, cues, readout and exposure from gamma4; this comparison does not isolate recovery as the cause of success or validate biology. |
| [Positive-channel v1, resumed](research/reports/positive-channel-association-resumed-2026-10-06/report.json), [v2](research/reports/positive-channel-association-v2-2026-10-06/report.json) | Both acquired/reversed preferences; separately registered v2 passed its full controls. | V1's informative gate failed: two acquisition shuffles reproduced informative feedback. Preserve that control failure. |
| [Conjoined-balanced association](research/reports/compartment-input-conjoined-balanced-2026-10-06/README.md) | Acquisition/reversal/ranking switches 6/6; 480 transitions and 384 enabled updates audited. | Two-cue association is easier than choosing the best move among every legal action. No biological consolidation or chess transfer follows. |
| [Repeated training, 8/32/128](research/reports/training-volume-resumed2-2026-10-06/README.md) | Feedback receipts, gain recurrence and resume audited. | Both encoders failed all three learning gates at every budget. Reviewed margins improved without a correct full-root choice. |
| [Adaptive contrastive coverage](research/reports/adaptive-contrastive-coverage-v1-2026-10-07/README.md) | Wrong c4b5 became certified c4g8; informative beat all three controls, and reset removed the repair. | One familiar development puzzle. Inspected counterfactual remained wrong. |
| [Warm-start second-puzzle repair](research/reports/adaptive-near-transfer-repair-v2-2026-10-07/README.md) | One failure/success pair repaired the second familiar position above matched controls. | [Four sibling positions](research/reports/adaptive-near-transfer-repair-transfer-v1-2026-10-07/README.md): informative 0/4, worsening two success ranks relative to disabled. These were development probes, not untouched final families. |
| [Shared-memory stability](research/reports/multi-context-stability-v1-2026-10-07/README.md) | Two familiar choices ended correct together; absent/disabled retained one failure and shuffled failed both. Main and recovery audits passed. | [Sibling assessment](research/reports/multi-context-stability-transfer-v1-2026-10-07/README.md): every condition 0/4. Search solved both trained positions in absent/disabled too, so the distinctive benefit was unaided choice. |
| [Further rehearsal, 8/32](research/reports/stability-feedback-dose-v2-2026-10-07/README.md) | Complete dose/control audit. | Informative damaged the first familiar choice at both doses. Absent damaged it at 32; disabled preserved both. [Every dose snapshot failed all four siblings](research/reports/stability-dose-transfer-v1-2026-10-07/README.md). More exposure was harmful here. |
| [Capture-retention v3](research/reports/capture-retention-assay-v3-2026-10-07/README.md) | Certificates, records and enabled recurrences audited. | 5/8 final successes also occurred before teaching and under every control; final actions never changed. Counterfactual switch failed. Five nominal model seeds were functionally identical. |
| [Bound-ray feedback comparison](research/reports/bound-ray-feedback-development-completion-2026-10-08/summary.json) | All eight arms audited; some causal margin improvements. | Both informative encoders remained 4/8 on training. Relational validation fell 3/4→2/4; bound-ray stayed 2/4 through two repairs and two regressions. Pair choices only; all-legal/transfer not established. |
| [Selective-credit depression prerequisite](research/reports/selective-credit-prerequisite-v2-2026-10-08/README.md) | Inactive-edge specificity passed in a numerical assay. | Equal-dose reversal tied the stipulated readout; only 3/64 phase checks passed. Both channels approached the lower bound. This was zero graph presentations, not a fly experiment. |
| [Delayed chosen-error lesson](research/reports/delayed-mate-chosen-error-v1-2026-10-08/README.md) | Audited mate-choice deficit narrowed 71.1%; taught error fell to rank four. | Another failure became first. Endpoint deltas showed predominantly common score suppression and no relative lift of the reviewed mate. No useful mate choice. |
| [Gamma2 timing v2](runs/gamma2-temporal-hypothesis-v2/audit.json), [actual-error targeting](runs/gamma2-adaptive-target-v1/audit.json), [cap-10 cue](runs/gamma2-adaptive-cue10-v1/audit.json) | Local direction and focused margin specificity passed; swapped timing reversed the effect. | Every informative all-legal choice still failed. Cap 10 replaced one top error with another and improved the targeted margin less than cap 8. |
| [Four-pair adaptive timing loop](research/reports/adaptive-temporal-loop-2026-10-09/result.md) | Current-error retargeting, exact matched controls, real interruption/resume, 760 frame replays and 130 final graph rows audited. Direction and adaptive margin advantage passed. | UsefulChoice and causalChoice failed. Correct-move strongest-competitor gap narrowed 15.4%, but Qg8 still won. Gamma2 retention, contingency reversal and transfer were not tested. |

## The code paths explain several different blockers

### 1. Most experiments test a small plastic subsystem inside a fixed large network

The current loop calls `SparseTrainer.forward([0], stimulation)`, reads MBON populations, and lets `RateTimingMemory` alter gains on 122 existing gamma-KC→MBON12 edges. The mapping contains 120 distinct cue KCs, four MBON12 cells and two PPL103 groups. The graph participates in recurrence; lasting adaptation in this condition is confined to that mask.

`apply()` writes effective magnitude as `base * gain`, through `setMagnitude()`, which also updates the signed-weight cache. Immutable anatomical base values therefore do **not** imply frozen effective weights. The gains are demonstrably changing. Input projection, output head, other magnitudes, biases and leak parameters remain fixed under this learner protocol. It is inaccurate to describe this as whole-brain plastic training.

This small adaptation space may limit which rankings can change, but edge count alone does not prove insufficient capacity. The successful familiar repairs already rule out a blanket inability to express a useful preference. Sources: [trainer](.codebase/src/supervised-baselines/trainer.mjs), [memory adapter](.codebase/src/neural-learning/rate-timing-memory.mjs), [authenticated map](research/reports/plasticity-timing-candidate-2026-10-09/rate-timing-map.json), [current runner](research/reports/adaptive-temporal-loop-2026-10-09/run.mjs).

### 2. The old and new learning rules have different limitations

The old [DelayedReversalMemory](.codebase/src/neural-learning/delayed-reversal-memory.mjs) uses:

`g_next = clamp((1-e) + (g-(1-e))*exp(-eta*d*dt))`, with `0<=e<=1`, `d>=0`.

Before clipping, this is a convex combination of the current gain and `1-e`. Starting at gain one, it cannot produce gain above one, even though the configured upper bound is 1.8. With zero eligibility, positive DAN excess restores a depressed edge toward one. With decaying eligibility, the target changes: at gain 0.7, eligibility 0.6 drives depression, but eligibility 0.1 drives recovery. Delay changes direction as well as credit strength. These are mathematical properties of this branch, not speculation.

However, [single-event recovery interventions](research/reports/recovery-causal-v1-2026-10-06/README.md) prevented only one of five wrong-action revivals and produced zero mates. Recovery is a possible contributor, not an established complete cause. The depression-only replacement also failed its own reversal test. Simply deleting recovery or freezing learned depressions is unsupported.

The newer [rate-timing rule](.codebase/src/neural-learning/rate-timing-plasticity-candidate.mjs) uses separate short/long DAN-response filters and KC credit to integrate potentiation and depression toward bounded gains. Its measured gains move both below and above baseline. The old one-sided-range diagnosis does not apply to it. Its timing constants, credit filter, gain law and reference normalization remain engineering assumptions. No gamma2 coexistence/reversal experiment establishes that these dynamics can support stable revisable chess memories.

### 3. The fixed action score can remain dominated by baseline differences

The decision interface is `mean(MBON12)-mean(MBON01)`, larger preferred. It is an engineered preference, not a calibrated chess value or a validated 26-action circuit. The informative four-pair result is:

| Move | Before feedback | After eight lessons |
|---|---:|---:|
| Qg8, failure | 0.00458820 | 0.00418836 |
| Qd7, failure | 0.00446556 | 0.00412212 |
| Qh7, success | -0.00049565 | -0.00011338 |

Qh7 improves and both repeatedly taught errors decrease. The successful move still trails the strongest failure by 0.00430174. Its gains remain 0.95317..1.04028 within 0.2..1.8, so boundary saturation is not the explanation for this run. Four pairs may be insufficient, or the accessible local changes may not overcome the output gap; this run cannot distinguish those possibilities.

Baseline-relative score change ranks Qh7 first in a prior diagnostic, showing useful information in the adaptation. It does not establish that MBON01 is the sole cause or authorize fitting a decoder to expose this known answer. Also, Qg8 returning to first place during the loop is not erased learning: its score stays depressed while Qd7 is depressed further. Freezing based on rank alone would address an unproven diagnosis. [Saved arithmetic and trajectory](research/reports/plasticity-evidence-review-2026-10-10/source-review.json), [readout code](.codebase/src/neural-learning/mbon-readout.mjs), [relative-readout correction](research/reports/gamma2-relative-readout-2026-10-09/README.md).

### 4. Action separation and relational transfer are different requirements

The current [conjoined encoder](.codebase/src/chess-input/conjoined-public-mate-frame-cue.mjs) wraps **every** token as `joint:[absoluteAction,token]`. Its [base encoder](.codebase/src/chess-input/public-lesson-frame-cue.mjs) uses absolute piece squares and history coordinates. Thus changing the move's coordinates changes every conjunction key, including shared turn/task features. This encourages separation of candidates within one board without explicitly preserving the same relation across relocated boards.

A static illustration in this review independently verifies Qh7 on the historical board and Qg7 after translating all three pieces one file left. Both are mate in one. Their current encoded token inventories share **zero exact keys**, although hashing produces two shared stimulated KCs. The actual selected widths are eight and ten despite the same cap of ten. Neither neural propagation nor transfer was run for this illustration. It establishes the representation property; it does not prove this is the sole cause of transfer failure.

The earlier relational encoder also had a recorded token-to-KC collision on the failed blocker counterfactual. Adding bound-ray relation tokens reached KC activity but did not repair its matched acquisition gate. Thus neither complete action separation nor merely inserting relational features has been demonstrated sufficient. A representation must both distinguish consequence-changing context and preserve useful common structure. [Static cases and certificates](research/reports/plasticity-evidence-review-2026-10-10/source-review.json), [historical alias audit](research/reports/capture-retention-assay-v3-2026-10-07/feature-alias-audit.json).

### 5. Reliable teacher evidence is compressed into a narrow neural message

The newest teacher verifies exact board/history/action/task consequences and binds the all-legal ranking before feedback. Unknown or mismatched proof is rejected. The [temporal planner](.codebase/src/puzzle-learning/temporal-feedback-plan.mjs) then represents verified success/failure using early versus coincident PPL103 stimulation. It supplies no synaptic delta, but it also does not deliver the semantic content of a written chess explanation to the learner.

The [delayed lesson receiver](.codebase/src/puzzle-learning/delayed-lesson-brain.mjs) does present checked symbolic continuation frames and retains a decaying root-action tag. That is richer exposure, but the retained gain update still depends on local eligibility and DAN rates. Its ordinal prediction is explicitly uncalibrated. Independently proving a tactic does not establish that the network learned why it worked or correctly credited the earlier choice.

Similarly, [MappedPuzzleBrain.evaluate](.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs) returns a neutral leaf value of zero. Successful bounded search can discover a solution without demonstrating a learned strategic value. Missing semantic credit and learned value limit the broader reasoning claim; neither is proven necessary for every simple policy association.

### 6. Continued adaptation has demonstrated interference, but its cause is not isolated

Shared-memory joint success followed by harmful extra rehearsal is stronger evidence than a static checkpoint: useful choices can coexist at one point and be damaged by further experience. Damage in the absent arm shows that “no external teaching pulse” does not necessarily mean “no plasticity”; recurrent DAN activity still drives some old-rule updates. Disabled is the state-preserving comparator.

Possible contributors include common cue activation, hash collisions, inactive-edge recovery, downstream competition and timing interactions. Existing interventions do not isolate one complete explanation. The new rate-timing branch has a conditional inactive-cue drift bound, but that proof requires the actual local KC rate to remain zero; recurrent overlap can violate it. Saved repeat/restoration checks show computational persistence, not retention through physiological time or unrelated learning. CPU waiting does not advance modeled traces. [Dose evidence](research/reports/stability-feedback-dose-v2-2026-10-07/README.md), [conditional bound and limits](documentation/design/neural-learning/conditional-retention-without-freezing.md).

## Methodology mistakes that obscured the diagnosis

- **Teaching stale mistakes:** fixed lessons kept reviewing Qe6, or selected the first top error once, after another error became dominant. Current-error retargeting corrects that design and improves the competitor margin, but still fails useful choice.
- **Reading changed margins as solved learning:** gamma2 local-direction passes, cap-28 delta ranks and 5/8 baseline capture accuracy are distinct from acquired all-legal correct choices. Aggregate margin gains also conceal repairs paired with regressions.
- **Calling seed changes independent replication:** `SparseTrainer` randomizes input/head arrays; direct `[0]` stimulation and MBON readout bypass their randomized influence. Capture v3 and the seed-48 diagnostic explicitly reproduce identical measured responses. Earlier synthetic cue seeds may genuinely change stimuli; the same diagnosis must not be applied to them automatically.
- **Uninformative shuffled controls:** positive-channel v1 and selective-credit v1 preserved failures where permutations reproduced informative teaching. Later protocols corrected controls without retroactively passing the originals.
- **Treating engineering audit passes as biology:** numerical replay may share the integrator; some audits verify saved rates rather than rerun the graph. The newest loop does replay final graph scores, but its biological law remains unvalidated.
- **Overinterpreting rank revival:** absolute trajectories contradict erasure as the explanation for the latest two-error alternation. Historical recovery-related revivals must be judged from their own evidence.
- **Changing several factors and claiming a mechanism cure:** recovery/MBON association successes used different masks and interfaces from gamma4. They demonstrate computational feasibility in their conditions, not a controlled rescue of the original law.
- **Reusing inspected families as final evidence:** sibling probes remain development evidence. The already inspected counterfactual cannot become a fresh final test after modifying the learner.

Failed runner/auditor interfaces, BOM parsing, interrupted publications and invalid control schedules are preserved in the linked reports. They are execution or design failures and must not be counted as negative biological experiments. Successful recovery also must not erase failed invocations or convert invocation timings into whole-run measurements.

## Biological support and the comparison with Cesp

The connectome provides identities and wiring constraints; the current efficacy initialization, rate dynamics and physiological approximations still need justification. The [v4 bidirectional-assay protocol](research/data/bidirectional-plasticity-assay-v4/README.md) remains blocked on tonic/local signal evidence, compartment/receptor identity, stabilization dynamics, graph adapter identity and a certified reversal association. The newer gamma2 pilot is a separately scoped engineering hypothesis, not evidence that these v4 blockers disappeared.

[Handler et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC9012144/) experimentally demonstrate timing-dependent opposing plasticity and association reversal in fly olfactory learning. This supports investigating revisable memory without permanent weight locks. It does not validate our chess encoding, gamma2 constants or online retention. Full-text sections were accessible on 2026-10-10; no new biological rule was installed.

The inspected [Cesp project](https://github.com/cesp99/fly-chess) uses fixed connectivity/sign constraints with trainable connection magnitudes, input projections and policy/value readouts; its documented training includes supervised imitation and self-play. The [locally pinned source review](research/literature/cesp99-calculation-2026-10-07/README.md) supports the same architectural distinction. Its result does not establish endogenous physiological learning. The relevant difference is how adaptation and action output are produced, not simply whether inference weights can be frozen. Xiaomi/Stockfish teaching analogies likewise supply no validated local fly update law. This review does not infer a common biological cause from the three systems.

## What should follow this diagnosis

The evidence supports an ordered investigation, with one registered causal question at a time:

1. **Preserve the successes and failures above as the baseline.** Match mechanism, cue, readout and teacher identities when comparing results. Require acquired correct all-legal choice above controls, alongside sentinel preservation; report focused-margin improvement separately.
2. **For current gamma2, discriminate accessible learning from output domination.** A bounded dose/reachability test could determine whether the same local rule can cross the familiar decision gap. The inherited 32-pair proposal remains unrun and unregistered; it is not this review's recommendation to start a dose sweep. A pass would still require retention/reversal and fresh transfer tests. A failure would constrain that budget, not prove impossibility.
3. **Test preservation and reversal while the mechanism remains capable of updating.** Use independently verified informative feedback, exposure-matched controls and explicit local trace measurements. A biological stabilization extension is justified only by measured interference and source-supported mapping; permanent gain freezing is not the remedy established here.
4. **Address transferable representation and action readout as explicit hypotheses.** Require shared relation evidence under changed coordinates and discriminated consequences, while keeping answer labels out of the encoder. Do not fit the known solution into a new comparator. Freeze definitions before evaluating fresh disjoint/counterfactual families.
5. **Keep anatomy and physiology validation separate from chess performance.** A useful computational choice does not supply receptor identities, natural reward pathways or a biological clock. Broader adaptation needs justified locations and dynamics, rather than enabling arbitrary updates everywhere.

**What can be concluded now:** endogenous local efficacy changes can causally repair particular familiar choices. The current training methods do not reliably produce preserved, transferable chess knowledge. Demonstrated constraints include stale-feedback exposure, old-rule dynamics, action-conditioned absolute encoding, uncalibrated output competition, harmful continued adaptation and invalid replication/control interpretations. Their individual contribution to every failure remains unresolved. A claim that plasticity or fly-derived chess learning is impossible is unsupported; a claim that we have solved it is also unsupported.

## Evidence and verification scope

This review read 42 existing result/audit/aggregate artifacts and checked their current byte hashes, verified 16 report-to-audit hash bindings, and verified all 92 source pins plus graph/annotation hashes for the latest adaptive loop. It recomputed the saved strongest-competitor margin and certified the static translated mate illustration. No new graph inference or training ran; no physiological solution or final-test success was manufactured. Existing software test results are attributed to their original runs; this documentation review did not rerun `npm test`.

The [evidence index](research/reports/plasticity-evidence-review-2026-10-10/evidence-index.json) preserves artifact hashes and reported gates. The [source review](research/reports/plasticity-evidence-review-2026-10-10/source-review.json) preserves recomputed metrics and static certificates. [Review methods](research/reports/plasticity-evidence-review-2026-10-10/README.md), [dated mistakes/pivots](research/journal/experiments/2026-10-10-plasticity-evidence-review.md), and [current compact](research/reports/plasticity-evidence-review-2026-10-10/review-notes.md) keep the investigation reconstructable. This is a targeted review of gate-relevant experiment families, not an exhaustive rerun of every historical receipt.
