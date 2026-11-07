# Start here

**Open the example where the fly gets identical eye input for a capture and a non-capture in the [full problem list](ranked-problems.md). Allow about two minutes.**

Review date: 2026-11-02. Simple-English rewrite: 2026-11-03.
The explanation changed. The findings and saved test results did not change.
No code was fixed. We did not train or run the simulated fly.

## Four problems to address first

1. **The fly receives the same eye signals for two different moves.** In one position, its rook captures a black pawn on a4. In the other, a4 is empty, so the rook captures nothing. The task gives the moves different correct answers.
2. **The result checker can report success without checking any answers.** This was reproduced with an empty list. It does not show that the earlier test had an empty list.
3. **The training command skips safety checks before training starts.** Its settings call it a `check`, although it runs the fly simulation.
   The skipped checks include whether research is paused and whether another fly simulation is already running.
4. **The fly changes its memory between move scores in the pilot.** It scores one move, updates memory, and then scores the next move. The separate final tests do not update memory while scoring.

## Four further parts of the plan need work

1. The eye test sets a connection multiplier (a number that scales the effect of a connection) to 1.8. The inspected learning rule allows a maximum of 1, so the fly cannot reach the test setting through that rule.
2. One promised en-passant sequence cannot happen: the task requires a first capture, but en passant is allowed only immediately after the other pawn moves two squares without capturing.
3. The separate answer file can return an answer only when all 308 eye-input values match a stored example. That alone cannot explain how the fly would use learning on a different chess position.
4. The later reasoning tests need exact example positions, the minimum score needed to pass, and rules for when each test ends.

**The goal stays reasoning, not repairing biological memory.**
These findings identify misleading test paths. They do not prove that reasoning is impossible.
No fix was selected overnight.

The [full list](ranked-problems.md) links each problem to evidence.
The [review index](README.md) links all separate reports and sources.
The [word list](writing-notes.md) explains technical terms.

**Next: read the full example showing identical eye input for a capture and a non-capture.**
