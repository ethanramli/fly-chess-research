# Research journal

- [2026-10-31: actual memory goal continues after evidence repair](experiments/2026-10-31-memory-goal-continuation.md).

- [2026-10-30: training cannot resume from a mid-event checkpoint (found by the D8 recovery witness; fails safe; fixed in block v3)](experiments/2026-10-30-mid-event-resume-bug.md)
- [2026-10-30: research maturity review — fixed training comparator, scientific limitations, corrected software findings and ISEF 2028+ scope](experiments/2026-10-30-research-maturity-review.md)

- [2026-10-30: full-r15 audit stalled after laptop sleep - CPU pacing counted the sleep as work (prediction: resumes about 12:39)](experiments/2026-10-30-audit-stall-after-laptop-sleep.md)
- [2026-10-30: full-r14 D4 failure - measurement mistake (constant-sign value channel) and the Fly's missing absolute valence](experiments/2026-10-30-stage1-full-r14-d4-measurement-mistake.md)
- [2026-10-27: Stage 1 retention probes v1-v8 summary - what changed, results, why each failed](experiments/2026-10-27-stage1-memory-probes-v1-v8-summary.md)
- [2026-10-27: Stockfish teaching set aside for Stage 1 (failed experiment)](experiments/2026-10-27-stockfish-teaching-set-aside.md)
- [2026-10-24: babysit safety features - early stop, pause, planner cap, detached launcher](experiments/2026-10-24-babysit-safety-features.md)
- [2026-10-24: Stage 1 memory retention fix — retention probe, eta choice and acceptance smoke](experiments/2026-10-24-stage1-memory-retention-fix.md)
- [2026-10-23: babysit Stage 1 end to end — delegated decisions, synthetic data, real-run defects](experiments/2026-10-23-babysit-stage1-end-to-end.md)
- [2026-10-23: Stage 1 evaluator retention stub and reverted edit](experiments/2026-10-23-babysit-stage1-retention-stop.md)
- [2026-10-21: curriculum execution, seed-3 launch and source-to-lesson pilot](experiments/2026-10-21-curriculum-execution.md)

- [2026-10-10: Plasticity evidence review, mistakes and researcher-directed pivot](experiments/2026-10-10-plasticity-evidence-review.md)

## 2026-10-09: Actual adaptive-loop repair and interpretation corrections

The previous gamma2 runner selected a first error once, then stopped after
error/success feedback. It cannot respond to cap-10's Qg8 to Qd7 replacement
mistake. The new version selects again after each pair and yokes its controls
to the informative sequence. An equal-dose fixed-target arm isolates the effect
of retargeting. Four pairs are registered for a bounded development test.
See [repair and full mistake record](../../archive/early-development/research/reports/adaptive-temporal-loop-2026-10-09/README.md).

PAM02 extension is deferred: its eligible KC population differs from the gamma2
cues, it has six DANs per side, and gamma2 timing evidence does not validate a
PAM02 rule. Baseline-relative ranking does not prove MBON01 is the sole cause.
Prior suite-pass claims lacked captured completion; the new suite has now
completed with 215 tests passed, zero failures (software-tests.txt in report).

Implementation corrections: an initial documentation patch was rejected because
current-status.md has preexisting invalid UTF-8 bytes; no part of that patch
applied. A one-line Node encoding check lost quotes through PowerShell and
failed to parse; a stdin script corrected it. Current status needs a native
append that preserves the original bytes. Neither error ran graph dynamics.

Started 2026-09-30. Use dated entries to preserve researcher intent, questions, experiment observations, corrections and unresolved next steps. Entries summarize work; they are not verbatim transcripts. Dates use Asia/Jakarta.

| Section | Contents |
|---|---|
| [Discussions](discussions/README.md) | Researcher vision, intended scientific contribution and learning-efficiency hypothesis |
| [Experiments](experiments/README.md) | Dated feedback/conditioning and learning-interface history |
| [Outreach](outreach/README.md) | Dated expert-discovery and contact history |
| [Archive](archive/README.md) | Superseded landing-page and instruction snapshots |
- [2026-10-07 capture-retention task interface](experiments/2026-10-07-capture-retention-task-interface.md)

Keep consequential decisions in [the decision log](../project/decision_log.md), current specifications in [design topics](../../documentation/design/README.md), and latest audited conclusions in [current status](../../documentation/current-status.md). Append dated corrections; do not silently rewrite historical failures. A proposal is not an approved or validated mechanism.

For outreach interviews, first read existing notes and the [researcher profile](../outreach/planning/ethan-interview-profile-2026-10-01.md). Document new researcher intent as interviews continue.

- [2026-10-07 shared-memory multi-context acquisition](experiments/2026-10-07-shared-memory-multi-context-acquisition.md)
- [2026-10-07 multi-context result and Stockfish teaching direction](experiments/2026-10-07-multicontext-stockfish-direction.md)

- [Stockfish target-feasibility result and relative feedback/latency direction](experiments/2026-10-07-stockfish-target-feasibility.md)

- [Bounded assessment cache matched graph benchmark](experiments/2026-10-07-assessment-cache.md)
- [Source-pinned cached-root all-legal PUCT benchmark](experiments/2026-10-07-cached-root-search.md)
- [2026-10-07 capture-retention transfer assay v3](experiments/2026-10-07-capture-retention-assay-v3.md)


- [2026-10-08 verified consequence lesson design](experiments/2026-10-08-verified-consequence-lesson-design.md)

- [2026-10-08 selective-credit prerequisite failure and preserved test mistake](experiments/2026-10-08-selective-credit-prerequisite.md)

- [2026-10-08 neural sequence state, diagnosis correction and mandatory pivot records](experiments/2026-10-08-sequence-state-and-diagnosis-correction.md)

- [2026-10-08 verified legal lesson frames and endpoint-encoder gap](experiments/2026-10-08-verified-lesson-frame-delivery.md)

- [2026-10-08 public endpoint frame encoding and corrected mapping invocation](experiments/2026-10-08-public-frame-encoding.md)

- [2026-10-08 delayed source-credit candidate and exposed recovery interference](experiments/2026-10-08-delayed-source-credit.md)

- [2026-10-08 integrated delayed lesson receiver and legacy API hazard](experiments/2026-10-08-delayed-lesson-receiver.md)

- [2026-10-08 frozen delayed graph integration, recovery and failed choice alignment](experiments/2026-10-08-delayed-graph-integration-protocol.md)

- [2026-10-08 missing common-memory comparison and measured score adaptation correction](experiments/2026-10-08-delayed-common-memory-diagnostic.md)

- [2026-10-08 bounded mate delayed lessons and all-legal criterion coverage](experiments/2026-10-08-bounded-mate-delayed-lessons.md)

- [2026-10-08 all-legal mate choice mechanism protocol and live execution](experiments/2026-10-08-delayed-mate-choice-protocol.md)

- [2026-10-08 actual initial error targeting protocol](experiments/2026-10-08-chosen-error-targeting-protocol.md)

- [2026-10-08 adaptive current-error feedback experiment, audited results and cue diagnosis](experiments/2026-10-08-adaptive-error-targeting-protocol.md)

- [2026-10-08 matched public action-context input experiment](experiments/2026-10-08-mate-conjoined-input-protocol.md)

- [2026-10-08 feedback specificity research without training and receipt-backed corrections](experiments/2026-10-08-feedback-specificity-research.md)

- [2026-10-08 independent bidirectional assay infrastructure review](experiments/2026-10-08-bidirectional-assay-independent-review.md)


- [2026-10-08–09 bidirectional assay infrastructure repair and final verification](experiments/2026-10-08-bidirectional-assay-repair.md)


## 2026-10-09: Gamma2 timing-dependent plasticity candidate

Primary Handler 2019 results include gamma2 bidirectional KC-MBON modulation under forward/backward pairing; receptor perturbations are chiefly gamma4 evidence. A new static annotation join identifies 122 existing gamma-KC/MBON12 candidate edges (72 left, 50 right), excluding 664 alpha-prime/beta-prime edges and all PAM02 edges from this scoped hypothesis. This provides a timing-based alternative to the unestablished signed-baseline branch, not a working learner. Exact biochemical rule, encoder reachability, timing calibration, coexistence and behavioral reversal remain unresolved. No learner dynamics, simulation or training ran; frozen v4 is unchanged. Source access 2026-10-09, targeted primary text excerpts only; sources, raw responses, assumptions, inspection errors and next test are preserved in [the candidate report](../../archive/early-development/research/reports/plasticity-timing-candidate-2026-10-09/README.md). Primary source: https://pmc.ncbi.nlm.nih.gov/articles/PMC9012144/ . Engineering adaptation: separate local KC/DAN traces and explicitly declared temporal stimulus coding, not teacher parameter updates or biological validation.

## 2026-10-09: Plastic-site input coverage pivot

Historical receipts show the gamma2 candidate receives almost identical baseline Qe6/Qh7 eligibility (cosine 0.9999999658), while the existing conjoined encoding directly stimulates none of its KCs for either move. A static all-legal check finds seven of 26 moves with zero candidate coverage. Reusing the unchanged conjoined encoder with the declared 120-KC gamma2 pool, unchanged seed and dose, removes these coverage gaps without identical full cues; overlap increases. This is an engineered input hypothesis, not neural learning evidence. Next compare rule and pool factors separately on the same anatomical mask. No graph dynamics, training or source-rule change occurred. See [raw evidence and mistake record](../../archive/early-development/research/reports/plasticity-timing-candidate-2026-10-09/README.md).

## 2026-10-09: Local timing numerical candidate, not solved retention

Implemented a disconnected pure event-pair step with separate finite KC/DAN traces and the existing bounded gain integrator. Its equations are an assistant engineering hypothesis motivated by Handler's qualitative gamma2 timing observations, not a transcribed receptor model. Four scalar test groups pass; the complete npm test suite passes 199/199 (raw log: research/reports/plasticity-timing-candidate-2026-10-09/npm-test-timing.txt). Tests explicitly expose residual-trace interference: later DAN activation can still change an earlier association. No event extractor, biological time calibration or graph adapter is installed. No training or prospective learner/graph simulation ran. Next resolve activity-to-event dynamics and persistence, then validate coexistence/reversal under an authorized controlled assay. [Specification](../../documentation/design/neural-learning/local-event-timing-candidate.md).

## 2026-10-09: Replace naive event sampling with a source-motivated rate component

Previous goal turn made numerical progress, but event-pair tests did not establish compatibility with sustained model rates. A deliberate naive adapter counterexample changes gain direction when the same rate block is treated as 1 versus 10/100 events (event-sampling.json). Do not integrate that adapter. Preserved event candidate and failure evidence.

Recovered the primary Gkanias article XML and timing-specific handler.py at commit 1610c80072fe8bb59bd397e7a61f716393a509b9. Distinct short/long filters in that code motivate a new disconnected component with exact constant-rate relaxation. Three scalar test groups pass: sign-changing pulse response, interval partition agreement and bounded resumable state. This is an explicitly continuous-time approximation of the source code; equations 35/36 in the retrieved article and the distinct code decays require reconciliation. The source's inhibitory MBON feedback must be checked against the actual graph, not invented. Retention and synaptic integration remain unresolved.

Access/inspection mistakes: the publisher XML endpoint returned challenge HTML despite HTTP success (preserved gkanias-75611.xml); guessed v2 GitHub XML was 404; v1 XML succeeded. PMC browser access also returned a challenge. Initial XML text inspection used the wrong encoding and a title selector returned no sections; explicit UTF-8 and local-name selectors recovered MathML/text. Broad search output was truncated, so no exact equation was taken from it. Raw article/source files are evidence, not executed code. No graph dynamics, training or prospective learner simulation ran. See [component specification](../../documentation/design/neural-learning/dopamine-response-components.md).

## 2026-10-09: Feedback-path feasibility and integrated rate timing

Previous goal turn was progress: it rejected a naive event adapter and recovered source-specific filters. This turn's static graph scan finds eight direct MBON12/PPL103 edges, all positive, and 84 negatively signed two-edge paths among 129. This supports investigating existing indirect feedback, not copying the source's direct inhibitory term or claiming net dynamic inhibition. Graph/model execution did not occur. The scan used hash-bound sparse arrays and annotations, observed 78.54 MiB peak RSS, and preserved raw feedback-paths.json.

Added a disconnected gain integrator using analytic KC-credit times signed-filter integrals, splitting at any internal signal reversal. Its bounded gain law and credit filter remain engineering hypotheses; response-component motivation is source-backed. Three numerical groups pass including subdivision agreement through 1,000 intervals. No code applies this state to the fly. Rate normalization, neural timing, graph checkpoint integration, coexistence and behavior remain unfinished. [Specification](../../documentation/design/neural-learning/rate-timing-plasticity-candidate.md). Raw full-suite log is research/reports/plasticity-timing-candidate-2026-10-09/npm-test-rate-timing.txt. No new inspection/test failure occurred in this turn. No training, prospective learner simulation, invented connections or weight freezing occurred.

## 2026-10-09: Bind rate timing to recorded frames and memory checkpoints

Previous goal turn was progress: graph-path evidence and rate integration changed the available next action. Added RateTimingMemory as an unintegrated gamma2 branch consuming all recorded recurrent intervals, using an explicit fixed-model reference and numerical step duration. Separate gains, KC credit and short/long local response states persist across consumed frames and enter snapshots. Existing base/sign validation and magnitude updates are reused; the old endpoint API is refused. Disabled handling holds all memory states fixed. Inert four-cell arrays verify continuation, scoped mapped changes, validation before mutation and reference-bound identity. No SparseTrainer or graph dynamics ran in these new checks.

This adapter holds gains during each precomputed neural frame and applies them afterward. That approximation and the above-reference normalization are explicit engineering choices; neither establishes a natural reward pathway, biological clock, online retention or transferable chess behavior. The actual annotation-authenticated mapping, schedule, model reference and coordinator adapter remain unfinished. No training was run. [Specification](../../documentation/design/neural-learning/rate-timing-memory.md).

Mistakes and fixes: inspection guessed a nonexistent stockfish-value-lesson-brain filename; file discovery showed no matching module, so no claim relies on it. Review identified that a valid finite gain could still overflow its Float32 effective magnitude during restore; added representability validation before mutation. Historical files and failed candidates remain preserved. Raw full-suite verification: research/reports/plasticity-timing-candidate-2026-10-09/npm-test-rate-memory.txt.

## 2026-10-09: Actual gamma2 mapping constructed and authenticated

The preceding interrupted turn inspected current state but did not complete the map; this continuation performs the next available static action. build-verified-map.mjs hashes released graph/annotations and the prior mask, joins all candidate KC/MBON/DAN identities, verifies CSR endpoints and positive edge signs, and emits rate-timing-map.json. It contains 122 existing edges, 120 distinct gamma KCs, four MBON12 cells and two PPL103 groups. The object now satisfies RateTimingMemory's map schema. The legacy readyForCandidateExperiment field indicates structural map readiness only; no signal, biological or behavioral feasibility gate has passed. No model/reference was initialized, no recurrence was executed, and no training occurred.

Static command passed all identity/edge assertions. Original maps and reports are untouched. Synapse coordinates, receptor identities, effective recurrent inhibition, numerical reference timing and controlled-assay integration remain unverified. This removes a concrete construction blocker; it does not establish the requested plasticity solution. [Mapping artifact](../../archive/early-development/research/reports/plasticity-timing-candidate-2026-10-09/rate-timing-map.json).

## 2026-10-09: Full-pulse timing candidate qualification

Complete scalar waveform arithmetic shows depression for simultaneous pulses and potentiation for a 1.2-model-unit DAN lead, but a 0.6-unit lead reverses the net update. Derived repeated-pulse equilibria depend on timing, not prediction accuracy. This exposes timing sensitivity and the missing stopping mechanism before graph integration. Parameters and gates were not tuned. Raw evidence and limits: [complete-pulse analysis](../../archive/early-development/research/reports/plasticity-timing-candidate-2026-10-09/README.md). No graph dynamics or training ran.

## 2026-10-09: Conditional stability without freezing; stopping-gate correction

Previous goal turn produced complete-pulse evidence. Its interpretation was too strong: a bounded timing-dependent fixed point does not prove an accuracy-sensitive stopping circuit is mandatory before an association assay. The timing shift described as small halves the pulse lead. Correction recorded without changing raw results or frozen gates.

Derived a sufficient bound on all future gain drift when local KC input remains zero: (gmax-gmin)*eta*R*eNow*tauKC. Credit decay can therefore protect an inactive association while reactivation restores plasticity, without freezing. The assumption fails under shared/recurrent KC activation, which must be measured. Closed-form stored pulse maps cross gain 1 in 63 upward or 27 downward repetitions from opposite gain bounds; these are scalar arithmetic, not training or behavioral reversal. No graph dynamics ran. [Proof, limitations and next decision](../../documentation/design/neural-learning/conditional-retention-without-freezing.md). Raw retention-reversal-bounds.json and derive-retention-reversal.mjs are in the timing candidate report.

## 2026-10-09: First read-only gamma2 neural overlap result

One predeclared serial graph diagnostic completed: 53 forward presentations, all model/anatomy parameter hashes identical before/after, no feedback or learning. Restricted gamma2 input changes Qe6/Qh7 diagnostic credit cosine from 0.806448 to 0.000002786 and supplies comparable strong credit to both; maximum all-legal pair similarity decreases from 0.964031 to 0.375077. This supports input/plastic-site alignment for the historical board; it is not retention or learned chess behavior. Untrained rankings change with the encoder, so same-encoder learning controls remain essential. Separate audit checks source/receipt hashes and recomputes all overlap arithmetic from raw local trajectories.

Observed 105.27 MiB peak RSS, 24.03 s elapsed, 13.203 s process CPU, heap256/duty0.5. Only the original Codex Node process remains after completion. Earlier assistant-only graph-execution restriction was overbroad relative to the user's no-training instruction; corrected before launch. This run is read-only and does not authorize training. Core code unchanged; no new full suite run. Exact command, identities, acknowledged receipts and source snapshots: [diagnostic report](../../archive/early-development/research/reports/gamma2-neural-overlap-v1-2026-10-09/README.md). Next informative step remains controlled verified temporal feedback after adapter/protocol completion and training authorization.

## 2026-10-09: Verified temporal stimulus planning implemented

Added a bounded temporal feedback planner using the existing independent consequence verifier. It binds board/history, task, move, actor, status and proof digest before encoding; unknown produces no frames. Cue timing stays fixed while verified success/failure select an explicitly engineered early/coincident PPL103 pulse. Informative, absent, disabled, fully swapped and scheduled-shuffled conditions expose their exact frame/pulse semantics. No teacher parameter delta enters the plan.

Three inert test groups cover consequence perspective/timing, matched control exposure, unknown and forged evidence. No neural model was instantiated by these checks. The eight-frame fixture is not a selected graph-training schedule. Ranking-before-feedback, neural continuity, pending-frame persistence and coordinator integration remain executor work. [Interface specification](../../documentation/design/puzzle-learning/temporal-feedback-interface.md). Full software-suite log: research/reports/plasticity-timing-candidate-2026-10-09/npm-test-temporal-plan.txt. No training ran; no graph experiment was added to the preceding completed read-only diagnostic.

## 2026-10-09: Temporal session recovery and authorized hypothesis-only pilot

The researcher explicitly authorizes training solely to test the plasticity hypothesis; this replaces the earlier no-training boundary for this bounded test only. The goal was reactivated before the assistant incorrectly said it remained paused; that statement is corrected. Previous response was no progress; current work implements and verifies session recovery and prepares a concrete controlled test.

TemporalFeedbackSession binds all-legal pre-feedback assessment to independently checked evidence, retains neural continuity during frames and local memory traces across lessons, and checkpoints the next unacknowledged frame. Inert mechanical fixtures verify prefix resume, completed-frame finish without replay, failed-frame rollback, disabled memory isolation, stale assessment and malformed checkpoints. All 214 software tests pass; these fixtures do not establish neural learning.

Mistakes: guessed .codebase/package.json and an incorrect test path were missing; rg discovery located root package.json and the topic test folder. Runner review caught a reversed MBON score formula before execution; it now reuses readMBON. A receipt-count checkpoint filename could collide on state-only publications; a separate monotonically increasing publication sequence fixes it. No failed graph run or favorable-result rollback occurred.

Registered [gamma2 temporal hypothesis v1](../../archive/early-development/research/data/gamma2-temporal-hypothesis-v1/protocol.json): informative, fully swapped, absent and disabled arms, from-scratch seed47, two verified mate-deadline lessons per arm, fixed 19-frame schedules, 152 teaching frames total. Every lesson records all-legal unaided rankings first. The fixed prediction requires failure depression and success potentiation on stimulated edges, opposite signs under swapped timing, plus informative pair-margin improvement exceeding every control by 1e-8. All-legal choice is reported separately. No tuning, checkpoint selection, reversal or retention claim is permitted from this pilot.

This is an engineering hypothesis adapted from previously registered Handler/Gkanias timing evidence; the exact local receiver, timescales, bounded gain rule and fixed-reference normalization remain approximations. Model-time lead is 1.2; it is not biological seconds. Existing graph identities/signs and all nonplastic parameters are hash checked. Native sparse runtime, heap256/duty0.5, RSS768MiB/free256MiB guards and frame publication recovery apply. Run status at registration: not launched. Post-run independent audit is required before interpreting gates. Historical v4 reversal blocker remains unresolved; this separately scoped pilot does not bypass that gate.

## 2026-10-09: Temporal hypothesis v1 launch failed before teaching

Exact command: node --max-old-space-size=256 research/reports/plasticity-timing-candidate-2026-10-09/run-temporal-hypothesis.mjs --protocol research/data/gamma2-temporal-hypothesis-v1/protocol.json --cpu-duty 0.5 --out runs/gamma2-temporal-hypothesis-v1. Process exited 1 during first all-legal assessment: readMBON requires population arrays but caller supplied precomputed means. One candidate evaluation followed reference evaluation; no lesson start, feedback event or memory update occurred. Checkpoint-1 and source snapshots remain preserved in the failed run directory. This is a runner interface failure, not evidence against the plasticity hypothesis. Correct the shared readout call to supply arrays, preserve v1 protocol/pins, register v2 with identical scientific parameters and gates, and launch into a new directory. No ongoing process or timeout is being mistaken for failure.

## 2026-10-09: Interface-corrected temporal pilot v2

Version 2 changes only readMBON input to population arrays; all scientific parameters, schedule and gate text are identical to failed v1. Version 1 pins and source snapshots are preserved. An initial multi-file patch did not apply because a context line omitted the remainder of the actual source line; a precise replacement applied successfully. New protocol: research/data/gamma2-temporal-hypothesis-v2/protocol.json. Run remains hypothesis-only and cannot establish retention, reversal, biological validity or transfer.

## 2026-10-09: Audit-reference omission discovered during active v2 run

Independent auditor construction found that v2 stores raw local rates and memory identity but omits explicit fixed-reference arrays. This prevents rate normalization replay from receipts alone; it does not prove neural feedback failure. Active pinned code/protocol is untouched. Correction for this run: once training is terminal, the auditor reconstructs the exact pinned from-scratch model and one unstimulated forward reference, authenticates the resulting memory identity against every arm, then replays local numerical updates from saved rates. This is a separate read-only reference reconstruction, not another training run or selected checkpoint. It uses the same sparse heap/RSS/free-memory/duty guards. Numerical audit shares the declared integrator and cannot constitute independent biological validation. Future protocol should record local reference arrays directly; no next protocol is created while the run is active.

## 2026-10-09: Audited temporal hypothesis v2 result

The serial hypothesis-only training process completed (exit 0): 152 feedback frames, 189.453125 MiB peak RSS, 330.4097108 s elapsed, CPU user170.437 s/system5.469 s, heap256/duty0.5. Separate read-only auditor completed (exit 0), reconstructing the omitted pinned reference and replaying all 152 recorded local updates. Topology, signs and all nonplastic parameter hashes match before/after every arm; disabled memory is identical throughout. Receipt/certificate/plan checks pass. Audit numeric replay shares the integrator and ranking arithmetic uses saved readout arrays; it is not independent biological or complete graph-response validation.

Predeclared local direction gate passes: informative Qe6 mean stimulated-edge gain change -0.02156780985590849 and Qh7 +0.010138613320879286; swapped respectively +0.010056474027606815 and -0.021525453054727722. Pair-margin specificity gate passes: informative +0.0003000074066221714, swapped -0.00030449358746409416, absent +1.73225998878479e-7, disabled 0. Every arm still chooses Qg8, independently verified failure. Useful all-legal acquisition fails; no retention, reversal or transfer was measured. These results support the bounded timing mechanism hypothesis and do not solve the full plasticity objective.

No gate or scientific setting was tuned. Existing v4 reversal blockers and earlier failures remain preserved. Next hypothesis to register: coexistence/retention under intervening teaching and certified reversal of both directions. Continue to require correct all-legal decisions and disjoint/counterfactual transfer. Full report: research/reports/gamma2-temporal-hypothesis-v2-2026-10-09/README.md. Raw protocol/result/audit and source snapshots: runs/gamma2-temporal-hypothesis-v2. Mistakes and corrections (failed v1 interface, draft sign, checkpoint filename, missing local references, mistaken paused statement) remain documented above.

## 2026-10-09: Adaptive current-error targeting registered

V2's strongest qualified result was that timing changes mapped KC-to-MBON12 gains and the Qh7-versus-Qe6 pair margin, while every all-legal final choice remained Qg8. The fresh baseline already ranked Qg8 highest; the fixed two-action schedule reviewed stale Qe6. For Qh7 versus Qg8, informative margin change was +0.0001008604, which narrowed but did not remove the -0.00477878 final gap. This demonstrates a correct association can coexist with a still dominant unrelated error; it does not show that simply increasing dose will fix it.

The prior protocol was not adaptive, despite adaptive targeting being a stated design weakness. This is a design mistake now recorded. New [gamma2 adaptive current-error protocol v1](../../archive/early-development/research/data/gamma2-adaptive-target-v1/protocol.json) selects the unique unaided all-legal top choice only after checking its independent certificate says failure; otherwise the run aborts. It pairs that actual selected error with the already certified Qh7 solution. Informative, fully swapped, absent and disabled arms each measure their own initial choice, have the same two-action/152-frame dose, and replay proofs. Gates are frozen: target-edge direction and pair-margin specificity, exact disabled-memory isolation, and whether Qh7 becomes the unique all-legal top move. There is one seed and one acquisition pass; a pass does not establish reliable chess learning, retention, reversal, transfer or biology. Protocol pins runner and auditor separately, inherits v2 timing/memory/encoder/model, and preserves v2 outputs. No training has yet started.

Rationale is the observed Qg8-vs-Qh7 error under the fixed Qe6 schedule, not a post hoc setting change to v2. Do not interpret the v2 pair-gate pass as useful acquisition. Protocol/run source hashes must verify before execution; training is already authorized for bounded hypothesis tests.

## 2026-10-09: Adaptive top-error follow-up audited; all-legal choice still fails

Protocol-v1 runner selected each arm's unique top all-legal move after independent certification. It was Qg8, a verified mate-deadline failure, followed by the certified Qh7 solution. The four conditions received equal cue/action schedules and 152 teaching frames. Separate auditor verified source pins, proofs, plan, complete pre-feedback rankings, 152 frame updates, topology/sign/fixed-state hashes and unchanged disabled memory.

Targeted informative cue gains changed by -0.0215295259 for Qg8 and +0.0101385966 for Qh7; swapped feedback reversed the signs, absent and disabled changed zero. Qh7-minus-Qg8 score margin improved +0.0003201417 versus swapped -0.0003152117. Yet that margin remained -0.004559496 and all-legal top stayed Qg8; the frozen useful-choice gate fails. Each directly stimulated cue contained eight gamma KC identities with zero shared cells. Cue separation and top-error selection therefore did not by themselves solve decision quality. This is one fixed-seed, two-feedback test, not evidence that either factor is unnecessary generally.

Diagnosis update: v2 correctly changed a focused Qh7/Qe6 margin but reviewed stale Qe6 while Qg8 led. V3 corrected the target and had a larger causal movement against the actual leader. Because the leader still won, stale targeting is a contributor but not the only blocker. The tested local association is stored selectively; its fixed MBON score effect remains too small relative to the observed all-legal gap. The current readout is an engineered preference, not a calibrated chess value or validated action circuit. Do not use a fitted coefficient, outcome-selected decoder or extra repeats on this same puzzle to declare a fix.

Observed runner peak RSS 190.113 MiB, elapsed 487.353 s, CPU user248.141 s/system8.610 s, heap256/duty0.5. Full receipt and audit record: [adaptive-target result](../../archive/early-development/research/reports/gamma2-adaptive-target-v1-2026-10-09/README.md). Raw evidence and archived runner/auditor are in runs/gamma2-adaptive-target-v1. Next work should test a justified action-value/readout mechanism across disjoint positions with an informative feedback condition and matched controls; freeze its definition before using held-out positions. Retention, coexistence, reversal, transferable chess choice and biological validation remain unmet. Frozen assay v4 retains its original blockers.

This turn's first multi-file patch did not apply because it expected an import line that was absent; inspection found the actual line and a narrower patch applied. No scientific parameter or result changed.

## 2026-10-09: Literature-based action-output boundary

Rechecked the primary MBON output study while interpreting the two failed all-legal puzzle runs. Aso et al. 2014 supports a distributed MBON ensemble representation of learned valence that biases memory-based action selection. Their result does not establish MBONs as one-neuron motor commands, nor does it validate the project's fixed `mean(MBON12)-mean(MBON01)` score as a 26-action chess value. The 2021 downstream connectome study maps multiple convergence neurons integrating MBON learned value and lateral-horn innate input, further underscoring that an output interface must be declared and tested rather than inferred from one score.

Primary-source search snippets were inspectable; direct eLife/PMC pages returned bot challenges in this session, consistent with prior documented retrieval limits. No newly retrieved full text or exact quantitative claim is used. These are already registered research lines, used here only for the bounded claim that MBONs bias actions and the specific subtraction remains engineered. Sources: Aso et al. 2014, https://elifesciences.org/articles/04580; Eschbach et al. 2021, https://elifesciences.org/articles/62567.

Interpretation: local temporal association is now causally distinguishable from shuffled feedback and changes the candidate margin, but it fails the chess action gate even when feedback targets the model's current top error and the direct cues have zero overlap. The unresolved object is the entire cue-to-choice path: cue transfer into the mapped KCs, scope of eligible synapses, propagation through the fixed graph, and the engineered decision comparator. Do not fit the comparator on the existing puzzle/result. Any next graph run must pre-register one bounded target readout/input hypothesis, include informative feedback alongside the matched controls, and test the learner's fixed all-legal choices on held-out puzzle families. The frozen v4 assay's biological identity/reversal blockers still apply to that assay.

Documentation correction, 2026-10-09: the feedback-learning append command quoted its date expression literally, leaving `(Get-Date -Format yyyy-MM-dd)` in the new sentence. The intended date is 2026-10-09. A link checker also treated primary-source HTTPS URLs as local paths; corrected audit skips external references and checks only local markdown links. Neither check changed research results.

## 2026-10-09: Gamma2 cue-capacity comparison registered

The audited cap-8 adaptive timing run selects f7g8 as each arm's unique verified top error, then teaches it with the verified f7h7 solution. Informative Qh7-minus-error margin change is +0.00032014166936278343, yet every arm still chooses the wrong f7g8. The static all-legal encoder sweep finds total cue current 12 at both caps; cap 10 uses 8?10 cells. Maximum pairwise cue cosine falls 0.375 to 0.3535533905932738, but mean rises 0.07576923076923077 to 0.08168387202779266. Thus input geometry is mixed and cannot be described as uniformly improved.

Registered [cap-10 protocol](../../archive/early-development/research/data/gamma2-adaptive-target-cue10-v1/protocol.json) and [report](../../archive/early-development/research/reports/gamma2-adaptive-cue10-2026-10-09/README.md) before graph execution. It compares against the existing independently audited cap-8 run; only maxCells changes, with total current 12, same model/seed, adaptive current-error schedule, verified lesson pair, controls, timing, memory and readout. The frozen prediction is unique all-legal Qh7 in informative cap 10; margin and all controls are secondary evidence. If the choice gate fails, useful acquisition fails this test. No training has started. The first one-off static command failed because PowerShell stripped its JavaScript quotes; it ran no computation or write. A here-string rerun completed the sweep and recorded the encoder identities in the protocol.


## 2026-10-09: Cap-10 cue result audited

The cap-10 adaptive timing run completed (269.41 s, peak RSS 189.57 MiB) and its independent auditor passed 152 frame replays, certificates, direction/specificity gates and disabled-state isolation. Informative cue gains depressed for verified f7g8 failure (-0.0192439) and potentiated for f7h7 success (+0.0101386); swapped feedback reversed the signs. Informative margin change +0.00029704 is below the audited cap-8 +0.00032014. The informative all-legal top changed from f7g8 to f7d7, but both are certified failures. The preregistered unique-correct-choice prediction therefore fails; swapped/absent/disabled still select f7g8. Width changed the leading wrong action in one arm without improving the target margin or producing the solution. Treat any competition effect as a hypothesis, not a conclusion from one puzzle/seed. Comparison audit and raw receipts are linked in the [report](../../archive/early-development/research/reports/gamma2-adaptive-cue10-2026-10-09/README.md). Mistakes: first static sweep command lost quoted JS during PowerShell parsing; corrected read-only here-string succeeded. One checkpoint-monitor command had a syntax error and no effect; corrected monitor observed progress. Neither changed the run.
# 2026-10-09: Plasticity output-path pivot

The cap-10 adaptive run reproduced local timing direction and specificity but
still selected a verified failure. A raw-rate check across the audited receipts
shows the timing memory changes MBON12 while MBON01 is effectively unchanged;
the fixed `mean(MBON12)-mean(MBON01)` comparator therefore carries a large
unchanged baseline into every action score. A separate label-blind
baseline-relative decoder exposed Qh7 on the same run, but that result is a
readout diagnostic and is not a plasticity or biological solution. The
hypothesis is that the missing competing MBON01/PAM02 pathway, rather than cue
capacity alone, masks otherwise persistent local change. This is not proven.

Pivot: register a feedback-enabled dual-output test using the existing mapped
PAM02 success interface together with the audited PPL103 timing condition, with
absolute readout held fixed and absent, fully swapped and disabled controls at
matched dose. Do not change the graph, freeze weights, fit the comparator or
claim biological compartment identity until the PAM02 map passes a separate
identity/coverage review. If the dual condition changes MBON01 in the predicted
direction but still fails all-legal choice, the remaining blocker is downstream
action routing; if it does not, the plasticity scope or cue eligibility remains
the blocker. Existing cap-8/cap-10 and relative-decoder artifacts remain
unchanged.
# 2026-10-09 correction: initial PAM probe used the gamma-only map

The first causal probe passed the gamma2 timing map into the PAM02 interface.
That map intentionally contains only MBON12/PPL103 groups, so the resulting
PAM02 population was empty and the zero-effect output cannot answer whether a
PAM02 pulse reaches MBON01. The probe was read-only and made no training claim;
the mistake is preserved here. The required next step is to build a hash-bound
PAM02/MBON01 map from the separately reviewed coarse mapping, then rerun the
probe and a feedback-enabled matched-control experiment. No biological
conclusion is drawn from the invalid probe.


## 2026-10-09: Adaptive temporal-loop audited correction

Implemented repeated current-error selection, exact informative-sequence controls, equal-dose fixed-target comparison, stored reference/proof evidence, streamed independent audit and verified disk resume. 215 software tests pass; 760 frame updates and 130 final graph rows audit. Useful acquisition fails; adaptive margin advantage passes. No solved-plasticity, biological-retention, reversal or transfer claim. PAM02 pulse-only proposal was deferred after zero direct overlap between its eligible cells and current cues. Earlier baseline-mask causal wording and unverified test-pass claims are corrected. Previous failed shared-memory patch made no code change. Current-status has preexisting invalid UTF-8; this native append preserves original bytes.

[Full result and correction record](../../archive/early-development/research/reports/adaptive-temporal-loop-2026-10-09/result.md).

## 2026-10-10: FlyBench implementation and pivots

[Full dated implementation/mistake record](../../archive/early-development/research/reports/flybench-software-2026-10-10/README.md): provisional rather than decimal-accurate ratings, unsupported 700 setting, untrained default adapter, sandbox subprocess failures, documentation encoding failure and game-boundary rather than exact midgame recovery. Initial and final synthetic checks are separate from fly strength and learning evidence.

## 2026-10-10: Researcher requests all50 PGNs

After implementation, the researcher explicitly requested playing the current fly against Stockfish and receiving all50 PGNs. Registered and launched the default untrained seed47 complete-game policy with frozen protocol, no learning and serial resource bounds. [Run registration](../../archive/early-development/research/reports/flybench-current-fly-50-2026-10-10/README.md). No graph-result claim before completion.

- [2026-10-10 move latency: staged zero-reset optimization, exact synthetic checks and active-run guard](experiments/2026-10-10-move-latency-zero-reset.md)


## 2026-10-10: FlyBench early stop and result correction

Stopped at researcher request after13 complete games when the 1320 floor ceased to gauge strength. The 13th loss is unpaired for Glicko; rating includes12 games. Game14 is saved unscored. Thirteen PGNs and replay audit retained. Corrected prior mistaken chat interpretation that game2 was a fly win; both first games were losses. See [full terminal report](../../archive/early-development/research/reports/flybench-current-fly-50-2026-10-10/README.md).


- [2026-10-10 weaker-opponent source check](../documentation/design/evaluation-and-performance/flybench.md): corrected Skill Level0 assumption; no alternative engine run.

- [2026-10-10 Phalanx weaker-engine candidate](../documentation/design/evaluation-and-performance/flybench.md): sourced easy-strength control and UCI port found; no Elo claim or run.
- [2026-10-10 low-rating calibration candidate review](../documentation/design/evaluation-and-performance/flybench.md): Nova hosted500 is a candidate, not independently validated; calibration layer not released.

## 2026-10-10: Nova FlyBench integration and unverified runtime pivot

Added a separately labeled Nova raw-policy opponent. The fetcher downloaded pinned v3b ONNX files at revision `018627575b71c9c17e9e5cc207c1b87db057dfbc` and verified their SHA-256 values. The released policy omits hosted temperature/Stockfish filtering, and its conditioning number is not Elo; therefore this is an opponent comparison path, not calibration to the Nova hosted 500 preset or to the stopped Stockfish scale.

Mistake/pivot: first installed `onnxruntime-node@1.30.0`, but importing the Windows package failed with `ERR_DLOPEN_FAILED` for its native binding. This is evidence of that package failing to load in this environment, not proof Nova inference is impossible. Switched to documented single-thread WASM `onnxruntime-web@1.30.0` without running inference. Model input/output shapes and legal move indexing have not been validated live. This remains an incomplete integration pending a controlled smoke inference and memory check.

The user reserved CPU for another agent. No graph loaded, Nova inference, game, or FlyBench process was started. Do not resume the stopped Stockfish 50-game run; it remains preserved at 13 completed PGNs. [Design and limits](../../documentation/design/evaluation-and-performance/flybench.md#2026-10-10-nova-raw-policy-integration); [pinned source registration](../literature/source-solution-register.md).

Static-review correction, 2026-10-10: initial Nova draft placed raw conditioning inputs directly into the Glicko reference ladder. That was a scale error. No run used it. Runner now rejects Nova unless a measured reference pool is declared, and it labels the supplied scale. This prevents an unsupported Elo implication; no Nova calibration has been performed.


Static-review memory gate, 2026-10-10: Nova's roughly399 MB external model data could exceed the 768 MiB RSS guard after WASM initialization. Added conservative 420 MiB RSS-headroom and 256 MiB free-memory preflights before session creation; this is not a measured peak guarantee. No runtime or games were started while CPU is reserved for another agent.


Static-review calibration separation, 2026-10-10: Glicko reference ratings and Nova policy-conditioning inputs are now stored as separate values. The report protocol records the mapping; games/PGNs label both, and rating updates strip conditioning fields before Glicko. Ladder rows can specify conditioningInput; absent that, an in-range reference Elo supplies only a starting raw-policy input, not an asserted conversion. Out-of-range rows require an explicit supported input. This does not calibrate Nova and remains untested pending available CPU.


Static API correction, 2026-10-10: ONNX Runtime's installed type declarations require external weight data as bytes (or a same-directory path string), not a {path,dataPath} pair. Adapter now reads and passes the model sidecar bytes explicitly and retains them for session lifetime. This is based on local API type inspection, not a live inference; no smoke test ran.


Follow-up correction, 2026-10-10: changed the untested byte-buffer external-data proposal to the API-supported same-directory file path form. This avoids holding an additional 399 MB JS buffer during initialization. Installed ONNX Runtime type declarations support a string external-data path. Session loading and peak RSS still require live verification and were not run.

- [2026-10-10: Independent WASM audit, inspection failures, checkpoint finding and publication record](../../archive/early-development/research/reports/independent-wasm-audit-2026-10-10/audit-log.md)

- [2026-10-10: Separate checkpoint repair and correction of lower-middle median labeling](experiments/2026-10-10-checkpoint-sync-repair.md).


- [2026-10-10: Independent review clarification for repaired checkpoint/statistics report](experiments/2026-10-10-checkpoint-sync-repair.md).

- [2026-10-10: Consequence-value priority, current gaps and prospective readout hypothesis](experiments/2026-10-10-consequence-value-readout.md).

- [2026-10-11: Stockfish-only calibration revision and preserved continuation mistakes](discussions/2026-10-11-stockfish-calibration-revision.md)

- [2026-10-11: Curriculum G0 receiver continuation and inspection mistakes](experiments/2026-10-11-curriculum-g0-receiver.md)
- [2026-10-19/20: Completed G0 diagnostic replay audit and reversal-history result](experiments/2026-10-19-g0-audit-memory-guard.md)

- [2026-10-20: Registered-run babysitter and recovery-state mismatch](experiments/2026-10-20-registered-run-babysitter.md)
- [2026-10-20: Visual terminal report and lesson-boundary pause](experiments/2026-10-20-terminal-report-and-pause.md)

- [2026-10-22 babysit campaign controller](experiments/2026-10-22-babysit-campaign-controller.md).
- [2026-10-31 memory fixture capacity and event-audit limits](experiments/2026-10-31-memory-fixture-capacity-and-audit.md).
