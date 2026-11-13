---
name: build-skills
description: Build, fix, or reproduce a repository skill and verify it against FlyChess’s skill review rubric. Use for new skills, recurring workflows turned into skills, and changes to skill behavior or routing. Skip requests that only explain an existing skill or use it for its normal job.
---

# Build skills

Use the [skill review rubric](references/skill-review-rubric.md) to design, test, and score the candidate. Aim for **95/100** on new skills and substantial changes. Routine readiness requires at least **90 verified points** and the release checks below. Use [Ponytail](../ponytail/SKILL.md) for scope and [Please No More Slop](../please-no-more-slop/SKILL.md) for wording.

## 1. Define the behavior

Read the relevant repository instructions, nearby skills, and a real task the skill should handle. For a revision, reproduce the reported failure when possible and identify the first decision that went wrong. For a new skill, see how the task is handled today. Decide whether to extend an existing skill or create a new entry point. Assign shared steps to one owner.

Record the user's goal, the skill's exact triggers and closest near miss, authorized inputs and actions, the deliverable, the decision rules, and the checks that show it is done. For each failure branch, specify the verdict or current state to report, the evidence behind it, and the next useful action. Ask only about unresolved decisions that would materially change the build.

Before writing, list the existing inputs and the exact paths the task allows you to create or change. Treat input receipts, prompts, and fixtures as read-only. If no separate handoff file was requested, report in chat. Check the diff or compare the inputs at the end to confirm they stayed intact. Keep the answer key outside the candidate's test context.

## 2. Set the checks before drafting

Map each rubric item to an observable check or a structural inspection. For new skills and substantial changes, prepare the rubric's six cases before drafting. Cover two realistic core tasks, a hard case, a near miss, overlap or repeat use, and a failure case. Include a fresh case that the author cannot tune against. If a hard case doubles as the held-out case, keep its inputs and answer key with the evaluator until the normal cases pass.

Write the prompts, expected outputs or actions, source locators, material failure conditions, and what counts as a useful improvement. Check the expected result against the actual fixture values before running each case. Pin the baseline. For the two core cases use the same model, starting context, inputs, tools and budget with the target skill disabled. Add a hard-case comparison if the core results tie. For revisions, also replay the reported failure against the prior revision when available.

For a narrow edit, rerun the changed behavior, the nearest adjacent behavior, and any newly affected rubric checks. Carry forward earlier scores only where the recorded evidence and its dependencies still apply. Use the full suite when the scope, routing, or dependencies change materially, or when seeking a new readiness verdict without enough prior evidence.

## 3. Write and connect the skill

Write `.agents/skills/<name>/SKILL.md` with concrete trigger boundaries in the description, including a common near miss when routing could be ambiguous. Compare the description with the intended trigger before handoff. When the user supplies an excluded request, put the exclusion in the description itself. Test in-scope and excluded requests against that description. Put the workflow in action order. Give a decision rule at each consequential fork. If a current record conflicts with a stale result, say which current state can be reported, which outcome remains unknown, and what exact record would resolve it. Keep reusable detail in directly linked references. Wire the normal caller or repository instructions only where needed.

Verify the frontmatter and links. Check the candidate entry point by its exact path, including hidden folders. Record separately whether the entry point exists, which dependency is missing, and which check is blocked. A missing dependency does not make a readable candidate absent. Run executable resources through their actual entry points in the allowed environment. Inspect the diff for changes to source evidence or files outside the requested write scope.

## 4. Run, score, and improve

Run each case in a fresh context containing the natural request, relevant artifacts, and tools a real user would have. Use [Delegate](../delegate/SKILL.md) for independent passes when authorized. Test natural routing with the candidate discoverable. Use explicit invocation to test the workflow directly. Record which ran. Keep manual walkthroughs and static checks labeled as such.

For each case, record the exact input locator, expected result, observed result, and verdict. Recheck a result against its source before counting it as passed. If the test runner is unavailable, continue the authorized build, run the checks you can, and leave the missing behavioral checks unverified.

Score the actual output and side effects against every rubric item. Give each deduction its observed cause, evidence locator, user consequence, and smallest fix. Track measurable overhead and whether the candidate materially improves the baseline. Record unknown cost or unavailable checks as unknown. Apply the rubric's caps and reconcile earned, lost, and unverified points.

Fix the earliest decision behind each material failure. Rerun the failed case and affected neighboring cases, then run the held-out case against the stable revision. If a held-out failure causes a material edit, reserve a fresh held-out case. Stop iterating when readiness is demonstrated, or when further improvement requires evidence, tools, or authorization outside the task. If a candidate consistently ties the baseline and adds overhead, reconsider whether it belongs in a separate skill.

## 5. Release or hand off

Call the revision ready for routine use only when the verified score is at least 90/100, no rubric cap applies, and the routing, core deliverables, important failure paths, and dependencies have been checked with no unresolved material failures. Use the score range when checks are unverified and label the verdict provisional. A blocked check can leave a useful draft to hand off with the exact rerun still needed.

Record the pinned revision and baseline, case prompts or stable input links, actual results, verified score, any unverified points, deductions, and remaining work. Use the agreed handoff path or the repository's existing review record. Check that the original evidence is still intact. When feedback exposes a recurring failure, add it to the next regression check.
