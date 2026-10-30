# FlyChess principles curriculum v1

Date: 2026-10-11, Asia/Jakarta. **Curriculum specification, not a trained model or a graph-launch authorization.** The [machine-readable curriculum](../../../archive/early-development/research/data/principles-curriculum-v1/curriculum.json) is authoritative for quotas, limits and prospective thresholds. These are new engineering acceptance rules, not optimal teaching doses, biological constants or revisions of previous frozen gates.

This replaces the earlier [outline](../search-and-feedback/forcing-and-positional-curriculum.md) as the actionable curriculum design; preserve the outline and every failed experiment. The end state includes tactical consequences, piece effectiveness, coordination, weaknesses, restriction, pawn breaks/exchanges, learned position evaluation, opposing plans and unfamiliar composition. It does not stop at capture fixtures or puzzle accuracy.

Package: [source coverage](../../../archive/early-development/research/data/principles-curriculum-v1/source-evidence.md), [completion review and implementation boundaries](../../../archive/early-development/research/data/principles-curriculum-v1/completion-audit.md), [checked illustrative teacher examples](../../../archive/early-development/research/data/principles-curriculum-v1/teacher-examples.json) and [reproducible specification audit](../../../archive/early-development/research/data/principles-curriculum-v1/README.md). Teacher examples are excluded from all curriculum dataset splits.

Reader-facing names are **Stage 1** through **Stage 12**. Existing machine-readable IDs remain stable for protocol and data compatibility.

## What counts as learning a principle

A principle is a conditional consequence relationship reused beyond taught examples. It is not a geometric feature, a sentence, a universally positive heuristic or one repaired board. Code supplies legal rules and explicitly declared symbolic observations. Task significance must arise through persistent local physiological state. Symbolic chess input bypasses eyes.

The learner receives board/history, a legal action during action assessment, and a public task criterion for bounded diagnostic tasks. No lesson ID, motif name, proof, success/failure flag, correct move, engine target or target-derived safe/unsafe token enters sensory input. Labels control the teaching signal only after unaided assessment. Family IDs are private teacher/audit metadata. Integrated play receives no lesson/motif tag or teacher-selected objective revealing the solution.

R0 is a fixed task-conditioned neural action-consequence preference. Freeze readout identity and polarity before training; zero/ties are incorrect consequence predictions, not calibrated confidence. Rplay is a candidate-free position-value hypothesis: fixed reference-relative MBON ensemble contrast z, then p=(1+tanh(z))/2. Complement the child-side estimate when orienting it to the root actor. It is uncalibrated until its tests pass. Do not fit a decoder to labels or substitute the current max-over-action-score proxy for Rplay.

## G0: verify the receiver before teaching chess principles

Register a new eight-context neutral cue-pair association assay in each of three behaviorally distinct computational replicas. An independently replayed contingency table defines task consequences. Reversing this toy contingency is not falsifying chess truth. It needs its own receiver/verifier contract rather than arbitrary statuses sent through the chess verifier.

Use 32 balanced presentations for acquisition, 16 matched intervening non-target presentations for interference retention, and 32 for reversal. At every phase require at least 6/8 correct context preferences and at least two more than each matched control in every replica. Informative output direction/specificity must exceed control drift by epsilon 1e-8. Report every failed context; aggregate improvement cannot hide failed reversal.

Verify released root IDs, indices, eligible KC-to-MBON edges, compartment/sign conventions, pathway evidence and approximations before stimulation. The gamma2 rate-timing candidate is a source-motivated engineering hypothesis. Missing subtype/receptor/compartment support cannot be repaired by renaming a scalar dopamine or adding unsupported recovery. Preserve gamma4 V1/V2, positive-channel V1 and later failures. Anatomical/biological applicability remains a separate evidence gate.

Require independent local recurrence replay, fixed wiring, removal/restoration of the learned effect and recovery immediately after a published pending update without duplication. G0 is unpassed for this curriculum. Historical local direction, familiar-choice repair or software tests do not satisfy it. Numerical intervals and deterministic no-decay persistence are not biological time or measured biological retention.

## Data, targeting and progression

Per lesson prepare 24 training boards (12 counterfactual pairs, six structural families), 16 validation boards (eight pairs, four different families), and 64 final boards (32 pairs, eight untouched families). Final families occupy four predeclared semantic strata, two eight-board families per stratum. These are planned quotas, not generated datasets. Symmetry equivalents belong in the same split.

