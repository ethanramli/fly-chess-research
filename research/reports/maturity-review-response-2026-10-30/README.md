# Response to the research maturity review (2026-10-30)

An assessment of [the Codex maturity review](../research-maturity-review-2026-10-30/README.md), written at the researcher's request. It is advisory: no experiment was launched, and no sealed data, frozen gate or active run was touched. The only new evidence is a training-only token analysis ([script](token-inventory-train.mjs), [output](token-inventory-train-output.txt)) and code reading.

**Run status at 12:52.** The full-r15 audit is unpublished. Its process is alive but has been in a pacing rest since 08:14 (journal 2026-10-30-audit-stall-after-laptop-sleep). The laptop slept twice more (09:23-11:07 and 12:21-12:50). The rest loop counts timer ticks, which stop during sleep, so the predicted 12:39 restart moves to about 14:50-15:10. This is a revised prediction, not a confirmed one. The audit then needs about 3-4 h at duty 0.75 on mains (three times as long on battery).

## A. Assessment of the review

### Accepted, and strengthened by my own check: the learner's input is a near-sufficient statistic of the label

The review reproduced a fixed rule over cue-v2 tokens that is 390/390 on training actions. I traced why, and the result is stronger than the review states.

- `public-attack-map-cue-v2.mjs` reduces each legal action to a short sorted list of tokens (`act:capture`, `act:capture|att:<piece>:<free|kline|pin>`, `act:capture|att:none`, and the quiet equivalents). KC cells are chosen by `bucket(seed, token)`. **No square, piece placement or family information reaches the brain; only token identity does.**
- An unaided assessment calls `forward([0], stimulation)`, which zeroes the neural state (`h[0].fill(0)`). **For a fixed memory, the Fly's response is a deterministic function of the token set.** Two different boards with the same tokens are the same stimulus.
- Training-only inventory: the 390 legal actions collapse to **33 distinct token sets built from 28 tokens**.
- A pure token-valence lookup (mean outcome per token, summed) with no graph and no fitting beyond counting, trained on 5 families and tested on the 6th (leave-one-family-out), chooses correctly on **23/24 held-out boards**. That is the same transfer protocol under which the [representation ceiling](../stage1-representation-ceiling-2026-10-27/README.md) found occupancy descriptions at chance.

The task's consequence is immediate legal recapturability. The encoder's attacker list with geometric pin marks is that computation, apart from edge cases. This is not label leakage in the data-handling sense, but it means **"transfer to unfamiliar families" in the Stage 1 gates measures token recurrence, not inference.** The review's "test-set performance of the comparator is unknown" is formally true. Structurally, though, the final set uses the same constructors and therefore the same token types; I predict that the rule and the lookup are near-perfect there too. A counts-only token-inventory check could confirm this, but it would need the researcher's permission because it reads the sealed final boards.

### Accepted as stated (limitations, not bugs)

- **Structural novelty (issue M06):** all splits share three constructors.
- **Biology (M12-M17):** the wiring is verified; the dynamics, signs, masks and immediate alpha updates are modelling choices; persistence is not retention.
- **Final-set reuse (M05/M37):** see the self-criticism below.
- **Topology attribution (M03):** the feedback controls test feedback, not the connectome.
- **Units (M04/M21/M23):** three cue projections on one graph are not three subjects; 8 final families are the real sample.
- **Oracle curriculum (M19):** the planner sees all certified outcomes.
- **Monotone depression (M13):** alpha gains only fall toward their floor. This bears directly on whether a 12-stage curriculum is even mechanically viable.

### Disputed or outdated

