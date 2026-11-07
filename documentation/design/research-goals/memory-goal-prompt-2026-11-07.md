# /goal prompt for the memory claims (2026-11-07)

Paste the block below after `/goal` in a new chat. Its single source of truth is the [memory handoff](memory-handoff-2026-11-07.md); the prompt only adds the done test, the loop and the working rules.

```text
Make the fly's own memory meet properties P1, P2 and P3 of documentation/design/research-goals/memory-handoff-2026-11-07.md, in one registered, independently audited chess run. Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). This goal authorizes design, review, build, dry runs, full runs and audits for memory tests that serve P1-P3, with full CPU.

START: read, in order, AGENTS.md, the memory handoff (all of it), documentation/next-checkpoint.md, and the newest runs/**/manifest.json. Check live node/python processes before you launch anything.

DONE only when one run meets all of these, in every seed, with gates written before the run:
1. P1, the fly's connections: the primary arm's lasting change is in modelled fly synapses, by a rule with a named primary source, with the teaching signal delivered through identified dopamine neurons. No engineered store in the primary arm.
2. P2, lasts during new learning: learn group A, then group B, then test both. A keeps at least 0.70 of its learned margin, B is learned, and the capacity used and every overwrite are reported.
3. P3, new positions without clues: test boards from games never used in practice, scored over ALL legal moves, with no candidate filter. The learning arm beats learning-off and shuffled feedback, with a game-clustered bootstrap lower bound above 0.
4. Fair and checked: identical experiences in all arms, rechecked certificates, s/c ties, RSS <= 2048 MiB, free memory >= 256 MiB, and an independent audit PASS, pinned.
5. Report: limits before wins, checked line by line against P1-P3 of the handoff. Raw-input and random-feature arms reported beside it. Labelled "fly connections", never "engineered memory".
P4 (lessons, reasoning) belongs to Volume 3 and is outside this goal.

LOOP for each version:
1. Name the property (P1-P3) and the mechanism. Use one stabilising mechanism with a primary source; start from research/reports/memory-interference-diagnosis-2026-11-01/next-mechanism-decision.md.
2. Write the proposal and its gate. Get a strict Codex review: codex exec -c model_reasoning_effort=high (never xhigh). Revise until it allows building.
3. Build with Haiku agents (xhigh): small scoped tasks, at most 4 at once. Every agent prompt says: read .agents/skills/ponytail/SKILL.md first. Review and run the tests yourself. Codex reviews the code before launch.
4. Dry run, its audit, then the full run and its audit. Launch every run detached (curriculum.launch_detached), dry runs and audits included.
5. Record the result and every mistake and pivot in the journal, the decision log, current status and next-checkpoint, before moving on.
6. On failure: diagnose with evidence, mark hypotheses, and write the next version. A finished gate never changes. A filter, a hint or an engineered store in the primary arm is a new claim, not a fix. A proven bounded limit is Volume 4 evidence: record it, then try the next sourced mechanism.

STOP early, and report to the researcher, if no mechanism with a primary source is left to test, or if a required biological fact cannot be resolved from sources. Write what was tried, what failed, the best evidence for Volume 2 or 4, and the one decision the researcher must make.

STYLE: replies in simplified English (ASD-STE100), numbered points, ADHD mode. Ponytail ultra for code. Use usage with care: one Codex review per round, and small agent tasks. Never say EUREKA; that needs the reasoning and transfer gates.
```