Predeclare two balanced certified probe actions per board and label every legal action under the exact task for all-legal diagnostics. Accept any certified successful action, not only a textbook move. Existing capture verification rejects noncaptures: a new task-domain wrapper must certify them as not performing the capture task, without calling them globally bad. Unknown required final labels invalidate the audit; do not replace cases, reduce denominators or count teacher exhaustion as a learner error.

Balance mover/action identity, side, material, location, check status and nuisance context wherever feasible. Include adversarial exceptions. Test scratch, geometric/label-blind and nearest-cue shortcut baselines. If supplied representation alone solves a task, report engineered computation. Use training errors only for targeting, validation only for selection, and sealed final families once after selection.

Each lesson has 32 four-event blocks, 128 known teaching events per condition/replica:
1. Reassess a current informative-arm training error and replay its failed action.
2. Replay a separately certified successful alternative from that panel.
3. Replay a successful training sentinel from an earlier principle.
4. Replay a failed earlier-principle counterexample.

This is two successes/two failures and 50 percent rehearsal. Stage 1 rehearses a different Stage 1 pair. When a panel is already mastered, use the predeclared oldest uncovered training pair; do not invent an error. Retarget current competitors after each pair. Unknown/stale proof or a missing balanced stratum stops the block before unverified teaching and is logged.

Yoke every arm to the informative-selected board/action/proof/order/timing sequence. Freeze the shuffle algorithm/seed before informative execution; construct its complete balanced schedule before control replay. Preserve action/task/actor exposure and waveform-class counts while breaking context-outcome contingency. Absent removes external teaching only; activity-driven plasticity may still occur. Disabled receives the informative waveform with every persistent gain/trace held fixed.

Keep one continuous from-scratch lineage per condition/replica, continued from accepted stage snapshots. Do not initialize every lesson anew. Replication seeds must change actual public-input projections and evoked responses; unused head seeds do not count. These are computational replicas, not independently studied living flies. Run serially on one sparse graph.

Publish after blocks 8,16,24,32; after the declared exposure select the earliest checkpoint passing every validation and previous-principle retention gate. Controls are compared at that same block. There are only four selection candidates; report rejected/later exposure and compute. No rollback within the primary acquisition trajectory. Snapshot selection is engineering protection, not physiological forgetting repair.

## Definitions of done: D1-D8

Every applicable gate must pass in every replica. Ties are incorrect and favorable margin changes alone do not pass.

| Gate | Required result |
|---|---|
| D1 acquisition | At least 22/24 successful unaided training choices. |
| D2 checkpoint selection | At least 14/16 validation choices and at least 3/4 in each validation stratum, with earlier retention intact. |
| D3 unfamiliar useful choice | At least 52/64 successful final all-legal unaided choices; at least 12/16 in each semantic stratum and 6/8 in each family. |
| D4 consequence prediction | Correct fixed-polarity signs for at least 104/128 balanced final probe actions. Zero is incorrect, not a probability estimate. |
| D5 counterfactual | Both board choices correct in at least 26/32 pairs, with the designated probe-action ordering reversing as its certified consequences reverse. A common always-safe alternative alone cannot pass. |
| D6 informative causality | At least ten additional correct final choices over scratch and each absent/shuffled/disabled control. Require a positive lower bound from the declared 95 percent paired family-cluster bootstrap, 10000 resamples, seed 20261011. Report replica results separately. |
| D7 cumulative retention | New-principle validation stays at least 14/16 after eight additional four-event interference blocks. Earlier per-principle validation counts may not fall; all four previously mastered training sentinels per earlier principle remain correct. Recheck after every subsequent stage. |
| D8 state/audit | Removing latest-stage learned state removes the acquired advantage; restoring it reproduces predictions/rankings. Independent certificate/local-update replay, fixed identities, memory continuity and exact pending-receipt recovery pass. Report unaided and fixed-budget searched results separately. |

Interference blocks are additional actual learning on older training families, yoked into controls and counted separately from the 128 new-stage events. Stage 1 uses predeclared unrelated G0 contingency exposures with an already reviewed receiver. Do not silently restore the selected snapshot after interference; a failed challenge is failed retention. CPU sleep or unchanged serialization cannot pass D7.

D6 can fail from a high scratch ceiling. Do not prune final cases or weaken the threshold afterward: report that acquisition was not established. Family-cluster uncertainty is a planned sampling assumption, not a population-level proof of cognition.

