# Smothered positive-channel eligibility probe

Completed 2026-10-07 after the five-condition acquisition run became terminal and its independent record audit passed. This is a single verified positive-feedback replay from a fresh memory state for each of four already-tested input variants. It tests whether the reward cue reaches eligible KC-to-MBON inputs and whether the saved local equation changes those gains. It does not test a post-training move choice.

## Results

| Input variant | Active PAM02 edge-associated KC entries | PAM02-associated edges changed | All mapped edges changed |
|---|---:|---:|---:|
| Original | 0 / 84 | 0 | 39 |
| Conjoined | 2 / 84 | 2 | 55 |
| Balanced | 10 / 84 | 10 | 85 |
| Conjoined-balanced | 12 / 84 | 12 | 92 |

The original cue had no active KC entries on the 84 mapped PAM02-associated edges, and no gain in those edges changed. Balanced and conjoined-balanced projection produced active entries in the positive-associated groups under this replay. Counts are **edge-associated KC entries**, not necessarily distinct neurons. The total changes include PPL103-associated groups; they must not be attributed to the positive channel.

This narrows the prior eligibility diagnosis: input projection changes can make positive-channel-associated activity measurable for this one event. It does **not** show that a candidate choice improves, that the memory is useful, that negative feedback is controlled, or that learning transfers. The positive channel's fixed negative modulatory polarity is still only the registered computational approximation.

## Verification and provenance

- Frozen protocol: [protocol.json](../../data/smothered-positive-eligibility-v1/protocol.json), SHA-256 `d1e070c3a57f43ed84573e8fedea1279d1560140ae0e6882a9734c6a65bf8093`.
- Raw report: [report.json](report.json), SHA-256 `d87d8b5db57938f87dc201279c907559d6fa923f96f7aed393cd72478236c880`.
- Independent audit: [audit.json](audit.json), SHA-256 `e804f474cf60df8bbb0a31237ec6ad1578801dee0c553d2378019ac143987fcb`; it passed one certificate replay and 3,480 edge-level recurrence checks, binding the report SHA above.
- Every receipt is atomically published and hash-bound in the report. Receipts retain the teacher proof and pre/post fixed-state hashes so the audit can verify evidence independently.
- The protocol pins the completed acquisition report/audit, all four prerequisite report/audit pairs, mapping, graph, annotations, package lock, Node/chess.js identities, and all transitive local source files. It was run serially with Node v22.23.2, a 256 MiB heap, and CPU duty 0.5. The invocation used 5.44 seconds and peaked at 103.46 MiB RSS.
- Runner command: `node --max-old-space-size=256 .codebase/scripts/diagnostics/probe-smothered-positive-eligibility.mjs --out research/reports/smothered-positive-eligibility-v1-2026-10-07 --cpu-duty 0.5`.
- Auditor command: `node --max-old-space-size=256 .codebase/scripts/diagnostics/audit-smothered-positive-eligibility.mjs --run research/reports/smothered-positive-eligibility-v1-2026-10-07 --out research/reports/smothered-positive-eligibility-v1-2026-10-07/audit.json`.

The acquisition result remains [2 successful and 38 failed condition-level experiences on one fixture](../smothered-acquisition-v1-resumed-2026-10-07/README.md), with all final choices failing. This probe is not a new puzzle success and does not meet the project goal of transferable reasoning.
