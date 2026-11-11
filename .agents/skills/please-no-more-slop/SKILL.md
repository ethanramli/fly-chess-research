---
name: please-no-more-slop
description: "Choose clear names and write technical ideas so the intended reader can explain them back. Use when creating or renaming code identifiers, files, folders, APIs, database keys, or labels, and when drafting, editing, or explaining technical or research material in replies, emails, documentation, reports, and handoffs. Use when asked to remove jargon or make something easier to understand."
---

# Please no more slop

Make the reader's job easy. A name should tell them what a thing is. A paragraph should tell them what happened, why it matters, or what to do.

## Name things

- Use the real concept or action. Name a function for what it does and a file for what it contains. Prefer `extract_metrics.py` over `data_extraction_pipeline_final_v4_processed.py` and `client_relationships` over `usr_clnt_rel_mttr_v2`.
- Drop vague words such as `handler`, `manager`, `wrapper`, `processor`, `helper`, and `util` when a specific name tells the reader more. Keep framework-required roles and standard domain terms that convey a real distinction.
- Spell out unfamiliar shorthand. Use one name for each concept across code, documentation, and replies. Keep distinct concepts distinct. Preserve public interfaces and unrelated names unless the task calls for renaming them.
- Apply the normie test. Could someone who understands the task but has never seen this project guess what the name refers to?

## Write and explain

1. **Start where the reader is.** Identify what they already know about the field and about this project. A professor in a related field may know the science and still need an explanation of a local test or label.
2. **Lead with what they came for.** In an update, give the outcome and its immediate consequence. In an email, make the reason for writing and any specific request easy to find. In an explanation, give the idea first and add the mechanism in the order the reader needs it. Keep necessary detail nearby or link to the source.
3. **Say what happened.** Name who or what did what, under which conditions, and with what result. Replace vague evaluations with the measurement or observable change when the source provides one. Split a sentence where the reader would have to backtrack. Use headings that help readers find an answer in a long document.
4. **Translate terms by meaning.** Replace project shorthand, jargon, and stacked nouns with familiar words when they carry the same meaning. Keep a standard term when the reader needs its precision or needs to look it up. Explain what it means here at first use if it is unfamiliar. Skip acronyms used only once and keep required identifiers exact when referring to them.
5. **Keep the claim intact.** Preserve scope, baselines, denominators, units, and uncertainty wherever they change the interpretation. Keep observations, interpretations, and plans distinct. Distinguish exploratory checks from planned tests, a model from the thing it represents, and an unrun test from a failed test. Verify important claims against the source. If a term or result is unclear, flag the gap and keep any useful exact wording until its meaning is confirmed.

## Check the result

- Read from the intended reader's position. Can they say in their own words what happened, what the evidence supports, and what happens next if a next step is relevant? Can they tell which sentence answers their question?
- Compare the rewrite against the source. Check that every consequential claim keeps its original meaning and level of certainty. Check that a definition explains something the reader can picture or verify.
- When testing with a reader, ask for a paraphrase before explaining what you meant. Revise the part they misread. Treat a self-check as an editorial check.

## Example

Dense: "The single-shot capacity gate failed. A later sequential exact search found settings on all three boards."

Clear: "The planned test required a safe capture to score highest in at least two of three chess positions. That happened in one position. A more extensive search later found settings that made a safe capture score highest in each of the three positions. That search came after the planned test failed and has yet to receive independent review."

For a specialist who needs the method, add the exact test name and how the search differed once you verify those details.