Stages 9-12 additionally require position MAE at most 0.10 against pinned multi-budget engine estimates, at least 0.05 lower than every matched control in every positional stratum, while exact consequence-choice gates remain intact. This is engine-target calibration, not true win probability. Stage 12 also requires 32 colour-balanced opening pairs/64 completed games per mode/replica/control in a pinned mini-position/reference-policy pool: at least 20/32 pairs favor informative over each control and game-point rate advantage is at least 0.15. Unaided and fixed-search play are separate. Unfinished games are unknown, not draws. No Elo inference.

Failure stops advancement. Preserve receipts and classify representation, delivery, local update direction, ranking, retention, reply omission, horizon or unknown proof only as supported. New solutions need dated mistake/pivot records and a new protocol with fresh untouched final families. These gates do not guarantee that the proposed mechanism will learn.

## Lesson order and operational targets

Every lesson requires its predecessor, through G0. Positive/negative descriptions below are template requirements, not claimed certificates. Each specialization adds to D1-D8.

### Stage 1: Attack, defense and recapture

**Definition:** Whether an opponent can legally recapture the moved capturing piece depends on defenders, blockers and king constraints.

**Learning target:** Predict immediate recapturability and prefer retention when retention is the declared task. Maximum 6 pieces; consequence horizon up to 1 plies. Tasks: capture-retention. Feedback: F0.

- Positive experience: Same capture survives every legal immediate reply because the defender is absent, its line is blocked, or an apparent defender is pinned and cannot legally recapture.
- Negative experience: The otherwise similar capture allows a legal recapture by an available, unblocked and unpinned defender.
- Changed-question/counterfactual experience: Change one blocker or defender while retaining the capture identity and material, reversing recapturability.
- Opponent coverage: Enumerate the exact legal next replies; distinguish an available recapture from an obligation to recapture.

**Definition of done:** D1-D8 plus At least 12/16 on each of four strata: open defender, blocked defender, absent defender, pinned apparent defender; never interpret retention as universal move quality. Status: specified, not trained; machine data lists required capabilities.

### Stage 2: King safety, check and mate

**Definition:** Check restricts legal replies; mate requires that no legal escape remains. A useful defense prevents a verified impending consequence.

**Learning target:** Distinguish check from mate and select a defense when a quiet improvement permits mate. Maximum 6 pieces; consequence horizon up to 3 plies. Tasks: forced-mate, avoid-loss. Feedback: F0. A bounded three-ply avoid-mate verifier now covers only whether the selected move permits an opponent-forced mate within the remaining two plies; it is not a general avoid-loss verifier or a production Stage 2 runtime. See [Stage 2 avoid-mate domain](stage2-avoid-mate-domain.md).

- Positive experience: Certified mate-in-one, or a legal defensive move preventing every opponent mating continuation within the declared horizon.
- Negative experience: A check has a quiet blocking/escaping defense; an attractive nondefensive move permits a certified mating reply.
- Changed-question/counterfactual experience: Change one escape square, supporting piece or interposition route so the same check or defense changes outcome.
- Opponent coverage: Include king escapes, captures of the checker, interpositions and quiet mating threats.

**Definition of done:** D1-D8 plus At least 12/16 in each stratum: actual mate, escapable check, mandatory defense, misleading improving move; all success claims cover every required escape. Status: specified, not trained; machine data lists required capabilities.

### Stage 3: Sound forcing moves and reply awareness

**Definition:** Checks, captures and threats are investigation priorities; soundness depends on what an opponent can force in response.

**Learning target:** Select a useful forcing candidate when one exists, and reject tempting forcing candidates refuted by forcing or quiet defense. Maximum 8 pieces; consequence horizon up to 3 plies. Tasks: forced-mate, bounded-material. Feedback: F0, F1.

- Positive experience: A check, capture or threat meets the fixed mate/material criterion against all required defenses.
- Negative experience: A high-priority check loses the payoff, an apparently profitable capture is refuted, or a threat can be neutralized quietly.
- Changed-question/counterfactual experience: Preserve the surface forcing move while adding or removing a specific defensive resource.
- Opponent coverage: Include counterchecks, recaptures, queen trades and quiet refutations. Do not filter opponent moves to only forcing tags.

**Definition of done:** D1-D8 plus At least 12/16 in each stratum: sound check, sound capture/threat, forcing refutation, quiet refutation; no check-priority score may supply the final answer. Status: specified, not trained; machine data lists required capabilities.

