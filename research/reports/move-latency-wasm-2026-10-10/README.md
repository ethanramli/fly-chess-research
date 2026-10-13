# Exact WebAssembly sparse accumulation

Status: adopted and verified. Full-graph timing, source/sample audit, 221/221 production regression checks and loader-free HTTP move application pass. Earlier pending statements below preserve preregistration history and are superseded by the completion addendum.

The [zero-reset predecessor](../move-latency-zero-reset-2026-10-10/README.md) failed its frozen latency gate and remains unadopted. This candidate changes only serial CSR accumulation to a dependency-free built-in WebAssembly kernel. Float32/float64 loads match model precision; separate double multiply/add retain original edge order. Every activation buffer, nonlinear activation, readout, derivative and learning update stays in the original trainer. It does not skip graph edges, time steps or legal candidates.

Signed weights, row/column indices and drive are recopied once per forward, and prior activity once per recurrent step. This avoids stale input caches when physiological memory, parameters or a checkpoint change. Linear memory cannot grow and is capped at 128 MiB; the actual comparison must stay within 768 MiB RSS and 256 MiB free memory. Source/model/graph/memory identities and candidate count remain pinned. The supported path includes both model precisions and null or explicit initial states.

Three [synthetic exact-equivalence groups](equivalence.test.mjs) passed before graph use. [Candidate](candidate-trainer.mjs), [oracle](oracle-trainer.mjs), [source manifest](source-manifest.json), [new frozen comparison](protocol.json) and [benchmark](benchmark.mjs) are preserved. Native compiler/assembler commands were absent. The bounded module is encoded using the [primary WebAssembly specification](https://webassembly.github.io/spec/core/binary/instructions.html); engineering provenance/assumptions are registered in [the source register](../../literature/source-solution-register.md).

Full candidate regression passes 221/221 with the verified trainer-substitution loader ([successful raw output](candidate-full-regression-retry.txt)). The first attempt passed 220/221 and its synthetic Stockfish resume guard rejected a source/protocol mismatch ([preserved failure](candidate-full-regression.txt)); the pinned FlyBench runner hash differed from the current file. The retry used the new stable file and passed without weakening guards. This is software evidence; timing remains pending.

The comparison retains four fixtures, four measured alternating pairs per fixture, one warmup pair, exact all-candidate activity and score equality, median improvement and no worse p95 for every fixture, duty 0.5 and the original graph. No predecessor gate is relaxed or fitted. It is an engineering comparison with no feedback or learning claim, not a mainline learner experiment. The next informative-feedback scientific condition remains separately preregistered and must include matched controls.

After confirming no live graph/experiment process, run from the repository root:

```powershell
node --max-old-space-size=256 research/reports/move-latency-wasm-2026-10-10/benchmark.mjs --out runs/move-latency-wasm-v1 --cpu-duty 0.5
```

Adopt only after exact state/choice equality, resource and latency gates, full candidate regression, and browser HTTP move application pass; rerun unfiltered `npm test` on adopted production code. Archive any failed comparisons unchanged. The staged import path will require a documented relocation to the same runtime helper when adopting; it does not change arithmetic. See [the dated mistake and pivot record](../../journal/experiments/2026-10-10-move-latency-zero-reset.md).

## 2026-10-10 result and adoption addendum

The [completed raw report](../../../runs/move-latency-wasm-v1/report.json) and [32 samples](../../../runs/move-latency-wasm-v1/samples.jsonl) pass the frozen gate. The [independent audit](result-audit.json) recomputes summaries, verifies legal candidate/score coverage and original source hashes, and checks reported resource bounds. Full-buffer equality was asserted during the comparison for all 92 legal successors; the audit does not independently rerun those computations.

| Development position | Original median | WASM median | Reduction | Original / WASM sampled p95 |
| --- | ---: | ---: | ---: | ---: |
| White start | 7.207 s | 6.396 s | 11.25% | 12.245 / 7.220 s |
| Black after e4 | 7.634 s | 5.864 s | 23.18% | 12.840 / 6.619 s |
| Six-ply opening | 17.424 s | 13.686 s | 21.45% | 21.476 / 17.858 s |
| Rook endgame | 6.218 s | 5.191 s | 16.52% | 12.221 / 9.865 s |

Only four measured pairs per fixture on one host: p95 here is the observed maximum, and scheduler/thermal variability is not isolated. These are warmed move-selection timings with CPU duty 0.5, all legal candidates and eight full graph steps unchanged. Aggregate medians 10.939 / 6.396 s mix positions and should not replace the per-fixture reductions. Peak RSS is 135.391 MiB, free memory at end 991.863 MiB, elapsed 465.392 s and CPU 222.344 s. No time-to-useful-learning, trained-policy, biological speed or universal latency claim follows.

[Staged HTTP verification](staged-http-verification.json) passes both colours through the existing server using the candidate loader: exact legal selected move/score, resulting FEN, history, replayable PGN and wrong-turn rejection. Fresh-server requests took 17.396 and 11.001 s; these have no matched cold baseline and are separate from warmed samples. The page was fetched, without visual browser inspection. The owned staged server was stopped before production changes.

[Production source manifest](production-source-manifest.json) records the import-only relocation; no arithmetic changed and frozen sources/results remain intact. Unfiltered production [npm test](production-full-regression.txt) passes 221/221 without a loader. Final production HTTP verification remains pending.

### Completion addendum

[Loader-free production HTTP verification](http-verification.json) now passes, including both colours, exact scores/moves, board/history/PGN replay, wrong-turn rejection and served page. Fresh-server requests took 7.209 s for black after e4 and 10.007 s for white start, with peak RSS 142.246 MiB; these are application checks without a matched cold baseline. [Actual server command identity](production-server-identity.json) confirms heap 256 MiB and no loader. The owned server was stopped after verification.

[Completion audit](completion.json) confirms production is exactly the staged implementation with its single import relocated, unchanged helper, successful raw tests and all verification hashes. Production regression raw output preserves PowerShell's UTF-16LE BOM; an initial collector decoding mistake and correction are journaled. The completed engineering outcome is 11–23% lower warmed median move latency on these four development positions, with unchanged full computation and selected actions. This changes execution speed, not playing strength or the unmet learning/transfer gates.

### 2026-10-10 independent-audit correction

The [independent audit](../independent-wasm-audit-2026-10-10/README.md) confirms all 92 full-graph successor trajectories and HTTP/test evidence, but rejects general checkpoint correctness due to an inherited stale signed-weight cache. It also identifies that historical 11-23% values above are lower-middle nearest-rank p50, incorrectly labeled median. Conventional medians show 19-40% reduction in the same four warmed fixtures; this adds no timing evidence or general guarantee. Original sources/protocol/statistics/results remain frozen. Follow the [separate checkpoint repair and reporting correction](../checkpoint-sync-repair-2026-10-10/README.md) for current status; this supersedes broader historical claims that all checkpoint changes were safe. The browser remains untrained and learning/transfer/Elo gates are unchanged.
