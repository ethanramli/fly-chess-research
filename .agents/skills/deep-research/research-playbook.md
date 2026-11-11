# Research playbook

Read the section that fits the question. Use [Deep Research](SKILL.md) for the common workflow.

## Scientific questions and literature reviews

- Define the population or system, intervention or exposure, comparison, and outcome as applicable. For computational work, record the dataset or model version, evaluation split, baselines, controls, and metric.
- Start with reviews or reference lists to map the area, then check the primary studies that support the key findings. Group reports by underlying study, experiment, or dataset. Record publication status, corrections or withdrawals where relevant, and whether you reached the full text.
- Extract the effect or observed result, uncertainty, sample, and conditions. Distinguish a run that finished, a software check that passed, a benchmark result, and an evaluation that isolates the cause of a measured change. Use comparisons with matching inputs and budgets when drawing conclusions about mechanisms.
- For a requested systematic review, define eligibility, databases, query strings, dates, and screening before making coverage claims. Record the work actually completed and any steps that remain incomplete. Follow the applicable review standard when the user requests one. [Cochrane Handbook, searching and selecting studies](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04#section-4-6-1)

**Example.** A preprint and its journal version both report 18 correct moves on 20 positions from the same run. Record one result and cite the version read. A separate paper using the same dataset can test a different method, but assess overlap before treating it as evidence of generalization to new positions.

## Technical questions and changing facts

- Verify the product version, platform, tier, or deployment date first. Prefer versioned docs, tagged source, changelogs, and official status pages for the behavior they describe. Use issue reports to locate real failures and check whether a fix shipped in the version at issue.
- Distinguish when an event happened, when the source published or updated its account, and when you retrieved it. An undated current page gives weak evidence for a historical claim. Use a dated record or archived capture for the relevant period and identify any gap.
- When sources disagree, check whether they describe the same release, plan, region, definition, and date. Check the publisher and original evidence outside its own page when credibility matters. [Wineburg and McGrew, lateral reading study](https://doi.org/10.1177/016146811912101102)

**Example.** To answer whether version 5 added an option, open the tagged release and the versioned documentation. A page for the default branch can describe a change that has yet to ship. Report the first released version you can verify.

## Comparisons, rankings, and recommendations

- Identify the decision and constraints. Use the same unit, currency, time period, plan, workload, or benchmark for each option. Preserve original figures and show the conversion or calculation when it affects the decision.
- Score only criteria tied to the decision. Keep unknown values visible. Separate an option's own marketing claim from evidence that tests it independently. Explain ties, uncertainty, and which assumption would change the ordering. Recommend an option when asked and the evidence supports it.

**Example.** A vendor lists a price per 10 search results and another lists a price per page read. Use a specific workload, such as 10 searches and 20 pages, and calculate each bill from its own rules. Flag any fee you cannot verify.

## Lists, due diligence, and broad discovery

- Define the universe, required fields, dates, and evidence needed for each row. Resolve entities by stable identifiers, domains, or registries. Distinguish parent companies, subsidiaries, and local offices. Keep input rows and their order when enriching a supplied list.
- Trace duplicates to the same underlying record or evidence. Mark missing fields, uncertain matches, and excluded candidates. For an exhaustive request, report which directories, registries, or date ranges you actually covered. A search engine result count alone gives no basis for completeness.
- Use an evidence table when the user needs to verify individual rows. Record a source for each consequential field or group of fields. Keep searches about people limited to information relevant to the user's task.

## Claim check

Use this compact note internally when several claims or sources could be confused.

| Claim | Source and locator | What it establishes | Limit or conflicting evidence |
| --- | --- | --- | --- |
| The evaluation met its threshold | Results table, row 4 | 8 correct first moves on 10 new positions, with 8 required | The report contains no comparison with the untrained model |
| Training caused the gain | Same table | Performance of the trained model on the test | The causal claim remains unresolved |

Before delivery, check that the opening answers the question, citations support the claims beside them, the strongest alternative has been considered where relevant, and any incomplete work is clear.