### Stage 4: Double threats and overloaded defense

**Definition:** Multiple targets matter only when the opponent cannot neutralize the consequences together; geometric double attacks alone do not prove a gain.

**Learning target:** Use forks and overworked defenders to obtain a guaranteed bounded payoff, while rejecting apparent forks that can be parried. Maximum 8 pieces; consequence horizon up to 5 plies. Tasks: forced-mate, bounded-material. Feedback: F1.

- Positive experience: The opponent's legal defenses cannot save both relevant outcomes, producing a certified material gain or mate.
- Negative experience: One reply trades the attacker, checks our king, or otherwise neutralizes both apparent threats.
- Changed-question/counterfactual experience: Add one defensive option or remove an overloaded duty so the double threat no longer wins.
- Opponent coverage: Look for combined defenses and counterattacks, not merely retreating one target.

**Definition of done:** D1-D8 plus At least 12/16 separately for real forks, apparent forks, overloaded defenders and defensive counterattacks; a count of attacked pieces cannot pass. Status: specified, not trained; machine data lists required capabilities.

### Stage 5: Lines, blockers and removal of defenders

**Definition:** Changing a blocker or defender changes which attacks and defensive resources are available.

**Learning target:** Choose a line-opening or defender-removing action because of its verified resulting consequence. Maximum 8 pieces; consequence horizon up to 5 plies. Tasks: forced-mate, bounded-material. Feedback: F1.

- Positive experience: Opening a ray, a discovered attack, or removing a defender permits a certified payoff.
- Negative experience: A remaining blocker, a second defender or an exposed own king prevents the same-looking plan.
- Changed-question/counterfactual experience: Move one blocker or substitute a defensive resource while preserving the candidate's local appearance.
- Opponent coverage: Include interposition, replacement defense, countercheck and recapture after defender removal.

**Definition of done:** D1-D8 plus At least 12/16 for opening a line, discovered attack, defender removal and replacement defense; removal of a piece is not sufficient evidence of causal usefulness. Status: specified, not trained; machine data lists required capabilities.

### Stage 6: Move order, intermediate moves and sacrifices

**Definition:** An earlier concession can enable a later consequence; changing move order or support can invalidate it.

**Learning target:** Prefer a necessary intermediate move or supported sacrifice when its full declared consequence succeeds, and reject its unsound counterpart. Maximum 8 pieces; consequence horizon up to 7 plies. Tasks: forced-mate, bounded-material. Feedback: F1.

- Positive experience: A certified sequence requires the preparatory action or concession before the payoff against all required replies.
- Negative experience: Direct execution fails, an opponent intermediate move refutes the concession, or the later compensation is unavailable.
- Changed-question/counterfactual experience: Remove payoff support or change move order so the same concession fails at the same horizon.
- Opponent coverage: Search intermediate checks, declined sacrifices and defensive alternatives; accepting a sacrifice is not assumed.

**Definition of done:** D1-D8 plus At least 12/16 for necessary preparation, sound concession, unsound concession and opponent intermediate move. Credit root and later choices only with independent state/action certificates. Status: specified, not trained; machine data lists required capabilities.

### Stage 7: Piece effectiveness and improving an ineffective piece

**Definition:** A piece is useful through its contextual attacking or defensive role, not simply its number of moves or nominal value.

**Learning target:** Activate a constrained piece, sometimes by moving a blocker or preparing a route, while preserving important duties. Maximum 8 pieces; consequence horizon up to 7 plies. Tasks: forced-mate, bounded-material, avoid-loss. Feedback: F1.

- Positive experience: A quiet action improves participation and enables a certified later payoff; alternative high-mobility moves do not.
- Negative experience: A mobility increase has no useful consequence, abandons defense, or activates the wrong piece for the position.
- Changed-question/counterfactual experience: Change the relevant target or defensive duty so the same activation ceases to help.
- Opponent coverage: Include a timely attack on the abandoned duty and interference with the intended route.

**Definition of done:** D1-D8 plus At least 12/16 for freeing a blocker, rerouting a piece, useless mobility and abandoned duty; include successful actions by a piece other than the ineffective piece. Status: specified, not trained; machine data lists required capabilities.

### Stage 8: Coordination and shared duties

**Definition:** Pieces can enable one another's consequences by support, access and complementary duties; redundant attacks need not improve the position.

