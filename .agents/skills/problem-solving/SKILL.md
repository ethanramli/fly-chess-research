---
name: problem-solving
description: >-
  Diagnose an unexpected result, reconcile conflicting evidence, choose between
  plausible approaches, or unblock a hard problem. Use when the user asks for
  Problem Solving, an effort level (Light, Medium, Heavy, or deep-in-thought),
  or a check that requires judgment about evidence or what to do next. Skip
  direct translation, formatting, copying, and routine edits with a settled
  procedure unless the user asks for diagnosis or an explicit effort level.
---

# Problem Solving

Identify the deliverable or decision, the constraints on the work, and the observation that would let you stop. On a follow-up, start from the open objections and changed evidence. Reuse earlier checks whose inputs, path, and claim still match.

| Level | Choose when | Default mode |
| --- | --- | --- |
| Light | One authoritative record or small check can settle a bounded question. | Solo |
| Medium | A defined problem needs a trace, derivation, or controlled replay. | Solo |
| Heavy | Several plausible causes or approaches could change an important decision. | Group |
| deep-in-thought | The project is blocked and the premise, measurement, or design may be wrong. | Group |

Honor explicit levels and modes. Otherwise choose the lowest sufficient level. Escalate when a check exposes uncertainty that could change the decision. Step down once it is resolved. An effort level sets the workflow. Use runtime reasoning settings only when supported and authorized.

## Light

Use the smallest authoritative input that can settle the request. For a factual correction, read the text to correct and the designated source. Open older or secondary material only if the primary record is missing, ambiguous, or in conflict. Check the result and return it in the requested format.

## Medium

Trace the real path from input to output, work backward from the failure, or solve a smaller case. Choose the approach that can locate the first wrong result. Compare expected with observed behavior at the relevant boundary. Use a control that bypasses the suspected step when two components could produce the symptom.

Verify through the normal entry point with a failing example and any adjacent behavior the fix must preserve. Before running a read-only replay, check for writes by imports and by the entry point itself. For Python imports use `python -B`; keep any required outputs in memory. Give the smallest supported fix or result and name any check still blocked.

## Heavy

1. Name the decision, live alternatives, baseline, and evidence that would change the choice. Start with primary evidence already in scope. Distinguish the observed representation from the outcome it summarizes. For example, a change in scores need not change their ordering, and a changed ordering need not change the top choice. If evidence is missing, retain alternatives consistent with the observations and identify the missing record or smallest discriminating check.
2. Write a concrete proposal. Include the action or claim, decisive assumptions, expected result, and a check whose possible outcomes lead to different decisions. Keep planned work within the user's scope and authority.
3. Run the review loop with two distinct critique briefs.

## deep-in-thought

Use Heavy's diagnosis and review loop with three distinct critique briefs. Before review, reconstruct the observation from the original evidence. For a numerical claim that drives the decision, show or compute the comparison from the raw values. Check the boundary rows against the written rule, including units and any rounding. Trace the immediate decision back to what the project needs to learn. Try a counterexample that passes the current test without doing what the user cares about. State the strongest remaining hypothesis, a credible rival, and predictions that distinguish them.

For a prospective evaluation, specify the unit, eligibility, denominator, measurement and horizon before seeing outcomes. Account for every eligible unit, including early exits, abstentions and missing evidence. Tie each disposition to the endpoint. For a successful-action endpoint, an observed decision to take no action fails the endpoint. A missing action record or a recorded action with unknown validity stays unknown. Give a bound, coverage requirement, or explicit inconclusive branch when unknowns could change the decision. For a causal claim, specify the matched intervention and control, hold competing drivers fixed, and state what result would change the decision. Treat a comparison of existing snapshots as descriptive unless the design identifies the claimed cause. For proofs or design decisions, use the corresponding assumptions, counterexamples and failure branches.

## Run the review loop

1. Pin one version of the proposal. Assign each pass a **different decision-critical assumption**, an evidence locator, and a check that could overturn it. Give every reviewer the same proposal, goal, constraints, and relevant raw evidence. Choose the assumptions to suit the proposal. The [playbook](playbook.md#review-the-proposal) has briefs for reproducibility, rival explanations, and the premise or measure.
2. **Group:** use independent sessions when authorized and available. Read their first findings before sharing conclusions. **Solo:** perform the same distinct checks yourself. If Group or the playbook is unavailable, run the applicable checks yourself and disclose any material loss of independence or coverage.
3. For each assigned check, record the assumption, evidence or missing check, and disposition: confirmed for the tested scope, changed with the resulting revision, or open with the next check. If reviews repeat one objection, run or request the uncovered check. Judge objections on evidence and retain unresolved dissent.
4. Return to the earliest invalidated step, update the affected proposal, and recheck the changed part against the objection and any newly affected assumption before reporting. In Group, return the changed part to the relevant reviewer when available. Carry forward checks that still apply. A clean first round can finish when the decisive assumptions have been tested. If a material objection cannot be resolved within scope, narrow the claim or give a conditional decision and the smallest authorized next step or missing prerequisite.

## Companion skills and reporting

Open a companion only when it answers a live question. Use [Ponytail](../ponytail/SKILL.md) for implementation choices, [Deep Research](../deep-research/SKILL.md) when permitted external evidence could change a decision, and [Science Review](../science-review/SKILL.md#decide-when-to-review) when one of its research review triggers applies. Use [Please No More Slop](../please-no-more-slop/SKILL.md) for substantive naming or writing decisions.

Lead with the requested result. Give the check and the evidence behind consequential conclusions. For Heavy and deep-in-thought, show what changed after review, what remains open, and what would permit the next decision. Keep the record as short as the task allows.
