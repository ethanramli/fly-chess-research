# Building science-review

This record captures the FlyChess request, design choices, and checks so another contributor can repeat the work. It covers skill behavior. The cases use archived evidence and hypothetical data.

## Request and defaults

The researcher asked for science-review, Deep Research, Heavy problem solving, a reproducible skill-building process, design questions, and a real loop in Problem Solving. The requested behavior is a scientific objection that changes the next action and a revised proposal that gets reviewed again.

| Question asked | Default used for this draft |
| --- | --- |
| When should the skill run? | Consequential protocol, interpretation, and manuscript decisions, including when Heavy already has reviewers. |
| What should an objection do? | A material objection sends the lead back to the earliest affected step. The lead adjudicates it against evidence and records what remains open. |
| When can the question be revisited? | Reopen framing when the evidence invalidates it. The researcher decides changes to their goal. Recommend deep-in-thought when first principles or the underlying question need investigation, honoring the requested effort level. |
| What should we test on first? | Use archived Memory v8 and a hypothetical test with a failing prerequisite. |
| When should the loop finish? | A clean review can close a verified scope. Material revisions receive another review. A missing decisive check yields an open objection and a handoff. |
| What should the build record preserve? | Questions, decisions, sources, cases and scoring rules, revisions, and actual verification. |

No answers had arrived when the draft defaults were recorded.

## Diagnosis and design decisions

- The existing [Problem Solving](../problem-solving/SKILL.md) named the reviewer roles and included iteration as a final step. The return path, re-review and stopping states needed explicit instructions. Heavy and deep-in-thought now share the return path. Light and Medium repeat their own action and reflection when useful.
- Keep review inside the current reviewer passes. A separate scientific approval pass would repeat work, and expanding the generic playbook would load field-specific checks for unrelated tasks. The [science-review guide](../science-review/review-guide.md#sources-for-the-checks) records which outside methods informed the checks.
- Two independent Heavy critiques exposed different gaps. The scientific skeptic showed that a blocked control can leave the downstream claim inconclusive even when the review stops. The peer reviewer showed that a verdict can survive a material change in the claim or its evidence if its scope is unrecorded. The draft now tracks revision and evidence per objection, rechecks changed dependencies, and reports work status separately from the strength of the evidence. Follow-up review caught a stop rule that could end the loop when a preferred check was blocked and other evidence could still narrow the claim. The revised rule keeps those checks and revisions in scope.
- [OpenAI's skill-evaluation example](https://developers.openai.com/blog/eval-skills) informed the baseline comparison and behavioral scoring. [Agent Skills](https://agentskills.io/specification) informed the short main files and task-specific references.

## Reproduce the behavior check

Use the baseline Problem Solving instructions at commit `a8c22b88605a401fa66267d1637ef25f98e632b9` and the candidate instructions in the commit containing this record. Use the same model and reasoning settings across fresh, read-only sessions, with access to the assigned instructions and the same case text. Run the cases with the common task below. Keep the scoring rows with the evaluator. Record the outputs and grade each row independently. Budget each run for one short answer without outside tools. These are dry reviews with supplied evidence, so they cannot test auto-triggering or estimate general reliability.

**Common task.** Use the assigned skill instructions to advise the lead on these three cases. For the first case, give the disposition and next step at each review round. For the second case, give the strongest supported conclusion for each condition. For the last case, give the workflow decision. Return brief decisions and evidence for each.

**Archived case.** A report says an external memory store with fly features scored 349.3 out of 560 on restricted capture selection and passed its frozen, independently audited gate. In the separate all-legal evaluation it scored 30.6 against 21.9 for random. The audit confirmed the restricted result. The first draft claims that the audit verified all-legal transfer. In a revised draft, the author removes “all-legal” and claims that fly activity caused the gain. On the same restricted task and store, raw features scored 383.2 and random features 362.6. The report contains no successful causal isolation of a fly-feature contribution. [Archived report](../../../research/reports/engineered-memory-test-v8-2026-11-07/README.md)

**Combination case.** A hypothetical locked test reports a trained-minus-control difference of zero percentage points for combining separately learned ideas. The protocol prespecified a meaningful improvement of five percentage points, with a confidence interval on the relevant difference. In the first condition, individual transfer failed and the interval is minus one to plus two. In the second, individual transfer and all quality checks passed, the interval is minus one to plus two, and the analysis followed the protocol. In the third, individual transfer and all quality checks passed, and the interval is minus seven to plus eight. No further test is authorized.

**Outside-scope case.** A contributor asks for two passes over Markdown links after a directory rename. The experiment, data and claims are untouched. The first pass found and corrected a broken link.

| Pass condition | What to look for |
| --- | --- |
| Archived finding | Keep the restricted, audited finding. Decline to extend the audit to the descriptive all-legal result. |
| Second review round | Reassess the new causal claim against the raw and random feature comparisons. State a next step or narrower sentence. A prior verdict cannot cover the new claim. |
| Failed prerequisite | The first combination condition leaves the downstream claim inconclusive even with the narrow interval. |
| Bounded negative | The second condition supports evidence against an improvement of five points or more under the test conditions. |
| Low sensitivity | The third condition cannot exclude a five-point improvement. Keep the claim open and respect the execution boundary. |
| Outside-scope behavior | Rerun the link check and keep scientific review out of the task. |

For a broader evaluation, use a fresh real task withheld from skill tuning and score it with comparable review conditions. Add a direct check of automatic routing in the host where the skill will run.

## Results from this build

Two fresh solo sessions received the shared cases and the assigned baseline or candidate instructions, with the same inherited model settings and read-only access. The exact model and reasoning settings were not exposed to the evaluator. Select and record a matched model and effort when repeating the comparison. The sessions received the case text and the paths to their assigned skills. They had no scoring rubric or other review output. Both met all six behavioral checks. The baseline already asked for a second review. The candidate made the reopening step explicit in both archived rounds and rechecked a proposed replacement sentence. This comparison establishes that the candidate can follow the intended loop on the supplied cases. It did not demonstrate a higher pass rate. In the second archived round, the baseline wrote “Remove the causal claim and re-review.” The candidate wrote “Reopen the mechanism question” and later checked its proposed replacement sentence against the case.

A separate fresh session used only the candidate instructions and the case below. It identified confounding between detector type and calibration, preserved the first descriptive result for the eligible recordings, treated the later threshold-selected sensitivity gain as exploratory, and stopped at the authorization boundary with a prospective matched test. It asked to verify that the pipeline held other material differences fixed because the supplied case left that detail open. This was a candidate-only test.

**Fresh case.** A study compares a wildlife-sound classifier with a simple detector. Their reported accuracy is identical. The investigators declare that microphone calibration cannot improve detection. Round one: the preregistered protocol excludes recordings without a complete reference label, and the report used that exclusion. Only the classifier's recordings came from the calibrated microphones. The team proposes a matched paired comparison and asks what to do next. Round two: the paired analysis used the same recordings and threshold for both conditions and found higher sensitivity with calibration. The team had selected that threshold after viewing these recordings. The investigators now say their matched comparison confirms that calibration improves sensitivity on future recordings. Access to an untouched test set requires authorization. Give the disposition and next step for each round, what the current evidence can support, and when to stop.
