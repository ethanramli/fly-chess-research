# Research question brief: persistent, revisable associative memory

Date: 2026-11-01. Phase 1 scoping only. AI-generated candidate question and scope, pending researcher confirmation. No new literature search, experiment, mechanism selection, or biological validation is reported here. The planning scores below are judgments for choosing a tractable question; they are not evidence of scientific merit or novelty.

## Primary research question

In the fixed FlyChess connectome model, can a source-supported local synaptic memory mechanism learn a sequence of distinct visual associations, preserve earlier associations through explicitly modeled delay and intervening learning, and selectively revise an association when its verified consequence changes, while preserving unrelated associations and outperforming matched feedback/plasticity controls?

The question requires distinguishing changes in stored synaptic state from changes in how the circuit's response is read. The specific mechanism, mapping, clock, numerical rates, reader, population size, and acceptance thresholds must be justified and fixed prospectively before a candidate experiment. This brief does not decide them.

## Why this is the selected question

The researcher's concern is useful long-term memory during continued learning. Protecting a single trace, reducing a decay term, obtaining a pooled gate pass, or saving/restoring a file cannot establish this joint capability. The candidate must retain older useful associations while acquiring new ones and remain selectively revisable.

The current documents describe damage to an unrelated association after reversal in a development seed. They also explicitly identify multiple explanations: incompatible shared input contributions, loss of stored contrast, and a resting-response readout offset. Shared neurons alone do not identify the cause. The existing direct-input surrogate is neither a proof of full-graph feasibility nor a proof of full-graph incapacity. [Diagnostic specification](../../memory-retention-continuation-2026-11-01/readout-interference-diagnostic.md).

The restart plan leaves the memory rule undecided and requires separate approval before chess training. This proposal supports that prerequisite; it does not replace the broader reasoning/transfer objective. [Approved restart plan](../../../../documentation/design/research-goals/restart-plan-2026-10-30.md).

## Candidate questions considered and FINER assessment

Scores are 1–5, with higher scores preferred. The novelty column is deliberately provisional at 2 for every question because no fresh literature investigation has occurred. Novelty cannot be inferred from an unfamiliar implementation or a lack of a solution in this repository.

| Candidate | Feasible | Interesting | Novel, provisional | Ethical | Relevant | Mean | Disposition |
|---|---:|---:|---:|---:|---:|---:|---|
| A. Can a justified local synaptic mechanism jointly support sequential acquisition, delayed retention, resistance to interfering learning, and selective reversal? | 4 | 5 | 2 | 5 | 5 | 4.2 | Selected research scope; requires source/mapping and measurement gates before implementation. |
| B. Does measuring the current resting response recover the apparently lost association without changing memory? | 5 | 4 | 2 | 5 | 4 | 4.0 | Immediate diagnostic prerequisite; too narrow to establish long-term memory by itself. |
| C. Can an Orb2-inspired local stabilization mechanism supply the required retention and reversal? | 2 | 4 | 2 | 5 | 5 | 3.6 | Candidate lead for investigation, not selected mechanism; compartment, coupling, kinetics and reversibility are unresolved. |

For A, feasibility is conditional on a bounded assay and a defensible biological mapping, rather than a promise that a successful mechanism exists. Interest and relevance follow the documented project failure and researcher-defined goal. The ethical score describes a computational-only study with no new human or animal subjects; provenance, honest claims, and permitted data use remain requirements. B is operationally tractable because a bounded frozen-state diagnostic is already specified. C receives a lower feasibility score because the available molecular lead explicitly lacks a validated adaptation to the present visual receiver. [Molecular lead and coverage limits](../../memory-retention-continuation-2026-11-01/molecular-stabilization-lead.md).

## Scope boundaries

**Domain:** computational associative memory under the FlyChess biological and engineering constraints; eventual chess learning remains a later application.

**Population:** a pinned, from-scratch Drosophila-connectome-constrained simulator and predeclared non-chess visual association sets; no living flies, people, or pretrained chess models. The released graph identities, sparse topology, and fast-edge sign conventions remain fixed. Candidate lasting adaptation belongs to explicitly declared local synaptic/physiological state.

**Timeframe:** prospectively chosen modeled delays and exposure schedules within a bounded assay, followed by independently restored retrieval. Model time, presentation count, and wall-clock execution must be reported separately. Until a justified clock mapping exists, the result is computational persistence across the declared delays, not biological hours, days, or lifelong memory.

**Geography:** not applicable to this simulation; no geographical population inference is intended. Execution is on the researcher's laptop under the repository's resource limits.

**In scope:**

