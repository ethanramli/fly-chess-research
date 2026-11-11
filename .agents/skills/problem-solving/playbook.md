# Problem Solving playbook

Read the relevant section when using [Problem Solving](SKILL.md). The workflow applies research ideas to agent work. Its four levels are operating choices to test in practice.

## Review the proposal

Choose reviewers for distinct risks. Give each the goal, constraints, relevant evidence, and a concrete question.

| Risk | Review prompt |
| --- | --- |
| Wrong problem | Which assumption about the goal, system boundary, or bottleneck would invalidate this plan? What observation would show that? |
| Weak evidence | Which causal or factual claim has the weakest support? Find a counterexample, alternative explanation, or decisive comparison. |
| Fragile implementation | Where could the proposed step fail on real inputs, old state, or a retry? Give the smallest check that would expose it. |

Use independent initial reviews before group discussion when feasible. Keep a short record for each material objection: **objection → evidence or check → revision or remaining uncertainty**. Ask for another pass when a change creates a new consequential risk. Agent agreement can guide where to look. A result still needs verification appropriate to the claim.

## Choose a check

1. Write the observation that would change the decision. Specify the comparison, input, measurement, and scope before looking at the result.
2. Compare predictions. A check that all explanations predict may establish baseline behavior. Choose a different check to distinguish explanations.
3. Observe the result through a tool, a derivation, an independent source, or a controlled evaluation as appropriate. Say what the check directly establishes and what remains open.
4. Follow the evidence. Retire or narrow explanations that conflict with it. Preserve multiple possibilities if the result cannot distinguish them.

For a project-critical blocker, give a plan that can survive handoff. Name the next action, owner if known, prerequisite, result that permits moving forward, and fallback if the result is inconclusive or fails. A plan may be ready while execution still depends on approval or access.

## Example routes

| Situation | Route | What good work looks like |
| --- | --- | --- |
| An optional dashboard metric could be optimized further. | Light, solo | Check which decision the metric informs. If the extra precision would change nothing, finish the dashboard and verify the requested view. |
| A retry occasionally duplicates an export. Both entry points call the same function. | Medium, solo | Reproduce the interruption after the file is written. Trace the shared path. Verify both retries leave one file and preserve its name. |
| Two FlyChess settings look better, but one evaluation changed the search budget. | Heavy, group | Diagnose what changed. Compare matched budgets and inputs. Have one reviewer check the comparison and another check what the result would support. |
| FlyChess cannot advance because a probe may be testing the input encoding, the training procedure, or a scoring artifact. | Deep-in-thought, group | Define the minimum observable result needed to advance. Use existing runs and relevant literature to form rival explanations. Propose the smallest controlled test whose outcomes distinguish them. Give each outcome a next action and keep the sealed evaluation untouched unless its use is authorized. |

## The same symptom, four approaches

Suppose a FlyChess training report shows a flat score. These examples show what each level does with that symptom under a different task scope.

| Level | Task | First move and sequence |
| --- | --- | --- |
| Light | Verify what the report displays. | Open the result through the normal report path, compare it with the recorded metric, and report what you verified. |
| Medium | Find where a known expected score change disappears. | Trace the same development record through raw scores, move ranking, and the reported metric. Fix the first stage that diverges from its expected output, then rerun the case. |
| Heavy | Decide whether the training update failed or the scorer missed it. | State each explanation's predictions. Compare a matched training and no-training case, then feed a controlled ranking change through the scorer. Have reviewers challenge the comparison and the interpretation before choosing a fix. |
| Deep-in-thought | Unblock the research when repeated runs fail to show interpretable learning. | Ask what evidence would actually justify another full run. Replace the broad question "Why is the score flat?" with independently checkable prerequisites: the inputs can distinguish the moves, training can change their relative scores, and the evaluation can detect a ranking change. Check the earliest uncertain prerequisite on development data. Make the next plan depend on its result. |

## Research behind the design

- **Monitoring and control.** Schoenfeld studied how people make decisions about what to try, how long to persist, and when to change approach in mathematical problem solving. That informs the recurring goal check and routing by unresolved uncertainty. [Schoenfeld, 1992](https://jwilson.coe.uga.edu/emat7050/schoenfeld_maththinking.pdf)
- **Solomon's paradox.** Grossmann and Kross found that self-distancing reduced the difference between how participants reasoned about their own and other people's relationship conflicts. This motivates the outsider review as a design analogy. The experiments involved humans reasoning about relationships. [Grossmann and Kross, 2014](https://doi.org/10.1177/0956797614535400)
- **Competing explanations.** Platt advocated listing alternatives and designing experiments whose outcomes distinguish them. This informs the predictions and decision-changing checks in Heavy and Deep-in-thought. [Platt, 1964](https://doi.org/10.1126/science.146.3642.347)
- **Reframe a blocked problem.** Kaplan and Simon studied how people found a more useful representation of a checkerboard puzzle. A property that stayed unchanged helped focus the search. That motivates looking for a simpler representation or an invariant when the current framing stalls. The experiment was about human puzzle solving. [Kaplan and Simon, 1990](https://doi.org/10.1016/0010-0285(90)90008-R)
- **Allocate effort where it helps.** Snell and colleagues found that the effectiveness of inference-time strategies depended on prompt difficulty in their experiments. This supports adaptive effort as a design direction. The thresholds in this skill are practical defaults. [Snell et al.](https://arxiv.org/abs/2408.03314)
- **Get independent checks.** Du and colleagues reported gains from multiagent debate on evaluated tasks. Huang and colleagues found that unaided self-correction could fail or degrade reasoning in their experiments. CONSENSAGENT documented sycophancy as a risk in multiagent interactions. This motivates independent first passes and checking claims against evidence before accepting agreement. [Du et al., 2024](https://proceedings.mlr.press/v235/du24e.html) · [Huang et al., 2024](https://proceedings.iclr.cc/paper_files/paper/2024/hash/8b4add8b0aa8749d80a34ca5d941c355-Abstract-Conference.html) · [CONSENSAGENT, 2025](https://aclanthology.org/2025.findings-acl.1141/)
- **Agent workflow inspiration.** The supplied public Astra text emphasizes reporting the outcome and what verification established. The supplied Fable text emphasizes checking unfamiliar or changing claims and the cost of delegation. These files describe apparent instructions and are unverified accounts of model behavior. [Astra text](https://github.com/asgeirtj/system_prompts_leaks/blob/main/OpenAI/Codex/gpt-6-astra.md#L49) · [Fable text](https://github.com/asgeirtj/system_prompts_leaks/blob/main/Anthropic/claude-fable-5.2.md#L1632)
