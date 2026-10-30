# Review our actual chess feedback method before integration

You are reviewing a research design and its partially implemented software. This prompt is self-contained: you have no repository or previous-chat context. Challenge the method, identify what it can actually teach, and recommend the smallest defensible next implementation and experiment. A strong engine, plausible biological analogy or passing software test does not automatically make this good teaching.

Search is optional. If unavailable, reason from the supplied facts, state uncertainties and avoid invented citations. If you search, distinguish primary evidence from analogy and proposals. Use plain language and prioritize exact decisions over a broad literature survey. Aim for 1,500–2,000 words; exceed this only for an essential distinction.

## 1. Objective and constraints

Our question is: **Could a simple organism achieve reasoning?** We use a from-scratch Drosophila-connectome-constrained computational model, with chess as a controlled testbed. We want experience-dependent learning to produce useful, consequence-sensitive evaluation that transfers to unfamiliar positions and counterfactuals, then test whether learned foundations combine in untrained situations. Familiar puzzle accuracy alone is insufficient. Success would concern this engineered simulation, not establish cognition in living flies or domain-general reasoning.

The intended `fly babysit` command will manage Lichess-derived practice, feedback, rehearsal, checkpointing, independent audits and gated stage advancement. It must save and stop at failed, unknown or unsupported gates. The full command is unfinished: a one-experiment supervisor exists, but the Stockfish adapter below is isolated from the serial curriculum and its persistence/audit machinery.

The twelve planned topics are: (1) attack/defense/recapture; (2) king safety/check/mate; (3) forcing moves and replies; (4) double threats/overload; (5) lines/blockers/defender removal; (6) move order/intermediate moves/sacrifices; (7) piece effectiveness; (8) coordination; (9) weaknesses/pawn structure; (10) restriction/prophylaxis; (11) pawn breaks/exchanges/endgames; (12) unfamiliar composition and selective investigation. These are research targets, not twelve proven trainable capabilities. Later topics lack ready exact consequence verifiers. Focus on feedback quality and the first decisive learning test, not another complete curriculum redesign.

Constraints and status:

- Preserve released neuron identities, sparse graph topology and fixed signs. Lasting learning must arise through an explicit, biologically motivated mechanism inside the simulation. No imported chess weights, teacher-computed parameter deltas, backpropagation or fitted external decoder in the primary condition.
- Symbolic board/action inputs bypass modeled eyes. Legal move generation is engineered rules infrastructure. Engine scores, attack/defense answers, certificates, source solutions and future moves must not enter the unaided action cue. A suitable public spatial representation remains a research issue; do not assume relational sufficiency.
- Stockfish is permitted as an additional teaching source. Its search stays teacher-side; unaided assessment precedes feedback. Any learner search is separately declared and evaluated with equal budgets.
- New work has a 2 GiB process ceiling, at least 256 MiB free system memory, Node heap 256 MiB, CPU duty 0.5, serial graph work and bounded streamed state. Existing frozen experiments retain their older limits. Laptop cost matters.
- The prerequisite acquisition/retention/retained-memory reversal gate is unpassed. Earlier computational association results do not establish useful chess learning or biological validity. No Stockfish-assisted full-graph learning or transfer result exists.
- Training is paused for this review. Nothing proposed below should be treated as an experiment already run.

## 2. What the current prototype measures

### A. Engine estimate of the consequence position

For root board/history `s`, original player `actor` and chosen legal action `a`, construct exact child `s' = T(s,a)` while preserving history.

The proposed teacher analyzes **every legal root candidate's child** at the same two or more declared search budgets. Each supplied record contains candidate, child FEN/PGN, budget, engine binary/settings hashes, a `completed` flag and UCI output lines. The grader checks matching identities, child histories, legal coverage and budget sets. It does not run Stockfish or authenticate its process; authentic command/transcript binding and the independent audit still need integration.

From the latest score-bearing line, require a parseable non-bound score plus WDL totaling 1,000. Incomplete/bounded/missing data supplies no target. Flip the child-side perspective into the original player's perspective:

```text
engine utility u = (W - L) / 1000, in [-1, 1]
expected game score q = (u + 1) / 2 = (W + D/2) / 1000
```

WDL is an engine-population model, not the Fly's calibrated probability of winning. Minimum/maximum estimates across budgets form a disagreement envelope, not a statistical confidence interval or exact proof.

### B. Move quality relative to Stockfish

For each candidate's envelope `[q_low, q_high]`:

```text
regret_low  = max(0, max_candidate(q_low)  - chosen.q_high)
regret_high = max(0, max_candidate(q_high) - chosen.q_low)
```

