# G0 history runner fixture v1

2026-10-13. Frozen six-neuron software fixture for the [paired diagnostic](../../../documentation/design/neural-learning/g0-reversal-history-diagnostic.md). [Protocol](protocol.json) pins 30 source/data files, runtime dependencies and the 24-stage schedule. This is not connectome learning or a G0 pass. The independent diagnostic auditor is not yet implemented.

Run from the repository root:

```powershell
node --max-old-space-size=256 .codebase/scripts/neural-learning/run-g0-reversal-history-diagnostic.mjs --protocol research/data/g0-history-runner-fixture-v1/protocol.json --out runs/g0-history-fixture-v1-uninterrupted --cpu-duty 0.5
```

First full execution is in progress. Pending-receipt interruption/resume, exact receipt equality, branch/reset auditing and completed resource outcomes remain unverified. Preserve this frozen package and any failures; do not rewrite its source hashes after a correction.

2026-10-13 update: uninterrupted execution exited0 with all24 stages,14,161 receipts and15,481 forward presentations. Peak RSS108.578125MiB; elapsed522.2089045s. The separately preserved branch/reset auditor has been launched and is reporting progress; completed replay and interruption/resume equality remain pending. Fixture behavior does not establish connectome learning.
2026-10-13 full replay update: [uninterrupted audit](../../../runs/g0-history-fixture-v1-uninterrupted/audit.json) passed all24 stages,672 lessons,12,768 frames and14,161 receipts. The declared reset-boundary interruption run is now active in runs/g0-history-fixture-v1-interrupted at target receipt10119. Deliberate exit/resume, complete equality and resumed replay remain pending. Synthetic behavioral branch gates failed and cannot establish Fly learning.
2026-10-13 recovery update: interruption reached pending receipt10119 and published checkpoint-020240.json.gz. Parsed state confirms reset-informative stage18, cursor1, event count1 and prior receipts10119. Artifact intended exit75; shell tool reported1, so native exit code is unverified. Resume now runs in runs/g0-history-fixture-v1-resumed from the exact publication. Complete equality and resumed full replay remain pending.
2026-10-13 equality update: resumed run completed and [recovery checker](../../../runs/g0-history-fixture-v1-resumed/recovery-check.json) passed exact complete receipt bytes, final memory/result and count/chain equality to uninterrupted execution. The resumed artifact's full recurrence auditor is now running; its completed result remains pending. This is process-recovery software evidence only.