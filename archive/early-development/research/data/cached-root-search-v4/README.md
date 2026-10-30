# Cached root assessment to Monte Carlo v4

Protocol was frozen before execution and pins the exact runner, cache module, complete prior experiment sources, graph, annotations, neural report/audit, mapping, dependencies, task and search inputs. It requires schema v4 and a fresh output directory. [Runner](../../../.codebase/scripts/evaluation-and-performance/benchmark-cached-root-search-v4.mjs) and independent audit in `.codebase/scripts/evaluation-and-performance/audit-cached-root-search.mjs`.

The sequence models a repeated assessment: restore the same previously learned memory; make an all-legal fresh neural assessment and a second fresh neural assessment for a repeat check; then conduct one seeded all-legal two-evaluation Monte Carlo search from that same root/memory. Uncached mode repeats root graph presentations. Cached mode reuses only the exact root summary during search. The child position is evaluated fresh. No weight, input, search candidate or learning rule changes.

The task position is a training-only board already encountered in the audited shared-memory trial. The included event is an independently checked PPL103 failure whose published local update is the starting snapshot; the benchmark does not deliver another teaching event. Memory remains frozen during assessment/search. The original root board and full move history are included in the cache key.

Both modes run heap256/duty0.5 with RSS768MiB/free256MiB guards. All32 legal root candidates are required. Fresh repeated assessments, exact search policy/trace parity, preserved fixed parameters/memory and independent certificates are required. An audited cached hit must occur during actual PUCT root evaluation after the fresh assessments. This measures an optimization opportunity in the assessment/search flow; it does not show acquisition, transfer or stronger play.

The neighboring v1/v2/v3 experiments preserve runner/path mistakes. V1/v2/v3 artifacts are not admissible evidence; see `research/reports/cached-root-search-v1-2026-10-07/INVALID-RUNNER-IDENTITY.txt` and the attempt notes. Only a v4 protocol/schema matched report with `AUDITED.json` is interpretable.
