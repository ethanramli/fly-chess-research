# User's "unslop" variant of the humanizer pass

The user runs a custom anti-slop checklist (called "unslop"). It overlaps
heavily with the 29 patterns in the main SKILL.md but has stricter rules and a
few items this skill does not cover. When he says "unslop", "check for slop",
or pastes his unslop spec, apply BOTH rule sets. Where they conflict, unslop wins.

## Stricter than baseline

- **Em dashes: banned entirely, not just "overused".** No em dashes, no en
  dashes, no hyphens-as-dashes. Also: do NOT reach for parentheses as a
  substitute; that just trades one tell for another. End the sentence or use a
  comma.
- **Boldface: near-banned.** Don't bold proper nouns or acronyms either.
  Exception he allows: a bold lead-in that names the item, ends in a period,
  and is followed by genuinely new detail ("Schema in TypeScript. Tables live
  in one file."). A bold label that restates the line ("Performance:
  Performance improved...") must become prose.

## In unslop but not in the 29 patterns

- **Colon overuse.** Colons are fine before a list or example. Not as
  mid-sentence connectors. Rewrite to let the point stand on its own without
  comparison framing.
- **Curly quotes → straight quotes.**
- **Jargon nouns with plain substitutions:** substrate→base, wedge (in)→add,
  vector→way/method, gold-plating→more than the job needs, ratchet→the
  mechanism's real name / a limit that only tightens, evacuate→move out,
  endgame→last phase, north star / flywheel / nexus / locus / vantage /
  bedrock / scaffolding (metaphor) / primitive (noun) / modality / paradigm —
  all get concrete replacements.
- **"Say what it does, not how it feels."** "The database stays close at
  hand", "types that follow your schema" name a feeling. The fix names the
  mechanism or a number: ".toSQL() returns the exact string sent to the
  database". Test: if the sentence could appear unchanged in another project's
  docs, it says nothing about this one. Cut it.
- **Dense sentence split.** If the reader backtracks, break it in two. One
  idea per sentence.
- **Adverbs prop up weak verbs.** "runs quickly" → "is fast" or the number;
  "significantly improves" → the measured delta.
- **Plain word preference:** utilize→use, leverage→use, facilitate→help,
  numerous→many, "in the event that"→if.
- **Active voice by default.** Catch is/are/was/were + past participle and
  name the actor. Passive only when the actor is unknown or irrelevant.
- **Sentence-case headings, no decorative emojis anywhere.**

## Process addition on top of the skill's Process

After step 6's self-audit, also ask: "Which sentences name a feeling instead
of a mechanism?" and "Which colons/dashes are connectors pretending to be
punctuation?"