**Learning target:** Develop coordinated participation rather than independently maximize each piece's activity. Maximum 8 pieces; consequence horizon up to 7 plies. Tasks: forced-mate, bounded-material, avoid-loss. Feedback: F1.

- Positive experience: Preparing support or access lets multiple pieces complete a certified consequence without losing an essential duty.
- Negative experience: Redundant participation adds nothing, a support piece is removable, or coordination is achieved at the cost of an urgent defense.
- Changed-question/counterfactual experience: Remove one supporting relationship or change its legal availability so the coordinated plan fails.
- Opponent coverage: Include exchanges of supporters, interference and exploitation of overloaded own defenders.

**Definition of done:** D1-D8 plus At least 12/16 for shared targets, support preparation, interference and redundant/unsafe coordination; supply paired support interventions, not only co-occurring activity. Status: specified, not trained; machine data lists required capabilities.

### Stage 9: Weaknesses, pawn structure and weak squares

**Definition:** A weakness is exploitable in context through available routes, targets and timing; structural labels alone do not determine value.

**Learning target:** Repair, defend, compensate for or exploit a weakness based on consequences, including exceptions to textbook structural preferences. Maximum 10 pieces; consequence horizon up to 7 plies. Tasks: forced-mate, bounded-material, avoid-loss, position-estimate. Feedback: F1, F2.

- Positive experience: A defense or pressure plan changes a certified material/mating consequence, or improves the separately measured value target.
- Negative experience: Repairing a pawn structure permits a greater loss; an isolated/doubled pawn is unexploitable or compensated by activity.
- Changed-question/counterfactual experience: Change access to the weak square or supporting route while leaving the superficial pawn classification unchanged.
- Opponent coverage: Include pawn breaks, exchanges of attackers and switching pressure to another target.

**Definition of done:** D1-D8 plus At least 12/16 for repair, exploitation, compensation and unexploitable apparent weakness; the extended positional value gate is required in addition to bounded task gates. Status: specified, not trained; machine data lists required capabilities.

### Stage 10: Restriction, prophylaxis and the opponent's plan

**Definition:** A move can be useful by preventing a consequential opponent plan even without an immediate attacking gain.

**Learning target:** Choose timely prevention when an opponent's verified threat outranks a tempting own improvement, and avoid unnecessary passive prevention. Maximum 10 pieces; consequence horizon up to 7 plies. Tasks: avoid-loss, bounded-material, position-estimate. Feedback: F1, F2.

- Positive experience: A quiet restraining action denies an otherwise certified opponent payoff and preserves our counterplay.
- Negative experience: An improving move ignores the threat, or prophylaxis addresses a nonexistent threat and permits a stronger opponent plan.
- Changed-question/counterfactual experience: Remove the opponent plan's prerequisite so the preventative move becomes unnecessary or wrong.
- Opponent coverage: Model future pawn breaks, activation routes, exchanges and quiet preparation in the actual legal child positions.

**Definition of done:** D1-D8 plus At least 12/16 for preventing a break, restricting a piece, unnecessary prophylaxis and competing threats; include changed-plan pairs where the preferred response reverses. Status: specified, not trained; machine data lists required capabilities.

### Stage 11: Pawn breaks, exchanges and endgame transitions

**Definition:** Irreversible changes alter access, king roles, pawn prospects and the value of preserving or exchanging pieces.

**Learning target:** Compare preparing a pawn break, trading into an ending and preserving tension according to the resulting consequences. Maximum 8 pieces; consequence horizon up to 9 plies. Tasks: forced-mate, bounded-material, avoid-loss, promotion, position-estimate. Feedback: F1, F2.

- Positive experience: A prepared break, an appropriate exchange or king activation enables certified promotion/material/mate or a better declared position target.
- Negative experience: The same exchange causes a draw or exposes the king; an unprepared break creates a decisive weakness; nominal simplification loses the useful plan.
- Changed-question/counterfactual experience: Change king activity, pawn support or an exchange partner so the same transition changes outcome.
- Opponent coverage: Include blockade, counterbreak, refusal of an exchange and promotion races.

**Definition of done:** D1-D8 plus At least 12/16 for prepared breaks, premature breaks, exchanges and king/pawn endings; favorable endgame labels require exact bounded evidence or an explicitly labeled estimate. Status: specified, not trained; machine data lists required capabilities.

### Stage 12: Compositional plans and selective adversarial investigation

**Definition:** Reusable relationships must be combined and revised in unfamiliar positions while both players pursue their own consequences.

