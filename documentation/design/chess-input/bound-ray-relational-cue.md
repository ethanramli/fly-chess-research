# Candidate-bound slider geometry cue

2026-10-07. Experimental symbolic-input hypothesis motivated by the failed capture-retention transfer assay. The existing connectome, synaptic rule, readout, and teacher remain unchanged. No neural training or reasoning result is claimed.

## Proposed input

The [prototype encoder](../../../.codebase/src/chess-input/bound-ray-relational-cue.mjs) starts from the frozen relational v3 board/action features and adds two candidate-target geometry families:

- `slider-line` binds the candidate's moving-piece type and target square to a rook, bishop, or queen's relative vector and side.
- `slider-context` binds that same slider and vector to each piece geometrically between the slider and target, including its type, side, and relative vector.

The cue does not receive a proof, checked outcome, future reply, safety label, Stockfish score, or search result. It does not ask whether a move is legal for the slider or whether the blocker prevents a capture. It exposes board geometry so any predictive relation must still be acquired from feedback. The x-coordinate is reflected to a shared absolute distance and rank is actor-normalized; this intentionally treats horizontal mirrors as equivalent for this relation.

The fixed dose remains14 mapped KC cells with total current21. Up to four selected cells are reserved by a frozen hash rule for relation-family inputs; remaining cells carry the existing board/action features. This is an engineering allocation, not a biological compartment claim. Different relation tokens can still collide, recurrent activity can still interfere, and the same cue can activate arbitrary mapped downstream pathways.

## Static evidence

The [train/validation audit](../../../research/reports/capture-retention-assay-v3-2026-10-07/bound-ray-input-audit.json) reads only the frozen training and validation files and leaves the final split unopened. At the same dose, all24 cues changed their selected KC sets relative to v3; all12 panels had distinct bound-ray token inventories between their candidates; at least one relation-family cell was selected for every cue. Mean within-panel selected-cell overlap increased from3.25 to4.25 on training and from3.0 to4.0 on validation. Higher overlap is not an improvement claim: this input deliberately preserves shared geometric features. These are input-level facts, not measured KC responses or a learned representation.

Software checks cover blocker-present versus open-line geometry, deterministic mapping, the fixed dose, unchanged board history, and rejection of outcome-like task fields. The full project suite passes138/138. The [implementation audit](../../../research/reports/capture-retention-assay-v3-2026-10-07/README.md#bound-ray-input-prototype) records the source/report identity and limitations.

## Read-only graph activity screen

The frozen [activity probe](../../../research/reports/bound-ray-activity-probe-v1-2026-10-07/README.md) compared v3 and bound-ray inputs on training/validation only, from one common scratch state. It confirms positive endpoint activity for all246 selected relation-token entries and exact readout replay under the unchanged graph. Yet bound-ray ranked only4/8 training pairs and2/4 validation pairs correctly, compared with v3's4/8 and3/4. Bound-ray chose `a1a4` on every training panel; its apparent training accuracy came from four matching labels and did not track the relation consistently. Validation mean success-minus-failure margin was slightly negative. Thus the engineered relation reaches active KC cells, but the untrained readout does not produce a robust consequence-dependent ranking. This is the next link to test with verified feedback and matched controls, not a reason to add more features or repetitions. No plastic updates, learned representation, transfer, or final-family files were involved.

## Next discriminating experiment

Do not tune the old v3 final positions; they are already inspected. Before graph training, freeze a new disjoint family set and protocol. Hold graph, memory initialization, fixed readout, learning equation, verified consequences, search policy and feedback schedule constant; vary only v3 versus this bound-ray input. Include absent, matched shuffled, and disabled-plasticity controls with identical exposures. Any varied projection-map seed is a declared factor, not a model seed or a winner to select from test results.

Measure the whole causal chain: public relation tokens, selected KC identities, actual KC/DAN activity, eligible KC-to-MBON edge changes, per-candidate MBON margins, unaided decisions, and decisions under one fixed search budget. Require the choice to follow counterfactual changes in the blocker relation and persist after repeat/reset/restoration checks. The exposure budget should be fixed and report improvement per verified informative experience and per CPU hour. If relation features are present but do not alter neural activity/readout, stop scaling repetitions. If the margin moves but does not cross the correct decision boundary, the cue-to-choice mechanism still fails.

Even a pass would establish only narrow learned transfer of a capture/recapture relationship. The project's full target still requires bounded Monte Carlo investigation, diagnosis of omissions/misvaluation/missed defenses/inadequate depth, feedback tied to verified consequences and responsible choices, useful all-legal decisions, and unfamiliar/counterfactual transfer on new tactical families. The current receiver replays a board/action with a valence pulse; it does not consume the teacher's written explanation as a neural signal. This prototype does not solve that gap or teach sacrifices, exchanges, forcing tactics, or general chess evaluation.
