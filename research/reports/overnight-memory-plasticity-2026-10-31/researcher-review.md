# Researcher review: AI decisions and equations

2026-10-31. AI-assisted development advice for the researcher to accept or reject; not student-authored conclusions or submission text. The researcher authorized autonomous bounded fixture work and removed the time limit. This document does not assess the researcher's current competence. No real-graph run, selected learning rule, final data or reasoning claim results from it.

## Decisions made during this run

| AI decision | Reason | Alternative not taken |
|---|---|---|
| Prepare memory fixtures before the eye test | Eye usable-strength check needs attainable gain range (F04) | Treating memory preparation as approval for graph training |
| Keep one original report/run identity across continuation | Preserve chronology, original start, pins and failed data | Restarting or overwriting the interrupted session |
| Use 200 KCs, 20 focal cells, random fixed weights/rates | Small reproducible rate surrogate; engineering choices | Claiming an actual visual graph simulation |
| Fixed approach-minus-avoid linear readout | Existing convention; no answer-fitted output | A fitted decoder or per-item learned output for the candidate |
| Threshold .2, eta .5, tau .5, gain range [.2,1], scale1.5 | Explicit numerical hypotheses in the pre-result plan | Presenting these as measured receptor/visual-KC parameters |
| Use KC-local eligibility and DAN deviations from rest | Test inactive-edge protection and revisable bounded writes | Installing lateral inhibition, slow storage and recovery together |
| Initial punishment lacked a reward-side dip | Earlier reading mistakenly covered only PPL1 suppression | This was corrected after targeted Cohn reading; original failures preserved |
| Reciprocal reward/punishment dip in v1.3 | Cohn primary calcium data motivates an additional fixture assumption | Fast-edge sign changes or claiming a measured visual pathway |
| Exactly two slow rates, .25 then .5 | Named retention failure permitted family 2; conditional second setting preregistered | An undeclared rate sweep or claiming the one-way approximation inherits coupled-model capacity |
| Fixed 24-trial acquisitions/reversals, every eighth unknown | Match exposures/timing; engineering choices | Adaptive teacher retry or replay of unchosen actions |
| Softmax temperature .1 and seeded choices | Unaided policy chooses its own feedback exposure | Teacher-selected correct choices or exhaustive feedback for all images |
| Preserve all q, w, background and valence conditions | Distinguish inactive loss, shared conflict and saturation | Dropping difficult overlap conditions after observing failure |
| Informative/absent/yoked-shuffled/disabled arms | Separate effects of contingent feedback and actual plasticity | Counting untrained/control activity as learning progress |
| Assay v1.2 revised degeneracy and pooled shuffled gate | Original positive control could not meet the first per-cell rule | Concealing post-result measurement changes; original validity-v1 is kept |
| SeparateTable positive control | Tests schedule/teacher/instrument mechanics | It was incorrectly treated as sufficient evidence of architectural feasibility; corrected in loop5 |
| Self-limiting pulse diagnostic V0=.64 | Test one specified overtraining explanation after three attempts | Selecting a third mechanism family or using it as established MBON-to-DAN wiring |
| Stop rate repairs at proven readout incompatibility | No rates can cross the same static capacity bound | Filling the remaining loop budget with a known-inadequate rate repair |
| Count capacity review as loop5 | Conservative accounting of the assay correction | Resetting the two-family/six-loop limits on provider handoff |
| Do not open held-out fixtures or sensitivities for selection | No qualifying candidate; held-out failures must not drive repairs | Searching held-out seeds for a rescue |
| Preserve missing receipt evidence as a blocker | Saved data contain summaries, not per-trial proof | Inventing/reconstructing receipts and calling them original |
| Re-read Lin/Li primary text for the new diagnosis | Representation/physiology decision bearing scope | Treating all anatomy types as verified from a tool summary |
| Apply methodology/integrity skills within development scope | Required by handoff | Launching a manuscript pipeline or claiming independent peer review |
| Do not replace unavailable Haiku with another provider | Goal's explicit non-core coding assignment; provider rate limit | An unauthorized fallback delegate or lead-created replacement CLI |
| Keep original report's candidate failure; propose a new assay separately | Avoid outcome-driven gate changes | Calling 11/28 READY by removing impossible cells retrospectively |

The initial plan and addenda contain every numerical factor and their timing. [Loop log](loop-log.md) records predictions, evidence, abandoned attempts, correction reasons and tooling mistakes. [Manifest](artifact-manifest.json) pins the final working artifact identities; it does not overwrite historical run/config hashes.

## Equations to explain in plain words

