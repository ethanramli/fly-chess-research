# Why current feedback produces little useful improvement

2026-10-08. Research synthesis, with proposed interventions distinguished from established results. The goal is more useful persistent learning per verified experience and per unit of total computation. No current result establishes 8/10 training quality.

## Finding that changes the next action

The bottleneck is broader than teacher correctness. A useful training event needs four links: a discriminating experience, evidence matched to the objective, a neural update with the right selective effect, and retained transfer. The present system has strong checks on parts of the evidence/publication chain but weak evidence for the last two links.

The latest timing fixture is especially revealing. Its safe capture was already preferred. Informative replay increased that candidate's score by 0.00079142, but increased the unsafe alternative by 0.00085386. The safe-minus-unsafe margin fell by 0.0000624391. No-channel replay also reduced the margin, by 0.0000605001. Informative-minus-no-channel margin change was -0.00000193901. Thus the positive pulse changed the score level substantially without improving discrimination in this inspected fixture. This is a descriptive two-action decomposition, not causal attribution to any edge or a universal failure claim. [Reproducible audit](../../../archive/early-development/research/reports/feedback-quality-review-2026-10-08/timing-margin-audit.json).

Calling the 76 changed entries learning progress would hide this distinction. Calling the 0.62-second replay a complete training cost would also hide setup, candidate assessment, proof, controls, persistence and auditing. The complete four-arm invocation took 26.33 seconds; the opposite-valence one-event control was not count-balanced.

## Current weaknesses, ordered by likely impact

| Weakness | Current evidence | Why it wastes experience | Required response |
|---|---|---|---|
| Poor action-specific update | Latest positive replay narrows pair margin; prior positive-memory probe showed nearly common offsets | Improved score can leave the same ranking or improve competitors more | Measure differential margins, informative-minus-control effect and regressions, not gain counts |
| Task mismatch | Stockfish feasibility: many mate-deadline failures tied with success at maximum full-game WDL | More accurate full-game win estimates can still be useless for the actual puzzle criterion | Keep certified task outcome separate from engine utility |
| Feedback is compressed | DualValencePuzzleBrain encodes board/action and adds PAM02/PPL103 stimulation; it does not encode explanations | The teacher may know a refutation while the learner receives no explicit transition/relation explanation | Checked contrastive examples and validated neural delivery contract |
| Rule is not established as prediction-error descent | ReversalMemory uses local measured excess activity, not a proven derivative of value error | Stronger/more finely graded pulses do not guarantee that outputs approach the target | Predeclare directional error reduction and control comparison |
| Shared cue interference | Capture-retention alias diagnosis and later training damaging prior choices | New correction can overwrite preferences needed elsewhere | Localize input/activity/memory/readout chain and test retention after each bounded lesson |
| Candidate-subset evaluation | Latest fixture compared two candidates, not all legal choices | Pair improvement may still promote an unrelated losing action | All-legal evaluation for useful-choice claims |
| Neutral search value | MappedPuzzleBrain.evaluate returns value 0 | More investigation does not learn to evaluate strategic endpoints | Separate fixed value interface validation from policy ranking |
| Delayed credit missing | Current receiver pairs cue/reinforcement in a replay; sequence planner is software only | A final pulse does not identify which earlier choice caused a combination | Independently certified earlier-context replay; no claimed eligibility without a mechanism |
| Weak exposure selection | Latest event rewarded an already-correct choice | Event spends compute without probing acquisition | Training-only choice failures, calibrated errors and retention sentinels, with matched schedule controls |
| Replication and final-set limits | Old nominal seeds were functionally inert; old counterfactual inspected | Repeated identical behavior is not independent evidence; inspected test cannot be final again | Functional factors and fresh disjoint families frozen before testing |

These observations do not prove that better input, more varied experience or another justified mechanism cannot work. They do reject treating repetition as the default repair.

## What Xiaomi MiMo actually contributes

