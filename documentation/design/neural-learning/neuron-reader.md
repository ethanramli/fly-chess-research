# neuron-reader: fixes to the reviewed design

**Status, 2026-10-31: sampler, explicit scoring function and streamed candidate path implemented; focused software and static identity checks pass. No biological scoring contract or full-graph result.** This is the focused repair plan for the researcher's requested `neuron-reader`, based on [all nine GPT-6.1 Sol findings](../../../research/reports/neuron-reader-design-review-2026-10-31/README.md). It gives module decisions and checks rather than another research-stage summary. The [restart plan, section 4A](../research-goals/restart-plan-2026-10-30.md#4a-neuron-reader-observation-first-then-a-justified-move-score) retains the experimental order and permissions.

## The concrete design

One small [module](../../../.codebase/src/neural-learning/neuron-reader.mjs) exports the two functions below. It does not own the simulator or the memory mechanism. The separate [candidate recorder](../../../.codebase/src/puzzle-learning/record-neuron-candidates.mjs) supplies the inference/receipt call path.

1. **`readNeurons(endpoint, manifest)`** accepts the existing simulator's final activity vector and a validated observation manifest. It selects the pinned cells, copies their numeric activity, and returns those observations plus five type means. It does not propagate the graph, learn, advance time or return a move score.
2. **`scoreNeurons(observation, scoreContract)`** calculates one fixed signed sum of type means only when the contract is complete, source-justified and compatible with the declared memory targets. A missing/unresolved contract is an error. The caller cannot use an observation-only result as a ranking.

Use a new `neuron-reader.mjs` in the existing neural-learning folder and its focused tests. Reuse the simulator and the existing manifest/hash patterns. Do not modify frozen legacy readers, the other session's memory files, or add another brain subclass, dependency or factory layer.

## Each critique and its repair

| Review finding | Specific design change | Evidence/check required |
|---|---|---|
| 1. Wrong legacy comparison; anatomical counts treated as benefit | Name the comparator as coupled v5: MBON12 minus MBON01 minus MBON07 plus MBON14. Report observed and scored coverage separately. Withdraw the near-blindness and promised-improvement claims. | Source/count corrections are in the review. A later comparison reads both formulas from the same endpoint, under the same Eyes input, snapshot and computation. |
| 2. Unreachable 1.8 gain corner; diagnostic signs used as validation | Keep oracle interventions out of both functions. The reader only measures the actual supplied state; the deployed score never imports decoder-fitted signs. | F04 remains a separately resolved protocol question. Neither passive recording nor its software checks depend on the proposed 0.2/1.8 intervention. |
| 3. Unknown behavioral signs | Make the sign/evidence table explicit. Unknown cells remain recorded with coefficient 0 in any finalized score; candidate negative signs are not activated merely by appearing in this plan. | Exact cell group, manipulation, assay, source scope and memory compatibility for each nonzero coefficient. No transmitter-to-behavior shortcut. |
| 4. Undefined numerical observable | Sample raw final `model.h[model.steps]`; retain individual values and type means. Never read the model's fitted head. | Freeze the model/config identities; a fixture distinguishes endpoint from intermediate activity and head predictions. |
| 5. Candidate reads may alter memory or depend on order | Put reading after ordinary inference from zero transient activity, with learning callbacks disabled and the entire persistent state unchanged. Copy sampled values immediately. | Complete state/board fingerprints before and after, reordered-candidate equality, and an aliasing check after the simulator buffer is reused. |
| 6. Five types mistaken for five cells | Use the exact 14-cell roster below, with root IDs as strings and explicit indices/soma sides. Never select a first match or filter by assumed same-side dendrites. | Verify the graph/root-ID join and annotation hashes before execution; changed/duplicate/missing identities fail. |
| 7. Pooling and choice unspecified | First take an arithmetic mean within each type. Then sum explicit coefficients times those means, in fixed type order. Policy randomness remains in the chooser. | Unequal-population fixture, exact score equation, frozen coefficient table, PRNG/seed/temperature, tie order/tolerance and invalid-value rule before choice data. |
| 8. Reader and memory target different cells | Require a compatibility record naming the actual modifiable targets and their path to a scored output. MBON32/35 remain unresolved candidates, not silently added approach cells. | In the separately approved memory assay, verified feedback must move candidate margins in the appropriate directions against the declared controls. If targets are missed, publish a revised roster before data. |
| 9. Weak/saturating signal and legacy integration untested | Add a clean Eyes candidate-recording call path; preserve existing callers. Record zero/ceiling activity and candidate ties as results. | Later authorized, matched full-graph measurements with frozen Eyes v1. A valid reader may still reveal unusable signal; that outcome is not repaired by fitting coefficients or changing the rendering. |