Display categories use expected-score loss: near-best up to 0.005; good up to 0.025; small loss above that; inaccuracy from 0.05; mistake from 0.10; blunder from 0.15. These are project adaptations, not validated neural thresholds or an exact reproduction of Lichess accuracy.

A separate regret-shaping number is positive near best and negative at large loss, withholding a direction if the envelope crosses its decision boundary. **The grade and this number are recorded; they do not directly determine the value adapter's neural update.**

### C. The Fly's provisional prediction and value error

Unaided candidate preference and the provisional action-value transform are:

```text
preference(s,a) = mean(MBON12 activity) - mean(MBON01 activity)
provisional_action_value(s,a) = tanh(preference(s,a) / fixed_scale)
```

Scale defaults to 1 and is not calibrated or fitted to Stockfish. Both populations silent means unavailable.

The adapter freshly assesses every legal root action, then every legal child action under unchanged lasting memory. Root action preference is recorded separately. Its **child-position value** is the maximum provisional value across the child's legal actions, flipped into the original player's perspective. This matches the engine target's board/player but interpreting this proxy as state value is an unvalidated assumption.

Convert the chosen engine envelope to signed utility `[u_low,u_high]`. For neural child-position estimate `v`:

```text
if u_low > v:   error = u_low - v
elif u_high < v: error = u_high - v
else:          error = 0  # no value-error teaching
```

This corrects a prediction, not directly move regret: a bad move whose position was underestimated can have a positive residual; a good move whose position was overestimated can have a negative residual. Evaluate whether those signs are appropriate for the actual decoder/update, rather than treating them as automatically wrong or automatically useful.

## 3. What actually reaches the neurons

The current isolated adapter effectively does this:

```text
replayValue(review, condition):
    reconstruct exact root history
    independently recheck chosen action's task certificate
    if consequence unknown: skip, no learning event

    unless outcome-only: grade all-legal Stockfish records
    if required target unavailable: skip
    construct exact child and its legal actions
    if child terminal: skip, even in outcome-only mode
    if presentation budget insufficient: skip

    record fresh unaided root ranking and memory identity
    assess child under same memory; compute child value and residual

    outcome-only: channel = checked success/failure; current = 1.5
    informative: channel = sign(value error); current = 1.5 * abs(error)/2
    no-channel: no experimental channel/current
    shuffled: use supplied schedule-labelled signed error
    disabled: deliver informative stimulation; disable memory.observe

    stimulate ROOT board + chosen-action cue, plus selected channel
    execute neural response
    unless disabled: memory.observe(rest)
    record actual update, before/after memory and fixed-wiring hashes
```

Positive error selects experimental PAM02 stimulation; negative selects PPL103, using mapped identities. These are coarse KC/MBON/DAN mappings with subtype/hemisphere filtering, not full synapse-coordinate/receptor reconstruction. Channel polarity and dose are hypotheses, not validated biological prediction-error coding. The teacher supplies stimulation, never synaptic deltas.

For concreteness, existing **eight-cell numerical adapter tests** use a memory rule with positive KC-to-MBON gain `g`, active KC excess `k`, and compartment factor `D` derived as negative mean DAN excess:

```text
D <= 0
g_new = clip(g + eta * dt * D * (k + g - 1), minGain, maxGain)
eta = 0.5; dt = 1; minGain = 0.2; maxGain = 1.8; activityScale = 1.5
```

The teaching roles depend on which compartment is stimulated, rather than a directly assigned signed weight delta. Clipping and recurrence can make effects state-dependent. Numerical `dt=1` is not established biological timing. The Stockfish adapter is not integrated with the separately implemented temporal-session receiver, delayed eligibility or registered G0 runner. Do not assume these already form one mechanism.

## 4. Known gaps and existing checks

These are **code-inspection findings**, not learning-experiment results:

1. **Combined delivery is missing.** The design promises checked task feedback plus additional Stockfish feedback. The informative call checks task truth but delivers only value error. Blindly stacking two potentially conflicting pulses is not an established fix: failing a mate-in-one task can coexist with a winning full-game estimate. We need an explicit objective/combination rule.
2. **Prediction/update alignment is unresolved.** Error describes a max-over-action value at the child, while plasticity is evoked with the root/chosen-action cue. Same-state/perspective bookkeeping does not show this update reduces the measured error or improves root ranking.
3. **Terminal successes are skipped.** The adapter requires child legal actions for its proxy and returns before outcome-only teaching too. A certified mate can receive no event through this path. We need a terminal-outcome contract without inventing a neural prediction.
4. **Attempt binding needs a caller contract.** Fresh root ranking is recorded, but the reviewed action need only be legal, not equal that ranking's choice. Selected attempts and deliberate alternative/rehearsal replays need explicit distinct roles.
5. **Shuffle matching is incomplete.** The adapter checks a hash-shaped schedule identity, event index, bounded nonzero error and sign opposite its own residual. It does not verify actual table membership or equality with the informative arm's magnitude. There is no integrated frozen/yoked error-table runner. Each arm's predictions can diverge during learning.
6. **Teacher provenance is incomplete.** Budgets/completion/hash fields need binding to real UCI transactions/options. The parser selects the last score-bearing line without explicitly selecting MultiPV=1. Engine estimates still require separate consequence evidence.

