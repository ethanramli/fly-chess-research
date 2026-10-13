# Shared-memory multi-context coverage v1

The frozen two-position experiment is terminal and independently audited. Protocol: [multi-context-coverage-v1](../../data/multi-context-coverage-v1/README.md). Run command used heap256, duty0.5, and 768 MiB RSS / 256 MiB free-memory guards.

The experiment presented two train-only positions from one smothered-mate motif family to one shared memory, cycling through four bounded context slots. Each current failure was paired with a pinned, independently verified positive move. All-context legal rankings were recorded after every teaching event. Absent, shuffled and disabled conditions replayed the exact informative sequence. Final unaided and fixed-search choices were measured separately. This is not an unfamiliar-position transfer test.

Preflight passed: both positive moves verified (`c4g8`, `b3g8`); the positions had 32 and 30 legal moves; frozen identities and prerequisite audits matched. Initial all-legal choices were `c4b5` and `b3c4`, both verified failures. The informative condition completed eight events; all controls matched its experience schedule.

**Learning gates failed.** Informative final choices remained failures (`c4b5`, `b3c2`), and both four-evaluation fixed-budget searches failed. Absent, shuffled and disabled controls also failed both positions. The shuffled schedule was identifiable. The independent audit passed and checked 154 certificates, 96 all-legal panels and 24 local recurrences; persistence/reset, fixed-state and matched-schedule checks passed.

The per-event panels show a limited but useful signal: the pinned successful moves ended at ranks 11/32 and 5/30 under informative feedback, compared with ranks 25/32 and 30/30 for absent feedback, 32/32 and 29/30 for shuffled feedback, and 24/32 and 30/30 with plasticity disabled. These rank changes did not put either correct move first and do not pass acquired-choice gates. They support further investigation of feedback-driven ranking changes, not reasoning or transfer.

Invocation resources: 2,923.14 s elapsed, 1,445.42 s CPU, 139.08 MiB peak RSS, and 3,977 presentations. These cover this invocation only, not any earlier resumed work.

Raw [report](report.json), [independent audit](audit.json), and [completion marker](COMPLETE) preserve the results. Report SHA-256: `8ab9f3a95ecd8db2e9a11166963743b23ffe018bddf06827c59be8c4582d38b5`. No transfer or reasoning claim follows from this same-family training comparison.
