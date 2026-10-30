# Audited warm-start puzzle repair

One verified failure/success pair changes the unaided choice from failing `a1b2` to successful `d5g8` on the inspected queen d5 / rook f8 development position. The successful move rises from rank 2 to rank 1 among all 34 legal moves. Absent, shuffled and disabled-plasticity conditions start from the exact same previously acquired memory and replay the same experiences; all retain failing `a1b2`. Success ranks are respectively 2, 33 and 2. The shuffle is identifiable.

The independent [audit](run/audit.json) passes 45 certificates, 31 all-legal panels, 6 search records and 6 local recurrences, including reset/repeat/restoration and fixed-state checks. [Report](run/report.json) and [completion marker](run/COMPLETE) bind the evidence. This is one warm-start trajectory on a second familiar development position, not independent replication or transferable reasoning. Retention of the original trained puzzle after this update has not been measured.

Fixed-budget search succeeds in informative, absent and disabled conditions; shuffled search fails. Thus the new feedback demonstrates an unaided choice repair, not an improvement over those search controls. All conditions still fail the inspected support-shift counterfactual, choosing `h5c5`.

Invocation: 763.99 s wall, 336.03 s CPU, 120.65 MiB peak RSS, 1,319 presentations, heap256/duty0.5 and configured memory guards. These figures exclude the failed v1 prefixes.

The earlier v1 invocation stopped at the free-memory guard after publishing checkpoint 1. Its resumed prefix then rejected an unsupported `training` split label before teaching. Both prefixes remain in `../adaptive-near-transfer-repair-v1-2026-10-07/`; v2 uses loader-validated `train`/`fixture` labels. No frozen v1 source or protocol was repaired in place.

[Frozen protocol](../../data/adaptive-near-transfer-repair-v2/protocol.json) · [Subsequent no-feedback sibling evaluation](../adaptive-near-transfer-repair-transfer-v1-2026-10-07/README.md).