## Exact observation roster

Copied from the existing [static anatomy evidence](../../../research/reports/memory-retention-continuation-2026-10-31/feedback-path-feasibility-v1.json), not from a new graph run. This fixes the proposed population to 14 cells. Runtime use still requires verification against the pinned graph and annotations; this document is not an executed manifest check.

| Type | Root ID, kept as a string | Graph index | Soma side |
|---|---|---|---|
| MBON05 | `720575940621164720` | 46203 | left |
| MBON05 | `720575940630496374` | 95882 | right |
| MBON06 | `720575940638028607` | 119919 | right |
| MBON06 | `720575940638163428` | 120251 | left |
| MBON07 | `720575940617302365` | 29400 | left |
| MBON07 | `720575940623381956` | 58537 | right |
| MBON07 | `720575940628783363` | 87355 | right |
| MBON07 | `720575940652390134` | 132782 | left |
| MBON09 | `720575940610964946` | 9900 | right |
| MBON09 | `720575940629422086` | 90572 | left |
| MBON09 | `720575940629856515` | 92679 | left |
| MBON09 | `720575940630864847` | 97844 | right |
| MBON27 | `720575940618249797` | 33266 | right |
| MBON27 | `720575940622979277` | 56209 | left |

Graph hash: `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`. Annotation hash: `30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6`. Primary-type annotation hash: `8aba246d71dc40361677493629972ce3883048c3d02010adc42bda22962a1a2d`. The execution manifest also pins this module, the Eyes v1 identity and the complete model/config/memory identities. The proposed type order is MBON05, MBON27, MBON09, MBON07, MBON06; cells within each type are ordered by graph index.

Soma side is not dendritic receiving side. The existing [MBON05 mapping note](gamma4-plasticity.md) establishes contralateral dendrites. Preserve other receiving-side uncertainties explicitly rather than inferring them from soma labels. Curated/predicted transmitter disagreement does not change the graph's fixed signs.

## Measurement and state rules

The selected observable is the copied endpoint model-rate activity. The current model computes that array in [SparseTrainer](../../../.codebase/src/supervised-baselines/trainer.mjs); the legacy [v5 reader](../../../.codebase/src/puzzle-learning/coupled-stockfish-brain-v5.mjs) already samples it. The exact step count, precision, normalization, recurrent scale, bias, leak and saturation come from a pinned model snapshot/config. Record their actual values; do not silently rely on constructor defaults or adjust them after seeing responses.

The pure reader validates manifest membership, indices, activity length and finite values. It returns independent ordinary numeric values, the manifest identity, individual observations and arithmetic type means. Exact zeros and values at the declared ceiling are diagnostic counts. It performs no baseline subtraction, extra rectification, additional normalization, learned weighting or unit conversion. Suppression can be evaluated by comparing recorded raw responses later; it is not clipped away by a reader transformation.

The candidate runner supplies the exact board/history identity and UCI, Eyes/graph/model identities, the complete persistent-state identity and the measurement configuration when writing a receipt. Every candidate uses the same zero transient start and persistent snapshot. The runner preserves board/history, weights, gains, traces, slow state, clocks and pending-receipt state; it does not observe feedback, flush a receipt, increment a learning clock or restore a different memory between candidates. It can count engineering presentations separately. The pure reader cannot mutate those objects because it is not given them.

Verify persistent-state and board/history fingerprints after each candidate. Detection aborts the candidate set and invalidates its ranking; do not silently restore and continue. Stream receipts rather than retaining an unbounded activity history. Sampling 14 values requires no full-state copy or additional graph propagation; preserve the repository's sparse/resource rules.

## The scoring decision, made explicit

The planned equation is:

`score(move) = c05*mean05 + c27*mean27 + c09*mean09 + c07*mean07 + c06*mean06`

Each coefficient is -1, 0 or +1. Equal type-mean weighting is an engineering choice, not evidence of a natural action circuit. The score expresses relative move preference, not calibrated position value or an innate chess judgment. The inspected evidence leads to this research queue:

