# /goal prompt for the memory claims (2026-11-07, rev 2 2026-11-08)

Paste the block below after `/goal` in a new chat. Rev 2 moves the workflow into the `research-loop` skill (`~/.agents/skills/research-loop/`), so this prompt holds only the claim, the done test and the stop rule. The single source of truth for the requirements is the [memory handoff](memory-handoff-2026-11-07.md).

```text
Use the research-loop skill for the whole workflow (with deep-research, and ponytail ultra for code). Resume the FlyChess memory research: make the fly's own memory meet Property 1, Property 2 and Property 3 of documentation/design/research-goals/memory-handoff-2026-11-07.md in one registered, independently audited chess run. Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). This goal authorizes design, review, build, dry runs, full runs and audits for memory tests that serve Properties 1 to 3, with full CPU.

START with research-loop step 1. Read the memory handoff in full. Then read the journal discussion research/journal/discussions/2026-11-07-memory-claim-gap.md. Check whether the detached v6-r4 and v5 audits (runs/python-actions/detached/v8audit-first-20261107T0510/) have finished; record their results first.

DONE only when one run meets all of these, in every seed, with gates written before the run:
1. Property 1: the primary arm's lasting change is in modelled fly synapses, by a rule with a named primary source, with teaching through identified dopamine neurons. No engineered store in the primary arm.
2. Property 2: learn group A, then group B, then test both. A keeps at least 0.70 of its learned margin, B is learned, and the capacity and every overwrite are reported.
3. Property 3: test boards from games never used in practice, scored over ALL legal moves with no candidate filter. The learning arm beats learning-off and shuffled feedback, with a game-clustered bootstrap lower bound above 0.
4. Fair and checked: identical experiences in all arms, rechecked certificates, s/c ties, RSS <= 2048 MiB, free memory >= 256 MiB, and an independent audit PASS, pinned.
5. The research-loop claim check is answered in the report, limits first, against Properties 1 to 3. Labelled "fly connections". Raw-input and random-feature arms reported beside it.
Property 4 (lessons, reasoning) belongs to Volume 3 and is outside this goal.

First mechanism: start from research/reports/memory-interference-diagnosis-2026-11-01/next-mechanism-decision.md, and fix memory test v1's two design mistakes (the handoff, section 2a).

STOP and report to the researcher if no mechanism with a primary source is left to test, or a required biological fact cannot be resolved from sources: what was tried, what failed, the best Volume 2 or 4 evidence, and the one decision needed. Never say EUREKA; that needs the reasoning and transfer gates.
```
