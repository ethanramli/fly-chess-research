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

## Light — filter actions by the goal

Start with an obvious next action. Keep the goal, constraints, and definition of done in view.

1. Name the deliverable and what will show it is complete.
2. Ask what the proposed action will change for the user. If it serves no requirement or decision, drop it and pick the smallest action that does.
3. Do the action within scope. Check the observable result and say what the check established.

## Medium — trace the known path

Start with a defined target and a path that can be followed. Use Light's scope check at consequential steps.

1. Write the expected result and the observed result, or the current state and the target state for new work.
2. Trace the actual path from input to output. For a failure, reproduce the smallest case and check intermediate outputs until you find the first consequential difference. For new work, work backward from the target to the prerequisites, then execute them in dependency order.
3. Resolve the first failing step or missing prerequisite at its source. Keep the surrounding behavior stable and rerun the original case through the normal entry point.
4. Escalate to Heavy if the path admits materially different explanations or approaches that tracing alone cannot distinguish.

## Heavy — compare rivals and try to rule them out

Start with a stable goal and more than one live explanation or design.

1. Specify the success criteria and constraints. Identify the serious rivals, including the baseline where useful. For a diagnosis, write what each cause predicts. For a design, write what each option must accomplish and where it could fail.
2. Use Deep Research for material evidence gaps. Select a check whose possible outcomes distinguish the rivals. Compare on matching inputs, conditions, and measures where relevant. If the evidence is inconclusive, keep the relevant rivals open.
3. Propose a choice with the evidence for it and the strongest objection to it. In Group mode, give reviewers distinct questions and let them form their first assessments before seeing your preferred choice when practical. In Solo mode, challenge the evidence and the implementation in separate passes.
4. Resolve decisive objections with a source, test, proof, or counterexample. Revise the proposal or change the choice. Report the deciding evidence and any tradeoff or unresolved uncertainty that could reverse it.

## Deep-in-thought — find a problem you can actually solve

Start with the original goal and a blocker whose current framing or evidence may be hiding the way forward.

1. **Work backward from success.** Write what would have to be true for the original goal to advance. Trace its dependencies to the earliest unresolved prerequisite. Separate requirements from assumptions about how to satisfy them.
2. **Find a better way to represent the blocker.** Keep the original framing available. Try another useful view, such as a causal diagram, a minimal case, a quantity that stays unchanged, or a split into independently testable questions. Keep a new framing only if it preserves the goal and exposes a check or solution the original framing obscures. If the original framing already does this, use it.
3. **Prove or test the narrowest useful claim.** Use Deep Research on material evidence gaps. Find the smallest example, counterexample, bound, or controlled test that resolves the prerequisite. State the expected outcomes and what each would imply. Check that solving the small case would change the original decision, and identify what still needs to be shown at full scope.
4. **Attack the framing and the plan.** In Group mode, have independent reviewers propose or challenge the framing, evidence, and execution plan. In Solo mode, revisit the strongest assumption from an outsider's perspective and check it against evidence. If a challenge breaks the framing, return to step 1 or 2. If it breaks a test, redesign that test.
5. **Hand off a concrete plan.** Name the first action, its prerequisites, the result that permits progress, and the next action for success, failure, or ambiguity. Run useful checks already authorized. When an active goal or explicit freedom authorizes further work, follow through within its scope and approval boundaries. Finish when the plan is actionable and its decisive risks have checks, or a specific missing fact, access restriction, or approval blocks progress. State what would resolve the blocker.

## Solo and group

- **Solo.** Solve directly. At a consequential choice, independently reconstruct a small example, check a primary source, seek a counterexample, or try to disprove the leading explanation. Keep work proportional to what is at stake.
- **Group.** Use available subagents when authorized. Assign distinct questions and provide the minimum evidence each needs. Ask for an objection, its consequence, and the cheapest way to verify it. Resolve disagreement with evidence. Record material dissent. If delegation is unavailable or disallowed, make separate review passes yourself and disclose the limitation when it matters.

## Report the result

For Light and Medium, lead with the result and the check that supports it. For Heavy and Deep-in-thought, also show the assumptions that mattered, the serious alternatives, what critique changed, and the remaining decision or next test. Give a concise rationale grounded in evidence the reader can inspect. Distinguish a plan, a completed action, and a verified outcome.
