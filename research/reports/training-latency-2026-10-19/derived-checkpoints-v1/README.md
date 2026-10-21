## 2026-10-19 withdrawal addendum

Withdrawn at researcher request after9 targeted checks, runner syntax and npm255/255 passed. No full-graph run or timing. Original staged description below is historical. Source and design paths were moved to [the abandoned-candidate archive](../../../source-archives/training-latency-abandoned-2026-10-19/README.md); use its manifest for original paths. Do not launch these checks/actions or adopt this candidate.

# Derived episode checkpoint candidate v1

Staged2026-10-19. Untested and unmeasured at initial registration; not adopted. Current sources are recorded in [source-manifest.json](source-manifest.json). Legacy sources and the separate live compiled-row timing campaign remain unchanged.

- [Design, explicit format boundary, recovery and acceptance contract](../../../source-archives/training-latency-abandoned-2026-10-19/documentation/design/evaluation-and-performance/derived-episode-checkpoints.md).
- [Equivalence, every-cursor replay, fault and fresh-process recovery checks](equivalence.test.mjs).
- Reusable preparation action: `python actions/prepare_derived_checkpoint_candidate.py`.
- Own checks: `python actions/derived-checkpoint-checks-v1.json`, jobs `exact-check`, `runner-syntax` and `math-regression`. Do not launch while a graph timing campaign or its auditor is live.

The candidate inherits the original episode dynamics and temporal verification/binding, changes only transient rollback/publication/evidence representation, and makes recovery asynchronous with explicit per-frame pacing. Its G0 domain copy changes only the base-session import. Its runner is derived from the actual six-arm history-diagnostic path and delays pending acknowledgement until reconstruction is verified. Both synchronized pending/acknowledged publications remain. New receipts/hashes intentionally have distinct schemas; equality must be established through independent numeric evidence and teaching semantics.

No full-graph timing, complete-workload speedup, resource result, checkpoint adoption, biological or learning result is established. Recovery costs must be counted separately. Goal success still requires greater-than83% matched complete-workload elapsed reduction with correctness, quality, resources and recovery preserved.