1. **D8 (the review's point 7, M09): partly outdated.** The review inspected evaluator v4 by 11:55. At 12:14-12:16 the predeclared recovery witness (ledger L105-L108, [report](../stage1-full-r15-recovery-witness-2026-10-30/README.md)) ran on all three replicas. It showed exactly-once recovery at block level after both a pending-publication interruption and an append-before-acknowledgement interruption. It also found a real defect: the registered stage-level resume cannot restart mid-event (it fails safe), which is fixed in block v3. What remains true: evaluator v4 still derives the flag from replay, and the stage-level property does not hold for r15's code.
2. **M39 (the "linear screen" is only a screen): partly disputed.** For this model the plastic part is the KC→MBON gains, so learned behaviour is a constrained linear readout of a fixed KC code (plus fixed graph nonlinearity). A linear-decodability failure on that code is therefore close to an upper bound on what plasticity can learn here. It is not a universal impossibility claim, but it is more than a generic screen.
3. **The review's repair order, item 2: disputed.** The review proposes freezing same-input comparators and evaluating them on new protected structural families. With the current encoder that comparison is settled in advance. The Fly can only learn token valence, so same-token comparators will match it, and a fresh final set would be spent on a foregone conclusion. The open question comes before that (section C).
4. **E06 (optic-lobe edges): accepted but low priority.** With uniform bias and 8 steps, baseline effects can propagate. A one-run sensitivity check would settle it; it does not change any conclusion here.

### Self-criticism of earlier decisions (mine, approved by the researcher)

- **Cue v1/v2 moved the inference into the encoder.** The representation-ceiling result (2026-10-27) showed that a linear learner over relation-free board descriptions cannot transfer. I treated that as a component to engineer around ("weakest link: input representation") and proposed the attack map and then the pin mark. Scores rose because the learner's job shrank to valence association. I labelled the cue a "restricted class", but kept treating Stage 1 gate passage as progress toward reasoning. It was not, and the ceiling result should have prompted a reframing, not a cue upgrade.
- **The gates do not say where the inference must happen,** so the encoder can satisfy them. I did not catch this when building on them.
- **r15 is not confirmatory.** I chose the D4 channel after r14's aggregate final D4 failure (diagnosed with training data) and reused the final families. That is exploratory repair plus replication on a used final set, and I framed it as "full Stage 1". It should be reported as development evidence.
- **Today's priorities.** I spent the day on software integrity (babysit, audits, D8 recovery). Those repairs were real, but they did not touch the largest threat, which is construct validity.

## B. Consequences for the research goal

The question stays: *could a simple organism achieve reasoning?* What this model can establish is narrower. The operational definition in AGENTS.md ("consequence-sensitive evaluation and transfer across unfamiliar positions and counterfactuals") is **satisfied trivially when the input already encodes the consequence-relevant relation**. It needs one added condition:

> Reasoning evidence requires that the consequence-determining relation is **not supplied as an input feature**, that the learner acquires it from verified consequences, and that it applies it to cases where a learner restricted to the supplied features (a same-input token or additive associator) fails.

Under that definition, current Stage 1 is a **positive control for feedback-driven associative valuation**, not a reasoning step. Continuing Stages 2-12 with more engineered relational tokens (the cue v3 plan in the Stage 2 readiness note) would repeat the same design: each stage would measure the encoder's chess knowledge plus MB association. Passing all twelve would not answer the question, and monotone alpha depression (M13) may exhaust the stores first.

## C. The single most consequential uncertainty

**Can this model class acquire any consequence-relevant relation that its input does not supply?**

The structure makes this sharp. Learning is confined to KC→MBON gains, so it is at most a constrained linear readout of the KC code that the fixed connectome produces from the input. Inference can therefore come only from the encoder (true now), or from the fixed graph dynamics turning a relation-free input into a code from which the relation is linearly decodable. If neither happens, **no curriculum, training volume or gate on this interface can yield reasoning evidence**, and the honest claim is associative valuation over supplied features. If the graph does supply it, the curriculum should be rebuilt on relation-free inputs, and the current results become a positive control. Either answer changes the next experiment; Stage 2 does not resolve it.

## D. The smallest decisive study: "withheld-relation decodability"

This is read-only (no plasticity), training split only, and needs a few minutes of forward passes.

- **Hypothesis H1.** The connectome's fixed dynamics turn a relation-free board description into a KC code from which capture safety is linearly decodable on held-out source families.
- **Competing explanations.** H0a: the graph adds nothing, so decoding equals the no-graph code (chance, as the ceiling report found). H0b: decoding works within families only (position memorization). H0c: any gain is generic to random expansion rather than this wiring.
- **Inputs (identical for all comparators).** The relation-free descriptions already used by the ceiling report (piece/occupancy facts and the candidate move), with no attack, pin or legality facts. Comparators:
  - C0 (positive control): the cue-v2 token code. Expect about 24/24; this validates the pipeline.
  - C1: linear decoder on the raw relation-free facts (already measured: chance).
  - C2: the same facts hashed into KC stimulation, without the graph.
  - C3: C2 propagated through the full graph (8 steps, reset as in assessment), decoding KC activity at the final step.
  - C4: a degree- and sign-preserving shuffled graph, run only if C3 beats C2.

  Every comparator uses the same decoder class (L2 logistic or perceptron, fixed regularization chosen before seeing results) and the same items.
- **Novelty tested.** Leave-one-source-family-out over the 6 training families, scored on boards (chance 11.3/24) and twin pairs (chance 2.7/12): the counterfactual twins have the same captures available but a different safe capture.
- **Frozen and protected.** Validation and final sets stay unopened. r15 and its gates are untouched. The graph, signs and dynamics are unchanged. No plasticity runs, and no new data is needed. More training-source families would raise resolution but need a new counts-only separation check, which is a researcher decision.
- **Outcomes** (fixed before running):
  - **Supports H1:** C3 held-out twin pairs at least 7/12 and at least C2 + 3. A feedback-trained Stage 1 run on the relation-free input then follows, with same-input comparators and a fresh, prospectively protected final set.
  - **Weakens:** C3 above chance but within 2 twin pairs of C2.
  - **Falsifies, for this input route:** C3 twin pairs at most 4/12. That shows plasticity cannot acquire the relation through direct KC input, so the claim narrows to associative valuation unless a different route or mechanism is justified.
- **Cheap checks first.**
  1. The token lookup (done: 23/24 LOFO; responses determined by the token set).
  2. Reproduce C1 from the ceiling report.
  3. Run C2 without the graph.
  4. Run the C0 positive control on a few boards to confirm the KC-activity extraction is correct.

  Only then run C3.

The AGENTS.md core-iteration rule allows this diagnostic: it answers a named question that blocks the next feedback experiment, and that experiment is specified under "Supports H1" above.

## E. Now versus later

**Now.**
1. Let r15 finish, and report it as an exploratory repair and replication on a reused final set, with the D8 witness and the token interpretation.
2. Pause Stage 2 / cue-v3 development.
3. Update the goal handoff with the operational definition in B.
4. Run the decodability study if the researcher approves.

**Later, and only if the chosen claim needs it:**
- a fresh, prospectively protected final set with new constructors;
- frozen comparators matched for exposure;
- topology nulls (only for a connectome-advantage claim);
- validation of the alpha stores (only for biological claims);
- a capacity and interference test of monotone depression before any long curriculum;
- a clean reproducible release.

**If the decodability study falsifies H1** there are two coherent options, and choosing between them is the researcher's call:
1. Publish the bounded result, with the boundary as the finding: verified-consequence learning in a connectome-constrained model acquires valuations of supplied relations and transfers them by feature recurrence, but cannot infer the relations themselves through this route.
2. Test a route where the fly's circuitry could plausibly carry inference. Either: PN→KC expansion input (the input-v3 idea), or MB inference beyond direct reinforcement (second-order conditioning or sensory preconditioning through MBON→DAN loops, which is documented in Drosophila). The second option would give "reasoning" an operational meaning the organism is known to support.

## F. Ordered next steps and the strongest supported claim

1. Finish and report r15 under the framing above. Plug in the charger: on battery, the remaining audit runs at a third of the speed.
2. Researcher decision: adopt the added condition in the operational definition, and pause Stage 2.
3. Run cheap checks 2-4 (no graph), then the read-only C3 decodability run (minutes).
4. Branch on the predeclared outcome: primitive-input feedback training with a fresh protected final set, or the bounded-claim / alternative-route decision.

**Strongest claim the current evidence supports** (r14; r15 pending):

> In a model constrained by the FlyWire wiring, outcome-only verified feedback delivered through modelled dopaminergic teaching pulses produces persistent local plasticity. After training, the model chooses legally safe captures on new positions from held-out source games (61-64/64 across three cue projections, against matched absent, shuffled and disabled-plasticity controls). This holds when the input supplies engineered attack and pin facts as tokens.
>
> Because the model's response is a function of those tokens, and a fixed rule or a token lookup over them solves the task, this is evidence for feedback-driven associative valuation of supplied features. It is not evidence for reasoning, transfer of an inferred relation, or physiological fidelity.

r14 failed its registered D4 gate. r15 is an exploratory replication on the same final set.