**Learning target:** Select forcing or positional candidates, examine opposing refutations, combine learned relationships and abandon plans when their premises fail. Maximum 12 pieces; consequence horizon up to 9 plies. Tasks: forced-mate, bounded-material, avoid-loss, promotion, position-estimate, played-outcome. Feedback: F1, F2, F3.

- Positive experience: A held-out combination of mastered relationships yields a useful choice and a robust continuation under a fixed investigation budget.
- Negative experience: A familiar-looking combination has a quiet refutation, or a memorized plan persists after its enabling relationship changes.
- Changed-question/counterfactual experience: Hold most of the plan constant while altering one learned prerequisite, reversing the appropriate action or plan.
- Opponent coverage: At every simulated ply retain forcing counterplay, necessary defense and quiet counterplans; widen unresolved candidate sets within the fixed budget.

**Definition of done:** D1-D8 plus pass all component strata and the integrated value/whole-episode gates; final combinations are absent from training, no lesson/motif answer tags reach the policy, and no engine query enters the learner evaluation function. Status: specified, not trained; machine data lists required capabilities.

## How feedback reaches persistent learning

Every lesson has two records: **teacher evidence** and **actual neural delivery**. An accurate written explanation does not imply the neural receiver understands it. The teacher verifies consequences and sets a declared stimulus; it never computes synaptic deltas. The existing local rule updates only eligible physiological state from measured activity.

### F0: certificate-bound action association

For Stages 1-3, first record the unaided candidate set/ranking, selected action, task, exact FEN/PGN and starting memory hash. On a separate history-preserving board, independently check the certificate. Reject stale, incomplete, mismatched or exhausted proof as unknown: no teaching frames, no invented failure and no reward.

The existing experimental temporal code presents the board/action cue at frame 2. A certified task success places a nonnegative PPL103 stimulus at frame 0; a certified failure places it at frame 2. Sixteen tail frames give 19 frames total, with external current capped at 1.5. These are an explicitly engineered success/failure timing code, not biological seconds or an identified natural reward signal. The inherited numerical reference is eight recurrent steps/frame, stepDuration 0.075, tauKC 0.4, tauShort 0.6, tauLong 1, eta 0.5, gain bounds 0.2-1.8 and activityScale 1.5; pin or separately version these before experiment use. None is prescribed as a measured fly constant.

At each frame, measure mapped KC and DAN rates against the fixed unstimulated reference. RateTimingMemory advances eligible KC traces, short/long response components and bounded positive gains through its existing local integrator. Lasting memory is those gains/traces; graph edges, root identities and signs remain fixed. Independently replay the local rates and gain recurrence. A valid pulse, changed gain or increased score does not pass a lesson: the choice, retention and transfer gates must pass too. This code's success-direction evidence is limited; G0 tests whether the chosen interface actually produces the intended discrimination and reversal.

### F1: sequence consequences and earlier-choice credit

For combinations and positional preparation, teacher evidence contains the attempted action, exact refutation, independently certified alternative and the responsible earlier choice. A successful displayed branch cannot substitute for complete required defensive coverage. Bind each credited earlier board/action to its own continuation certificate under the same horizon and task.

The learner receives bounded public before/action/after/opponent-reply frames plus the registered consequence waveform; proof text and correct-move labels remain outside input. Compressing the replay into at most 32 neural frames is an engineering approximation whose timing/credit rule must be frozen and pass a separate receiver assay. Existing frame exposure alone is not accepted sequence learning. Compare this condition with the same root-only F0 feedback at matched exposure, and ablate the earlier action cue/eligibility while retaining later frames. Required causal credit evidence: the root-choice benefit disappears under the ablation, returns under restoration and transfers to unfamiliar root contexts. Do not assign the final outcome to every move on an illustrative line.

Teach bad-choice/refutation/good-alternative contrasts, then older successful and failed training sentinels. The exact phenotype is useful unaided choice, not fluent narration or more active neurons. A multi-ply lesson cannot be signed off using the narrow capture-retention waveform alone.

### F2: additional positional value-error teaching

Later positional lessons keep their certified consequence feedback and add a separately declared estimate condition. Define the candidate-free Rplay output before training; it need not already be accurate, but it must have a fixed meaning, perspective and validated direction of response. It must pass calibration before strategic search treats it as useful value.

