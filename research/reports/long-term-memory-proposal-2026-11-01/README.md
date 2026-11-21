# Long-term memory proposal: scoping checkpoint

2026-11-01. The researcher requested deep research plus the academic pipeline and approved proposal-only research, with an estimated budget of 15,000 to 25,000 tokens or 20 to 30 minutes. That approval did not authorize experiment launches or use of external AI providers. The reusable `/goal` prompt below is a draft from that earlier request; it does not grant current permission to start work. The pipeline is awaiting confirmation of the research question and scope.

**Status: Phase 1 scoping.** This is a concrete research design for confirmation, not a verified final mechanism recommendation or an executable experimental protocol. Fresh literature investigation remains behind the skill's question/methodology checkpoint. Existing project evidence was inspected; no new primary-source verification is claimed.

## Proposed direction in plain language

Find a memory mechanism that can learn a new association without destroying an earlier useful one, recall both after a modeled delay and intervening learning, and revise the first when its verified consequence changes while keeping the second useful. Investigate three interacting requirements: inputs that can be distinguished, synaptic changes that target the right association, and storage that lasts but can still be revised. A slowly changing weight or a protected synapse alone does not establish that all three requirements are met.

The starting candidate is the project's existing proposal for **local control of plasticity on verified visual KC-to-MBON synapses**, followed, only if justified, by a source-supported mechanism that stabilizes and can revise stored changes. The most specific local-protection lead in the existing notes is mAChR-B-mediated lateral modulation; APL/local inhibition is a separate lead for distinguishing representations. Orb2-associated stabilization and interacting fast/slow states are storage ideas to evaluate, not mechanisms selected for installation. Their relevance to these visual compartments and their capacity for reversal remain unverified.

This starting point follows the [October 30 recommendation](../../literature/memory-interference-2026-10-30/recommendation-and-test-plan.md); the project already had candidate ideas. The current local-gated and reservoir families implement some forms of eligibility or hidden state, and their failures are preserved. Renaming those mechanisms would not make them new proposals.

## Materials

- [Research question brief](phase1-scoping/research-question-brief.md): candidate questions, FINER assessment and scope.
- [Methodology blueprint](phase1-scoping/methodology-blueprint.md): causal design, selection rules, measurements and rejection conditions.
- [Reusable `/goal` prompt](goal-prompt.md): bounded authorization, focus and completion criteria for the research/experiment agent.
- [Critical scoping review](phase1-scoping/critical-review.md): REVISE for a checkpoint-selection ambiguity, corrected in the blueprint; [lead response](phase1-scoping/review-resolution.md) preserves the original verdict and explains the repair.
- [Interpretation correction](../../journal/experiments/2026-11-01-memory-proposal-interpretation-correction.md): earlier conversational overclaims and their correction.

## What the next research phase must deliver

A primary-source evidence matrix with exact read coverage; a released-cell/receptor/compartment crosswalk; a comparison of the local-modulation, representation and stabilization candidates; one recommended mechanism or an explicit no-go; supported equations separated from introduced approximations; a bounded preregistration-ready test proposal with resources, controls and rejection rules. Numerical rates or a biological clock must not be invented to fill source gaps.

The scope is a computational prerequisite for later consequence-sensitive chess transfer. A memory assay does not establish reasoning, and model-time persistence does not establish hours or days of memory in a fly.

AI assistance: Codex inspected repository evidence and drafted the scoping design; a native same-provider agent prepared the question brief and a separate native reviewer is used for the scoping challenge. These are separate review roles, not a claim of independent error processes. No manuscript was sent to an external AI provider.
