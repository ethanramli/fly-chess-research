# Babysit accepted-memory handoff — 23 October 2026

## Finding and change of implementation priority

The resumed goal remains the complete unattended curriculum, with G0 excluded.
The preceding conversation supplied status, not implementation progress. Current
`fly status` still reports `not_registered`, 0/12 stages accepted.

Inspection found that the Stage 2 runtime constructs a fresh memory on every
arm. The Python campaign compares prior promotion hashes with the next stage's
initial hashes, but no Stage 2 loader consumes the accepted snapshot. Advancing
the stage number therefore cannot preserve the learned foundations. This is an
engineering gap, not evidence that neural learning fails.

Prioritize an actual accepted-memory handoff over additional source scans:
bind the preceding matrix result, independent acceptance audit, frozen selection
artifact and selected checkpoint to the registered prior stage and exact
condition/replica. Restore persistent neural memory before constructing the next
stage session. Preserve the new stage's own receipt/session state and replay the
same initial memory during independent audit. Refuse missing, failed, changed or
cross-lineage artifacts. No G0 or learner experiment is authorized by this work.

A separate inspection found that the matrix result keys are `replica/condition`
while the acceptance evaluator expects `replica:condition`. Existing evaluator
fixtures use the latter, masking the production mismatch. Resolve at the shared
lookup boundary while preserving published result identities and old artifacts.

## Verification

The accepted-memory loader is connected to Stage 2 training and replay before
the new teaching session is constructed. Seven offline checks pass: selected
rather than terminal memory, isolated control lineage, missing/skipped stages,
failed/unknown audits, changed artifacts, invalid lineage/path and rollback after
a guard failure. These are fixture contracts, not a neural learning result.

The Stage 1 observation evaluator now indexes matrix entries by their embedded
lineage identity. Its final-sealing fixture uses actual production slash keys and
passes (1/1). Published result objects/hashes are not rewritten.

Further call-path inspection found Stage 2's asset loader, encoder and Stockfish
session admit only Stage 2 panels, while the shared planner explicitly requires
an earlier-stage rehearsal panel. Thus every proposed Stage 2 block would stop
as `missing-earlier-rehearsal-stratum`. Extend this actual path to admit pinned,
training-only Stage 1 rehearsal, preserving Stage 1 projection stimulation and
per-panel proof/review contracts. Do not make a same-stage panel impersonate an
earlier foundation. Verification of this extension is pending.

The mixed Stage 2/Stage 1 block fixture delivers four events with real task
certificates through a mock learner and independently replays them. It passes;
it does not demonstrate connectome learning or live Stockfish quality. The new
encoder also preserves Stage 1 tokens/stimulation for the same projection pins.

The first five-file Node test invocation could not spawn child test processes
(`spawn EPERM`); raw output is preserved in
`runs/babysit-stage-memory-handoff-checks-v1/tests.log`. Native in-process test
isolation ran 16 checks successfully, but one import failed because the matrix
CLI parsed the test runner's positional arguments at module import time. Move
parsing to the actual `main()` call, preserving explicit programmatic arguments.
Keep the failed invocation in `no-isolation-tests.log`; rerun after this fix.

No graph, learner, Stockfish or source-corpus process was started.

## Completed checks and remaining gate defects

After deferring CLI parsing to invocation, the same five-file in-process suite
passes **17/17**. Raw output:
`runs/babysit-stage-memory-handoff-checks-v1/no-isolation-tests-fixed.log`.
The failed invocations are preserved beside it. No core neural update equation
changed. Fixtures use mock learning/engine responses; real task certificates and
receipt replay are checked. No claim of neural learning or campaign readiness.

The Stage 2 training-family document now contains both Stage 1 and Stage 2
training assignments, with a single cumulative registration hash. Both stages
retain their own certificate and Stockfish review schemas. The Stage 2 learner
requires the versioned `stage2-with-rehearsal` encoder; identical projection
settings preserve Stage 1 stimulation. It still needs audited cumulative data,
the independent acceptance evaluator and the rest of the campaign.

Static review also found two open defects in the existing Stage 1 observation
evaluator. It selects checkpoints separately for controls instead of comparing
them at the informative arm's selected block, and considers every block rather
than the declared 8/16/24/32 publications. It treats end-of-training validation
as retention without delivering the eight additional interference blocks. These
are engineering/interpretation errors, not measured retention results. No final
data was opened or stage accepted in this work. Preserve existing code/evidence;
correct the execution/evaluation path against the frozen protocol before using
it for promotion or extending it to Stage 2. Do not loosen frozen gates, start
G0, or resume source scans.

The handoff additionally reads the hash-pinned predecessor registration and
rejects graph, mapping, model/readout-source, plasticity, replica-seed or earlier
projection changes. Only the declared task family expands. The extended focused
suite passes **18/18** in
`runs/babysit-stage-memory-handoff-checks-v1/pinned-identity-tests.log`.
Syntax checks of the Stage 2 factory/constructor pass. `git diff --check` reports
two pre-existing trailing-whitespace lines in the already-dirty handoff history;
these unrelated historical lines were left intact.
