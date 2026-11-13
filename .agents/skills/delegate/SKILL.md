---
name: delegate
description: Design precise assignments for subagents, decide when to split work, and coordinate and verify their results. Use when asked to delegate, scope worker prompts, run parallel agents, or reduce the context and cost of multi-agent work. Skip direct work with no delegation decision.
---

# Delegate

The lead owns the user's goal, task boundaries, shared decisions, and final result. Give each worker one question or change it can finish with the evidence and authority in its prompt. The worker owns the local method within that scope.

## Decide what to delegate

1. **Define done.** Turn the request into observable acceptance checks. Preserve the user's priorities, repository rules, and any limits on reads, writes, tools, or experiments. Use [Problem Solving](../problem-solving/SKILL.md) to handle uncertainty in the overall plan.
2. **Split by result.** For each acceptance check, name its owner and the artifact or evidence that will satisfy it. Include the lead's integration check. Put dependent steps with one owner if they need the same context or repeatedly inform one another. Schedule a later assignment only when it can start from a specific, verified output. Combine tiny tasks when the same files and setup dominate their work.
3. **Settle shared decisions.** Give each writable file or shared resource one owner per wave. Pin any shared interface, units, schema, or definition that could be interpreted differently. Include one concrete boundary example when an interface matters. Ask the owner of each risky component to test one other valid input that could break its contract, such as an allowed precision, size, or retry case. State which cases passed, and reserve a component-wide claim for coverage that supports it. If the contract is open, assign one owner to settle it and wait for that output before launching consumers. For independent reviews of the same artifact, give each reviewer a different question and collect their first findings separately.
4. **Choose the smallest useful team.** Compare solo work, a few grouped assignments, and narrowly scoped workers when the choice matters. Include lead planning, repeated setup and context, tools, integration, verification, and likely retries. Keep cost and elapsed time separate. Ten workers make sense when there are ten substantial pieces that pass these checks and the budget supports them. For uncertain work, try one representative assignment or a small first wave before expanding. Honor the user's explicit count or model within the host's limits.

## Write the worker prompt

Fill in the applicable fields. Use [Please No More Slop](../please-no-more-slop/SKILL.md) for plain, specific wording. A worker with only this prompt should know where to start, what to return, and when to stop.

```text
Assignment — [plain name for the result]
Purpose — [one sentence on the decision or deliverable this supports]
Task — [one action or question and the exact output to return]
Inputs — [revision, artifact, exact paths or source locators, relevant facts,
          verified dependency outputs, shared contract and example if needed]
Scope — [read/write permissions, owned paths or read-only, relevant tool limits,
         and the closest tempting work that belongs to someone else]
Done when — [observable checks and the evidence to return for each]
Stop when — [the checks are satisfied, a named budget is reached, or a missing
             prerequisite or out-of-scope change blocks progress]
Return — status (done, partial, or blocked), result or artifact path, evidence
         for the checks, and any unresolved blocker or assumption.
```

- Lead with the task. Pass the smallest sufficient context and point to exact sections for details. Include required definitions, versions, and constraints that the worker would otherwise have to guess. Check that the worker can access the referenced inputs.
- Say whether the worker should inspect, propose, or edit. Give investigation and review workers read-only scope. Name the test command or procedure when choosing it would require exploration. Use measurable limits where they matter, such as the files, sources, tool calls, or output length. If a missing input blocks the task, have the worker return what it verified, the missing input, and what it needs to resume. Workers stop after their own assignment and leave further delegation and shared decisions to the lead.
- For a threshold decision, ask for the eligible count or measured value, the required threshold (including units and equality), and the exact source lines that verify both. If a prerequisite is missing, ask which one. Keep those facts even if you also ask for a verdict.
- For research, use [Deep Research](../deep-research/SKILL.md). Name the question, source boundary, and inclusion rule. Ask for the original source and exact passage, table, or data locator for each material claim. For review, give the evidence and the question while withholding other reviewers' conclusions.
- Before sending, read the prompt as a fresh worker. Check whether two workers could make different reasonable assumptions, duplicate the same lookup, or each pass locally while their results fail together. Fix the prompt or move the shared decision back to the lead.

## Dispatch and integrate

1. **Start with clean context.** Use a fresh worker context when the host supports it. Send the prompt and scoped evidence instead of the full parent conversation. Choose Luna at medium for bounded work when available and appropriate. If the host requires inherited history or a different model, account for it when sizing the wave and disclose any material substitution. Context isolation and file isolation are separate. In a shared checkout, keep write paths disjoint and serialize checks that mutate shared state. Use isolated worktrees when overlapping writes are needed, with one owner for reconciliation.
2. **Run ready work.** Launch independent assignments up to the host's concurrency and the user's budget. Release dependent work only after accepting its prerequisite. Track each assignment, owner, dependency, result, and check. On a resumed task, check which earlier results still match their inputs and rules. Give a worker only the changed check and the evidence needed to do it independently. If you can verify that change yourself and the user permits solo work, skip the worker call. Pause dependent work while a changed prerequisite remains open. If spawning is unavailable or unauthorized, use the same breakdown to do the authorized work directly or return the scoped prompts when the user asked for a plan.
3. **Accept results on evidence.** Check the exact artifact or source, verify scope and acceptance checks, and use the combined result through its normal entry point. Derive the decision from the evidence yourself. If the required evidence is verified, recompute the eligible numerator and denominator from the source before applying the exact threshold. For repeats or exclusions, account for what was removed and check that the parts add to the reported distinct count. A result below the threshold is a verified failure. Use unverified when a prerequisite is missing or inconsistent. Resolve any disagreement between the worker's label and its facts before reporting. Resolve disagreements at the source. If one result fails, fix the missing input, scope, or shared assumption before rerunning only the affected work. Escalate an unresolved hard decision to the lead or a stronger available model.
4. **Close the loop.** Account for every user acceptance check and identify unresolved gaps. If cost matters, record actual usage across the lead, workers, and retries where available. Label estimates and unknowns. Use the [playbook](playbook.md) for worked prompts, failure cases, and a matched cost comparison.
