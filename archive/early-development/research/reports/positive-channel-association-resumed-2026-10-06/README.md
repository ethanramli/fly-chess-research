# Positive-channel association V1: complete, acceptance failed

The six informative seeds acquired and reversed strict choices successfully. Overall acceptance failed: acquisition-versus-shuffled effects had four positive differences and two ties, p=0.0625 at frozen alpha=0.05. Acquisition versus absent and both reversal comparisons had six positives, p=0.015625. Two acquisition shuffle schedules reproduced informative feedback. No gate is relaxed and no validated puzzle integration follows from this result.

Report SHA-256: `93176cbcb383a09e558d9619bd6d00108f64466355974325df9056f4364f7a66`. `audit.json` independently checks 480 transitions and 384 enabled local updates. `audit-prefix.json` additionally establishes exact pending-receipt recovery. The preserved `audit-correction.md` records the auditor's numeric signed-zero correction; raw records are unchanged. `source/` archives the frozen runner and neural implementation plus the corrected independent auditor and protocol.

Original command:

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-positive-channel.mjs --out research/reports/positive-channel-association-v1-2026-10-06 --cpu-duty 0.5
```

Windows EPERM prevented publication of checkpoint 207. Published checkpoint 206 remained authoritative; 207.partial was not acknowledged. Original interruption metrics: 100.76953125 MiB peak RSS, 256.4591444 seconds elapsed, 125.937 seconds CPU. Resume command:

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-positive-channel.mjs --out research/reports/positive-channel-association-resumed-2026-10-06 --resume research/reports/positive-channel-association-v1-2026-10-06/checkpoint-00206/state.json --cpu-duty 0.5
```

Resumed invocation: 104.03125 MiB peak RSS, 580.442391 seconds elapsed, 338.984 seconds CPU and 680 model evaluations. These are invocation metrics, not a complete uninterrupted-run measurement. Graph/input/source identities and Node version are in `report.json`.

The independent recovery replay resumed original checkpoint 00003 into `../positive-channel-association-prefix-2026-10-06/`, using `--max-trials 1`. It performed zero new model evaluations while acknowledging the pending event. Its invocation used 99.515625 MiB peak RSS, 1.0933087 seconds elapsed and 1.078 seconds CPU. Receipt hashes preserve the link to the original run; no pending neural update was duplicated.

This is a counterbalanced computational association experiment, not verified chess acquisition, biological retention, natural reward reconstruction or unfamiliar reasoning. A separately frozen fresh-seed balanced-control follow-up is documented in `../../../documentation/design/neural-learning/positive-feedback-v2.md`; it does not replace this failure.
