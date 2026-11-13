---
name: please-no-more-slop
description: >-
  Write and review clear technical and research replies, emails, handoffs,
  documents, reports, and captions. Use when drafting, editing, explaining,
  simplifying, scoring, comparing drafts, or choosing names for code, files,
  APIs, or labels. Skip requests that only quote or return exact text.
---

# Please no more slop

Make the answer easy to find and the evidence easy to understand. Give replies and standalone documents the same care.

## Choose the deliverable before writing

| Request | What to deliver |
| --- | --- |
| Return, show, suggest, review, or score | Give the requested text or findings in the reply. Read referenced files as inputs. |
| Draft a new file or document | Write to the requested destination, or choose a separate new destination if unspecified. |
| Edit or update a named file in place | Change the authorized part of that file. Preserve surrounding text, identifiers, and links. |

**Before any file write, identify the user's instruction to persist the result and the destination it authorizes.** Merely naming a file after “rewrite” or “improve” identifies the source. For “Rewrite draft.md. Return only the update,” read draft.md and produce the update in the reply. “Update draft.md in place” authorizes editing it. “Write the update to review.md” authorizes writing review.md. Use the reply when the destination is ambiguous. For a return-only or no-edit request, finish in the reply without patching or creating files.

Use [README Maestro](../readme-maestro/SKILL.md) for navigation and reader routes. Apply the wording checks here to the resulting text.

## Write for the reader

- **Replies and handoffs:** Lead with the answer, outcome, or request. Explain the immediate consequence and give the next action when it matters. Use the requested length and return only the text when asked.
- **Documents and reports:** Make the document stand on its own. Put the decision or main finding first. Give the reader the relevant method or evidence, limits, and decision condition where they need them. Use headings to separate distinct reader questions. On a scoped edit, do this inside the requested section using the document's existing structure.
- **Both:** Use familiar words where they preserve the same meaning. Keep standard terms the reader needs for precision or lookup, and define unfamiliar terms where they first matter. Use one term for each concept. Remove padding and repeated conclusions.

## Keep the measurement and claim intact

Before simplifying a material result, identify what was tested, what counted as success, the threshold if given, the result and denominator, and any comparison or condition that changes the conclusion. Keep exact operators and units. For a rank outcome, say what had to rank where. If a short name or caption cannot carry the full definition, put the rest in its adjacent definition or sentence.

Keep a planned result separate from a later exploratory check. Keep a completed process, a software check, and an outcome for a trained model distinct. Preserve the population, comparator, and strength of the claim. Report missing evidence where it affects the decision, and make the next check specific when one is known.

## Name things by what they do

Use a verb for an action and a concrete noun for a value. Name a measure for its recorded outcome, such as `safe_capture_first_rate` when a safe capture must rank first. Use established terminology when its meaning is precise. Preserve public names verbatim unless a rename is authorized. For a proposal, distinguish internal names from public identifiers and explain which one stores what.

## Check the result

Check the finished text against the source. Can the intended reader state the decision and recover the success condition and result without guessing? Check any consequential quantity, qualifier, or limitation that changed during rewriting. For an edit, verify the requested section and confirm the final diff stays within scope. For a reply, return it in the requested form.

## Score and rank writing

Score from 1 to 10, where **1 is clear and 10 is the most slop**. Judge what the writing does to the reader. Style alone gives no basis for identifying who or what wrote it.

Pick the audience, the purpose, and the text being scored. Use the same audience and purpose for competing drafts. When judging unrelated passages, state the audience and purpose for each. For a long document, judge the whole piece and quote representative passages. Score individual passages only when asked or when identifying where to revise first.

Give each category 0, 1, or 2 points. Count each flaw under the category that best explains its effect. An unexplained pass usually belongs under Concrete detail. Claiming a pass proves more than was measured belongs under Accuracy and scope. Sum the five numbers and report a minimum of 1.

| Category | 0 points | 1 point | 2 points |
| --- | --- | --- | --- |
| Main point | The reader quickly finds the answer, result, or request | The point takes some hunting | The main point is missing or buried |
| Words | The intended reader understands the terms or gets the explanation they need | Some terms or labels take extra work | Key terms rely on unexplained jargon, shorthand, or vague abstractions |
| Concrete detail | Actions, results, and numbers have enough context for the purpose | One useful comparison, example, or detail is missing | Vague claims or unexplained numbers hide what happened or how to judge it |
| Flow and filler | The order makes sense and each sentence earns its place | Some repetition, padding, or backtracking | Dense clauses, filler, or scattered facts make the reader reconstruct the message |
| Accuracy and scope | Claims preserve what the source supports, including limits | A qualification is unclear or easy to miss | Wording materially distorts the evidence, upgrades an untested claim, or blurs what was measured |

Use these bands to sanity-check the score. **1–2** reads cleanly with minor friction at most. **3–4** is usable after targeted edits. **5–6** requires the reader to decode important parts. **7–8** needs a substantial rewrite. **9–10** leaves the reader unable to recover the point reliably or gives them a materially misleading account alongside other major problems.

Report the score, the five category scores, and the top one or two problems with exact quotes. Say what the intended reader would misunderstand or have to look up. Offer a short rewrite when it helps. When comparing drafts, list the clearest first and allow ties. Flag a material accuracy error separately even when the total score is low. If sources are missing, mark source accuracy unverified. Score any visible scope problem. Use 0 provisionally if none is visible and label the total provisional.

## Examples

Use [the 30 scored examples](writing-slop-examples.md) only when asked for examples, requested to calibrate against them, or when a specific score boundary is unclear. Read the relevant score bands. If the reference is missing, use the rubric above and say that example-based calibration could not be checked.

### Source-checked rewrite of the planned test and later search

"The planned test required a safe capture to score highest in at least two of three chess positions. That happened in one position. A more extensive search later found settings that made a safe capture score highest in each of the three positions. That search came after the planned test failed and has yet to receive independent review." [Stop report](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L31)

For a specialist who needs the method, add the exact test name and how the search differed once you verify those details.