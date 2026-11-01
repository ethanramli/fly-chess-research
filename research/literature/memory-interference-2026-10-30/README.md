# Memory interference: research scope and methodology blueprint

Prepared 2026-10-30, 20:41 Asia/Jakarta. **Research/planning deliverable completed at 21:11. Scope confirmed; formal review declined.** This document registers neither an experiment nor a replacement memory rule. No learner code, graph dynamics, training, sealed data or frozen sources changed.

**Read the result:** [recommendation and staged test plan](recommendation-and-test-plan.md). Supporting [primary-source notes](primary-source-notes.md), [executed searches/access limits](search-log.md), and [source-to-solution register](../source-solution-register.md). The original scoping draft below is preserved with dated corrections. The recommended local-protection/slow-memory candidates are untested in the new eye-driven model.

## Decision to investigate

**Which memory mechanism best preserves earlier associations during subsequent learning in the eye-driven FlyChess model while retaining the ability to learn new associations and reverse obsolete ones?**

This is a prerequisite question within the researcher's objective: applying many unrelated concepts to solve an unfamiliar problem. Perfect recall is not the goal. The eventual criterion is retaining enough useful, revisable concepts to support the approved restart plan's Phase B and Phase C tests. Memory capacity, association, and reasoning remain different claims.

The researcher requested research and planning only. Their willingness to compromise on memory permits studying capacity/retention trade-offs; it does not unambiguously authorize unlimited RAM, altered anatomy, imported weights, or an external store supplying chess answers. Engineering alternatives may be documented separately without changing the primary claim.

### Research question assessment

These FINER ratings are planning judgments, not measurements or evidence grades.

| Criterion | Rating | Reason |
|---|---|---|
| Feasible | 4/5 | Existing code, historical receipts and non-chess association tasks support bounded comparisons. Applicability to the new eye route is unresolved. |
| Interesting | 5/5 | Forgetting can prevent the accumulation of concepts required by the researcher's thesis. |
| Novel | 2/5, unresolved | Novelty of the mechanism or combination requires a fresh primary-source search; the project cannot assume it. |
| Ethical | 5/5 for this phase | Local records and published research only; no human or living-animal study is proposed. |
| Relevant | 5/5 | Directly addresses the approved restart plan's undecided memory rule. |

Three subquestions, each inheriting the scope below:

1. Which failures reflect shared activity, inactive-synapse recovery, bounded-gain exhaustion, or an inability to distinguish inputs/read out their differences?
2. Which source-backed mechanisms offer selective retention together with acquisition and reversal in the relevant fly compartments?
3. What controlled test sequence would distinguish those mechanisms without mistaking lookup, frozen weights, or decoder performance for concept learning?

Scope axes: domain = computational fly memory and continual association learning; population = this connectome-constrained model, with adult Drosophila experiments as the primary biological reference; timeframe = seminal work through the actual search date, to be logged; geography = unrestricted literature search, no geographic population claim. Larval, mammalian and artificial-network studies are explicitly marked bridges, not direct adult-fly validation.

## What the latest handoffs actually establish

Read in priority order: [approved restart plan](../../../documentation/design/research-goals/restart-plan-2026-10-30.md), [restart handoff](../../../documentation/handoffs/restart-handoff-2026-10-30.md), [latest fix-goal ledger through L125](../../../documentation/handoffs/fix-goal-ledger-2026-10-24.md), and the superseded [reasoning goal](../../../documentation/handoffs/reasoning-research-goal-2026-10-28.md)/[curriculum state](../../../documentation/handoffs/curriculum-reasoning-state.md). Historical detail was checked against the [v1-v8 memory-probe summary](../../journal/experiments/2026-10-27-stage1-memory-probes-v1-v8-summary.md), [plasticity handoff](../../../documentation/handoffs/plasticity-repair.md), and earlier mechanism specifications.

