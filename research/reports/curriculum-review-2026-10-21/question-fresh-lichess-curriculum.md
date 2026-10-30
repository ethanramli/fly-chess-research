# Design a Lichess puzzle curriculum that could build toward reasoning

You are an independent research reviewer in computational neuroscience, animal learning, machine learning, chess, and experimental design. **This is a fresh chat; all project context needed to begin is below. You cannot inspect the repository.**

**Our decision:** What chess foundations should a connectome-constrained learner acquire, in what order, through an automated loop of Lichess puzzles and verified feedback, so we can test whether it combines those foundations in unfamiliar situations?

We need a concrete curriculum, teaching loop, and first reasoning/transfer experiment. Criticize or replace the proposal if warranted. Distinguish the current implementation from the broader research route. Do not promise that training creates reasoning, or abandon the goal merely because its prerequisites are unfinished.

Search is optional. Without it, reason from supplied facts and mark biological claims and theme IDs needing verification. Do not fabricate citations, measured timings, verified chess examples, or anatomical mappings. Aim for roughly 1,800–2,200 words, extending only to resolve a consequential ambiguity. Spend the answer on decisions rather than background or a broad literature review.

## 1. Objective, boundaries, and current learner

The overarching question is **"Could a simple organism achieve reasoning?"** We use a computational model constrained by a released adult Drosophila connectome and chess as a testbed. A first result would be persistent, consequence-sensitive evaluation that transfers across unfamiliar positions and relevant counterfactuals. This would not establish cognition in a living fly, general reasoning, or internal forward planning. Novelty must be checked separately against the literature. Around 2000 Elo is a distant performance aspiration, not the present success criterion.

Requirements:

- Start without pretrained chess weights. Preserve released neuron identities, graph topology, and fixed signs.
- Lasting learning must arise through an explicitly modeled, biologically justified mechanism inside the simulation. The teacher supplies experiences/consequence stimuli, not parameter updates. Supervised fitting/backpropagation may be a labeled comparison, never the primary learner.
- Symbolic input bypasses eyes. Legal moves and mechanical board transitions may be supplied, but an engineered predicate must not be counted as a relation learned inside the brain.
- Teacher evidence binds exact board/history, actor, action, criterion, and verified consequence scope. A solution line or engine score is not exhaustive proof. Unknown/exhausted verification produces no teaching event. A separately declared engine-value teaching condition is possible, but must remain labeled estimated and requires a defined neural value output.
- Record unaided choices before feedback; compare informative, absent, shuffled, and disabled-plasticity arms at matched public exposure/timing. Evaluate unaided and fixed-search-budget choices separately. External search success is not endogenous reasoning.
- Use disjoint training, validation, and sealed final families. No final-set tuning. Preserve cumulative memory, earlier-stage retention, checkpoints, and failed results.
- Sparse serial laptop execution: new unfrozen work up to 2048 MiB RSS, at least 256 MiB free memory. Frozen experiments retain their original guards. No dense adjacency or edge-by-batch tensors.

**Actual receiver, not a complete fly reconstruction.** A fixed signed sparse graph propagates nonnegative continuous activity with eight recurrent steps per frame:

```text
z_j = external_drive_j + sum_i signed_weight_ji * h_i
activation_j = 0 if z_j <= 0, otherwise 10*tanh(z_j/10)
h_j(next) = (1-alpha_j)*h_j + alpha_j*activation_j
```

Initial magnitudes use row-normalized log(1 + anatomical synapse count), scaled by 0.9; activity is float32. Neural state continues within an episode and resets between episodes. Persistent learning currently affects only 122 existing positive gamma-KC-to-MBON12 edges from 120 unique Kenyon cells. Other weights are fixed. The coarse gamma2 map identifies PPL103 teaching cells, one per hemisphere group; receptor/synapse-coordinate physiology remains unmeasured.

Each eligible edge stores gain g, KC credit e, and short/long DAN-response filters S/L:

```text
de/dt = (k-e)/0.4
dS/dt = (r-S)/0.6
dL/dt = (r-L)/1.0
delta = L-S
dg/dt = 0.5*e*[max(delta,0)*(1.8-g) - max(-delta,0)*(g-0.2)]
initial g=1; initial e=S=L=0
```

Local k/r are rectified deviations above fixed unstimulated-model references, divided by 1.5; k is capped at one. Numerical intervals are 0.075 model units, not biological seconds. Gains are held during a frame's trajectory, then updated from it. This source-motivated engineering rule is not a validated physiological law or endogenous reward-prediction-error mechanism.

For each candidate, the fixed preference is `tanh(mean(MBON12)-mean(MBON01)-identical_unconditioned_cue_balance)`. No decoder is fitted to labels; this is not calibrated position value. Assessment freezes persistent learning. An unchanged disabled model may tie at zero by construction.

