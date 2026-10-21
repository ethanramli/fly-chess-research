# 2026-10-18: Durable curriculum reasoning goal prompt

## Researcher request

Prepare a /goal prompt for one long-running chat, intended for Luna at low effort to reduce cost. Researcher wants autonomous curriculum continuation, preserved progress, diagnosis/repair of regressions and an objective that survives repeated compactions. The near-term scientific target is the smallest reliable unfamiliar-position transfer, not 2000 Elo or completion of all twelve stages. Researcher reports no new experiments/advice and email sent recently; mentor response is pending.

## Prepared contract and boundaries

Added the [goal contract](../../../documentation/handoffs/curriculum-reasoning-goal.md), [compact mutable state](../../../documentation/handoffs/curriculum-reasoning-state.md), and conditional AGENTS navigation. This prepares a goal; no goal tool was activated, model changed, process inspected, graph launched or checkpoint resumed. Use explicit initial process/artifact reconciliation because the most recent run observation is historical.

The loop handles live, unknown, interrupted, unaudited, passing, failing, regressed and missing-capability states. Existing G0 prerequisites and per-stage D1-D8 remain authoritative. Full-graph runs remain serial, bounded, feedback-enabled and frozen. Failure prompts a new discriminating hypothesis; repeated uninformative runs trigger diagnosis rather than an automatic dose sweep. Final failures terminate that confirmatory campaign; fresh tests cannot be mined until success. Accepted snapshots and all failed candidates remain immutable.

## Mistakes, limitations and correction

- A literal "mindless" continue/tweak loop would risk changing gates, overfitting final tests and burning compute without information. This is a proposed workflow correction, not an assertion that a prior run committed those errors. Replace it with explicit state transitions, fixed finish criteria and a justified-next-experiment check.
- Current curriculum package is design-complete, graphLaunchAuthorized=false, and missing integrations remain. Do not misdescribe the prompt as making the full curriculum executable. Preparing validated stage runners/proofs/auditors is authorized future work once the goal is activated.
- Initial combined reads truncated and the OpenAI Docs search occurred after a combined repository read, contrary to that skill's requested docs-first order. Follow-up fetched the official Goals/Luna/compaction pages and targeted curriculum passages before drafting. A requested prompting-guide Markdown URL failed; the canonical HTML redirect was accessible and local guidance was available. None of these fetch/read issues is scientific evidence.
- Official Goals documentation describes persisted thread state and continuation within lifecycle/budget limits. A prompt cannot guarantee weeks of uptime, cost savings, or 1,000 successful compactions. File-backed recovery is an engineering design, not a tested reliability result. Luna low has not been validated as an autonomous scientific investigator here.
- Treat irreversible/public actions, paid compute and actual permission limits separately from routine local research. No budget is invented. Preserve the explicit no-research interval October2027-May2028. No competition or eLife submission is added to this goal's completion gates.

## Verification and next step

Documentation-only: inspect files, launch wording, lifecycle constraints, local links and the fixed transfer gate contract. No simulation tests warranted. Goal state starts PREPARED, with current process/checkpoint hashes UNVERIFIED; this is intentional rather than fabricated live state. Next action belongs to the user: select Luna low and explicitly activate the provided /goal command when ready. Activation authorizes routine local bounded work under the contract; the first action is process/pin/checkpoint reconciliation.
