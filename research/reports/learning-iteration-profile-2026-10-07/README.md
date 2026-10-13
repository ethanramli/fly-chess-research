# Learning-iteration timing diagnostic

Completed 2026-10-07T02:26:04.096Z on a single frozen training fixture.

One exact first adaptive all-legal choice-review-feedback-ranking cycle, plus its two frozen naive baselines. Same current policy, graph, cues, proof and local rule. No Monte Carlo search is included in this adaptive runner. This is a timing diagnostic, not a new learning result or optimization.

The cycle took 60253.0 ms wall time and 30296.0 ms CPU time, with 53 neural presentations. Exact pre-update assessment, selected move/certificate, post-update memory and post-update all-legal ranking matched the archived successful run.

This locates costs in the adaptive all-legal review and immediate-feedback loop. It does not profile the Monte Carlo search path or claim a speedup. Phase times are nested, and all pacing, guard, CPU and RSS rules remain recorded.

See `report.json` for raw phase samples, pinned source/input hashes and resource measurements.
