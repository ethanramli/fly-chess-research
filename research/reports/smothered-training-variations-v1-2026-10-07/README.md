# Smothered training variation screen

2026-10-07. Six deterministic queen-start/rook-location variations of the already inspected smothered development motif, using chess.js rules and existing bounded independent mate certificates. All are train/development and finalTestEligible:false. Related coordinate variants do not constitute disjoint unfamiliar families.

The generator checks valid initial king exposure, every immediate mating move, and every legal root outcome under a3-ply task. Accept only no immediate mate, at least one verified success and no unresolved root outcomes. Preserve unknowns and rejected positions. A successful sacrifice on a certificate branch does not by itself prove necessity or a learned concept. No neural learning runs here.

Command:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/prepare-smothered-training-variations.mjs --out research/reports/smothered-training-variations-v1-2026-10-07 --cpu-duty 0.5
```

Generator/base-dataset hashes, planned positions and verification bounds in plan.json. Streamed certificates.jsonl; atomic per-position reports/checkpoints. Resource guard768MiBRSS/free256MiB; duty0.5. Terminal independent certificate audit remains pending. Tool session21177 was launched; dated observation does not establish current process status. Future learning must retain exact matched controls and establish interference/retention across training positions before disjoint transfer testing.

## Terminal audited result

Five training-only variations accepted; queen-e6/rook-e8 rejected because e6e8 is an immediate mate. Independent audit passes all190 legal-root certificates across6 positions; no unknown outcomes. Main invocation and audit are terminal. Accepted positions vary queen start/rook location within one inspected motif, so no disjoint transfer evidence follows. No neural learning occurred. report.json/audit.json preserve hashes and resource evidence.
