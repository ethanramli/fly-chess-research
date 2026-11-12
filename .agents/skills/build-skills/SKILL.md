---
name: build-skills
description: Design, research, test, and revise reusable repository skills. Use when asked to create or improve a project skill, turn a successful workflow into a skill, or reproduce why an existing skill was built the way it was.
---

# Build skills

Build a skill around the behavior that should change. Keep enough evidence to repeat the design and test without this conversation.

1. **Understand the work.** Find the current entry point, related skills, and one real failure. Ask the user the questions that change triggers, authority, examples, output, or stopping behavior. Ask the questions requested by the user and track which answers were supplied. Use the answers to revise the design. Where choices can be made reversibly, mark any defaults you used.
2. **Choose what to build.** Compare the existing workflow, an edit to an existing skill, and a new skill where ownership differs. Use [Problem Solving](../problem-solving/SKILL.md) at the requested level and [Deep Research](../deep-research/SKILL.md) for consequential external assumptions. Keep the sources and the design decisions they affected.
3. **Define the checks before testing.** Pin the baseline and candidate revisions, user prompts and input artifacts, model, tools, budget and scoring rules. Include a normal task, a close case where the skill should stay out, and a failure or boundary that motivated the change. Use only applicable cases. Keep a fresh case outside prompt tuning when the change affects consequential behavior. Define what triggers the skill, what a correct output or action looks like, and what failure would matter.
4. **Write the smallest useful skill.** Follow the project's skill location and naming. Use frontmatter with the lowercase name and description of when to use it. Put essential steps and handoffs in `SKILL.md` and load examples or detailed references only when useful. Add a script only for a repeatable operation that needs deterministic behavior. Connect the skill to the existing entry point and maintained navigation.
5. **Run the cases and iterate.** Run baseline and candidate on the same tasks in fresh sessions with matched conditions where possible. Give workers realistic user requests and the artifacts they would have at runtime. Keep the expected answers with the evaluator. Compare behavior, outputs and failures using the pinned rules. Use the earliest failed step to choose the next change, revise, rerun affected cases and try the fresh case. Run structural and link checks as well. When the setup limits the comparison, record the limitation and scope of the evidence.
6. **Leave a record.** Save the skill and a compact, versioned record with the request, questions and answers or defaults, source links and decisions, the pinned cases and scoring rules, what changed between rounds, and what actually passed. Record failures and missing checks. Keep raw receipts at stable locations when available. Reopen the relevant step when later feedback changes a requirement.

Use [the science-review build record](science-review-build.md) as an example of how to reproduce a build. Sources for this workflow include the [Agent Skills specification](https://agentskills.io/specification) and [Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills).
