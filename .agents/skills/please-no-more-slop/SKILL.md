---
name: please-no-more-slop
description: >-
  Write and review clear technical and research replies, emails, handoffs,
  documents, reports, and captions. Use when drafting, editing, explaining,
  simplifying, scoring, comparing drafts, or choosing names for code, files,
  APIs, or labels. Skip requests that only quote or return exact text.
---

# Please no more slop

Use the five-year-old test for both replies and documents. A child with no project background should be able to read the main explanation and tell you what happened, why it matters, and what happens next when a decision is open.

## Choose the deliverable before writing

| Request | What to deliver |
| --- | --- |
| Return, show, suggest, review, or score | Give the requested text or findings in the reply. Read referenced files as inputs. |
| Draft a new file or document | Write to the requested destination, or choose a separate new destination if unspecified. |
| Edit or update a named file in place | Change the authorized part of that file. Preserve surrounding text, identifiers, and links. |

**Before any file write, identify the user's instruction to persist the result and the destination it authorizes.** Merely naming a file after “rewrite” or “improve” identifies the source. For “Rewrite draft.md. Return only the update,” read draft.md and produce the update in the reply. “Update draft.md in place” authorizes editing it. “Write the update to review.md” authorizes writing review.md. Use the reply when the destination is ambiguous. For a return-only or no-edit request, finish in the reply without patching or creating files.

Use [README Maestro](../readme-maestro/SKILL.md) for navigation and reader routes. Apply the wording checks here to the resulting text.

## Write so a five-year-old can follow the main idea

- If the reader has to act, make the first sentence say what to do. Otherwise start with the answer or result. Use familiar words, name who or what did the action, and keep one main thought per sentence. Put causes and events in the order they happened. Repeat a name where “it” or “they” could point to two things.
- Use a concrete action in place of an abstract phrase in the main explanation. “Two people tried to get the last seat, and the site gave both a ticket” is easier to picture than “the simultaneous booking check failed.” Explain technical terms through what they do or what someone can see. For example, “the job wrote a second copy after midnight” says what happened. Replace words that make the main idea depend on specialist knowledge. If an exact term matters, put the plain meaning first. For example, “the scanner stopped talking to the library computer” explains a lost network connection.
- Put the reason before the details if the details would make the reader ask why. For a proposed test, explain the problem, what changes, what we look for, and how the result changes the next action. Use a short example when the reader would otherwise have to work out how a value affects the result. Explain each step of a calculation the reader needs to follow.
- Apply this to the main explanation in a reply and to the opening explanation of each important section of a document. Give the full technical detail the intended reader needs nearby. Use the requested format. For a one-paragraph reply or a caption, put the plain explanation directly in that text.

## Explain why a number or rule matters

- **Setting or cutoff:** Say what it changes, why it has that value, and what would happen if it were higher or lower when that matters. Distinguish a value measured or calculated from data from a threshold chosen for a practical decision. If the source gives no reason for the exact value, say so.
- **Check or measurement:** Say what two things were compared, what the result lets us conclude, and which condition it covers. “At least 99% survived” needs to say what survived and why preserving it matters. If the next check is in different conditions, name what changes and why it calls for another check.
- **Decision rule:** Explain the action in ordinary words before listing cutoffs. For each material comparison, say what it helps rule out and why that matters to the decision. Give one worked example if several cutoffs interact. Explain “drop” by naming the change we would stop pursuing. Explain “inconclusive” by saying what prevented a decision, such as a failed check, too few comparable cases, or a result between the cutoffs. Give the next check if it is known. If the written rules overlap, flag the overlap and label any proposed priority as a recommendation.
- **Implementation detail:** Mention it when it affects what the reader can do. Give the cause and effect in one plain sentence. “After the checker moved folders, it kept looking in the old place for the code it needs, so it can’t start.” Keep that explanation with the build step it affects.

Apply only the checks the reader needs. When a reader says they are lost, rewrite from the first idea they need to understand. Answer their “why?” and “what does that tell me?” before restating names or values.

## Keep the measurement and claim intact

Before simplifying a material result, identify what was tested, what counted as success, the threshold if given, the result and denominator, and any comparison or condition that changes the conclusion. Keep exact operators and units. For a rank outcome, say what had to rank where. If a short name or caption cannot carry the full definition, put the rest in its adjacent definition or sentence.

Keep a planned result separate from a later exploratory check. Keep a completed process, a software check, and an outcome for a trained model distinct. Preserve the population, comparator, and strength of the claim. Report missing evidence where it affects the decision, and make the next check specific when one is known.

## Name things by what they do

Use a verb for an action and a concrete noun for a value. Name a measure for its recorded outcome, such as `safe_capture_first_rate` when a safe capture must rank first. Use established terminology when its meaning is precise. Preserve public names verbatim unless a rename is authorized. For a proposal, distinguish internal names from public identifiers and explain which one stores what.

## Check the result

Read the draft once as someone who knows none of the project terms. Try to answer, in everyday words, the questions that apply:

1. What happened or what is the answer?
2. How do we know? If a number matters, what was counted or chosen, and why that value?
3. What does the result let us conclude? What remains open that affects how we use it?
4. What happens next? If there is a decision rule, can the reader explain why each outcome leads to its action?

Scan the opening and the next-step sentence for words such as “passes,” “rehearsal,” or “connection” used without explaining the action or result. If a reader needs to know what that word means to act, say what someone should do or see. Rewrite any sentence that still makes the reader guess. Recheck the meaning against the source. When an independent reader is available, give them only the finished text and ask them to explain it back. Treat your own check as an estimate of clarity. For an edit, confirm the diff stays within scope. For a reply, return the requested text.

## Score and rank writing

When asked how clear the writing is, count how many applicable read-back questions a reader could answer correctly from the draft alone. Give replies and documents equal weight when both are being graded. Keep file handling and activation out of this clarity score.

When asked for the repository writing rubric, score from 1 to 10, where **1 is clear and 10 is the most slop**. Judge what the writing does to the reader. Style alone gives no basis for identifying who or what wrote it.

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

"We tested the program on three chess boards. To pass, it had to put a safe move that takes a piece first on at least two boards. It did that on only one, so the test failed. We tried more settings and found one that worked on all three of the same boards. No one outside the team has checked that result yet." [Stop report](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L31)

For a specialist who needs the method, add the exact test name and how the search differed once you verify those details.
