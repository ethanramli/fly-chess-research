---
name: problem-solving
description: Solve scoped tasks, diagnose failures, compare approaches, and unblock difficult projects. Use light, medium, heavy, or deep-in-thought effort in solo or group mode. Route automatically when the user leaves the choice open.
---

# Problem Solving

Move the user's goal forward with the smallest amount of work that can resolve the important uncertainty. Use [Ponytail](../ponytail/SKILL.md) for implementation scope, [Deep Research](../deep-research/SKILL.md) for evidence gathering, and [Please No More Slop](../please-no-more-slop/SKILL.md) to communicate findings and verification. Use the [playbook](playbook.md) for reviewer prompts, examples, and research behind the design.

## Route the task

| Level | Use it when | Default mode |
| --- | --- | --- |
| **Light** | The next action is clear and the main risk is drifting from the goal. | Solo |
| **Medium** | The goal is clear, but diagnosis or execution needs several dependent steps. | Solo |
| **Heavy** | Multiple plausible causes or designs could change the result, or a wrong choice would cause substantial rework. | Group |
| **Deep-in-thought** | A project-critical roadblock threatens the goal and the problem framing, evidence, or solution remains materially uncertain. | Group |

Honor an explicit level or mode. Otherwise choose the lowest level that addresses the stakes, uncertainty, reversibility, and cost of error. Escalate when a check exposes a consequential unknown or invalidates the plan. Step down once the critical uncertainty is resolved. Treat these as workflow choices and use runtime reasoning settings only when the host supports them and the request authorizes them.

## Light — keep the goal in view

1. State the desired outcome, the relevant constraints, and what would show the task is done.
2. Before a meaningful step, ask what it advances or what decision its result could change. Set aside work that serves neither.
3. Take the smallest authorized useful action. Check its result against the outcome and explain what the check established.

## Medium — make the problem tractable

Run the Light checks throughout.

1. Restate the problem in terms you can observe. Identify what you know, what you assume, and which unknown could change the next move.
2. Break the work into dependent steps. Trace the actual behavior, reproduce the problem, derive a small case, or inspect the relevant source. Start with the step that can settle the most important unknown cheaply.
3. Pick a path that fits the evidence. Check the assumption most likely to break it and decide what result would make you change course.
4. Execute within scope and verify through the normal entry point or against the original criteria. Revise if the check fails. Escalate if the diagnosis remains ambiguous and the ambiguity matters.

## Heavy — diagnose, compare, and challenge

1. Define success and constraints. Identify the main plausible causes or approaches, including the current baseline when useful. Write what each predicts or what would make it fail.
2. Read existing evidence and use Deep Research for outside claims that could change the design. Choose a check that distinguishes between the leading possibilities. Draft a proposal with its assumptions, tradeoffs, and verification.
3. In group mode, ask reviewers to work independently on different risks. Give them the task and evidence before showing the preferred answer when practical. In solo mode, check the risks in separate passes. Reconcile the findings with the proposal. Follow decisive objections to a source, test, proof, or counterexample.
4. Revise and recheck the affected claims. Record unresolved disagreements and why they matter. Deliver the decision or carry out the authorized work, with verification matched to the consequence.

## Deep-in-thought — unblock the project

Start with the Heavy workflow and apply Deep Research to material evidence gaps.

1. Map the bottleneck. Trace which dependency blocks the goal, distinguish symptoms from prerequisites, and name the smallest outcome that unlocks progress. Check whether reframing or bypassing the obstacle would still satisfy the goal.
2. Develop competing explanations or designs. For each, record the assumptions, predicted observations, the observation that would overturn it, and the cheapest decisive test. Start with the check that would most change the decision. When no single check can settle it, choose checks whose evidence can accumulate.
3. Review the framing, evidence, and execution plan using the selected mode. In group mode, seek independent criticism of each material risk. Revisit your strongest assumption from an outsider's perspective. Compare the critics' reasoning to the evidence and rerun only the parts affected by a substantive objection.
4. Produce a concrete plan with the first action, prerequisites, success and failure criteria, and what to do under each result. Identify any remaining decision that needs the user. Run useful checks already authorized. When an active goal or explicit freedom authorizes further work, follow through within its scope and approval boundaries.
5. Finish when the plan can be acted on and its decisive risks have a check, or when a specific missing fact, access restriction, or approval blocks further progress. State what would resolve the blocker. Continue checking while another feasible step could materially change the plan.

## Solo and group

- **Solo.** Solve directly. At a consequential choice, independently reconstruct a small example, check a primary source, seek a counterexample, or try to disprove the leading explanation. Keep work proportional to what is at stake.
- **Group.** Use available subagents when authorized. Assign distinct questions and provide the minimum evidence each needs. Ask for an objection, its consequence, and the cheapest way to verify it. Resolve disagreement with evidence. Record material dissent. If delegation is unavailable or disallowed, make separate review passes yourself and disclose the limitation when it matters.

## Report the result

For Light and Medium, lead with the result and the check that supports it. For Heavy and Deep-in-thought, also show the assumptions that mattered, the serious alternatives, what critique changed, and the remaining decision or next test. Give a concise rationale grounded in evidence the reader can inspect. Distinguish a plan, a completed action, and a verified outcome.