Pin Stockfish binary/hash/version, one thread, 16 MiB hash and node budgets 2000/10000. Analyze the exact resulting child board/history. The root-actor target is (W+D/2)/1000. A disagreement above 0.10 or missing usable score suppresses the added estimate signal. This envelope is not a confidence interval and an engine estimate is never a consequence certificate.

Record root action preference separately from child position prediction. For the actual child cue, compute both target and prediction in the child's side-to-move perspective; if it is the opponent, complement their root-actor values. Deliver the child-perspective error, not the root error with the wrong sign. A proposed graded current is min(1.5,1.5*abs(error)); positive child error uses the proposed value-increasing timing and negative child error the value-decreasing timing, only after those directions and graded doses pass G0. Zero error delivers no additional pulse; the independently certified outcome event is still supplied. This requires a newly reviewed receiver; the isolated max-action proxy is not an implementation of it.

Compare outcome-only, outcome-plus-value, absent, matched-value-shuffled and disabled arms. The added-signal shuffle preserves error magnitudes/timing exposure while breaking its state correspondence; truthful consequence evidence stays separately recorded. Apply common causal choice/retention gates to the designated informative comparison and the extra MAE/non-regression gates to the value-teaching comparison, including outcome-only. Missing task proof suppresses all teaching; missing engine evidence suppresses only this added signal. The teacher supplies the bounded error stimulus, never an optimizer gradient or gain delta.

### F3: actual episode outcomes and plan revision

In Stage 12, bind complete actual legal histories and terminal rule evidence under a pinned reference-opponent policy. Checkmate/draw are checked against history; the 80-ply cap or resource stop leaves an unfinished episode unknown. Freeze the opponent policy and opening identities. Earlier-action credit requires independently replayed counterfactual outcomes under that same policy and the F1/episode-credit gate. These are actual outcomes against a specified opponent, not proof against every possible defense.

Evaluation freezes learning. The opponent may be a separately pinned engine/policy, but neither engine evaluation nor teacher search can enter the fly's evaluation function. Compare all-legal diagnostic choices, unaided selective play and same-budget searched play separately. A whole-episode value gain does not establish 2000 Elo or cross-domain reasoning.

## Exact teacher task semantics

Every proof includes root FEN/PGN, actor, action, task/threshold/horizon, verifier identity, children/defensive coverage, status and resource stop. Checker independently reconstructs transitions; generator and checker must not simply agree on the same unchecked label.

- Capture-retention: immediate legal recapturability of the moved capturing piece. Available recapture is sufficient to fail this narrow preservation task, not proof that the sacrifice loses chess.
- Forced mate: attacker OR / defender AND, complete required replies, with draw or horizon exhaustion a failure of the deadline objective and resource exhaustion unknown. Existing dispatch supports 1/3/5/7 plies; nine needs a new reviewed task version.
- Bounded material: use k=1 nominal unit by default (pawn1, knight/bishop3, rook5, queen9) and freeze horizon H before presenting the board. Success requires guaranteeing net material delta at least k without own checkmate; own mate is failure, opposing mate is success, terminal draw is failure of this gain objective, and nonterminal deadline leaves use the exact material delta. These conventions are a teacher rubric, not intrinsic piece values or full-game evaluation. A different threshold requires a separately versioned family contract.
- Avoid-loss: use allowable nominal loss k=0 and freeze H. Success means an own strategy keeps every required opponent branch free of own mate and loss greater than k through H. Terminal draw succeeds for this safety objective; opposing mate also succeeds. No beyond-horizon safety claim. A different tolerance requires a separately versioned family contract.
- Promotion: force the declared pawn's promotion by H; opponent mate or draw before promotion fails, incomplete proof is unknown. Promotion does not itself establish a win.
- Position-estimate: supplementary engine target with pinned settings, not proof. Played-outcome: independently replayed actual terminal trajectory, not exhaustive best defense.

For multi-ply tasks, own choices are existential and required opposing replies universal under the fixed horizon/terminal rules. Thresholds and horizons are identical for a contrastive pair and frozen per family before training. New material/safety/promotion verifiers and full-action capture handling are implementation requirements, not existing functions. The new curriculum cannot be run by inserting unsupported objective names into existing modules.

## Selective investigation and integration requirements

Ordinary play investigates at most 16 candidates initially, including four quiet alternatives. Mandatory defenses, forcing moves and role-relevant quiet improvements are priorities, not a final score. Apply this at every actual simulated turn for both players. Keep quiet refutations reachable and widen within the remaining budget. Return best found with unresolved coverage; visits and score gaps are not calibrated confidence.

