---
name: please-no-more-slop
description: "Choose clear names and write technical ideas so the intended reader can explain them back. Use when creating or renaming code identifiers, files, folders, APIs, database keys, or labels, and when drafting, reviewing, editing, or explaining technical or research material in replies, emails, documentation, reports, and handoffs. Use when asked to remove jargon, make something easier to understand, score AI slop, or rank drafts by writing quality."
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

## Score and rank writing

Score from 1 to 10, where **1 is clear and 10 is the most slop**. Judge what the writing does to the reader. Style alone gives no basis for identifying who or what wrote it.

Pick the audience, the purpose, and the text being scored. Use the same audience and purpose for competing drafts. When judging unrelated passages, state the audience and purpose for each. For a long document, judge the whole piece and quote representative passages. Score individual passages only when asked or when identifying where to revise first.

Give each category 0, 1, or 2 points. Count each flaw under the category that best explains its effect. Sum the five numbers and report a minimum of 1.

| Category | 0 points | 1 point | 2 points |
| --- | --- | --- | --- |
| Main point | The reader quickly finds the answer, result, or request | The point takes some hunting | The main point is missing or buried |
| Words | The intended reader understands the terms or gets the explanation they need | Some terms or labels take extra work | Key terms rely on unexplained jargon, shorthand, or vague abstractions |
| Concrete detail | Actions, results, and numbers have enough context for the purpose | One useful comparison, example, or detail is missing | Vague claims or unexplained numbers hide what happened or how to judge it |
| Flow and filler | The order makes sense and each sentence earns its place | Some repetition, padding, or backtracking | Dense clauses, filler, or scattered facts make the reader reconstruct the message |
| Accuracy and scope | Claims preserve what the source supports, including limits | A qualification is unclear or easy to miss | Wording materially distorts the evidence, upgrades an untested claim, or blurs what was measured |

Use these bands to sanity-check the score. **1–2** reads cleanly with minor friction at most. **3–4** is usable after targeted edits. **5–6** requires the reader to decode important parts. **7–8** needs a substantial rewrite. **9–10** leaves the reader unable to recover the point reliably or gives them a materially misleading account alongside other major problems.

Report the score, the five category scores, and the top one or two problems with exact quotes. Say what the intended reader would misunderstand or have to look up. Offer a short rewrite when it helps. When comparing drafts, list the clearest first and allow ties. Flag a material accuracy error separately even when the total score is low. If sources are missing, mark source accuracy unverified. Score any visible scope problem. Use 0 provisionally if none is visible and label the total provisional.

## FlyChess examples from Git history

Scores below use the category order above. Treat the excerpts as historical writing samples.

### Clear writing

**1/10 (0, 0, 0, 0, 0).** For a new teammate checking the research goal.

> 2. **Reasoning, as the researcher defines it:** "being able to apply many unrelated concepts to solve an unfamiliar problem". No result so far meets this.

The definition makes an abstract word usable. The next sentence gives the evidence status immediately. [November 1 status](https://github.com/ethanramli/fly-chess-research/blob/82af13ff69e3d5b707711ede9b3fbf02093f34cb/documentation/current-status.md#L8)

**1/10 (0, 1, 0, 0, 0).** For a new teammate checking where the run stopped.

> v6 (frozen replication on 573 positions from 300 new games) was stopped at 6 of 24 jobs for a shutdown; relaunch is the next step.

The sentence gives the run size, how far it got, why it stopped, and the next step. "Frozen replication" is the one phrase a newcomer may need explained. [November 5 status](https://github.com/ethanramli/fly-chess-research/blob/c1ce57bc0fea3ab52c5c66e4d1ed12ae1eb3d75a/documentation/current-status.md#L5)

### Writing that makes the reader decode the point

**5/10 (0, 2, 2, 1, 0).** For a new reader of the historical README.

> Can a connectome-constrained model acquire task-relevant strategic evaluation from explicit position-assessment supervision and use it to generalize to previously unseen chess positions?

The question is easy to locate. The reader still has to unpack "task-relevant strategic evaluation" and guess what supervision the model receives. The nested phrasing adds work to a single question. [Early README](https://github.com/ethanramli/fly-chess-research/blob/f830ada349805b807d4628c3f9c7646d7329683e/README.md#L7)

One rewrite for that historical plan: "Can a model built around a map of a fly's brain connections learn to judge chess positions from examples of how those positions are assessed, then judge new positions?" The early plan used explicit assessment as supervision.

**7/10 (1, 2, 2, 2, 0).** For a researcher in a related field reading the status update.

> The revision-4 predeclared single-shot capacity gate on the widened 6,046-gain mask found one exact win out of three and failed. A later sequential exact search found settings on all three boards, but it followed gate failure and has not had independent review. The earlier 2,096-gain result is a negative bound for a linear surrogate, not an exact-network impossibility proof.

The result follows a long test label. The passage leaves "exact win" and the passing threshold undefined. It compresses three different checks into three sentences without giving the reader a way to connect each check to the question it answered. It does preserve the order of the tests and the limits of the evidence. [November 9 status](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status.md#L7)

### Source-checked rewrite of the planned test and later search

"The planned test required a safe capture to score highest in at least two of three chess positions. That happened in one position. A more extensive search later found settings that made a safe capture score highest in each of the three positions. That search came after the planned test failed and has yet to receive independent review." [Stop report](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L31)

For a specialist who needs the method, add the exact test name and how the search differed once you verify those details.