| Observation | Evidence and scope | Consequence for this investigation |
|---|---|---|
| Alpha gains can only fall. | Current [alpha-lobe source](../../../.codebase/src/neural-learning/alpha-lobe-memory.mjs): `D <= 0`, `k >= 0`, update `eta*dt*D*k`, lower clamp 0.2. Static inspection, not a new run. | Finite downward range can exhaust learning. KC overlap is not the only candidate cause. |
| Inactive synapses recover during DAN activity. | Current [reversal source](../../../.codebase/src/neural-learning/reversal-memory.mjs): `eta*dt*D*(k+g-1)`. With `k=0`, `D<0`, `g<1`, the update is positive. Historical probes report loss over other lessons. | Forgetting can occur even with zero KC activity on the old association. Diagnose this separately from overlap. |
| Reduced token overlap was not a sufficient historical fix. | Probe v4 reduced cross-talk but also impaired acquisition. Later v8 improved its probe under an engineered attack-map cue. These are early-development observations. | Do not assume maximal separation is best, or carry old token-route success into the eye route. |
| A returning wrong choice need not mean its own trace was erased. | The historical plasticity handoff explicitly distinguishes competing-action rank changes from loss of the original update. | Record absolute scores, margins, relevant gain changes and every legal choice; rank alone cannot diagnose erasure. |
| The eye route and old readout differ. | [Wiring count](../../reports/restart-wiring-2026-10-30/wiring-count-output.txt), L117 and restart plan section 5. Visual KC outputs concentrate on MBON05/27/09 and MBON07/06; old restrained targets have limited coverage. | Compartment/edge eligibility must follow the eye route. Do not assume a rule on old targets is usable. |
| The planned linear decoder has a demonstrated detection limit. | L125; [synthetic decoder output](../../reports/restart-decoder-check-2026-10-30/output.json), [log](../../reports/restart-decoder-check-2026-10-30/run.log). Linear decoding remained at chance for the constructed XOR-style signals. | A linear-decoder failure is not evidence that all relevant information is absent. Any revised eye-test protocol needs its own approval before graph data. |

The new eye-driven learner has not demonstrated a memory failure or a memory solution. Most observed forgetting is from superseded conditions. Their mechanisms motivate hypotheses, not conclusions about the restart.

### Two analytical distinctions from the actual code

For inactive KCs, write `D=-d`, `a=eta*dt*d`, with the code checking `0 <= a <= 1`. The unclipped recovery update is

`g_next = (1-a)*g + a`.

Under constant `a`, `1-g_n = (1-a)^n*(1-g_0)`. This directly demonstrates a route to erasure without overlapping KC activation. It does not establish how much of any historical behavioral failure it caused. With constant active `k`, the same rule's unclipped fixed point is `1-k`, so its writing and recovery effects must be considered together.

The alpha rule instead gives `g_next = max(g_min, g-a*k)` within its bounds. Repeated active reinforcement can reach the lower floor; once there, further depression conveys no change. Removing recovery and freezing gains therefore exchange different limitations rather than establishing a complete solution.

The memory is already stored on individual permitted KC-to-MBON edges. This is not evidence of two software writes accidentally sharing one scalar for every neuron. The problem to test is shared neural activity and the locality/dynamics of plasticity.

If two situations have identical input and relevant internal state/history, a deterministic learner cannot give different responses to them. Conversely, shared neurons alone do not imply identical representations or unavoidable interference. We must measure graded activity, downstream effects and task conflict rather than counting shared cells only. This is an analytical distinction, not new biological evidence.

## Methodology blueprint

### Paradigm and present deliverable

Use a quantitative, causal model-comparison framework, preceded by a documented primary-source investigation. The present phase is problem definition and study design. New source retrieval, the annotated bibliography, source grading and cross-source synthesis follow confirmation of this scope. No review form is assumed, and no systematic-review or exhaustive-coverage claim is made.

The three requested skills are loaded: deep-research governs research/scoping, academic-paper supplies claim/evidence and methods discipline, and academic-pipeline keeps the research stage distinct from later writing. A manuscript and the full publication pipeline have not been requested. The research skill's primary-source/file workflow applies during investigation. No outside AI provider receives manuscript text, and no cross-provider verification is authorized.

### Source strategy to execute after confirmation

Search publisher articles, PubMed/Europe PMC, eLife, primary preprints and authors' repositories. Log exact queries, dates, returned candidates and access failures. Seek contradictory findings and negative results as well as supportive work. Search both adult-fly mechanisms and clearly separated continual-learning comparisons.

Planned query families, not executed searches:

1. `Drosophila Kenyon cell memory interference overlapping representations APL sparse coding`
2. `KC MBON synaptic plasticity potentiation depression dopamine timing compartment specificity`
3. `Drosophila long term memory consolidation spaced training interference reversal`
4. `mushroom body MBON dopamine feedback prediction error learning saturation`
5. `continual learning synaptic consolidation replay stability plasticity retention acquisition tradeoff`

Existing register leads include Aso/Rubin, Handler, Berry, Felsenberg, Ichinose, Gkanias, Bennett, Huang and local-protection studies already discussed in the [source register](../source-solution-register.md) and [earlier specification](../../../documentation/design/neural-learning/bidirectional-plasticity-without-freezing.md). They are retrieval leads here, not a newly verified bibliography. The register records abstract-only or partial coverage for several important sources; retrieve the relevant methods, equations and results before claiming mechanistic support. Verify every title/DOI rather than trusting remembered article numbers.

