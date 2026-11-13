# Skill Review Rubric

**100 points.** Judge the skill on the decisions it improves, the work it reliably produces, and the cost of getting there. Review the exact revision of `SKILL.md` and any instructions, references, scripts, or integrations it depends on.

## Point allocation

| Criterion | Points | What earns full credit |
| --- | ---: | --- |
| Activation and scope | 15 | **5** for a discoverable trigger that fires on ordinary in-scope requests. **5** for staying inactive on near misses. **5** for clear handling of overlap, handoffs, and repeat triggers when another skill or an earlier run is relevant. |
| Workflow and decisions | 20 | **5** for establishing the goal, inputs, and constraints. **10** for concrete decision rules that produce the right next action at important forks. **5** for proportionate checks, completion criteria, and stopping rules. |
| Domain correctness and added value | 25 | **10** for correct outputs on core cases against a predefined answer key, source, or domain standard. **10** for avoiding consequential reasoning errors on a hard case. **5** for a repeatable, material improvement over the same model without the skill. |
| Output and evidence | 15 | **5** for delivering the requested artifact in usable form. **5** for tying consequential claims, scores, or decisions to inspectable evidence. **5** for making limitations, assumptions, and next actions clear where they affect use. |
| Failure handling | 10 | **5** for handling missing, conflicting, or weak inputs in a way that preserves correctness. **5** for recovering from a realistic dependency failure or accurately reporting the blocker and preserving useful progress. |
| Efficiency | 10 | **5** for scaling depth, tool calls, and delegation to the task. **5** for avoiding observable repeated work, excess context loading, and handoffs that add no value. Assess the overhead alongside the quality it buys. |
| Maintainability | 5 | **3** for a valid entry point and reachable, current dependencies. **2** for keeping each governing rule in one place and making supporting material easy to find when needed. |
| **Total** | **100** | |

## How to award points

Score each bolded item separately. Award full credit when it meets the stated requirement across the applicable cases. Award half credit, rounded down, when it works in part and the gap is recoverable without invalidating the main result. Award zero when the behavior is absent, materially wrong, or consistently fails. A prerequisite or output the skill promises but fails to provide is a scored failure. If the reviewer cannot run a check because of an external evaluation constraint, mark the affected points unverified and report a provisional range from points earned to points earned plus points unverified.

Record every deduction with the criterion, points lost, exact instruction or observed behavior, consequence, and smallest change that would recover the points. Charge a root cause once. A second deduction requires a distinct, demonstrated failure against a different criterion. Judge supported behavior and its consequences. Tone, verbosity, checklist length, and the number of agents earn no standalone credit.

## Test protocol

1. Pin the revision and define what success and a material error look like before running the skill. Use domain standards appropriate to the task and stage. Write at least one fresh case that the skill’s own examples do not answer.
2. Run two core cases, one hard case, one near miss, one overlap or repeat-trigger case, and one failure case. The failure case should exercise missing or contradictory input and, where the skill relies on a tool, script, or reference, a dependency failure. Test activation through the normal entry point and run the workflow as a user would. Use a plausible contextual variation when an adjacent skill or runtime dependency is absent.
3. Compare both core cases against the same model with the same inputs, starting context, tools, and budget, with the target skill disabled. Assess outputs against the same expectations. Track observable differences in result quality, duplicate reads, tool calls, and delegation. Record token use or runtime when available. If the skill and baseline tie on both core cases, add the hard case to the comparison before scoring added value.
4. Record the revision, environment, prompts, expected and observed outcomes, points earned, deductions, and any unverified points. For a result that determines readiness, rerun any surprising failure with fresh context before treating it as reproducible.

## Readiness thresholds

| Final score | Verdict |
| ---: | --- |
| 95–100 | Exceptional under the tested conditions |
| 90–94 | Ready for routine use under the tested conditions |
| 80–89 | Useful with supervision. Fix the scored gaps before routine use. |
| 70–79 | Material revision required |
| 0–69 | Unreliable for its intended use |

Apply the lowest applicable cap after adding the earned points. A reproducible failure on a core use case that makes the primary output unusable, with no viable recovery inside the workflow, caps the score at **49**. Fabricated evidence presented as verified, a material error passed off as having cleared a required check, or an action taken outside the user’s authorization caps it at **39** when attributable to the skill. Report the raw score and the capped score. Mark any verdict provisional while points remain unverified.

## FlyChess calibration

- **`science-review`** earns domain credit by applying the appropriate ISEF criteria to the evidence actually available, explaining why each deduction follows, and distinguishing a flaw in the study from evidence the reviewer has yet to see. Test both a small research decision where a full review would interrupt progress and a milestone that warrants a full scorecard. Include a polished study with a real methodological weakness.
- **`problem-solving`** earns workflow and efficiency credit when each effort level establishes the goal and changes how the agent investigates, tests, and stops. Test a simple task that should stay light and a hard problem where the obvious diagnosis is wrong. For heavy and `deep-in-thought`, inspect whether independent critiques challenge distinct assumptions and whether the final decision responds to them.
