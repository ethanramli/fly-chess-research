# 2026-10-30: full-r15 audit stalled after laptop sleep (CPU pacing counted the sleep as work)

## What happened

The full-r15 audit (runner v5 `--mode audit`, PID 9520, run `runs/lichess-stage1-synthetic-v1-full-r15`) started at 05:29 local at CPU duty 0.75. The researcher unplugged the laptop and then closed the lid. Windows System log:

- 06:44:06 Kernel-Power 105, power source change (unplugged). Babysit wrote `power-pacing.json` with duty 0.25 at 06:44:09.
- 06:44:26.63 the system entered sleep (Kernel-Power 42, lid).
- 08:13:00.48 the system woke (Power-Troubleshooter 1). The sleep lasted 5,313.85 s.

After the wake, the audit process stayed alive. Its working set was about 134 MiB, there was no stderr, and babysit reported it as `live`. But its CPU time stopped at 3,519.7 s. It did not change between 08:14 and 08:37 (0.0 s over a 45 s sample at 08:33; all 12 threads in Wait).

## Diagnosis

The cause was traced in code. The QueryPerformanceCounter behaviour is still a hypothesis that is being tested.

`MappedPuzzleBrain.evoke` (`.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs:47-54`; the Stage 1 brain `DualValencePuzzleBrain` extends it) times each synchronous forward pass with `performance.now()` and then calls `pace(elapsedMs)`. Runner v5 `paceFactory` (`.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v5.mjs:98-104`) rests for `elapsedMs × (1/duty − 1)`. It reads the duty once per call and does not reread it while resting.

`performance.now()` is wall-clock based (libuv hrtime, QueryPerformanceCounter on Windows). If the laptop sleeps during a forward pass, the 88.6 min sleep is measured as one forward pass. At the battery duty of 0.25 the runner then rests 3 × 5,314 s ≈ 15,942 s (4 h 26 min). Plugging in does not shorten that rest, because the duty is read only once per call.

**Prediction (falsifiable):** the audit's CPU time resumes at about 08:13:00 + 15,942 s ≈ **12:38:45 local**. It could be a few seconds later because of the remaining forward-pass time. If the duty had been read as 0.75, it would have resumed at about 08:42; it was still flat at 08:37 and is being watched. A background watcher logs when the CPU time first rises by more than 2 s.

## Scope and limits

- Pacing changes elapsed time only. The audit's replay and its gate results do not depend on it, so the r15 audit evidence is not affected.
- The same code path runs in training mode. A training run that sleeps mid-pass stalls the same way. It resumes correctly afterwards, but loses up to 3 × the sleep duration on battery (1/3 × on AC).
- Not caught by: babysit, which reports the process as `live` because a resting process is alive; the resource guard, because memory was normal; and the existing tests, which never suspend the OS.
- This is a mistake in our tooling, not in the learner.

## Decision

- Researcher (2026-10-30): "i dont really mind. just figure out what caused the bug." The audit is left running, so the prediction above tests the diagnosis. Nothing was killed or restarted.
- Fix for future runs, in a new runner version only (v5 stays pinned for r15): clamp the measured step time before pacing, and reread the duty during long rests. Unit test with an injected 5,000,000 ms elapsed value. Record the observed resume time here as an addendum.

## Addendum 2026-10-30 about 08:43 (time corrected): fix built (not yet used)

Runner v6 (`run-lichess-curriculum-matrix-v6.mjs`) clamps the paced step at 60 s and rereads the duty during a rest. Unit test: a simulated 5,314,000 ms step at duty 0.25 rests 180,000 ms, not 15,942,000 ms; a charger change mid-rest shortens the rest. v5 is byte-identical to its r15 pin. v6 takes effect only when a new registration points at it. Ledger L097.