The original MiMo-7B report describes a pretrained language model, then verified mathematics/code RL with GRPO. Its coding reward distinguishes difficulty groups of executable tests. Partial credit addresses cases where all-or-nothing rewards provide little signal. Data curation rejects defective tasks and samples difficulty strategically. It does not establish that every training rollout executes a correction loop with feedback inside the same conversation. [Primary report, sections 3.2–3.3](https://arxiv.org/html/2505.07608).

Later MiMo-V2.6/Gagar work evaluates interactive coding trajectories. Tests establish passing status first; an agentic grader compares passing implementations for quality and redirects positive advantage. This distinguishes task success from efficient, appropriate execution. These systems start with pretrained/SFT capabilities and use gradient policy optimization. Their reported gains cannot be transferred quantitatively to a scratch connectome learner. [Official release](https://mimo.mi.com/docs/en-US/news/latest/v2-6), [Gagar paper](https://arxiv.org/html/2609.32577).

Project adaptation, proposed: treat a chess lesson as an executable specification. A move may satisfy capture-retention, yet fail a mate deadline or lose later. Every subcriterion needs its own scope. Start with two or more consequential alternatives, a checked refutation and a changed-relation example. Award efficiency only after the declared correctness criterion is met. Record the attempt, consequence, correction and subsequent frozen-memory probe. Do not reward eloquent explanations, teacher agreement, changed moves alone or a shorter but wrong search.

Difficulty is not simply neural error magnitude. A large error may reflect unknown proof, inaccessible representation or a wrong update direction. A useful lesson must be verified, learnable under the declared pathway, and contrastive enough to distinguish actions. Keep hopeless/unknown cases visible in the coverage denominator rather than silently filtering them until metrics improve.

The closest direct research on learned correction is SCoRe. Its experiments identify no-edit collapse and train multiple attempts on model-generated data; they also penalize correct-to-incorrect revisions. This motivates separate wrong→right and right→wrong measurements here. It does not validate our synaptic rule or show that an immediate corrected retry is durable transfer. [SCoRe](https://arxiv.org/html/2409.12917v1).

## Stockfish: evaluator, search and teacher evidence are different objects

The pinned sf_19 source performs iterative deepening with alpha-beta search, move ordering, transposition reuse, reductions/pruning and quiescence. Its qsearch addresses unstable tactical leaves. NNUE supplies a learned static evaluator; incremental feature accumulators make many successive evaluations cheap. This is not a process of assigning each piece an independent fixed price. Copying its pruning constants into a much slower, uncalibrated fly evaluator has no supported efficiency guarantee. [Pinned search source](https://raw.githubusercontent.com/official-stockfish/Stockfish/sf_19/src/search.cpp), [NNUE guide](https://official-stockfish.github.io/docs/nnue-pytorch-wiki/docs/nnue.html).

Stockfish's normalized score/WDL are engine-specific measures calibrated to engine game conditions. They are not proof of a bounded mate and not calibrated win probabilities for the fly. [FAQ](https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html), [WDL model](https://github.com/official-stockfish/WDL_model).

Our completed target probe makes this distinction concrete: 124 analyses, 82 usable exact UCI targets, and 8–11 deadline-failing actions per board/budget tied with the winning action at maximum utility. Here “exact” means an unbounded UCI score report, not a mathematical proof. More nodes did not cure the objective mismatch. [Local evidence](../../../archive/early-development/research/reports/stockfish-target-feasibility-v1-2026-10-07/README.md).

Proposed teacher representation:

1. Certified outcome for the exact declared task and horizon, including complete required-defense coverage.
2. Checked tactical consequence witnesses: recapture, checkmate, material transition or relevant earlier decision. A witness alone proves only its stated scope.
3. Engine estimates for broader position utility, pinned by board/history, actor, binary hash, threads/hash, node budget and output validity.
4. Budget sensitivity as a disagreement envelope, never a confidence interval.
5. Candidate comparison/regret, value prediction error and proof status stored separately.

Do not average these into one convenient reward. A full-game winning estimate must not overrule a certified mate-deadline failure. Conversely, surviving one recapture is not a strategically good move. When criteria conflict, preserve both facts and teach only the explicitly declared objective through a separately validated channel.

The provisional tanh(MBON balance/scale) remains uncalibrated. It can be tested as an action-value proxy, but it does not automatically supply a state value, a neural chess explanation or a usable error gradient. A maximum over action values also needs consistent actor perspective throughout search. Stockfish should be a separate teacher offline; unaided testing uses the fly's output alone.

## Capablanca and a lean calculation budget

Capablanca's own book teaches progressive endings, piece coordination, restraint, activity, executable strategic plans and exploiting weaknesses. It warns against unnecessary speculative complications, but also analyzes long forced combinations and defensive alternatives. His annotated losses include criticism of changing plans without reason. This supports economical, purpose-directed play; it does not establish that he considered only three moves, avoided tactical calculation or used a measurable universal stopping rule. [Chess Fundamentals, chapters II–V and illustrative games](https://www.gutenberg.org/files/33870/33870-h/33870-h.htm).

Proposed curriculum derived from those principles, not a claim about his internal cognition:

- A blocked versus open line changes whether an apparently profitable capture survives.
- A defender occupied with one duty cannot necessarily meet another threat; test the actual legal replies.
- A passive piece becomes useful when a line opens or a constraint disappears, keeping material constant.
- An exchange can preserve a favorable ending, but can also discard initiative or cause a draw.
- A quiet preparatory move can enable a later threat; a sacrifice can be correct despite immediate material loss.
- A plan should persist only while its factual preconditions still hold; a changed counterfactual should make the learner abandon it.

Each principle needs matched nuisance variation and adversarial exceptions. “Prefer activity” or “simplify” cannot be hard-coded as a universal positive reward. Teacher-side chess features can describe examples and support verification; if supplied to inference as an oracle, they become an engineering shortcut requiring a separate condition.

Lean search should first order candidates, preserve every legal move, and spend bounded defensive exploration where the current hypothesis is fragile. Quiet moves and sacrifices must remain reachable. Stopping should depend on a declared proof/budget contract and measured tactical error, not a small neural score gap falsely treated as confidence. Test fixed-search and adaptive-search conditions at matched neural presentations, teacher calls, proof nodes and wall/CPU time. Record candidate omission separately from incorrect evaluation or missing defense.

Human chunking research motivates learned relational regularities but does not map them to the current KC code. Our symbolic encoder already supplies engineered relationships; transfer must establish that persistent neural memory uses them. [Chase & Simon](https://gwern.net/doc/psychology/chess/1973-chase.pdf).

## Why better grading alone may not help

Current local rule, away from clipping, is `g_next = g + eta * D * (k + g - 1)`, where k is positive excess KC activity and D is negative mean positive-excess DAN activity. This is a source-derived computational approximation, not gradient descent on the chosen-versus-alternative margin. [Source mechanism](https://elifesciences.org/articles/75611), [implementation](../../../.codebase/src/neural-learning/reversal-memory.mjs).

For a hypothetical fixed k and nonzero fixed D, its equilibrium is `g = 1 - k`; changing |D| changes the approach rate, not that equilibrium. This is an algebraic property of the frozen-activity approximation, not a prediction that our recurrent k/D stay constant. It shows why replacing binary reward with graded amplitude is insufficient by itself to prove accurate value calibration. In the real simulation k and D depend on recurrence, cue, memory and channel, so empirical direction tests are required.

A pulse can change both an action and its competitors through shared cells and broad readout. The meaningful quantity is `delta(score_success - score_failure)`, with no-channel drift subtracted. For value teaching it is post-update target error, with control comparisons. Neither raw score movement nor an arbitrary current/error mapping establishes the right direction.

Bennett's computational MB model motivates reinforcement prediction errors and feedback-dependent stabilization, but also discusses learned-value bounds, hypothetical connectivity and missing temporal credit. Its augmented wiring cannot be silently added to a fixed released graph. Handler's experimental work shows that cue/reinforcement timing can alter learning, so simultaneous replay is a declared approximation rather than demonstrated sequence learning. Hige motivates input-specific synaptic plasticity. None proves that our coarse anatomical mask and direct stimulation are appropriate for chess. [Bennett](https://pmc.ncbi.nlm.nih.gov/articles/PMC8105414/), [Handler](https://www.cell.com/cell/fulltext/S0092-8674(19)30611-7), [Hige](https://pmc.ncbi.nlm.nih.gov/articles/PMC4674068/).

Further primary-source check: [Dylla et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28676744/) observed KC and DAN response plasticity during Drosophila odor/shock trace conditioning but reported no evidence for DAN prediction-error coding in that assay. This does not rule out every compartment or task, but it blocks treating error-coded DAN activity as an established fly-wide mechanism. [Gkanias et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8975552/) distinguishes its reinforcement-driven plasticity rule from direct prediction-error calculation; modeled circuit feedback can produce broader dynamics. Therefore the Stockfish-value error is an authorized engineering teaching condition through the project's named experimental channel, not a biological dopamine signal.

Teacher computation of an error is permitted under the accepted Stockfish condition. It remains different from the biological circuit computing an endogenous prediction error. The rule currently clips below-rest DAN differences away; omission dynamics therefore cannot be assumed. Do not insert unsupported negative updates, extra reward wires or an optimizer to manufacture a pass.

## Rich feedback that fits the current receiver

Proposed first improvement is a checked contrastive lesson, not a paragraph that the neural system cannot parse:

1. Freeze memory; record the learner's unaided all-legal ranking and bounded investigation.
2. Verify the committed action and one independently proposed alternative after commitment. Unknown gives no event.
3. Extract the smallest checked refutation/continuation and mark the exact objective/horizon/defense coverage.
4. Replay the committed failure and verified alternative under the existing pathway, retaining separate events and before-feedback rankings.
5. Within the same fixed event budget, substitute a verified earlier-context or relation-counterfactual example only where it answers a documented diagnosis. Record which root event was displaced.
6. Test the next unaided decision, then test delayed retention and fresh unfamiliar/counterfactual cases with learning off.

This combines executable feedback, contrast and economical correction without importing pretrained reasoning. It does not establish a relational transition model, causal responsibility across a sequence or biological eligibility. Those require separate mechanisms and tests.

The project already contains contrastive review and fixed-budget sequence planners. The next implementation should build on them and the feedback-binding gate rather than create a duplicate teacher. The current capture-retention encoder explicitly accepts only that one-ply task; applying it to multi-ply mate or general engine-value tasks requires a separately versioned compatible encoder and protocol. [Existing contrastive design](../../../documentation/design/search-and-feedback/contrastive-choice-feedback.md), [sequence planner](../../../documentation/design/search-and-feedback/fixed-budget-sequence-replay.md).

## Additional safeguards for sample efficiency

Process-supervision research supports checking intermediate reasoning rather than relying only on final answers, but its trained language verifiers are not available neural mechanisms here. Replay independently verified earlier contexts rather than rewarding arbitrary intermediate “progress.” [Let's Verify Step by Step](https://arxiv.org/html/2305.20050).

Potential-based shaping preserves optimal policies only under its mathematical assumptions and specified form. An arbitrary bonus for activity, short lines or material can teach the wrong goal; no theorem makes our physiology optimize such a shaped objective. Keep primary correctness separate from efficiency and make shaping a declared comparison. [Ng et al.](https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf).

Prioritized replay motivates spending experiences on informative errors, but changes the sampling distribution and can amplify interference. Start with a small bounded teacher curriculum selected from training only, preserving criterion coverage and previously acquired sentinels. No unbounded replay history; no selecting final-test errors for training. [Schaul et al.](https://arxiv.org/abs/1511.05952).

Heterogeneous MB feedback models motivate exploring circuit-specific learning, but externally optimized model parameters remain comparison evidence and must not replace endogenous scratch adaptation. [Jiang & Litwin-Kumar](https://journals.plos.org/ploscompbiol/article?id=10.1371%2Fjournal.pcbi.1009205).

## What an 8/10 claim would require

The user's 4/10 is a usefulness judgment, not a measured scientific scale. A proposed ten-point engineering checklist awards one point for each independently audited property: exact context binding; criterion-matched evidence; checked discriminating contrast; explicit credit scope; neural delivery fidelity; selective directional improvement over controls; retention without required-criterion regression; unaided all-legal improvement; disjoint/counterfactual transfer; and measured improvement per total compute.

Eight checked properties is a possible engineering reporting shorthand. However, neural selectivity, retention, unaided improvement and transfer are mandatory for calling the training an effective route toward transferable reasoning. Strong teacher metadata cannot compensate for their absence. Keep teacher-evidence quality and learner-effect quality as separate vectors. Do not retrospectively assign points to frozen experiments or alter their gates.

Recommended intervention order: improve the lesson/evidence contract; test action-specific learning direction; address the demonstrated cue/readout interference if needed; establish retained unfamiliar reversal; then integrate broader multi-ply replay and separately validated engine-value teaching; finally measure lean-search time-to-quality. More volume is justified only by a registered learning curve with retained criterion improvements. No numerical promise of 8/10 or automatic learning acceleration is supported yet.