The synthetic encoder hashes the complete `(seed,cue,action,cell)` tuple to eight of the 120 KCs, stimulated at current 1.5. It excludes labels but does not preserve explicit spatial or elemental structure. Subsets overlap. This is **not a validated chess encoder**. A teaching episode has 19 zero-indexed frames: cue at frame 2; favorable pulse on the same PPL103 targets at frame 0; adverse pulse at frame 2. The teacher certifies the outcome before this replay. A rich certificate is not directly transmitted as a neural explanation.

**The 122-edge scope is today's assay, not a permanent project ceiling.** Additional existing anatomical pathways or eligible plastic synapses may be investigated if independently justified and registered. Do not assume expansion is an available fix or that neuron count alone proves impossibility.

## 2. Current evidence and the prerequisite boundary

G0 tests eight synthetic cue/action associations: 32 acquisition experiences, 16 interference experiences on four other cues, then 32 reversed-contingency experiences. It is receiver qualification, not chess learning. Its original frozen gates require at least 6/8 choices, two additional correct contexts over every control, oriented-margin advantage, and state/recovery/replay checks in each of three effective projection seeds.

The first replica acquired and retained 8/8 but reversed 7/8, tying shuffled feedback. Replay passed; the learning gate failed. A later retained-versus-complete-memory-reset diagnostic reproduced reset-pass/retained-fail on seeds 20261011 and 20261012. Seed 20261013 remains unregistered/unrun at the latest documented inspection. Whole-memory reset changes g/e/S/L/event count together and cannot identify the responsible component.

For seed 20261012, retained informative reversal is 7/8, mean margin 0.00010604; a shuffled arm is 5/8, margin 0.00030735. Reset informative is 8/8. Retained informative gains range 0.78644834–1.02095990, versus allowed bounds 0.2–1.8; none are near the lower bound. Endpoint traces are small but nonzero. These observations do not prove saturation, negligible cumulative trace interference, or a particular cure.

An illustrative rectangular-local-rate calculation gives gain changes about +0.01068 for a frame-0 pulse and -0.02327 for frame 2; shifting the favorable pulse to frame 1 gives only +0.00065. These are scalar examples, **not measured graph waveforms or a diagnosis**.

G0 is unpassed; no advancement is authorized. Earlier work repaired some familiar chess choices but failed unfamiliar/counterfactual transfer. No useful disjoint chess transfer or calibrated position evaluator exists. Replay checks computational execution, not biological validity.

Keep receiver repair distinct from curriculum design. We can plan stages now, then execute only after qualification. Any changed receiver needs a new registered assessment; do not retroactively change old gates.

## 3. Experience source and desired teaching process

Lichess is our intended primary source. Reference pages, supplied so search is unnecessary for understanding the request:

- https://database.lichess.org/#puzzles
- https://lichess.org/training/themes
- https://github.com/lichess-org/lila/blob/master/translation/source/puzzleTheme.xml

The CC0 CSV contains puzzle ID, FEN, UCI moves, rating metadata, themes, source game URL, and opening metadata. **Apply the first listed move to get the solver's position; the next begins the solver line.** Themes/ratings help sample experiences; they must not enter neural input or substitute for consequence verification. Use the archive for scale. FEN alone does not reconstruct repetition history; source-game replay and task-relevant history must be resolved.

An existing streaming curator checks source-line legality, groups selected puzzles by source game, splits samples, removes selected exact duplicates, and records hashes. Structural-family separation, full history, and certified consequences remain unresolved. Earlier acquisition attempts did not produce a usable local corpus; no certified Lichess curriculum has run.

The intended loop is:

**select training experience -> unaided choice -> independent consequence check -> modeled feedback -> targeted repair and cumulative rehearsal -> delayed/disjoint evaluation -> continue or return a specific diagnosis.**

For delayed outcomes, the teacher can re-present an earlier board-action cue and certified stimulus as an additional exposure. This tests state-action learning, not endogenous recollection or temporal credit across plies. External hypothetical search freezes learning and preserves the real board/history. A static evaluator may learn from certified multi-ply experience without reproducing the teacher's search internally.

Existing Python tooling wraps a registered train-to-audit cycle, checks identities, saves full state/pending receipts, and supports verified recovery into a fresh directory. We want bounded campaigns without an AI monitoring each lesson. Scientific redesign, unregistered interventions, and final-test reuse remain review decisions.

## 4. Candidate curriculum and the decisions to resolve

The original, unvalidated topics are:

1. Attack, defense and recapture
2. King safety, check and mate
3. Sound forcing moves and reply awareness
4. Double threats and overloaded defense
5. Lines, blockers and removal of defenders
6. Move order, intermediate moves and sacrifices
7. Piece effectiveness and improving an ineffective piece
8. Coordination and shared duties
9. Weaknesses, pawn structure and weak squares
10. Restriction, prophylaxis and the opponent's plan
11. Pawn breaks, exchanges and endgame transitions
12. Compositional plans and selective adversarial investigation

