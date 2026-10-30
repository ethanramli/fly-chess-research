# G0 history replication: projection seed 20261013

Registered 21 October 2026. Synthetic receiver diagnostic, not a G0 qualification or chess experiment. The scientific change from [seed 2](../g0-reversal-history-replication-v1/README.md) is the final predetermined projection seed; output paths and provenance change accordingly. The canonical runner and byte-identical copied auditor remain unchanged. See [protocol](protocol.json) and [registration](audit-registration.json) for exact pins, controls and commands.

## Question and interpretation

Does retained-memory reversal still fail a descriptive control comparison while complete-memory reset passes on the third predetermined seed? Seeds 20261011 and 20261012 show that pattern. A repeat supports a history-dependent limitation in this configuration; a different outcome demonstrates projection dependence and must be reported. Neither outcome identifies which memory component is responsible. Whole-memory reset changes gains and several traces together. No endpoint-floor saturation has been demonstrated. An interrupted or unaudited run remains unknown.

The feedback-enabled schedule is unchanged: 32 acquisition, 16 interference and 32 reversal lessons, informative/absent/disabled and three matched-shuffle arms, retained/reset branches. All 24 stages and 672 lessons must be replay-audited. Gates and exposure are not extended or tuned. Limits remain 16,000 neural presentations, 768 MiB RSS, 256 MiB minimum free memory, heap 256 MiB and CPU duty 0.5. These are computational replicas, not biological animals.

## Execution

```powershell
.\fly.cmd --config "python actions/curriculum-step-seed3.json" plan train
.\fly.cmd --config "python actions/curriculum-step-seed3.json" babysit --interval 300
.\fly.cmd --config "python actions/curriculum-step-seed3.json" status
```

The supervisor launches one registered train job and then its independent audit. Raw output and exact invocation records stay in `runs/python-actions/`; publication starts at `runs/g0-history-replication-20261013-v1`. Reinvocation after interruption must select the last complete compatible checkpoint and resume into a fresh directory. Do not restart because an observation timed out. This config uses the original runner; the separate lesson-pause adapter is not enabled here. Default `curriculum-step.json` is untouched; always supply this config for this run.

Protocol SHA256: `ddeffa58240f600dd93a68fe53a8aa2ad82d6a294f2de217ba7b4069d7953eb0`. Plan hash: `88e78fcff45be2ffb4a5f12063f4f6f5487886949cb04ed9705ea2398e3b0238`. Registration verified the original 33 source/dependency files plus graph and annotations; peak RSS during hashing was 71.99 MiB. Python preflight passed all four pins and serial/resource inspection. No scientific outcome is asserted by registration.

## Gate-blocking purpose and next step

This completes the predetermined projection replication before choosing a receiver intervention. G0's original reversal gate still fails, and Stage 1 training remains blocked. After full audit, compare all three seeds, then register one justified feedback-enabled mechanism test if reversal still fails. Meanwhile curriculum, certificate and corpus tooling may be prepared without graph learning. Do not substitute this diagnostic for the original three-replica G0 gate or unfamiliar chess transfer.
