**1. Executive decision**

Do not integrate the present value-error adapter into automated curriculum advancement. Retain its evidence-handling components, but replace its first learning objective with **certified, bounded task-consequence preference attached to the root action actually presented**. This is a proposed experiment, not an established solution. Engine-value teaching should wait until the representation and receiver demonstrate specific, persistent, reversible preference learning.

The strongest argument for retaining the adapter is that prediction error can legitimately have a different sign from move quality. Compartment-specific local plasticity could implement useful corrections without backpropagation. Its bounded inputs, perspective handling and immutable-wiring checks are useful foundations. What is missing is evidence that the chosen intervention corrects its own decoded prediction, preserves other knowledge, or changes useful choices. Arithmetic correctness does not supply that evidence.

“High quality” has four distinct meanings here: teacher evidence accurately identifies a consequence within a declared scope; delivery binds that consequence to the appropriate experience through a characterized neural intervention; causal efficacy produces durable, specific improvements over matched controls; transfer preserves consequence sensitivity on unfamiliar and counterfactual positions. The supplied information supports parts of the first two, none of the latter two. The seventeen tests establish their stated software properties only.

This memo treats `question.md` as the mechanism specification, not independently verified source-code behavior. A targeted primary-source check supports taking timing seriously: Handler et al. found timing-dependent reversal and opposing plasticity involving distinct dopamine-receptor pathways in fly olfactory learning. That supports testing temporal mechanisms; it does not validate PAM02/PPL103 polarity, this endpoint rule, its numerical dose, or chess credit assignment. Those biological correspondences remain unverified. [Handler et al., 2019](https://pubmed.ncbi.nlm.nih.gov/31230716/). No experiment or implementation is performed by this review.

**2. Prioritized failure analysis**

| Claim | Evidence or deduction | Counterargument / limitation | Severity | Smallest decisive check |
|---|---|---|---|---|
| The tested encoder cannot distinguish consequences | Identical inputs, initial dynamic state and memory imply identical deterministic responses for distinct actions | An externally supplied encoder might distinguish them | Blocking for chess claims | Compare input and KC response differences for a successful action, failed alternative and counterfactual |
| The update need not correct the measured prediction | Child-value residual drives root-cue plasticity; their response sensitivities need not align | Shared representations could align them | Blocking, untested mechanism | From identical snapshots measure fresh child value and root ranking after each channel |
| One memory/readout is being asked to serve incompatible objectives | Task failure and positive full-game value can coexist | Either objective is individually coherent | Blocking contract ambiguity | Predeclare the objective and trace case C |
| Terminal teaching is lost | Supplied control flow skips terminal children, including outcome-only | Skipping is safe for an undefined child-action proxy | Confirmed functional contradiction | Certified mate must reach a root-cue outcome event |
| Changed weights may cause nonspecific interference | Shared KC activity and recurrence couple cues | Overlap can also enable useful generalization | High, empirical | Probe a correct shared-input sentinel after each treatment |
| Comparisons may conflate feedback with exposure | State-dependent skips and an unauthenticated shuffle schedule | Selected test cases are matched | Blocking causal inference | Replay one frozen exposure table across arms and audit every slot |
| Rich records exceed verified evidence | Engine provenance and defensive coverage are incomplete | Existing bounded certificates can still be useful | High, integration gap | Bind real engine transactions and independently replay certificate obligations |

For case A, chosen utility is `2(0.60)-1 = 0.20`; regret is `0.30`; residual is `0.20-(-0.60)=+0.80`. PAM02 receives current `0.60`. The intended value correction is upward even though the action missed the task and was worse than another candidate. For B, utility is `0.80`, regret is zero, residual is `-0.15`, and PPL103 current is `0.1125`. Downward correction of an overestimate is consistent with good move quality. Neither case justifies rewarding or punishing root preference by that residual's sign.

Let `g` denote persistent gains, `h(g)` the measured child value, and `p(g)` the root preference. For a small permitted update `Δg`, correcting a nonzero residual requires approximately

`error × [∇h(g) · Δg] > 0`.

The root change is instead `Δp ≈ ∇p(g) · Δg`. Neither sensitivity is supplied. A max over child actions adds switching points; finite before/after probes are preferable there. Thus A and B determine channel and requested dose, but determine neither actual value correction nor root-ranking change. Probe both from copied identical memory, reset transient activity, and compare against no-channel presentation. Diagnostic perturbations may characterize sensitivities; their derivatives must not become teacher-computed training updates.

The stated rule also defeats a monotonic-depression diagnosis. With `D=-1`, `k=0`, `g=0.5`, it yields `g_new=0.75`; with `k=1`, the same initial gain becomes `0.25`. Ignoring clipping and holding activity constant, its fixed point is `g*=1-k`, with local multiplier `1+eta·dt·D`. This exposes possible recovery, oscillation or instability depending on dose; recurrence means these are conditional calculations, not actual network predictions.

For C, signed engine utility is `0.90`, residual `+0.10`, current `0.075`, and regret `0.05`. Task feedback should discourage missing immediate mate; engine-value correction should raise an underestimated winning-position value. Combining these in one undifferentiated preference is an avoidable objective error. Under the recommended task condition, certified immediate mate governs. Under a future separately registered game-value condition, engine utility governs. Neither is a contradiction within its own objective.

If `v` lies inside a nonzero disagreement envelope, the proposed value residual is zero. That means no direction is supported by this target rule, not that the prediction is correct. A large envelope can conceal poor prediction. Preserve the experience and record a zero intervention.

**3. One recommended learning contract**

Use **bounded task-consequence preference**, initially for one fully specified immediate consequence task. For criterion `c`, actor `i`, exact history `s` and legal action `a`, define `y_c(s,a)` as +1 for certified success, −1 for certified failure, and unknown otherwise. Failure requires evidence of failure under that criterion; an exhausted search is unknown. A noncapture may be failure for a capture task without being poor chess.

The neural score `p_g(c,s,a)` represents an ordinal tendency toward task success, not calibrated probability or game value. The behavioral objective is a positive margin

`p_g(c,s,a_success) - p_g(c,s,a_failure)`

and, ultimately, certified success among all legal choices. The teacher supplies individual consequences, never margin gradients. If criteria change, the criterion must be an explicit public context cue; otherwise identical board/action inputs could receive conflicting targets. Restrict the first experiment to one criterion to avoid adding an untested context mechanism.

Credit the root board/action that produced the consequence. Lasting memory remains the declared KC-to-MBON gains on existing edges with fixed signs. Re-present that exact cue after commitment, clear unrelated candidate activity, and deliver a bounded, fixed-dose consequence channel with a predeclared timing schedule. Initial channel polarity remains a hypothesis to test. Improvement is possible if positive treatment raises the successful-action margin and negative treatment lowers unsuccessful-action preference relative to alternatives. The local rule permits changes; the receiver experiment must establish their functional direction and specificity.

Use an unfitted sparse spatial input containing piece identity, color, square and candidate source/destination/promotion. A deterministic mechanical candidate afterstate may be included if declared before testing; omit computed attack labels and teacher solutions. This proposal supplies information, not evidence that the circuit can express relations. Whole-position lookup identifiers would make memorization easy while undermining the intended transfer test. Inspect action discrimination and nuisance sensitivity before training, then test relational sufficiency behaviorally.

For the first immediate-outcome test, explicit replay supplies action binding without claiming a multi-ply eligibility trace. It is an engineered associative presentation, not a model of natural delayed credit. If immediate association works but multi-step transfer fails, the smallest next addition is a bounded, verified consequence sequence presented after commitment, with a registered temporal eligibility mechanism linking earlier activity to later outcomes. Each intermediate experience needs its own meaning; do not reward every move in a successful line identically. Such a receiver requires biological justification and new validation before use.

Conceptual contract:

```text
restore published memory; freeze learning during assessment
reset transient state between candidate probes
record all-legal unaided ranking, ties, chosen action and memory hash
bind experience role: chosen attempt OR explicitly scheduled alternative/rehearsal
verify exact history, action, criterion and certificate independently
unknown -> persist no-event reason; do not stimulate or update
select treatment from immutable matched schedule
reset transients; replay credited root/action cue for declared duration
deliver certified consequence channel, or the assigned control treatment
observe local plasticity only as declared; record actual activity and gain changes
atomically publish memory + pending receipt + next schedule position
acknowledge receipt idempotently after durable publication
evaluate later from fresh transient state with frozen memory and no channel
```

Certified terminal success goes directly through root-cue teaching; no child-action prediction is needed. Terminal draw or loss follows the declared task criterion, rather than an automatic game-value substitution. Multiple successful actions share the same label; deterministic seeded tie-breaking must not encode the teacher's preferred move. Unavailable neural output is recorded as an inability to choose, not silently discarded from performance. Certifiable scheduled teaching can still proceed, since it requires no value residual.

Human receipts retain certificates, alternatives, explanations and optional engine estimates. Neurons receive only the public cue, scheduled consequence stimulation and, in a future sequence condition, explicitly declared experiences. Recording an explanation is not neural explanation learning. Stockfish remains diagnostic in this first condition; adding an independent game-value objective is deferred rather than concealed in a combined pulse.

**4. Smallest decisive validation ladder**

First verify software invariants without graph training: exact attempt/replay roles, terminal delivery, history and actor binding, unknown rejection, common exposure, frozen evaluation, schedule membership, wiring invariance, and interrupted-publication recovery. Existing terminal-skip assertions need a new contract test; preserve the old result as historical behavior.

The first newly registered model experiment should be a bounded acquisition–interference–retained-memory reversal assay with distinguishable public cues and an overlapping sentinel. It should explicitly test the unpassed receiver prerequisite, not bypass it with chess volume. Use paired arms initialized from identical snapshots: informative consequence, absent channel, matched shuffled consequence, and disabled plasticity. The informative arm receives independently verified consequences for every teachable experience. For reversal, reverse declared assay contingencies while retaining acquired memory; do not label the same immutable chess consequence both true and false. This reversal is a receiver assay with correspondingly limited claims.

Independent units are complete initialized learner replicas with predeclared seeds and exposure schedules. Repeated measurements or many checkpoints from one replica are not independent replications; multiple task families support a separate family-generalization estimate. Primary outcome is the paired informative-minus-control difference in retained, fresh-state preference margin in the currently reinforced direction after reversal. Acquisition and interference retention are mandatory prerequisite gates, so a favorable reversal aggregate cannot erase failed acquisition. Measure all controls separately.

The sentinel starts with a correct preference and shares public features/KC activity with the trained pair. Require preservation within a predeclared practically acceptable loss after acquisition, interference and reversal. Also report useful choice counts, unavailable responses, clipping, channel responses and complete gain changes. Reload saved memory in a fresh evaluator; restore pretraining memory and disable plasticity to distinguish stored learning from transient activation and procedural effects. Persistence after restart is computational retention, not biological consolidation.

Choose meaningful margins and sentinel tolerances before confirmatory testing from the intended decision requirement and numerical resolution. Estimate between-replica variance in a separate development pilot, then size paired confirmation for the smallest worthwhile effect and chosen uncertainty/error criteria. Arbitrary replica counts or 32 four-event blocks imply no power. Freeze exposure caps and checkpoints; resource exhaustion, unsupported biological timing, corrupt evidence or failed mandatory gates stop advancement. Unknown outcomes stay unknown, with coverage reported. Do not repeatedly extend the budget until a pass appears.

After the receiver gate passes, test useful all-legal immediate-task choices and retention on several training families. Only then evaluate disjoint validation families and sealed final relational/counterfactual families: move a defender or blocker so the correct action changes, vary irrelevant pieces while preserving the relation, and test unfamiliar arrangements. Group related counterfactuals, transpositions and source games within one split. Compare pretraining and nonplastic performance to expose encoder shortcuts. Untrained motif composition and delayed sacrifices are later gates requiring appropriate verifiers, not consequences of an immediate-task pass.

Failure interpretation must follow measured intermediates. Identical encoded cues implicate representational aliasing; distinct cues with absent DAN response implicate delivery; changed gains without the desired fresh preference change implicate receiver/readout alignment; target improvement with sentinel loss implicates interference; familiar success without counterfactual sensitivity limits generalization. None alone demonstrates universal inability to learn.

**5. Executable controls and evidence**

For the first causal assay, freeze a common experience table before treatment. All arms assess each position but receive the same credited actions, histories, order and timing, explicitly marked as scheduled experiences where they differ from their own choices. This estimates learning from common experience. Later on-policy curriculum comparisons estimate the total effect of different learning-and-sampling policies; they cannot simultaneously claim identical experienced actions.

Choose shuffled **consequence labels**, permuted within predeclared balanced blocks independently of cue identity. Use a genuine permutation without requiring every label to be opposite; an opposite-sign rule is systematic anti-learning. Preserve counts of positive/negative channels, fixed dose, duration and scheduled presentations. Actual neural activity can differ and must be measured, not forcibly matched. Authenticate exact table membership, permutation seed and event index; a hash-shaped string is insufficient.

Informative versus shuffled estimates the benefit of correct cue–consequence contingency at matched exposure and stimulation distribution. Informative versus absent measures adding the experimental pathway beyond cue-driven endogenous adaptation. Informative versus disabled tests whether permitted persistent plasticity is necessary. The absent arm still calls the declared observation rule: endogenous activity may change memory, so it is not necessarily a no-learning arm.

For future value-error experiments, shuffled targets and shuffled residuals answer different questions. A shuffled target recomputed against each arm's own prediction disrupts target association but changes dose distributions. Yoked shuffled residuals preserve the informative arm's delivered error distribution but are no longer prediction errors for the recipient. Sign inversion supplies adversarial correction, not a random contingency null. Use a frozen/yoked residual table only when the claim concerns informative delivery at matched stimulation; label that estimand explicitly. Keep zero-dose slots and missing-prediction status visible. Teacher-side unknown certification yields no update in every common-exposure arm; an arm-specific numerical failure terminates the matched comparison rather than quietly removing inconvenient slots.

Engine provenance, if later used, minimally includes binary and neural-network file hashes, options, threads/hash, seeds where relevant, exact history-bearing `position` and `go` commands, search budgets, raw transaction boundaries, exit/completion state and selected principal-variation index. Require `MultiPV=1` or explicit index filtering, unbounded scores and matching WDL from the intended transaction. Analyze budget envelopes as disagreement only. Independently replay legal certificate branches and required defensive coverage; an illustrative principal variation does not certify best defense or bounded failure.

Report attempted, certified-success, certified-failure and unknown counts by criterion, difficulty, source family and condition, including exclusions and resource failures. Certification-conditioned accuracy must accompany coverage; it is not whole-corpus performance. Audit certificate scope again before replay.

Publish memory, pending receipt, RNG state, next event cursor and identity hashes as one atomic recoverable generation. Recovery either consumes an already committed event idempotently or recomputes from the previous published state; it must never apply an acknowledged event twice. Preserve partial writes separately.

Reduce cost by excluding all-legal engine analysis and child-action neural sweeps from this first task-only experiment. Cache frozen teacher evidence, recheck certificates, stream bounded records, process one position at a time and retain the stated resource limits. Fixed-dose teaching also removes endogenous residual-dependent exposure. These reductions remove unnecessary work; they do not weaken defensive proof obligations.

**6. Implementation order and decision boundary**

Recommended changes, for a subsequent authorized implementation, are: first freeze the task/credit/exposure contract and terminal receipts; second reuse history reconstruction, certificate checking and snapshot machinery while replacing the constant encoder with one declared public representation; third verify the receiver, sentinel and control schedule before connecting curriculum advancement. Keep the value proxy and grader as isolated diagnostic hypotheses. Do not add a critic, external fitted decoder or twelve-stage controller to solve this prerequisite.

While training remains paused, software contract review, deterministic fixtures, source registration and protocol preparation can proceed. Graph assays require a new registered experiment; automated progression and claims of useful chess learning wait for the receiver and choice gates. A failure leads to a dated diagnosis bounded by measured evidence, not automatic extra rehearsal or altered frozen thresholds.

The remaining decision-changing facts are narrow:

- **Cue/KC discrimination and overlap:** identical task-relevant responses require encoder revision; distinct responses permit receiver testing.
- **Fresh preference response to each channel, dose and timing:** appropriate specific changes retain the local mechanism; wrong or absent changes require a justified receiver revision before chess training.
- **Retained-memory reversal and sentinel preservation:** failure blocks scaling even if acquisition succeeds.
- **Certificate yield on a declared corpus sample:** low coverage restricts the next study to a supported domain; it does not justify treating engine estimates as proof.
- **Anatomical and temporal support for the selected mappings:** insufficient support limits claims to an engineered computational assay pending a source-backed replacement.

**Decisive next action:** preregister the single common-exposure receiver assay above, including its representation, polarity hypotheses, retained-memory reversal and sentinel rejection criteria. Run it only after the training pause is explicitly lifted. Its outcome determines whether this local learning pathway merits a bounded chess-foundations experiment.
