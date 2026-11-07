# Memory goal (set 2026-11-04, night)

Set at the researcher's request ("write a new goal for yourself ... strictly stay within memory's scope, but it has to follow the definitions and the usefulness for volume 2"). Researcher's definition of done: "a memory that supports learning, so that it can learn useful memories that will be stored as experience."

**Serves:** Volume 2 only: chapter 3, To Learn (the memory component), and chapter 5, Evidence for Learning. Volume 2 question: *Can a simple organism-derived model based on a Drosophila connectome learn under computational constraints?* ([series plan](five-volume-series.md)).

## The goal

Show, with a test written before it runs, that the fly model's **content-addressed episodic memory** learns. "Learns" means that stored, verified experiences make the model's later choices on **new** positions better. The memory is the engineered component named in chapter 3 and is disclosed as engineered. Its content (the key it is searched by) comes from the fly's own Kenyon-cell activity. A fitted reader may help form that key only as a labeled aid, fitted on practice games only.

## Done when (all must hold in one registered, independently audited run)

1. **Useful on new positions.** Choices from the stored experiences beat (a) the same system with no memories and (b) the same memories with shuffled outcomes. The margin and bootstrap bound are fixed before the run, and the result must hold in every seed. Test positions come from games never used in practice, so this is not memorization.
2. **Improves with experience.** More stored experience gives a better score: the full store beats a quarter store, with a bootstrap bound above 0.
3. **Kept.** Earlier experiences still count after later ones are added. Measured, not assumed; evictions and overwrites reported.
4. **Fair and checked.** All arms get identical experiences. Feedback carries rechecked certificates. Ties are scored s / c. An independent audit reproduces every score. Laptop limits are met: RSS ≤ 2048 MiB, free memory ≥ 256 MiB.
5. **Honest scope.** Results are labeled "fly code plus disclosed engineered memory", never brain-only. Raw-input and random-feature results are reported beside them. Beating them is a separate, secondary claim, not part of done.

## Out of scope (do not drift)

Reasoning or transfer between concepts (Volume 3), search or Monte Carlo (Volume 2 chapter 4), limit proofs (Volume 4), Elo or playing strength (Volume 5), new datasets unless a memory test needs them, and unrelated refactors.

## How each iteration runs

1. Write the version's question and gate before it runs.
2. Strict Codex review (effort high) before launch.
3. Haiku agents build (at most 4 at once); the main session reviews and runs the tests.
4. Dry run, then the real run, then the independent audit.
5. Record the result, mistakes and pivots (journal, decision log, next checkpoint).
6. If it fails: diagnose, then write the next version. Never change a finished version's gate.

## Addendum 2026-11-07: this goal does not match the claims

v8 met this goal (audit PASS, 2026-11-07). The researcher's questions afterwards showed that the goal was too weak for their memory claims. It asked only for usefulness on new boards, it allowed an engineered store and a filtered choice, and it did not require learning in the fly's own connections or resistance to overwriting. It also placed an engineered memory in Volume 2, although the researcher's 2026-11-01 decision placed engineered memory in Volume 3. The text above is unchanged as history. The requirements now in force: [memory handoff 2026-11-07](memory-handoff-2026-11-07.md).
