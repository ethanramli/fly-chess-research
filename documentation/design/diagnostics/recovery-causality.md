# Recovery causality: single-event memory replay

2026-10-06. [Frozen protocol](../../../archive/early-development/research/data/recovery-causal-v1/protocol.json) completed: **each intervention prevents only 1/5 selected revivals; no correct choice emerges**. The original objective remains transferable reasoning through verified consequence feedback, not successful memory interventions.

Adaptive review failed with five previously reviewed mistakes returning to the top. A read-only decomposition found recovery of old-action-associated gains at every revival, but that correlation could not establish causation. This follow-up replays the five saved training events (attempts 4–8), preserving the exact encoder, full graph, readout and all 26 legal candidates.

Three conditions start from each event's recorded pre-update state and recorded local activity:

- Recorded post-update gains: reproduce the saved full-root response exactly.
- Suppress-positive: keep recorded depression, replace every positive net gain change with its pre-event gain.
- Remove-recovery-term: recompute the single event as `clip(g + eta * D * k)`, omitting `eta * D * (g - 1)`.

The latter two are artificial interventions, **not learning rules proposed for biological acceptance**. They use saved neural activity, not teacher-chosen deltas or new trials. No source memory, completed gate, wiring, sign or unpermitted parameter changes. No retraining, candidate exclusion or decoder calibration. Recurrent transmission then runs afresh from zero for each candidate. Persistent state stays unchanged during measurement.

Measure which revived mistakes remain preferred, actual full-root choices and independently verified mate outcomes. Preventing a selected revival while leaving another mistake preferred identifies a numerical contribution to that event, not a useful task repair. Event selection comes from the failed training trajectory; it supplies no unbiased generalization estimate. The experiment does not establish a rescued training trajectory, biological necessity or unfamiliar-position transfer. No feedback is delivered during this replay.

Fifteen jobs, at most 512 presentations per invocation, serial sparse full graph, heap 256/duty 0.5 and existing resource guards. Atomic checkpoints after each job allow exact resume into a new directory. The independent auditor reconstructs both interventions, all legal coverage, ranking arithmetic, recorded reproductions, certificate binding and source identities. A one-job resumed replay tests checkpoint fidelity.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-recovery-causal.mjs --out research/reports/recovery-causal-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-recovery-causal.mjs --run research/reports/recovery-causal-v1-2026-10-06 --out research/reports/recovery-causal-v1-2026-10-06/audit.json
```

The current source-derived rule is unchanged. A positive causal result would justify testing its recovery behavior and representation separately when designing a supported replacement; it would not justify installing either artificial intervention as the learner. Long-delayed attribution, richer feedback, unfamiliar/counterfactual tests and broader adaptation still need implementation and validation.

## Results and next implication

[Raw evidence and commands](../../../archive/early-development/research/reports/recovery-causal-v1-2026-10-06/README.md): both interventions replace attempt 4's Kh6 with Qf6, another previously rejected non-mating action. Four later revivals survive both interventions. All 15 recorded/intervened choices fail independent mate verification. All recorded responses reproduce exactly, 15 memory masks/proofs audit, a resumed one-job prefix matches and 52 tests pass. Main 390 presentations: 108.84 MiB peak RSS, 164.424 elapsed seconds, 79.750 CPU seconds; heap 256/duty 0.5.

This weakens a recovery-only explanation. Recovery contributes to the specific event-4 top ranking, but eliminating it for a single event does not generally prevent the observed revival or correct choice. Accumulated recovery over earlier events was not removed, so the result does not rule out a trajectory-level contribution. Representation/readout and supported memory capacity must be investigated alongside recovery; no artificial intervention is installed as a learning cure. A fixture success would still require separate unfamiliar/counterfactual reasoning tests.
