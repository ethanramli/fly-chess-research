---
name: problem-solving
description: Solve scoped tasks, diagnose failures, compare approaches, and unblock difficult projects. Use light, medium, heavy, or deep-in-thought effort in solo or group mode. Route automatically when the user leaves the choice open.
---

# Problem Solving

Move the user's goal forward with the smallest amount of work that can resolve the important uncertainty. Use [Ponytail](../ponytail/SKILL.md) for implementation scope, [Deep Research](../deep-research/SKILL.md) for evidence gathering, and [Please No More Slop](../please-no-more-slop/SKILL.md) to communicate findings and verification. Use the [playbook](playbook.md) for reviewer prompts, examples, and research behind the design.

## Route the task

| Level | Use it when | Default mode |
| --- | --- | --- |
| **Light** | The task needs structured, practical thinking focused on action and scope. Step back and ask whether the current action, feature, or optimization actually helps the overall goal. Use Ponytail to stop scope creep. | Solo |
| **Medium** | The task needs a deliberate approach and sequential thinking within a defined scope. Choose how to tackle it, reflect on your own work as you go, and adjust the approach when the results call for it. | Solo |
| **Heavy** | A harder problem has several plausible causes, designs, or solutions. Diagnose it, research the relevant evidence, propose a solution, and have two independent models with different points of view find flaws. Iterate on the proposal. Use this for most hard problems. | Group |
| **deep-in-thought** | Reserve this for the hardest, make-or-break problems, such as a roadblock that prevents the project from advancing. Evaluate the diagnosis, question why, what, and how from first principles, and identify what is unknown. Deep-research and evaluate the evidence, form hypotheses, propose a test, and iterate with three independent models applying peer-review, scientific, and foundational skepticism. Work toward a concrete plan that can produce new scientific evidence. | Group |

Apply Light's focus and scope check at every level.

Honor an explicit level or mode. Otherwise choose the lowest level that addresses the stakes, uncertainty, reversibility, and cost of error. Escalate when a check exposes a consequential unknown or invalidates the plan. Step down once the critical uncertainty is resolved. Treat these as workflow choices and use runtime reasoning settings only when the host supports them and the request authorizes them.

## Light — stay focused

1. State the user's goal, the boundary of the task, and the observable result that means it is done.
2. Before a meaningful action, ask what it contributes to the goal. Drop tangents and optimizations that change no required outcome or decision.
3. Take the smallest useful action within scope. Check the result. If the task changes, recheck the goal before continuing.

## Medium — choose an approach and reflect

**Understand the goal.** Translate the request into a concrete deliverable and a check the user would recognize as success. Name any constraint or assumption that could change the approach.

1. Choose an approach that fits the problem. For example, trace a failure from input to output, work backward through dependencies, or solve a smaller case before generalizing. State why that approach fits.
2. Carry it out in a sensible order. At a checkpoint, ask what you expected, what actually happened, and which assumption the result strengthens or weakens.
3. Use that reflection to keep, revise, or replace the approach. Verify the result against the original task. Check whether the chosen approach left a meaningful part unaddressed.

## Heavy — diagnose, research, propose, critique, iterate

**Understand the goal.** Identify the decision this work must support. Define what each viable option must achieve, which tradeoffs the user cares about, and what evidence would change the choice. Resolve material ambiguity about those priorities before ranking options.

1. **Diagnose.** Identify plausible causes or designs, the current baseline, and the evidence that would distinguish them.
2. **Research.** Use Deep Research to check claims that could change the choice. Verify the relevant sources and compare alternatives under matching conditions where possible.
3. **Propose.** State the recommended action, its assumptions, what it should achieve, and how to check it. Name the strongest reason it could fail.
4. **Critique.** In Group mode, use two independent reviewer models. Choose two of the three [reviewer roles](playbook.md#review-the-proposal) based on the proposal's biggest risks. The scientific skeptic and peer reviewer are a useful default. Choose the foundational skeptic when the premise or measurement is in doubt.
5. **Iterate.** Resolve material objections with evidence. Return to the earliest step an objection invalidates, revise the proposal, and recheck the changed claims. Finish when the proposal meets the goal and remaining uncertainty is explicit.

## deep-in-thought — investigate from first principles

Use this when the diagnosis, the question, or the evidence needed to make progress may itself be wrong. The goal is to produce a defensible new result when the available evidence and authorization allow it.

**Understand the goal.** Trace the immediate request back to the larger project aim. Separate that aim from the current hypothesis, method, and metric. State what the project actually needs to learn, what evidence would count as progress, and which constraints must hold. Revisit the framing if the diagnosis or critique exposes a mismatch. Preserve the user's goal unless they authorize a change.

1. **Diagnose.** Reconstruct the observation from original evidence and trace the project blocker. Write the best current explanation and credible alternatives.
2. **Evaluate the diagnosis.** Check whether the measurement can detect the effect, whether the observation supports the diagnosis, and whether a rival explanation fits the same evidence. Separate established results from interpretations.
3. **Question the first principles.** Ask **why** the proposed mechanism should work, **what** is actually being measured or assumed, and **how** the result could arise. Work from definitions, causal constraints, or necessary conditions. Question inherited assumptions and problem framing while preserving the user's goal and hard constraints.
4. **Identify the unknown.** Name the unanswered question whose resolution would most change the project. Specify what evidence would resolve it and the scope it would cover.
5. **Deep-research.** Trace the literature to original evidence. Seek conflicting results, known limits, existing answers, and useful methods from adjacent work.
6. **Evaluate the evidence.** Check methods, assumptions, independence, and applicability. Decide what the evidence settles and what remains genuinely open. If the unknown changes, revisit steps 3 and 4.
7. **Form hypotheses.** State the leading explanation and credible rivals. Derive distinct predictions and what would count against each. If the claim is mathematical, give the assumptions and look for a proof, bound, or counterexample.
8. **Propose a decisive investigation.** Choose a test or derivation whose outcome would change the conclusion. Specify comparison, controls, measurement, success criteria, and branches for a negative or inconclusive result. Separate hypotheses generated from existing data from checks that can test them prospectively.
9. **Critique.** In Group mode, use three independent reviewer models with distinct briefs: **peer-review skepticism** about claims and reproducibility, **scientific skepticism** about inference and the proposed test, and **foundational skepticism** about premises, definitions, and framing. Require each to try to break the proposal and show how to check the objection. Use the [review prompts](playbook.md#review-the-proposal).
10. **Iterate.** Follow objections to evidence and return to the earliest step they invalidate. Run the checks already authorized, including within an active goal or explicit freedom to proceed. Update the hypothesis or proposal from results. End with a concrete, critiqued plan when execution is outside scope or blocked. Report any verified new finding at the scope the evidence supports, with its basis and unresolved limits.

## Solo and group

- **Solo.** Perform the steps yourself. Make separate critique passes using the level's reviewer briefs. Label them as your own review.
- **Group.** Use independent model sessions when delegation is authorized. Heavy uses two reviewers and deep-in-thought uses three. Use distinct available models where the host supports selection. Give each the relevant evidence and their own brief. Collect first reviews independently before sharing conclusions between reviewers. If the host limits model choice or delegation, use the closest available review setup and state what was available. Judge objections on evidence and retain unresolved dissent.

## Report the result

For Light and Medium, lead with the result and the check that supports it. For Medium, give the approach and any reflection that changed it. For Heavy and deep-in-thought, also show the assumptions that mattered, the serious alternatives, what critique changed, and the remaining decision or next test. Give a concise rationale grounded in evidence the reader can inspect. Distinguish a plan, a completed action, and a verified outcome.
