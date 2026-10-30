# Evidence notes for the Clark one-page draft

14 October 2026. Internal verification notes, separate from the [one-page brief](damon-clark-one-page-brief-2026-10-14.md). Draft only; no email, attachment or referral response was sent. These notes preserve the evidence checks and interpretation corrections rather than placing a long audit inside the letter.

## Correction of the 8/8 versus 2/8 interpretation

The researcher's initial recollection described eight learned chess puzzles and two successes on unfamiliar positions. The inspected record instead identifies **G0 synthetic association acquisition**: eight artificial four-bit input signals and two options, A/B. Its2/8 score is the no-external-feedback control on the same eight signals. It is not the learned model's unfamiliar-position accuracy. The researcher acknowledged possible misunderstanding; the brief uses the verified task identity and condition counts.

The receiver takes a public four-bit signal and candidate A/B option, hashes that combination under a fixed projection seed, and chooses a bounded set of existing Kenyon cells to stimulate. The model receives neural input, not a human-readable four-digit number, chess board or outcome label. Synthetic contingency outcomes remain private to the verifier/teacher until feedback. The first training examples include0000/A as success and0001/B as success; reversal swaps the task assignments. These are artificial contingencies, not rewritten chess truth.

Source: [actual receiver and encoder](../../../.codebase/src/neural-learning/curriculum-g0.mjs), [frozen contingency table](../../../archive/early-development/research/data/curriculum-g0-receiver-v1/contingencies.json), [G0 design](../../../documentation/design/neural-learning/curriculum-g0-assay.md).

The claim “a model without reasoning would score0/8 on unfamiliar positions” has no valid baseline justification. Chance, a fixed preference or a simpler learned relationship can produce successes without the project's operational reasoning capability. Conversely, failed transfer at the tested scope does not establish universal inability. A reasoning claim needs disjoint families, consequence-changing counterfactuals, controls and causal memory evidence under the predefined gates.

## Claim-to-evidence check

| Draft claim | Inspected evidence | Scope limit |
|---|---|---|
| G0 acquisition8/8 versus2/8,3/8,0/8 | [Raw phase results](../../../runs/curriculum-g0-assay-v1-resumed5/result.json) | First computational replica, trained synthetic associations; no unfamiliar chess test. |
| Retention8/8 after16 intervening experiences | Same raw interference phase | Numerical simulated teaching; no claim of biological consolidation or elapsed-time retention. |
| Reversal7/8 ties mismatched7/8 and fails | Same raw reversal phase; G0Passed=false | Minimum accuracy passes, informative advantage and direction/specificity fail. Later replicas unrun. |
| Separate replay reproduces the G0 outcome | [Audit](../../../runs/curriculum-g0-assay-v1-resumed5/audit.json), passed=true, G0Passed=false | Software reproduction using archived sources; not independent biological validation or an external expert replication. |
| Current-error/alternative feedback repairs one familiar puzzle | [Completed report](../../../archive/early-development/research/reports/adaptive-contrastive-coverage-v1-2026-10-07/README.md) | One inspected development fixture; its counterfactual failed. |
| Two familiar successful choices coexist | [Terminal shared-memory report](../../../archive/early-development/research/reports/multi-context-stability-v1-2026-10-07/README.md) | Familiar contexts; search-only controls also solved them with search. The distinctive benefit was unaided choice. |
| Four siblings fail in all conditions | [Sibling assessment and audit](../../../archive/early-development/research/reports/multi-context-stability-transfer-v1-2026-10-07/README.md) | Previously inspected development probes, not untouched final families. |
| Alternative readout succeeds on two taught boards but fails changed-board gate | [Consequence-value feasibility](../../../archive/early-development/research/reports/consequence-value-feasibility-v1-2026-10-10/README.md) | Reference-relative engineered readout; no calibrated position value. |
| Rehearsal can damage familiar choices | [Dose comparison](../../../archive/early-development/research/reports/stability-feedback-dose-v2-2026-10-07/README.md) | Protocol-specific interference, not a complete causal diagnosis. |
| Retained/reset-memory diagnostic unfinished | [Frozen diagnostic](../../../archive/early-development/research/data/g0-reversal-history-diagnostic-v1/README.md), current status and absence of a completed result in the inspected records | No new experiment was launched, resumed or stopped to prepare this draft; no claim of a repair. |

## Motivation, originality and authorship

The [current research goal](../../../documentation/design/research-goals/scientific-contribution.md) preserves the simple-organism reasoning question while specifying a fly-derived computational model and chess testbed. The brief identifies the proposed methodological combination rather than asserting established global novelty or a novel biological learning law. Endogenous plasticity, teacher evidence, engineered interfaces and software audits remain separate.

The [researcher's profile](ethan-interview-profile-2026-10-01.md) records leadership of the question/teaching design and substantial AI-generated implementation. The brief does not imply the researcher hand-coded or independently understands every component. It does not claim Clark agreed to mentor, that a paper was fully read by Ethan, or that an introduction has already arrived.

## Preparation mistakes and corrections

The first broad search included JSON files and matched FEN strings containing8/8, burying the relevant outcome counts. A targeted Markdown2/8 search and direct raw phase-result parsing resolved the task/condition confusion. Large combined reads also truncated; targeted receiver and report reads supplied the needed scope. No missing or unverified unfamiliar2/8 result was inserted into the draft.

The assistant used “cues” and “network” without defining them adequately. The researcher asked twice for clarification. The brief now says “artificial signals, each paired with two options,” and this note explains the exact encoding and why this prerequisite isolates association/retention/reversal before chess complexity. The purpose is to diagnose the modeled learning machinery, while the project remains directed at consequence-sensitive chess transfer.

The older general outreach summary remains a dated historical artifact; this is a separate Clark-specific draft. No experimental gates, graph, source archives or learning mechanisms changed. No simulation tests were needed.
