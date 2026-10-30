# Adaptive near-transfer v4 audit correction

This separate frozen protocol audits the completed v4 panel report after the first auditor version incorrectly read the certificate hash from the wrong field. The original frozen experiment protocol and auditor source remain unchanged and are hash-checked against the preserved `auditor-v4-first-failure.mjs` copy in the run directory. The corrected auditor has its own source hash under this protocol.

The correction verifies input/source identities, all 20 condition-position panels, all 636 legal candidate scores, all 636 consequence certificates, move-choice ordering, success-move ranks, and unchanged memory. It audits the recorded neural output and does not rerun the neural evocations.

Command:

```powershell
node .codebase/scripts/puzzle-learning/audit-adaptive-near-transfer.mjs --protocol research/data/adaptive-near-transfer-v4/protocol.json --audit-protocol research/data/adaptive-near-transfer-v4-audit-correction-v1/protocol.json --run research/reports/adaptive-near-transfer-v4-2026-10-07
```

The audit correction validates report integrity and task certificates; it does not upgrade these related development positions into independent transfer families.
