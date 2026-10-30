# Training latency investigation

Target: more than40% less elapsed training time than the current implementation, with identical experiences, neural trajectories, feedback, rankings, controls and recovery. The competitor's raw benchmark is unavailable, so any comparison must name the baseline actually measured.

[Registration and mistakes](../../../research/journal/experiments/2026-10-19-training-latency.md) · [Raw evidence](../../../archive/early-development/research/reports/training-latency-2026-10-19/README.md)

| Process | Preserve | Investigate |
|---|---|---|
| Teacher and assessment | Certificate verification, unaided rankings, exact memory binding | Repeated cue encoding and deterministic assessment work; cache only under complete state validity. |
| Neural simulation | Full sparse graph, signs, eight steps, precision and summation order | Already uses serial WASM; measure recurrence, activation and data copies independently. |
| Local learning |122 eligible edges, full local trajectories, equation and timing | Snapshot/rollback allocations and unnecessary repeated plan construction. |
| Evidence | Memory, state, local trajectory and receipt hashes | Cost of expanding full numeric arrays; retain evidence compatibility and independent replay. |
| Persistence | Pending publication before acknowledgement, then durable acknowledged publication | Lossless binary state and native codecs; retain fsync/rename and both recovery barriers. |
| Pacing | Duty0.5, heap256MiB, RSS768MiB, free256MiB | Existing callback pacing omits subsequent checkpoint CPU. Report whole-process duty as well as requested pacing. |
| Recovery and audit | Exact continuation, no duplicate updates, full independent replay | Audit restarts from receipt0 after interruption; future resumable independent audit can avoid repeated work. Preserve the current live audit. |
| Learning effectiveness | Frozen per-criterion gates, controls, disjoint transfer | Faster execution does not repair failed learning gates. Time to equivalent quality must accompany speed. |

First measure existing-state persistence without loading a graph. Next select a representation after testing encode, durable publication, decode, bytes and equality. Preserve each source snapshot. Then, when authoritative process state permits serial graph work, profile complete informative lessons and matched controls: assessment, encoding, forward, plasticity, snapshots, hashing, both publications and pacing. Use identical parents and experiences in a new pinned engineering comparison; include interrupted/resumed pending-update recovery and independent replay. No production adoption or whole-training claim before that comparison.

Measurements alongside the live audit are provisional. Report raw paired samples, conventional medians, CPU, peak RSS, exact commands and identities. A40% elapsed reduction differs from a40% throughput increase. No G0, chess transfer or biological gate follows from an engineering pass.


## 2026-10-19 source-backed next candidates

[External review and exact call sites](../../../research/literature/training-latency-techniques-2026-10-19.md) covers binary typed-state serialization, native compression tradeoffs, shared fixed-size Wasm buffers and independent audit recovery. The source-to-solution register records scope and departures. Wasm-copy removal and audit checkpoints remain proposals pending attribution and a separate preserved registration.

The v3 paired comparison is queued after the current curriculum audit in the researcher-authorized exclusive window. It preserves all selected lesson operations and controls but omits cold setup and stage-boundary assessments; these remain part of whole-training validation. Keep its sources pinned while waiting.


## Structural costs to question, with fixed correctness boundaries

1. Full sparse recurrence is recomputed for every frame/action. An exact incremental alternative may reuse a row only when its drive, weights and relevant previous-state values are identical; dirty rows retain original edge order, precision and complete histories. No thresholding or approximate delta accumulation. The staged all-phase state-reuse observation is the first feasibility check, not proof of an engine speedup.
2. Pending and acknowledged publications contain the same large transient neural state while acknowledgement changes receipt metadata. More fundamentally, transient episode state may be deterministically reconstructable from a bounded lesson-start publication plus verified frame history, while persistent gains/traces and pending receipts still require durable publication before acknowledgement. Possible future designs include a shared immutable physiology blob or periodic full snapshots with bounded replay. Neither durability barrier, fsync, receipt binding nor exactly-once updates may be removed. Recovery cost must be counted explicitly, and temporary reconstruction must never duplicate a lasting update. This would be a new storage protocol with independent recovery proof, not a silent change to frozen artifacts. No implementation or win claimed.
3. Full independent audits currently discard verified work after interruption. Resume must use the auditor's own atomically published validated state, identities and receipt prefix; never trust the learner's assertion of validation. This helps interrupted workloads and must not be counted as a faster uninterrupted neural pass.

The researcher requested first-principles investigation rather than stopping after small wins. These structural hypotheses extend the existing code-path diagnosis; they do not relax scientific gates, resource bounds or frozen identity contracts. Prioritize evidence on whether large repeated work is avoidable before another compression/copy microbenchmark.


## 2026-10-19 causal reuse feasibility

The all-phase archived-state screen is complete. Cross-lesson corresponding states have median19.03% changed neurons; adjacent states have59.59%. Next measure exact causal rows using every retained intermediate state, current drive/alpha and permitted signed weights; equal outputs alone are insufficient. The registered trajectory-reuse-v1 observer still computes every row, verifies every claimed clean activity/next value and replays actual informative feedback plus controls with both durable publications. Timings include observation overhead and are not performance evidence. First validate the six-neuron integration, then execute the same72 selected lessons on the full graph. Whole-run timings and production adoption remain separate required work.