Choose the smallest defensible set of **Stage 1, Stage 2, ...** pillars. Merge/reorder/defer as justified. A pillar should describe a reusable conditional computation, not merely a human motif name. Explain what could transfer through persistent learning, and what additional mechanism makes a later stage testable. The six-piece cap belongs to an initial bounded diagnostic; it is not a universal restriction on later Lichess lessons.

Resolve these practical problems in your plan:

- **Source-to-pillar assignment:** Exact relevant theme IDs plus teacher-side checks; multiple motifs can make an apparently early puzzle require later knowledge. Identify concepts poorly covered by the source rather than inventing tags.
- **Lesson construction:** Whole puzzle, solver decision, short sequence, or derived comparison? State horizon in plies. Obtain successes, tempting failures, safe quiet alternatives, consequence-changing counterfactuals, and irrelevant variations. Avoid "there is always a tactic" bias. Use alternative legal moves, source-game positions, or declared supplements where needed.
- **Verification and complexity:** Distinguish recapturability, bounded material outcomes, forced mate, and estimated positional value. A principal variation is not all-defense coverage. Set tractable budgets; unknown gives no teaching. If simplifying source boards, preserve lineage and reverify: deleting a supposed distractor may alter a pin or defense. Exact current-state legality is not complete historical provenance.
- **Endogenous computation:** Choose a concrete representation/action/readout contract. State where offsets, pair selection, ray relations, and conjunctions are computed. Legal-move filtering already supplies some king safety. A whole-compound hash can separate XOR cues externally; a fitted probe is not a proof of leakage or incapacity. Explain what the connectome must actually learn.
- **Teaching information:** Specify any contrastive cue or successor-board experience required beyond scalar valence. Do not assume prose certificates enter the brain. Preserve actor/perspective and action-specific credit; overlapping/recurrently active KCs need not have isolated updates.
- **Evaluation:** Group source-game, near-duplicate, transformation, tactical-structure, and derivative lineages before splitting. Separate coordinate transfer, familiar-piece role recombination, and novel relation composition. A positive margin contrast can coexist with wrong preferences; require useful choices, retention, and causal controls. Determine sample/exposure requirements from a pilot, not arbitrary repetition counts.

## 5. Deliver an actionable answer

Provide these five items, with decisions first:

1. **Verdict and stage table.** Assess the Lichess-foundations-to-transfer route separately from current receiver limitations. For each proposed stage give its learned computation/dependency, source-theme filters and exclusions, learning unit/horizon, teacher criterion, strongest shortcut/control, transfer/retention gate, and interpretation of failure. Distinguish demonstrated prerequisites from hypotheses. Explain later extensions without pretending they are ready.
2. **Worked first two stages.** Show how source candidates become certified positive/negative lessons and meaningful counterfactuals. Define acceptable actions, neutral/unknown cases, and private teacher information. If providing FENs, verify both kings, existing check, piece limits, focal/reference legality, and required replies; otherwise label fixtures unverified. A counterfactual changing two defensive resources cannot isolate either one without additional controls.
3. **Reusable campaign loop and bounded pilot.** Give compact pseudocode: choose examples using training evidence only; assess; teach; rehearse; checkpoint; validate; audit. Match informative/absent/shuffled/disabled arms to the same adaptive public experience sequence. Distinguish board exposures, candidate assessments, teaching events, and independent families. Explain transition from two-choice mechanism tasks to useful all-legal choices. State scientific/resource/integrity stops, recovery rules, and when Python can progress unattended. Preserve earlier-stage gates; do not select a winning intervention before designing controls. Specify what pilot measurements determine a confirmatory budget.
4. **First reasoning/transfer experiment.** Identify separately learned relations whose unseen combination must be solved without teacher hints. Hold out combinations and families, include relevant changes that reverse the plan and irrelevant changes that should not, and compare the strongest simpler material/coordinate/template/associative explanations. Separate static systematic composition from internal planning. Include a minimal staged-versus-direct/interleaved comparison with relevant exposures matched, so stage completion is not mistaken for curriculum benefit. State supported claims, falsifying results, and literature checks needed before asserting novelty.
5. **Next decision and essential blockers.** Recommend one immediate analysis or prerequisite study and the next two conditional decisions toward the curriculum. Identify only missing measurements that could change that plan. If a new mechanism is needed, specify its functional requirement, evidence needed, and qualification—not an invented biological solution. Failure should distinguish hypotheses where possible, not automatically prove a projection or anatomical capacity limit.

You may conclude that ordinary Lichess puzzles need controlled supplements or that some stages must wait. Explain how that changes the route. Keep the objective intact: acquire reusable chess foundations through an efficient teaching loop, then test whether they support unfamiliar consequence-sensitive composition. Neither endless prerequisite diagnostics nor puzzle accuracy alone answers that question.