1. Determine whether apparent forgetting reflects storage loss, a reader offset, or an unresolved interaction between representation and memory.
2. Compare a small prospectively selected set of biologically motivated mechanism classes only after verifying source applicability, accessible memory state, local teaching pathway, and selective updating.
3. Test new association acquisition, retrieval without reminder feedback, quiet/distractor/intervening-learning retention, selective reversal, and preservation of unaffected associations jointly.
4. Use informative, absent, matched-shuffled and disabled-plasticity conditions at matched exposure/timing, supplemented by candidate-specific causal ablations.
5. Preserve per-item and per-seed results, fixed development/validation/final families, exact persistence/replay evidence, and all failures.

**Out of scope:**

1. Unlimited memory capacity, indefinite retention, and guarantees against every possible interference pattern.
2. Chess reasoning, Elo, human comparison, or living-fly cognition claims from these associative-memory assays.
3. Answer-fitted encoders/readouts, teacher-calculated parameter deltas, imported weights, or an external table identifying which synapses to protect for each task.
4. New topology, invented reward mappings, unsupported transmitter/sign changes, or use of artificial task/phase identifiers to prevent interference.
5. Authorizing experiments, modifying frozen protocols, or changing sealed tests through this proposal.

## Sub-questions

1. **Measurement and representation:** At fixed stored state and fixed input, how much of the apparent loss is attributable to the declared reader/baseline, and which interference hypotheses remain after that comparison? Analyze input and synaptic overlap as measured predictors; do not assume either is the cause or provide overlap labels to the learner.
2. **Mechanism and causal persistence:** Which source-supported local physiological mechanism, if any, can preserve association-specific effects through modeled delay and continued learning while the informative condition outperforms matched controls and relevant mechanism ablations?
3. **Selective revision and limits:** Can changed verified feedback update the affected association while preserving unrelated associations, and how does the joint outcome vary across predeclared association counts, input-overlap strata and independent seeds/families?

### Explicit inherited scope bindings

| Sub-question | Domain | Population | Timeframe | Geography | Deviations |
|---|---|---|---|---|---|
| 1 | Same computational associative-memory scope | Same pinned simulator and declared non-chess associations | Same fixed assay schedule; frozen-state observations as a prerequisite | Not applicable; laptop execution | None |
| 2 | Same computational associative-memory scope | Same pinned simulator and declared non-chess associations | Same prospectively chosen modeled delays and exposures | Not applicable; laptop execution | None |
| 3 | Same computational associative-memory scope | Same pinned simulator and declared non-chess associations | Same prospective schedule, with separately fixed reversal and interference blocks | Not applicable; laptop execution | None |

## Assumptions and unresolved decisions

- The inputs and permitted readout must distinguish the requested associations under the allowed efficacy bounds. A storage change cannot be presumed to rescue information that the allowed input/reader discards. Existing surrogate checks apply only to their declared approximation.
- Overlapping neurons may participate in several distinct synaptic patterns. The observed behavioral failure does not demonstrate that all such sharing necessarily overwrites a memory. Conversely, local stabilization alone is not evidence that conflicting updates are safely separated.
- A fast and a slow state, or a protected molecular state, is only a candidate mechanism. Evidence must specify where it lives, how local activity and verified feedback control it, and how it remains revisable.
- Quiet retention and resistance to continued learning are separate outcomes. Both must be measured, together with successful new learning; suppressing all updating would fail the joint question.
- A finite assay can establish persistence and interference resistance only within its declared load, inputs, delays and seeds. Capacity curves and failure boundaries remain part of the result.

## What would count as an answer

An affirmative result requires the informative candidate to satisfy prospectively frozen per-criterion acquisition, delay, interference, unaffected-item retention and selective-reversal requirements, with independent replay and replication on untouched validation/final material under the registered selection contract. Report the worst affected associations alongside distributional estimates so an aggregate improvement cannot conceal destructive forgetting.

A negative or unresolved answer is also informative: an unsupported biological crosswalk, incompatible representation/reader, inability to learn new items, failure of selective reversal, uncalibrated time, or loss of unrelated memories rejects or limits the candidate. No numerical pass thresholds or sample-size claims are created retrospectively here.

## Phase boundary and handoff

This is a scoping deliverable. Researcher confirmation of the question/scope is required before the deep-research Phase 2 literature investigation. The next phase should seek both supportive and contradictory primary evidence for representation separation, local credit assignment, consolidation/stabilization, active forgetting and revisable multi-timescale storage. It must not assume the existing Orb2 lead is the answer. No experimental launch follows from scope confirmation.

AI disclosure: this brief was drafted by a Codex subagent from the named project documents. No new source retrieval, biological experiment, graph propagation, training, or external AI service was used for this brief.