| Equation | Meaning and why it matters | Provenance |
|---|---|---|
| E=clamp((k-theta)/(1-theta),0,1) | Only above-threshold local activity earns eligibility; genuinely shared active cells remain eligible | Engineering choice; not Manoim's measured receptor kinetics |
| e'=E+(e-E) exp(-dt/tauE) | Trace approaches current activity or fades across a gap; delay weakens credit | Standard first-order filter; time constant chosen, model time is not seconds |
| a=eta max(h-r,0)/scale; b=eta max(r-h,0)/scale | Above-rest and below-rest DAN activity drive opposite bounded directions | Restoration direction motivated by Huang fitted model; trigger motivated by Cohn, not established visual physiology |
| gStar=(a*gMin+b*gMax)/(a+b) | Target lies between legal gain limits; no pulse means no gain write | Engineering bounded update |
| g'=gStar+(g-gStar) exp(-e*(a+b)*dt) | Gain approaches its target only where eligible; implementation uses frame-end e | Declared split-step numerical rule, not an exact coupled continuous model |
| s'=u+(s-u) exp(-rho*rate*dt); effective=(u+s)/2 | Extra slow state lags fast state; it can slow acquisition and reversal as well as overwriting | Engineering one-way approximation; Benna/Fusi motivates extra coupled state but does not supply this rule |
| value(x)=sum k_i*(P_i*gP_i-R_i*gR_i)/s | The same stored edge gains determine every image's score | Fixed engineering readout; no learned answer table |
| p(first)=1/(1+exp((vSecond-vFirst)/temperature)) | Higher scores are preferred, but wrong actions can still be sampled | Fixed policy/exploration choice |
| R=marginA(T2)/marginA(T1) | Retention is measured only after acquisition; poor initial acquisition is not success | Assay metric |
| g(T2)=1+(g(T1)-1)*.75^N | Old recovery returns inactive edges to baseline under unrelated pulses | Algebra from pinned ReversalMemory, checked before candidates |
| marginNorm=margin/(1.6*(1-w)) | Pinned common scale; actual attainable margin depends on rates, weights and shared structure | Engineering scale, not a universal guaranteed capacity |
| a.x <= supportBox(a+lambda*b), lambda>=0, when b.x>=0 | If B must remain correct, this bounds reversed A even with optimally chosen gains | Original diagnostic derivation, independently enumerated 2D checks plus actual adapter comparison |
| Allow floor(.1*N) unconstrained seeds before the median bound | G6 tolerates one B failure out of twelve; a per-seed impossibility alone is not automatically a cell failure | Original aggregate bound; checked against exhaustive abandonment enumeration |

For the bound, the symbols a and b are **readout difference vectors**, distinct from the depression/restoration drives above. The same letter in two equations does not imply the same physical quantity.

## One concrete explanation exercise

Open [readout-bound-spec.md](readout-bound-spec.md). Explain why q=.5,w=.5 shares every discriminating focal cell, why the gain box is a generous relaxation, and why preserving B makes .40 reversed-A margin unattainable here. Then explain why this says nothing universal about a fly's memory or a nonlinear/context-dependent receiver. The next proposed decision is [the prospective assay/evidence correction](assay-correction-proposal.md); it is not a request to accept the AI's conclusions as the researcher's own.

## Receipt-repair addendum, 2026-10-31

The researcher approved lead-authored fixture/adapter/test repair after the Haiku provider failure. Earlier statements describe the status before that approval. [The pre-repair report](MORNING-REPORT-before-receipt-repair.md) and all earlier source/results remain preserved.

| Additional AI decision | Reason and rejected alternative |
|---|---|
| Add new recorded/checker/replay modules rather than changing the original loop | Preserve original source identities and failed data; no retrospective reconstruction presented as original events |
| Synchronous choice records before certificate creation/pulse | Logging failure halts the trajectory before teaching; avoid an unbounded asynchronous write queue |
| Bind certificates to actual scheduled trial and observed scores/choice | A hash alone cannot establish a real choice or prevent rehashed false fields |
| Separate replay loop using pinned candidate classes | Recompute frames, policy RNG, consequences, control valences and state; simpler than inventing a second biological implementation. It remains an internal audit with shared error sources |
| Hash-chain records plus source/registration/file hashes | Detect order/content/identity changes and anchor replay to the actual declared software, not merely consistent JSON |
| Re-run the same12 development seeds, same cell, all4 arms | Verify the repair without selecting new learning parameters or opening held-out data; repeated identical seeds are not independent evidence |
| Add a copied-registration hash guard after reviewing V2 | Initial event replay was correct, but that metadata identity was not checked. Preserve V2 and generate V3 under the correction |
| Use a streaming Python equivalence action | Compare all48 new summaries exactly to original data with bounded memory, rather than report only matching aggregate medians |
| Recover the asymmetric runner by checking its original digest | Restore exact historical source bytes without altering the current code or inventing old receipts |
| Describe the repair as auditable retention evidence, not improved long-term memory | No physiology, consolidation, timing or memory equation changed; the scientific learning gates still fail |

Additional equations/contracts to explain: `recordHash=SHA256(canonical body including previous hash)` protects record integrity, not factual truth; seeded softmax replay checks the model's own choice; `144=24+48+24+24+24` counts the original trials (the initial168 prose was corrected before data); `6912=12*4*144` includes864unknown trials. A replay pass establishes agreement with this pinned model implementation, not that the organism has long-term memory. [New raw evidence and limits](receipt-repair-v3-audit/result.json).

The later [lower-overlap oracle witness](low-overlap-feasibility-spec.md) is another AI-made diagnostic choice: neutralize shared cells algebraically, keep gain pairs summing to1.2, and use distinct cells to show compatible readout states. For a neutral cell, `gP=1.2*R/(P+R)` and `gR=1.2*P/(P+R)` balance the two weighted outputs; Float32 effects are checked. The instrument may inspect correct relations/future patterns; the learner may not. It is not a proposed teaching update, allocation of new neurons, learned checkpoint or proof of reachability within24 trials. [Output](low-overlap-feasibility.json) contains scores/checks only, without a reusable weight bank. It helps justify testing learning dynamics in that cell; it does not solve them.

Final testing decisions: move the npm concurrency option before paths after a measured installed-runtime probe showed the appended option was ignored; let the CLI's existing300s guard act before the outer harness kills it; retain failed temporary fixtures instead of unconditional cleanup. The earlier90s failure and source bytes remain preserved. No assertion was removed or test skipped. These are engineering validation choices, not biological timing parameters or evidence of memory improvement.
