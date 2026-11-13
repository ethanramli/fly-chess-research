---
name: build-skills
description: Build or improve a reusable repository skill. Use for requests to create a skill, turn a recurring workflow into instructions, fix a skill that misfires, or reproduce the design and tests for an existing skill.
---

# Build skills

Follow this protocol from the user's request through a verified change. Each step produces an input the next step can use. Follow [Ponytail](../ponytail/SKILL.md) for scope and [Please No More Slop](../please-no-more-slop/SKILL.md) for wording.

## 1. Define the behavior

Read the relevant repository instructions, the nearest skills, and a real task the skill should handle. For a revision, inspect what the existing skill actually did and find the first decision or action that went wrong. For a new skill, find how the task is done today.

Write a brief with:

- **Goal and user:** Who uses the skill, what recurring job it does, and why the current workflow falls short.
- **Use and skip:** A realistic request that should trigger it and a similar one that should go elsewhere.
- **Inputs and authority:** What evidence, tools, permissions, and user decisions it needs. Define what to do when any of those are missing.
- **Output and done:** What the user receives, what observable behavior earns a pass, and when to stop or return a blocker.

Ask the user about decisions that materially change the brief. Ask the questions they requested and use their answers. Record reversible defaults when the request leaves choices open. Move on when you can write a case someone else can judge.

## 2. Design the workflow

Decide whether the behavior belongs in an existing skill or needs its own entry point. Identify who owns shared steps and which existing skills to call. Use [Problem Solving](../problem-solving/SKILL.md) at the requested level. For a consequential design with competing approaches, use Heavy and follow its critique and revision loop. Use [Deep Research](../deep-research/SKILL.md) when a source, field standard, or tool behavior could change the design. Record the exact source and decision it affected.

Work through the normal case and the closest failure case before writing. Identify which decisions the agent must make, in what order, and what evidence each decision needs. Specify a next action for a failed check, a missing prerequisite, and a material revision. Use repository skills of comparable complexity as the quality bar. Check that another agent can tell when to load this skill, which related skill owns the next step, and what counts as done.

## 3. Prepare the tests

Write the user prompts, input artifacts, expected behavior, and pass conditions before drafting the candidate. For a substantial build or change, cover:

| Case | What the test must show |
| --- | --- |
| Normal request | The skill runs through its usual entry point and delivers what the user asked for. |
| Near miss | A similar request routes elsewhere without unnecessary work or side effects. |
| Failure or boundary | The workflow handles a realistic problem, such as missing evidence, a failed check, or a material change after review. |
| Fresh case | The behavior works on a case that was kept out of drafting and tuning. |

Pin the current skill or workflow as the baseline when claiming an improvement. Record the candidate revision, shared inputs, available tools, model and settings when exposed, budget, and scoring rules. Match conditions across versions. Keep the expected outcomes with the evaluator. For a narrow edit, test the affected behavior and one adjacent behavior it could break.

## 4. Write and connect the skill

Write `.agents/skills/<name>/SKILL.md` using the repository's conventions. Give it a lowercase name and a description with concrete triggers. Write the essential steps in action order, with the inputs, decisions, outputs, and return paths defined above. Link supporting material at the step that needs it. Keep detailed rubrics, reference data, or reusable examples in linked files. Put project history in its owning record. Add a script only if it removes recurring work or makes a check deterministic.

Wire the skill into its normal caller or repository instructions where needed. Check its header, paths, links, and routing against adjacent skills. Check scripts or other executable resources using their actual entry point.

## 5. Run, revise, and rerun

Run the cases in fresh contexts with only the prompt, tools, and artifacts available to a real user. Use [Delegate](../delegate/SKILL.md) for independent passes when authorized. For routing, leave the skill available and use a natural request. An explicit invocation tests the workflow itself. Record which test ran and what it can establish.

Score the observed output or action against the prepared conditions. When a check fails, identify the earliest failed step, revise it, and rerun the failed case and any affected neighboring case. Repeat while a material gap can be fixed within scope. Use the held-out case once the tuned cases pass. If it drives another edit, use a new held-out case to check generalization.

## 6. Release or hand off

Call the skill ready when its intended route works, the output meets the brief, the important failure paths are handled, and the supporting files and links pass. Name any test the environment prevented and qualify claims accordingly. Save a short receipt with the exact revision, inputs or stable links, material choices, checks and outcomes, and open gaps. Use the repository's existing record or pull request. Leave the procedure in the skill so someone can build the next one without this conversation.

When user feedback changes the requirements or exposes a failure, return to the first affected step and make the feedback a regression case if it can recur.
