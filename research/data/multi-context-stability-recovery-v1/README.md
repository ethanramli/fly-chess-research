# Stability pending-receipt recovery

[Protocol](protocol.json), SHA256 `ae7cc852777ac5e90e95e6bab212d53d361243ee47670f5681f4bd2b3d71090b`, pins published checkpoint00006 and its manifest. It is the informative event0 receipt-phase checkpoint with saved post-update memory and pending receipt. A one-event resume must publish the exact receipt without applying learning again, then reproduce both all-legal rankings with exactly66 new presentations and unchanged memory.

The protocol contains the exact bounded resume command. **Do not launch before the primary graph process is terminal and its report/audits have been checked.** Run serially into the new output directory. Validate all pinned identities before launch. Then use `.codebase/scripts/puzzle-learning/audit-multi-context-stability-recovery.mjs` with `--original`, `--resumed` and `--checkpoint` paths. This is persistence/recovery evidence, not a new learning seed or transferable reasoning.

Status: prepared only; no recovery graph replay or audit has run.