| Type | Review-scoped evidence | Current coefficient decision |
|---|---|---|
| MBON05 | Avoidance support in the inspected single-type assay | Investigate -1 with the actual memory targets; not activated yet. |
| MBON27 | Behavioral role remains a hypothesis in inspected material | 0 until suitable evidence resolves it. |
| MBON09 | Inspected activation evidence groups MBON08/09 | 0 until the relevant population/sign is resolved. |
| MBON07 | Negative effect on the identified pathway; universal behavioral sign not established | Investigate a scoped -1 convention with the actual memory targets; not activated yet. |
| MBON06 | Inspected coactivation does not isolate its contribution | 0 until suitable evidence resolves it. |

This table summarizes the [review's primary-source findings and their read limits](../../../research/reports/neuron-reader-design-review-2026-10-31/README.md). It is not a finalized coefficient contract. Do not represent an uncertain cell's coefficient 0 as proof that it has no behavioral effect.

The final contract must contain all five coefficients and the evidence/assumption/target rationale for every nonzero entry. At least one entry must be nonzero. Evidence-incomplete or all-zero contracts are rejected, not converted to a neutral or random policy. No coefficient is fitted to safe/unsafe labels, Stockfish or final families. Once the contract is valid, a negative-only score can rank moves; it does not need invented positive coefficients.

Software checks schema, identities and an explicitly reviewed coefficient/evidence table. It cannot establish the truth of a behavioral interpretation by checking that a citation field is filled. Source interpretation and causal compatibility need their own review and evidence; their signed-off contract is an input to this module.

The integration must show how the approved memory changes the scored responses. Correct feedback must be able to increase and decrease the relevant candidate margin within the reachable state range. A causal assay is required for this claim; the reader alone cannot solve an incompatible memory mechanism. If this requirement is unmet, the scalar chooser remains unready while passive recording remains usable.

Before actual move choice, separately freeze the existing chooser's temperature, PRNG/seed, canonical candidate ordering, numerical tie tolerance and error behavior in its run manifest. F03/F04 and the section 7 supervised decoder do not supply coefficients or policy calibration.

## Acceptance checks for the implementation

1. **Identity and observable:** reject wrong graph/annotation identities, duplicates, missing cells, bad indices and nonfinite activity; use the exact roster and endpoint rather than a head or intermediate step.
2. **Copy and pooling:** outputs survive later buffer reuse; arithmetic type means are correct for different population sizes; diagnostic-only means never accidentally become a move score.
3. **State and ordering:** real candidate inference on a bounded software fixture leaves all persistent state and the board unchanged, and moving candidates to a different evaluation order gives identical copied observations under the same model/config.
4. **Scoring contract:** reject incomplete/all-zero/mismatched contracts, nonzero entries without the required reviewed evidence/assumption record, and nonfinite scores. Verify the fixed equation and chooser seed/tie behavior using an explicitly synthetic contract. Schema checks and synthetic signs do not validate biological signs.
5. **Claim separation:** report these as software checks. Later graph comparisons must declare any extra legacy observation cells in a versioned comparison manifest and record signal strength, saturation, margins and ties. Do not claim improved choices or learning from wiring counts or fixtures.

## What this plan actually resolves

The interface, cell roster, measurement, pooling, state handling, error handling and focused checks are implemented. Two scientific decisions remain open: which nonzero behavioral coefficients are adequately supported, and whether the approved memory can move their candidate margins in both required directions. Those need source verification and separately authorized causal evidence; software checks cannot resolve them.

## Implementation interface and use

`neuronReaderCells` is the frozen released roster exported beside the two functions. The observation manifest is `{ roster: neuronReaderCells, config: { ...model.config }, memoryIdentity }`; `memoryIdentity` is a SHA-256 identity for the declared mechanism, distinct from the changing snapshot. The reader derives a manifest identity and records its own source hash. Synthetic fixtures require an explicitly synthetic roster and cannot pass as released-graph observations.

`scoreNeurons` requires `schema: 'neuron-reader-score-v1'`, matching scope/manifest/memory identities, a reviewed evidence/compatibility record and all five coefficient entries. Each entry has a `value`; nonzero entries additionally require the source, assay, scope, assumptions and exact type-population root IDs. See the [synthetic fixture](../../../.codebase/tests/neural-learning/neuron-reader-fixture.mjs) for the precise shape; its arbitrary signs are not a usable biological contract. No default production contract is supplied.

`recordEyesCandidates({ board, moves, eyes, model, manifest, persistentState, guard, pace })` is an async generator. Supply legal UCI strings, the existing Eyes/model objects and explicit guard/pacing functions. The model's sparse graph must match the roster's graph-state hash. The required `persistentState()` callback exposes all owned persistent memory as acyclic plain data with typed-array spans and `identity === manifest.memoryIdentity`. It must include every trace, slow state, clock and pending receipt; completeness must be reviewed when the memory mechanism is selected. A partial historical checkpoint is not assumed complete.

The recorder fingerprints fixed graph/parameters plus config, signed weights, gradients, optimizer state and the supplied full memory before each measurement. It binds receipts to FEN plus PGN/history, candidate set, Eyes and reader/recorder identities, configuration and the initial state. It emits a completion receipt only when every candidate succeeds. Stream records to the caller's log; an interrupted/error set has no completion receipt and cannot supply a complete ranking. No reward or learning call is made, and no default no-op resource guards are installed.

Reproduce the focused software checks from the repository root:

```powershell
node --max-old-space-size=256 --test --test-concurrency=1 .codebase/tests/neural-learning/neuron-reader.test.mjs .codebase/tests/puzzle-learning/record-neuron-candidates.test.mjs
```

For a static identity check into a new directory:

```powershell
node --max-old-space-size=256 .codebase/scripts/neural-learning/check-neuron-reader.mjs --out runs/neuron-reader-static-check-new
```

The static command refuses an existing directory. It validates graph/source hashes, root IDs, all selected annotation rows and transmitter labels without constructing a model or propagating activity. Existing evidence directories are not rerun or overwritten. This build does not launch a graph experiment, alter the approved numerical gates, select a memory rule or change another session's files.

**Completed software verification, 2026-10-31:** [build report](../../../research/reports/neuron-reader-build-2026-10-31/README.md) and [verification receipt](../../../research/reports/neuron-reader-build-2026-10-31/verification.json). Ten focused checks pass; all 14 static identities match; final regression is 741/747 with the six previously recorded historical-path failures. Source snapshots and unchanged protected-source hashes are preserved. No production sign table or causal memory compatibility is established; chooser PRNG/temperature/tie integration remains for that later step. The scoring function's synthetic contract check does not claim this policy integration has run.

[Neural-learning designs](README.md) · [Dated decision/mistake record](../../../research/journal/experiments/2026-10-31-neuron-reader-design-review.md)


## 2026-11-01 external-review addendum: causal scope and graph prerequisites

The [actual-graph audit](../../../research/reports/neuron-reader-graph-audit-2026-11-01/README.md) confirms threshold-dependent loss of KC-to-MBON connections and thirteen disagreements between selected Eyes roots and pinned photoreceptor labels. All selected inputs have outgoing edges. These are unresolved graph/annotation prerequisites, not failed propagation results. Keep the current recorder passive and its original fourteen-cell roster unchanged; no production coefficient contract is selected.

The earlier rationale favoring cells directly modified by memory must not be treated as a necessity or sufficiency claim. Recurrent routes can mediate or cancel response changes. A later causal protocol should distinguish plastic-edge, MBON-to-MBON and MBON-to-DAN pathways, with controls, without choosing readers after inspecting the desired effect. Recording all MBONs, non-chess calibration, threshold/sign variants and odor/color benchmarks remain proposals requiring explicit mappings and protocols. This addendum changes no original numerical gate, owned memory implementation or experiment permission.


## 2026-11-01 MBON05 provenance addendum

The [sign trace](../../../research/reports/mbon05-sign-provenance-2026-11-01/README.md) identifies the exact source of the opposite signs: left blank Codex transmitter resolved by an edge-weighted ACH fallback, right explicit GLUT, with curated glutamate unused. The sampler preserves these graph signs and separate annotation labels; a move-score coefficient cannot repair an incorrectly specified outgoing connection. The prospective 112-edge sign overlay is a separately pinned model sensitivity proposal, not an applied reader change. Curated transmitter evidence alone does not identify every receptor or justify a production behavioral coefficient.
