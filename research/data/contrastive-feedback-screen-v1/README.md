# Contrastive feedback screen v1

This is a bounded development-puzzle screen, not evidence of reasoning or transfer. Its purpose is to test a verified failure/success feedback pair against absent, shuffled and disabled-plasticity controls under original and balanced cue projection.

The runner records an iteration timing ledger for every all-legal assessment and fixed-budget Monte Carlo call: neural presentations, legal/candidate counts, elapsed search and proof-verification time, completed simulations, neural evaluations, omissions and the stopping bound. Use that ledger to locate the current bottleneck before choosing a single optimization. Do not optimize a step solely because it is slow if the change removes candidates or degrades the learned choice; rerun the same puzzle and controls after any change.

Run only after checking that no graph experiment is active and completing the frozen input/source identities:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-contrastive-feedback-screen.mjs --preflight --cpu-duty 0.5
```

The full graph run and independent audit commands will be recorded in the report README after the frozen protocol is complete. The protocol and raw evidence remain separate from the general documentation status.

The completed v1 result is documented at [the audited screen report](../../reports/contrastive-feedback-screen-v1-2026-10-07/README.md). The following same-puzzle teacher-search iteration is [the forcing-prior comparison](../../reports/forcing-loop-v4-2026-10-07/README.md).
