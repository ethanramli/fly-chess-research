# Science review guide

Read the rows that can change the decision. Start with the highest-consequence claim and follow the evidence far enough to decide it.

| Claim or decision | Check |
| --- | --- |
| The protocol can answer the question | Write rival predictions and the observation that would distinguish them. Specify the comparison, unit of analysis, threshold or meaningful effect, and interpretation of positive, negative, and inconclusive outcomes before seeing the result. Check that prerequisites, positive controls, and the measure can detect the target behavior. |
| Performance transfers | Check how families, games, or shared templates were split across practice, development, and final evaluation. Verify comparable candidate sets, inputs, and search budgets. Ask whether a simpler rule or repeated template could pass. Use an authorized development fixture or a prospective test when the final set is sealed. |
| A component caused the improvement | Trace what inputs, feedback, stored state, scorer, and search each condition used. Look for a comparison that changes the proposed cause while matching other material conditions. Match the easiest credible shortcut or simpler baseline to the same task. |
| A result supports a bounded negative | Verify prerequisites and outcome-neutral quality checks. Ask which meaningful effect the design can exclude and on what units. Consider interval width, floor or ceiling effects, dependence, exclusions and uncertainty across relevant runs. State the limit of the inference. |
| The simulation supports a biological statement | Distinguish verification that the code implements the specified model, a result within that model, and validation for a particular biological claim. Trace model assumptions and the roles of engineered interfaces. Identify the evidence needed to extend the claim beyond the simulation. |
| A mathematical bound applies | List the domain, assumptions, pinned model state, scoring rule, and any approximation. Recheck a decisive derivation or seek a counterexample. A surrogate bound extends to the exact model only with a justified error bound for the relevant domain. |
| The finding is reproducible or ready to cite | Trace protocol, version and inputs through run records, analysis, uncertainty, audit and reporting. Keep the primary result, deviations, exploratory analyses and missing artifacts visible. Match the manuscript wording to the test actually run. |

## FlyChess examples

- **Memory v8.** The independent audit confirmed the frozen capture-only benchmark for the external memory store. The all-legal comparison was a separate descriptive result. Raw and random features scored higher than fly features using the same store in the reported comparisons. Preserve the capture-only finding and reopen the mechanism or broader transfer claim where it relies on those comparisons. [Memory v8 report](../../../research/reports/engineered-memory-test-v8-2026-11-07/README.md)
- **Combination.** A failed individual transfer prerequisite leaves the combination claim inconclusive. When prerequisites pass and the test has adequate sensitivity, the same performance may support a bounded negative result. Check the planned interpretation against the protocol, including which system and memory condition were declared. [Transfer and combination protocol](../../../documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md)
- **Capacity.** A later exact search found settings on three development boards after the predeclared gate failed with one verified win on three development boards. Record both with their actual status. Separate the existence of settings found by search from the ability of feedback to teach the model to reach them. [Capacity stop report](../../../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md)

## Sources for the checks

| Source | What to use |
| --- | --- |
| [eLife Assessments](https://elifesciences.org/about/elife-assessments), significance and evidence definitions | Judge the importance of a claim separately from the evidence for it. |
| [Center for Open Science, Registered Reports](https://www.cos.io/initiatives/registered-reports), FAQ on genuine negative findings and poor practice | Define quality checks independently of the desired result. Use the principle for internal review and apply a journal's requirements only when relevant. |
| [Nosek and colleagues, The Preregistration Revolution](https://pmc.ncbi.nlm.nih.gov/articles/PMC5856500/), introduction on prediction and postdiction | Preserve the distinction between a finding that generated a hypothesis and evidence that prospectively tested it. |
| [Kapoor and Narayanan, Leakage and the reproducibility crisis](https://pmc.ncbi.nlm.nih.gov/articles/PMC10499856/), leakage taxonomy and model information sheets | Check nonindependence, separation of data, and whether the test set represents the population named in the claim. |
| [Erdemir and colleagues, Credible practice of modeling and simulation](https://pmc.ncbi.nlm.nih.gov/articles/PMC7526418/), Rules 1, 3 and 4 | Use context of use, verification, validation, uncertainty and sensitivity to judge simulation claims. The paper's examples come from healthcare. |
| [NeurIPS Paper Checklist](https://neurips.cc/public/guides/PaperChecklist), claims, reproducibility, experimental details and statistical significance | Match claims to evaluated conditions and record what uncertainty estimates capture. |
