# Post-repair sibling evaluation

The [frozen protocol](protocol.json) evaluates all four saved condition memories on four previously inspected sibling positions, excluding the continuation's trained position. Learning is frozen, all legal moves are assessed, and certificates are independently checked.

[Audited result](../../reports/adaptive-near-transfer-repair-transfer-v1-2026-10-07/README.md): all choices fail; informative ranks worsen on two boards and stay unchanged on two against disabled plasticity. The separately frozen [audit correction](../adaptive-near-transfer-repair-transfer-audit-v1/protocol.json) preserves the original auditor failure and evaluation identities.
