# Delegation playbook

Use the relevant example when scoping, diagnosing a failed handoff, or measuring whether delegation saved work.

## A bounded FlyChess assignment

This read-only example uses a pinned revision so the same prompt can be replayed.

```text
Assignment — Verify one navigation link
Purpose — Check whether a newcomer can reach the current research status.
Task — Verify the `current status` link in the opening navigation paragraph
       of documentation/README.md. Return one row with source line, link text,
       resolved target, and verdict (valid, broken, or unverified).
Inputs — FlyChess revision c92ff5a10dd8c23102cd8e1095ce7fe0eb3341af.
         Read line 5 and resolve its relative target from documentation/.
Scope — Read only the source and linked target at that revision, using the
        checkout or GitHub file reads. Leave all files and other links alone.
Done when — The row shows the link as written, its resolved target, and the
            target path or heading that supports the verdict.
Stop when — You can return the row. If access is denied, return partial with
            the inaccessible path. If the link or target is confirmed absent,
            return broken and identify the path checked.
Return — Status, one row, and any blocker. Maximum 100 words.
```

For ten sizable independent documentation sections, give each worker one section, the shared definition of a valid link, and its own set of links. The lead checks the combined list against the requested section inventory and samples the evidence. For ten links in one short file, group them so one worker reads the source once. Use a deterministic link checker when it covers the requirements and use workers for checks that need interpretation.

## When two changes meet

Suppose two hypothetical FlyChess changes add promotion choice to a board interface and accept it in a move endpoint. Exclusive write paths still allow the interface to send `"knight"` while the endpoint expects `"n"`. Local checks can pass against either convention.

The lead pins the agreed request contract in both prompts. For example, `promotion` is a lowercase piece code and `"n"` means knight. The interface worker owns the outgoing field. The endpoint worker owns decoding. If the convention is undecided, settle it before dispatching either implementation. At integration, select knight through the normal interface and verify that the resulting board contains a knight on the promotion square.

## Repair a bad split

| Symptom | Lead action |
| --- | --- |
| Three workers search the same source set. | Split by a decision-relevant question or group the lookup with one owner and reuse its findings. |
| A worker needs another worker's unfinished decision. | Pin the decision first, move the consumer to a later wave, or give the coupled work one owner. |
| A report is plausible but has no evidence. | Ask for the missing path, test result, or source passage. Verify it before accepting the claim. |
| Results disagree. | Compare input revisions, definitions, and measurements. Run the smallest check that distinguishes the competing answers. |
| A worker repeatedly hits its budget or leaves scope. | Check what it had to rediscover. Provide the missing input, narrow the question, or change who owns the decision. Retry only if it changes a required outcome. |
| Workers repeatedly read the same large material. | Give one owner the common extraction and pass its verified results, or group assignments that genuinely need the same context. |

## Measure whether the split paid off

Use this when deciding whether a recurring workload warrants more agents or when someone asks for proof of savings.

1. Pick a representative workload and pin the starting revision, inputs, available tools, and time or spending limits. Set the quality floor in advance with observable checks, including at least one check of the combined result when pieces interact.
2. Run a solo baseline, a few broad workers, and narrowly scoped workers. When testing three versus ten specifically, add a run where three workers execute the same narrow assignments as the ten-worker run. This shows what clearer task boundaries contribute at a fixed worker count and what additional isolation or concurrency contributes with the same assignments. Keep the lead model, worker model and effort, and grading rules fixed where applicable. Record the actual solo model and any differences between runs.
3. Grade against the same rubric, without configuration labels where practical. Repeat on multiple representative inputs or runs before generalizing. Record which runs miss the quality floor and what failed.
4. Count lead and worker input, output, and reasoning usage as reported by the host. Include planning, repeated context, tool cost, integration, validation, and retries. Use billed cost or actual credits when available and keep elapsed time separate. Record model settings, context inheritance, and peak concurrency. Compare cost savings among passing runs and report failed runs and their spend too. Missing usage stays unknown.

## Research behind the design

- Anthropic's production research write-up ties vague assignments to duplicated or missing work and recommends explicit objectives, output formats, source and tool guidance, and boundaries. It also reports substantial token overhead in its own setup. The cost figures apply to its system and baselines. [How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system)
- A controlled study found that the value of coordination depended on task structure. Its tested systems gained on a parallelizable task and lost ground on a sequential planning benchmark. This motivates checking dependencies and comparing against a solo baseline. [Towards a Science of Scaling Agent Systems](https://arxiv.org/abs/2512.08296)
- Long-context retrieval and question-answering experiments found that the location of relevant information affected performance. This supports making critical inputs easy to find. The study did not test Luna or this prompt format. [Lost in the Middle](https://aclanthology.org/2024.tacl-1.9/)
- Codex documentation recommends parallel agents for independent, read-heavy work and warns of additional coordination when several agents edit code. [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