Current TemporalFeedbackSession asserts all-legal pre-teaching binding. Preserve that assertion and old frozen sources. Candidate-limited training needs a new reviewed contract separating the actual shortlist decision from a read-only all-legal diagnostic; the diagnostic may not retroactively replace the learner's choice. Until that integration exists, compatibility pilots use explicitly labeled all-legal binding. All-legal audits are research measurements, not the intended ordinary-play calculation policy.

Use the current sparse model, encoders, forcing tags, independent mate/capture checkers, temporal session, local receiver and checkpoint helpers. The following remain prerequisites: source/identity review and G0; an explicit noncapture task wrapper; independent material/safety/promotion certificates; candidate-free position input/readout; validated sequence/episode credit; task-aware quiet candidate coverage; and fresh disjoint data/replicas/auditor. The [machine specification](../../../archive/early-development/research/data/principles-curriculum-v1/curriculum.json) marks each capability's current status and actual path. The old capture-transfer and unfamiliar-value failures remain failures.

Bound each decision to 256 total neural presentations, reserving planned feedback/reference work before allocating search calls; count every assessment/reference/teaching presentation. Individual sequence sessions allow at most 32 frames. Search caps: 32 simulations,16 evaluations,9 plies,4096 nodes,10000ms. Proof caps: 20000 nodes/5000ms per action,256 replies. Soft deadlines cannot interrupt a running evaluation. Unknown bounds produce no teaching; publish pending state before interruption acknowledgment. Stream records, process one board at a time, and use node --max-old-space-size=256 with cpu-duty0.5, RSS at most768MiB and free memory at least256MiB. Check authoritative processes before graph use; the earlier access-denied process inspection was not evidence that no run was active.

## Receipts, launch checklist and completion boundary

For every event persist: protocol/data/source identities; lesson/block/event/condition/replica IDs; exact root/child histories and actors; candidate set/omissions and unaided ranking; R0/Rplay quantities separately; all certificates and engine settings/target uncertainty; teacher explanation versus actual signal; cue/frame/current identities; mapped rates and eligible gain/trace changes; before/after memory hashes; cursor, pending receipt and publication hash; all neural/proof/search/resource counters.

Atomically publish memory, neural state, traces and pending cursor/receipt before acknowledging an update. Resume the last completed publication into a new directory without repeating pending frames. No partial checkpoint is acknowledged. Independently audit exact replay and resource/persistence/identity boundaries; software replay does not validate physiology.

Launch only after a fresh stage protocol pins implementations, graph/annotations/mapping, task verifiers, encoders/readouts/memory, event/shuffle schedule, dataset split manifests, stage thresholds and effective replica identities, and independent audit plus interruption recovery pass. A source hash, lock or old pending sentence is not process evidence. Run informative teaching alongside controls serially; diagnostic-only graph work needs a documented blocker and a specific feedback-enabled next step.

The curriculum is complete as a design when all twelve targets, definitions of done, teacher/receiver contracts, prerequisite statuses and audit requirements are specified and internally checked. Training completion is a different state: G0 and every Stage 1-12 gate must actually pass. None is marked learned here, and no full curriculum training is launched by this document.


## 2026-10-24 researcher addendum: policy B (no G0 dependency for chess stages)

Researcher decision (2026-10-24), recorded before any stage result under it: chess stages no longer require a passed G0 receiver assay. G0's role was to show that the learning machinery can acquire and retain simple associations, which its first replica did; its reversal failure and its different receiver (single-channel `RateTimingMemory`) remain preserved history. For chess stages, receiver causality is established inside each stage's own gate: D6 (informative beats scratch, absent, shuffled and disabled-plasticity controls with the paired family bootstrap), D8 (removing learned state removes the advantage; restoring reproduces it) and D9 (Stockfish assistance). Stage 1 D7 is deferred: Stage 1 has no earlier chess principle, so its retention is tested by Stage 2's cumulative D7, which requires Stage 1 validation counts not to fall and all four Stage 1 sentinels to stay correct after Stage 2 learning and interference. All other D1-D9 thresholds are unchanged. The original text above stays as history. Implementation: `retentionDeferral: 'stage1-d7-rechecked-by-stage2-v1'` in the Stage 1 evaluator/gate and `receiverPolicy: 'stage-matched-controls-v1'` in `research/reports/lichess-stage1-synthetic-acceptance-audit-v2.json`; registrations from revision 6 use them.