Current certificate domains are narrow: exact immediate capture/recapture retention and bounded forced mate with independently checked required replies. Noncapture can fail the declared capture task without being bad chess. Failing bounded mate does not imply a lost game. Unknown/resource-exhausted verification produces no event. There is no generic exact positional or long-horizon teacher.

All **17 existing focused tests** passed in a fresh one-process run: target perspective, bounded current, history binding, unknown rejection, fixed wiring, some control exposure, shuffle-sign checks and terminal skipping. Their synthetic encoder is constant across board/actions. They cannot establish spatial specificity, error reduction, useful move correction, retention, transfer or biologically valid dose. Passing tests that preserve existing behavior does not approve that behavior scientifically.

## 5. Planned practice and acceptance, not yet integrated

Training-only error targeting proposes four-event blocks: current failed action, separately certified successful alternative, earlier successful sentinel, earlier failed counterexample. Planned budget: 32 blocks per stage, 50% rehearsal. Stage 1 rehearses another Stage 1 pair. Planner/session/checkpoint components exist, but the full Stockfish curriculum runner does not.

Intended comparisons include checked-outcome-only, checked-outcome plus Stockfish, absent/no-channel, matched shuffled feedback and disabled plasticity. Controls must preserve the experiences, order, timing and computation required by the declared causal comparison. External search cannot silently rescue unaided choices.

Train, validation and final-test families must be disjoint across source games, transpositions and related counterfactual variants. Final families stay sealed during targeting/checkpoint selection. Advancement needs useful unaided all-legal choices, retained earlier abilities, superiority to controls, persistent causal memory and unfamiliar consequence-sensitive transfer. Immediate repair is not mastery; fixed-search-budget evaluation is separate.

## 6. Questions requiring your judgment

1. **Verdict:** Is this feedback adequate for any useful claim? Distinguish teacher evidence, biologically defensible delivery, learning efficacy and transferable reasoning. Rank the defects. Correct our assumptions without claiming universal incapacity from an untested interface.
2. **Choose the learning target:** Should the first condition teach bounded task consequences, action value `Q(s,a)`, state value `V(s)`, pairwise preference/regret or a staged combination? Specify what the Fly predicts, which cue receives credit and why the local update should change the intended quantity. Can the child-max proxy/root-cue update be justified, or should it be replaced? Keep adaptation endogenous.
3. **Specify one coherent feedback contract:** Give precise pseudocode for a chosen failed move and verified alternative, including task/full-game disagreement, near-best ties, terminals, uncertainty, feedback timing and unsupported horizons. State what enters neurons versus what is merely saved for humans/audits. Is scalar modulation with a static cue adequate, or is additional experience/eligibility structure needed? Identify assumptions to test without speculative machinery.
4. **Design the smallest decisive quality check:** Define conditions, examples, measurements and pass/fail/unknown interpretations that establish selective move correction or value-error reduction while preserving a learned sentinel. Include no-channel/shuffle/disabled comparisons and a changed-relation transfer probe. Distinguish software checks from the subsequent biological-model experiment. Which failures identify a specific mechanism, and which remain ambiguous? Do not invent statistical power from an arbitrary small sample.
5. **Make controls and teacher evidence executable:** Resolve error schedules when predictions diverge, matched magnitude/timing, truthful pre-choice binding, engine transaction provenance, required defensive coverage and atomic exactly-once recovery. Propose the cheapest defensible engine budget/coverage strategy; two agreeing searches cannot be called proof or confidence.
6. **Return an implementation order:** What must be repaired before Stockfish graph work, what can be built while receiver gates remain unpassed, and what evidence is necessary before calling feedback high quality? End with the single most decisive next action. Ask only for facts that cannot be inferred here; do not require another broad consultation if a concrete conditional decision is possible.

Our endpoint remains a learner that acquires reusable foundations and combines them in unfamiliar situations. We want an honest path to testing that endpoint, without mistaking rich teacher records, changed weights or improved familiar puzzle scores for reasoning.