For each usable source, extract species/stage, compartment and neurons, induction timing, measured or assumed signal, memory timescale, reversal/interference assay, causal manipulation, numerical parameters and provenance, author limitations, and our proposed departure. Distinguish biological experiments, fitted computational models, theory and engineering baselines. Full-text mechanisms cannot be inferred from an abstract. An inaccessible source may remain an explicitly unassessed lead, not evidence supporting a recommendation.

### Candidate families to compare, without selecting a winner now

| Family | Question for the sources | Main failure to guard against |
|---|---|---|
| Activity-dependent eligibility and local protection | Can updates be restricted to the relevant active synapses while remaining revisable? | Inactive protection does not protect a KC reactivated by another task; exact compartment/trigger support matters. |
| Compartment-specific fast/slow memory or consolidation | Can rapid acquisition coexist with slower, revisable storage? | Arbitrary rates or wall-clock sleeps are not biological consolidation. Slow learning alone can appear stable. |
| Sparse coding and inhibitory regulation | Does the actual circuit reduce harmful overlap without deleting useful shared features? | Zero overlap can encourage memorization or impair acquisition; engineered task labels would defeat the restart. |
| MBON-to-DAN feedback and bounded teaching drive | Can learning regulate subsequent plasticity rather than repeatedly drive weights to a floor? | Wiring sign alone does not establish a stable prediction-error loop, effective feedback gain or correct credit. |
| Bounded replay or synaptic-importance engineering comparisons | What retention/capacity is achievable as an explicitly non-biological comparison? | External answer storage, pretrained policies, extra exposure and oracle-selected replay would change the claim. |

Bidirectional efficacy changes are a candidate within the local/compartment families, not an automatic cure for overlapping associations. Strengthening can also overwrite memories. No alpha1/alpha3 rule is changed without compartment-specific support. The restart's slow-recovery proposal remains an untested proposal alongside the earlier eligibility-gated candidate, whose inactive-cue guarantee explicitly fails when cues reactivate shared KCs.

### Proposed later test ladder (not authorized for execution)

1. **Separate the mechanisms analytically and on small fixtures.** Distinguish inactive recovery, direct shared activity, readout competition, saturation and identical-input conflicts. Reuse existing arithmetic and historical receipts before considering new graph diagnostics. Toy results remain toy results.
2. **Prepare a non-chess memory assay after the approved eye-test path is resolved.** Train A, measure A, learn B/C at controlled exposures, remeasure A, then reverse A's contingency. Vary actual representational overlap and congruent/conflicting outcomes as predeclared factors. Include multiple associations and both valences. Use no teacher-provided task identity as a solution.
3. **Compare the minimum justified mechanisms with controls.** Every mainline condition includes informative, independently verified own-choice feedback; absent, matched-shuffled and disabled-plasticity controls accompany it. Keep input, readout, event timing and resource/exposure budgets fixed where the causal contrast requires them. Match presentations and log differing choices, known outcomes, unknowns and pulses; do not silently equate their counts. A separately declared replay diagnostic is not own-choice chess training.
4. **Test stability while new learning remains possible.** Measure A retention together with B acquisition and later reversal, gain-floor occupancy, plasticity locality, output margins and capacity as associations accumulate. A freeze/no-learning comparison may expose the trade-off but cannot pass as a solution. Probe effects must be matched or learning disabled only during measurement, not during interference training.
5. **Return to the approved chess progression only after approval and assay success.** Test the memory rule on training/development data, preserve final-test sealing, then follow Phase A, Phase B and the separately approved Phase C. Better retention alone supports no reasoning claim.

Use synthetic readouts/linear or nonlinear decoders only as declared measurement tools. Do not fit the learner's answer-producing readout on checker labels. Diagnostic decodability, usable signal strength, learned policy and concept combination are separate outcomes. New assays cannot silently repair the frozen eye-test protocol.

### Analysis, validity and stopping rules to fix in a later registration

Primary outcomes should jointly cover old-association retention, new acquisition and contingency reversal. Report per-association and per-valence performance and margins; do not let an average hide a loss of one criterion. Include both exposure-dependent interference and model-time retention where time is actually modeled. Disk persistence and CPU rest are not biological retention measurements.

Define independent computational replication at the seed/schedule level; thousands of correlated presentations are not thousands of flies. Use matched contrasts and uncertainty at the appropriate association/task-family level. Determine seeds and exposure budgets from an explicit precision/power rationale, then freeze thresholds, multiplicity handling and per-criterion selection rules before confirmatory data. Pilot data inform development only. This draft invents no experimental pass numbers.

