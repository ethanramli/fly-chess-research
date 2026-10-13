# 2026-10-07 fixed-budget sequence feedback

The original reasoning target remains consequence-sensitive improvement on unfamiliar positions, not accumulation of training turns. Search can verify branches and the teacher can produce separately bound attacker contexts, but neither the planner nor the current replay receiver explains semantic lines or maintains a validated long-delay eligibility trace.

I added an isolated fixed-budget planner. On a verified avoidable miss with a verified successful alternative, it retains both root examples and selects up to two checked earlier attacker board/action contexts, one failure and one success when available. Those replace other root counterfactuals within the same four neural presentations. Unknowns remain non-teaching. The software fixture passes its proof rechecks and budget assertions; no graph activity or neural learning was run.

This is an experiment-design candidate, not a result. It may be worse than root-only feedback because it drops other legal candidates and uses one illustrative certificate branch. Before graph execution, a frozen matched protocol must compare root-only and sequence replay with equal presentations, absent/shuffled/disabled controls, independently audited certificates and all-legal rankings. Any development repair must be followed by untouched unfamiliar and counterfactual tests, both unaided and under equal search budgets.

See [fixed-budget sequence replay design](../../../documentation/design/search-and-feedback/fixed-budget-sequence-replay.md).
