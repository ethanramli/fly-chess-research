# Derived episode checkpoint candidate

Registered 2026-10-19 while the separate compiled-row timing campaign is live. Engineering proposal, not adopted or measured. Original experiment sources, checkpoints and receipt schemas remain frozen.

## Redundant work being removed

A temporal lesson starts with a zero transient neural state. Its bounded frame sequence and endogenous memory update are deterministic under pinned graph, model, timing, encoder, certificate and implementation identities. The current runner publishes the full transient vector in both pending and acknowledged checkpoints for each frame. It also converts that vector to decimal JSON for evidence and rollback. Lasting physiological memory is separately bounded and small.

Candidate: retain the lesson-start physiological memory, immutable experience/options, independently verified plan, unaided assessment binding, current physiological memory, frame cursor and receipt chain. Store transient episode metadata plus a versioned binary digest instead of its vector. Keep both atomic, synchronized pending/acknowledged publications. No change to neural arithmetic, feedback, learning or exposure.

## Explicit version boundary

Use new session, episode, frame/lesson receipt and disk-envelope schemas. The neural digest binds its schema, Float32/Float64 precision, little-endian encoding, length and exact bytes, including signed zero. The original JSON neural hashes and chains are historical evidence and are not rewritten. A separate independent auditor must compare numeric states and canonical teaching semantics; literal old/new receipt equality is not claimed.

The typed episode keeps existing begin/present/end behavior and a typed private rollback copy. Ordinary snapshots expose only metadata and a digest; they must not copy or serialize the full vector. A new FCD1 envelope uses existing built-in V8 serialization and level1 Zstandard with a SHA256 compressed-payload check and the existing16MiB output bound. It only accepts the new compact session; no implicit migration of old checkpoints.

## Recovery transaction

For an active episode, reverify the stored certificate and plan, restore lesson-start memory, begin from zero, rebind the recorded unaided assessment, and replay exactly the acknowledged prefix through the unchanged endogenous receiver. Require explicit pacing for every recovered frame. Bound replay to32 frames. Compare reconstructed current physiological memory, episode digest/metadata, pending plan/binding/cursor and receipt chain with the published checkpoint before accepting it or acknowledging its pending outer receipt.

Recovery replay reconstructs an already recorded state. It does not append teaching receipts or acknowledge additional learning events. Report its actual graph evaluations, elapsed time, CPU and RSS separately. On missing/mismatched/unknown certificates, changed identities, nonfinite state, wrong dtype/cursor, pacing failure or any reconstruction mismatch, reject the checkpoint and restore the prior in-memory session. While asynchronous recovery is pending, prohibit normal start/step/finish/snapshot calls. An inactive episode has a known zero state and needs no graph replay.

The runner must delay pending-receipt acknowledgement until successful session reconstruction. A root checkpoint with no active session may retain its existing idempotent acknowledgement path. Preserve exact run identity, atomic publication, log synchronization, resource guards and no duplicate pending updates. Do not import a new-format checkpoint into a frozen historical experiment.

## Gates before timing or adoption

1. Typed rollback and binary hashing: both precisions, offsets, signed zero, invalid values, dimensions, endian/version and mutation checks.
2. Matched lessons: all six actual G0 arms, positive/negative informative feedback, unknown handling, assessment-before-feedback, full numerical histories, local trajectories and physiological updates versus the original implementation. New hashes are independently derived from original states.
3. Every bounded fixture recovery cursor; fresh-process pending and acknowledged boundaries; corrupted payload/plan/certificate/memory/hash; failed, repeated and missing pacing callbacks; failed recovery rollback; no concurrent session use.
4. Core regression suite and wiring invariants. Then isolated full-graph recovery checks with original resource/pacing guards, followed by a separately registered matched timing campaign and independent audit.
5. Full defined training workload before/after, including setup, assessments, boundaries, informative and control lessons, durable publications and pacing. Selected lessons or component timings cannot satisfy the current greater-than83% total-reduction goal.

Primary built-in binary hashing/serialization and synchronization sources were registered in the training-latency source review. Bounded deterministic neural reconstruction is our engineering hypothesis; those sources provide neither a biological justification nor a local performance guarantee. No expected speed percentage is assigned.
