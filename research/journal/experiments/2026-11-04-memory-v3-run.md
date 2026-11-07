# 2026-11-04: memory v3 run

**Serves:** Volume 2, chapters To Learn and Evidence for Learning.

## Approval

The researcher approved the run on 2026-11-04: "continue on testing out the fly. use a little more CPU, finish it in 1.5 hours", then diagnose the mistakes. v3 runs as built, with the defects the pre-run audit found (tie rule, missing feedback certificates, shuffled-control exposure). Its result cannot support the comparison claim against the no-memory arm, because that arm scores zero by construction. The graph arm's own score against chance and the other arms is still a measurement.

## Change 1: CPU duty 1

1. The runner asserted `--cpu-duty 0.5`. It now accepts 0.5 or 1. At 0.5 the pacing arithmetic is the same as before. The manifest records the duty.
2. **Mistake (process):** `python actions/curriculum.py` allows only duty 0.5 or 0.75 (`curriculum.py:329`). That file is pinned by every registration, so changing it would change many pins. The registered argv (duty 1) was started directly with `node`, not through `fly.cmd start`. Logs: `runs/python-actions/engineered-memory-test-v3-direct-20261104/` and `...-v3-r2-direct-20261104/`. The run writes its own manifest with PID, argv and pins. The direct launch runs inside the agent session job, so it stops if the session closes.

## Mistake 2: v3 ran out of JavaScript heap (code)

1. **What happened:** the first launch (`runs/engineered-memory-test-2026-11-03/engineered-memory-test-v3/`) died after 47 s with "JavaScript heap out of memory" at the 256 MiB heap limit. It died in step 4, while it kept the eye input of all 21,053 (position, move) pairs.
2. **Why:** each eye input is a list of `{index, current}` JavaScript objects. All of them together did not fit in 256 MiB. v3 was tested on synthetic data only, so the real size was never tried. The design's memory estimate (700-900 MiB RSS) counted the typed Kenyon-cell cache but not these object lists, which count against the heap limit, not only RSS.
3. **Second defect shown:** a V8 heap failure is fatal and skips the runner's `catch`, so the manifest still says `running`. Under AGENTS.md rules, `running` with no live process means interrupted. The folder is preserved unchanged.
4. **Fix:** eye inputs are now stored as an `Int32Array` of indices and a `Float64Array` of currents. Their data sits outside the JS heap and the values are exact. A round-trip assert checks one sample. The rerun writes to `engineered-memory-test-v3-r2`. Runner pin: `7a451c30...a5ca14`.

## Result-reading cutoff for memory v4

The memory v4 proposal (rev 3, `documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md`) had SHA-256 `29318f4cbf0d6c0c9d59e1f29ebbc0e0aba0053f5d4101ab7e64a6e275470f82` at 2026-11-04T12:33:46Z. At that time r2 was still in brain passes (33 records: split and progress only); no v3 arm score existed. Any later v4 change made after the v3 result is read must be listed as such.

## Outcome

r2 completed 2026-11-04 (7,927 s, peak 1,058 MiB): **does not pass**. Graph 1, 2, 8 of 184; raw 24, 18, 11; random 15, 22, 16; mismatched 2, 1, 4; none 0. Ties at the top decided most scores in every memory arm (graph 106-126 ties per seed), and practice exposure differed between arms (graph 12-14 safe experiences, raw 32-35). [Report](../../reports/engineered-memory-test-v3-2026-11-04/README.md).

## Mistake 3: runtime estimate (design)

The design estimated about 3 hours at duty 0.5, so about 1.5 hours at duty 1. The real run took 2 h 12 min at duty 1. Brain passes matched the estimate (about 55 min). Memory scoring took about 75 min, more than estimated, because every score scans every stored 5,177-value pattern and `frozenScores` scores each move twice. The v4 benchmark measures this cost before launch.