No mechanism is recommended as solved unless it preserves useful old behavior, supports new learning, remains reversible, and beats relevant controls at declared exposure and resource cost. Stop and report a bounded failure if the mechanism or eligible pathway cannot meet those conditions. Preserve every negative condition; record a new hypothesis/version before another attempt.

Keep released identities, topology and signs. New unfrozen work stays within the registered 2048 MiB RSS ceiling and free-memory guard; use sparse, bounded state with an explicit byte/RSS budget. Do not reinterpret the researcher's compromise as permission to replace endogenous learning. Checkpoints must include any slow state, eligibility, simulated time and pending receipt, with exactly-once recovery and independent replay.

## Scoping challenge and unresolved choices

This is the same assistant's adversarial scoping check, not independent peer review. **Provisional PASS for investigating the scoped question; no experimental or biological validation.**

The central challenge is that memory could be improved without improving reasoning. The blueprint addresses it by requiring new acquisition/reversal and retaining Phase C as the later reasoning criterion. A second challenge is that more storage can hide an inadequate representation; the plan separates information/readout diagnosis from interference. A third is that old successes used answer-rich tokens; no such success is accepted for the eye route.

Unresolved: source support for the exact visual-KC compartments, the useful capacity/retention trade-off, modeled time, and whether the researcher wants any engineered comparison to be investigated beyond the primary fly-constrained candidates. None is silently decided by this draft.

Expected next deliverable after scope confirmation: an evidence matrix with primary-source read coverage, conflicting evidence, ranked candidate mechanisms and a minimal proposed assay. Budget estimate: approximately 30-60 minutes of agent research for a bounded first pass, longer if essential full texts are inaccessible; no paid outside model calls. This is not a promise of a memory solution.

## Process, limitations and handoff

Only repository evidence and source code were inspected in this phase. No new external scientific claim has been verified. Existing records retain their access limitations. Older Codex memory was checked briefly for orientation; current repository instructions and handoffs govern this restart.

Process mistakes retained for audit: attempted to create a goal although the harness already had an active goal (rejected; existing goal retained); oversized combined reads truncated some output (replaced by targeted latest-entry/source reads); two guessed local paths did not exist (`mushroom-body-memory.mjs` and the decoder report's README). The actual `reversal-memory.mjs`, decoder output and log were inspected instead. These tooling errors produced no simulation or learner change.

**Checkpoint update, 2026-10-30 20:49:** the researcher confirmed the scope: "yeah, thast the scope. go ahead." Phase 1 scope confirmation is closed. The requested deep-research skill's one-time review-form note is now due; no review form was previously selected or skipped in this conversation. New source searching waits for that reply, without reopening the approved scope. Manuscript writing, experimental memory-rule selection and publication remain later decisions.

AI assistance: Codex inspected local records/code and drafted this scope and methodology. No claim of independent review, complete literature coverage, biological validation, or achieved reasoning is made.

### 20:57 addendum: format checkpoint closed; research continues

Researcher: "no need review, just figure out what i asked you to figure out" and "just continue the goal that is the whole scope." This explicitly declines a formal review and closes the review-form note under its no-formal-review/skip branch. The scope remains accepted. Earlier pending statements above are historical. New work now gathers primary evidence for a practical recommendation and test design; no manuscript or separate editorial review is required. Repeated clarification had delayed the substantive research; that workflow mistake is recorded here and is corrected by proceeding within the approved scope.

Tool access: the Firecrawl CLI is absent, and the installed Firecrawl skill's linked `firecrawl-search/SKILL.md` is absent at its stated relative location. Available web search is used as the fallback. Some publisher and PMC requests returned access challenges; successful primary text and bounded read coverage are retained, and inaccessible methods are not treated as verified.

### 21:11 addendum: practical research result delivered

The recommendation, ranked alternatives, source read-coverage matrix, source register and staged retention/acquisition/reversal design are complete. The recommended sequence is local physiological protection, minimal revisable fast/slow storage if needed, and measured inhibitory coding. This completes the requested research/planning work, not empirical resolution of the memory or reasoning gates. The preserved Phase 1 statements above describe their original stage.

The research helper remained uninitialized and was interrupted/cancelled; it supplied no findings. The parent completed and verified the source notes directly. Attempts to parse the downloaded XML first encountered an external-DTD lookup, resolved using an XML reader with DTD processing ignored and no external resolver. Access and helper failures have no biological meaning and are recorded in the evidence/journal.
