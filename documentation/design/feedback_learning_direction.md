# Feedback-driven learning: direction clarified in discussion

Date: 2026-09-30. This note consolidates the researcher's intentions, implementation corrections and unresolved questions from the project discussion. It is a discussion record and current design direction, not a completed biological model or frozen experimental protocol.

Implementation addendum, later on 2026-09-30: the subsequent request to implement the next step produced a [mapped gamma4 conditioning prototype](mushroom_body_learning.md). A primary-literature-motivated but unfitted timing rule now has persistent local efficacy state and passes bounded software association/retention/temporal-reversal checks with controls. Earlier statements below that no mechanism had been implemented describe the discussion at that point. Natural sensory/reward pathways, action learning, biological validation and the puzzle learning loop remain unresolved; this addendum does not supersede those requirements.

Further validation addendum: the request to establish learning produced [two controlled choice experiments](association_validation.md) with fixed engineered readout, contingency reversal, matched shuffled feedback and causal memory reset/restoration. V2 acquisition strengthened rewarded preference in all six seeds; three failed to make the new choice after reversal. Both overall acceptance tests failed. This supports a narrow association result in the specified model while leaving reliable adaptation, natural interfaces and chess transfer unresolved.

## Intended learning process

The researcher wants to train a simulated fly through experience: present a chess position or puzzle, let it choose and investigate moves, and provide feedback about the consequences. The released connectome's wiring must be preserved, initialization stays from scratch, and the system must remain usable under the laptop constraints.

The rubric is intended to judge behavior and provide feedback. The assistant initially interpreted it as a vector of directly supervised criterion predictions; the researcher corrected this. Numerical criterion prediction can remain a comparison condition, but it does not replace the intended feedback-driven experiment.

The English rubric must still be operationalized into reproducible assessments. The board is encoded numerically for sensory input. The assessment is then translated into a feedback event after the fly acts. These are separate mappings: a chess input encoding does not automatically provide a biological reward pathway.

## Teacher and brain boundary

The researcher objected to the teacher externally changing the brain to make its answers better. The intended teacher supplies experience and feedback; lasting adaptation must arise from an explicitly modeled mechanism inside the simulation.

The existing Adam/backpropagation trainer remains engineering and baseline evidence. It does not establish the biological learning process requested here. The assistant briefly implemented a generic reward-modulated weight-update prototype, then removed it before integration when this mismatch became explicit. Calling an arbitrary update rule "internal" would not resolve the biological question.

Preserving the connectome's wiring and freezing every possible persistent state are different requirements. Lasting learning requires some lasting state to change. The discussion identified endogenous synaptic effectiveness or other biologically justified memory state as possible locations, but did not select or validate one. Neither the teacher nor the current puzzle runner is authorized by this design to invent anatomical reward mappings or directly optimize the model's weights.

The connectome cache and current rate-model equations do not by themselves specify a complete reward pathway, plasticity mechanism or memory process. These need biological evidence, an explicit approximation, and validation. No mechanism has been established in this chat.

## Puzzles, feedback quality and calculation

The researcher prefers starting with puzzles and eventually selecting training puzzles that target demonstrated weaknesses. Self-play was discussed as an alternative or later source of experience; it was not established as the best curriculum for this project. Future adaptive selection must use training evidence only and preserve disjoint validation and final-test families.

The proposed second board is a hypothetical workspace. It lets the system make and undo moves without changing the real task position. Search needs candidate moves, plausible defensive replies and an assessment of consequences. Its visits and estimates are not automatically reliable feedback.

The researcher highlighted long combinations involving deflection, forks and intermediate moves (zwischenzug), including multiple motifs combined in one line. A superficially bad first move may lead to a useful consequence much later. The design must account for candidate omission, premature rejection of sacrifices, missed defensive replies and stopping before the payoff. A reward at the end also creates a credit-assignment problem for earlier choices.

Grandmaster thinking was discussed as inspiration for perceiving piece relationships, recognizing opportunities, generating ideas and interleaving recognition with selective calculation. This motivates hypotheses about learned search allocation; it does not establish that the current fly model represents concepts, plans or human cognition. An explicit goal representation remains a proposal, not implemented code.

Feedback may come from actual game outcomes, an operational rubric, or independently verified puzzle consequences. Short Monte Carlo continuations require an endpoint assessment; random or weak defensive play can make unsound moves appear successful. The current implementation therefore uses bounded forced-mate verification with success, failure and unknown states. It implements only this narrow engineering objective, not the full future rubric.

The coding-model analogy in the discussion was motivational rather than a verified account of any named company's training process. Dataset volume alone does not determine inference cost for a fixed deployed model. Experience-driven learning also still needs an explicit mechanism that stores what was learned.

## Latency and implementation evidence

The researcher reported unacceptable waiting during browser play. Source inspection found that the existing player evaluates every legal successor through the full connectome and then rests approximately as long as each evaluation took. It uses an untrained one-ply policy. This is a code-based explanation, not a measured breakdown of the reported browser session. The browser player has not been modified in this discussion.

The isolated [puzzle round](puzzle_feedback_round.md) now implements one root choice, second-board PUCT search, independently verified feedback, a record-only receiver and atomic round-state checkpoints. Its full-graph fixture selected `Qh7#` and recorded `+1`. The initial run measured 3.514 seconds from script measurement start through report preparation, 2.703 CPU seconds and 101.77 MiB peak process RSS. All graph and parameter hashes stayed unchanged. This does not demonstrate learned puzzle ability or a latency improvement over the browser player; the implementations and workloads differ.

The receipt explicitly records `appliedToNeurons: false` and `learningApplied: false`. A correct mate selected with search is evidence that the task plumbing runs, not that biological feedback reached the fly or that it learned. Raw results and replay evidence are linked in the implementation note.

## Agreed sequence and next unresolved step

The researcher proposed: get one puzzle-and-feedback learning round working, optimize latency, then scale. The completed round currently verifies the task plumbing only. The learning requirement remains outstanding before that sequence advances to scaling.

The next proposed work is:

1. Identify reward circuitry and a plasticity/memory mechanism supported by biological evidence; establish whether the necessary neuron identities and annotations are available for the released graph.
2. Specify what the teacher supplies, how feedback affects identified neurons, where memory persists, and which endogenous state is permitted to change. Record all approximations and resource costs.
3. Implement a bounded prototype and validate rewarded association, retention and reward reversal against a matched control without informative feedback. No implementation or successful result exists yet.
4. Replace the record-only receiver, reconnect puzzle feedback, and measure changes in later unaided choices and choices under a fixed search budget. Keep immediate repetition separate from transfer.
5. Once an actual learning round works, measure latency, optimize within the sparse serial constraints, and develop a leakage-safe curriculum with held-out motif combinations.

The broader rubric, neural reward mapping, endogenous learning dynamics, persistence format and success gates for this mechanism remain to be specified. The existing supervised protocol needs an amendment before it can describe this revised experiment as settled.

For discussion chronology, see [the journal entry](../../research/journal/2026-09-30.md). For decisions, see [the decision log](../../research/project/decision_log.md).
