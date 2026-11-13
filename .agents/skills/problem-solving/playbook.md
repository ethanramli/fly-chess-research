# Problem Solving playbook

Read the relevant section when using [Problem Solving](SKILL.md). The workflow applies research ideas to agent work. Its four levels are operating choices to test in practice.

## Review the proposal

Choose roles by the assumptions in the proposal. For a scheduled retry, one reviewer might check whether the verified entry point represents the supported scheduled route while another checks whether the date normalization preserves the original job identity. Give each the relevant source locator and an observation that would invalidate their assigned assumption.

| Reviewer | Question to own | How to challenge the proposal |
| --- | --- | --- |
| **Peer reviewer** | Could someone reproduce this result and defend the wording? | Pick the strongest claim. Trace it to the exact data, methods, and sources. Look for missing details, selective reporting, and claims beyond the cases tested. Return the strongest claim the evidence supports. For implementation work, check whether the change and its verification cover real inputs, existing behavior, and failure cases. |
| **Scientific skeptic** | Could a different mechanism produce the same result? | Name a credible rival. State what each explanation predicts. Check for leakage, unequal conditions, and controls both explanations would pass. Propose a check where the rivals predict different outcomes. |
| **Foundational skeptic** | If the proposal succeeds exactly as planned, will it answer the right question? | Challenge the premises, definitions, and measurement. Construct a case where the test passes without the intended behavior. Identify what must change in the question or measurement if the counterexample holds. |

Ask each reviewer for the assumption tested, the evidence and what it establishes, and the smallest check or revision if an objection remains. Use the [review loop](SKILL.md#run-the-review-loop) to record and recheck the lead's response.

### Example — a claim about transfer in FlyChess

Suppose a proposal says, "FlyChess learned a transferable concept because it scored higher on unseen boards."

- The **peer reviewer** asks which boards were unseen, how they were selected, and whether another team could reproduce the result from the saved runs and scoring procedure. The evidence may support a narrower claim about performance on the evaluated boards.
- The **scientific skeptic** asks whether more search could explain the gain. Compare trained and untrained conditions on the same positions under the same search budget.
- The **foundational skeptic** asks whether unseen boards actually test concept transfer. A familiar tactical template can recur on a new board. Test positions where the concept still applies and the familiar template would lead to the wrong move.

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
| FlyChess cannot advance because a probe may be testing the input encoding, the training procedure, or a scoring artifact. | deep-in-thought, group | Define the minimum observable result needed to advance. Use existing runs and relevant literature to form rival explanations. Propose the smallest controlled test whose outcomes distinguish them. Give each outcome a next action and keep the sealed evaluation untouched unless its use is authorized. |

## The same symptom, four approaches

Suppose a FlyChess training report shows a flat score. These examples show what each level does with that symptom under a different task scope.

| Level | Task | First move and sequence |
| --- | --- | --- |
| Light | Verify what the report displays. | Open the result through the normal report path, compare it with the recorded metric, and report what you verified. |
| Medium | Find where a known expected score change disappears. | Choose an end-to-end trace. Compare expected and observed raw scores, move ranking, and the reported metric. Reflect on whether the trace supports the suspected cause, revise the approach if it does not, then rerun the case. |
| Heavy | Decide whether the training update failed or the scorer missed it. | State each explanation's predictions. Compare a matched training and no-training case, then feed a controlled ranking change through the scorer. Propose a fix. Ask two independent reviewers to challenge the diagnosis and the proposed change, then revise on the evidence. |
| deep-in-thought | Unblock the research when repeated runs fail to show interpretable learning. | Audit what the flat score establishes. Ask what the model must represent for feedback to distinguish two moves. Identify whether different target moves actually share the same effective input. Read relevant prior work, derive predictions for an input collision and a failed update, and propose a development check that can separate them. Have the three reviewers attack the claim, test, and premise. Revise from the earliest step that fails. |

## Research behind the design

- **Monitoring and control.** Schoenfeld studied how people make decisions about what to try, how long to persist, and when to change approach in mathematical problem solving. That informs the recurring goal check and routing by unresolved uncertainty. [Schoenfeld, 1992](https://jwilson.coe.uga.edu/emat7050/schoenfeld_maththinking.pdf)
- **Solomon's paradox.** Grossmann and Kross found that self-distancing reduced the difference between how participants reasoned about their own and other people's relationship conflicts. This motivates the outsider review as a design analogy. The experiments involved humans reasoning about relationships. [Grossmann and Kross, 2014](https://doi.org/10.1177/0956797614535400)
- **Competing explanations.** Platt advocated listing alternatives and designing experiments whose outcomes distinguish them. This informs the predictions and decision-changing checks in Heavy and deep-in-thought. [Platt, 1964](https://doi.org/10.1126/science.146.3642.347)
- **Reframe a blocked problem.** Kaplan and Simon studied how people found a more useful representation of a checkerboard puzzle. A property that stayed unchanged helped focus the search. That motivates looking for a simpler representation or an invariant when the current framing stalls. The experiment was about human puzzle solving. [Kaplan and Simon, 1990](https://doi.org/10.1016/0010-0285(90)90008-R)
- **Separate discovery from confirmation.** Nosek and colleagues explain why an explanation developed after seeing a result needs a prospective check for a stronger test of its prediction. That informs how deep-in-thought handles hypotheses developed from past FlyChess runs and fresh evaluations. [Nosek et al., 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5856500/)
- **Allocate effort where it helps.** Snell and colleagues found that the effectiveness of inference-time strategies depended on prompt difficulty in their experiments. This supports adaptive effort as a design direction. The thresholds in this skill are practical defaults. [Snell et al.](https://arxiv.org/abs/2408.03314)
- **Get independent checks.** Du and colleagues reported gains from multiagent debate on evaluated tasks. Huang and colleagues found that unaided self-correction could fail or degrade reasoning in their experiments. CONSENSAGENT documented sycophancy as a risk in multiagent interactions. This motivates independent first passes and checking claims against evidence before accepting agreement. [Du et al., 2024](https://proceedings.mlr.press/v235/du24e.html) · [Huang et al., 2024](https://proceedings.iclr.cc/paper_files/paper/2024/hash/8b4add8b0aa8749d80a34ca5d941c355-Abstract-Conference.html) · [CONSENSAGENT, 2025](https://aclanthology.org/2025.findings-acl.1141/)
- **Agent workflow inspiration.** The supplied public Astra text emphasizes reporting the outcome and what verification established. The supplied Fable text emphasizes checking unfamiliar or changing claims and the cost of delegation. These files describe apparent instructions and are unverified accounts of model behavior. [Astra text](https://github.com/asgeirtj/system_prompts_leaks/blob/main/OpenAI/Codex/gpt-6-astra.md#L49) · [Fable text](https://github.com/asgeirtj/system_prompts_leaks/blob/main/Anthropic/claude-fable-5.2.md#L1632)
