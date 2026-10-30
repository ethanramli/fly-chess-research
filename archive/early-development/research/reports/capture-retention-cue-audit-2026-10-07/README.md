# Capture-retention cue audit

[Pinned raw report](report-v2.json) records the six candidate cues, verified consequences, retained attacker/blocker feature tokens, mapping/source hashes and encoder identity. Reproduce from the repository root with:

```powershell
node --max-old-space-size=256 .codebase/scripts/search-and-feedback/audit-capture-retention-cues.mjs research/reports/capture-retention-cue-audit-2026-10-07/reproduction.json
```

The actual reversal-candidate mapping and relational cue v3 produced **six distinct 14-cell stimulation patterns, no exact collisions, no outcome-label tokens, and at least one retained attacker feature for all 6 candidates.** All 3 candidates whose recapture ray is blocked retained at least one feature for that blocker. The raw record pins mapping SHA-256 `1751d9a5c0ca048068c0e6501d795b3fcba1242662db461b688f495a92b05b1b` and encoder identity `e959effabb3fb9bae6e1dbc9199f5edb1b8ac38443c15a40f97e57221bf65188`.

This passes a narrow *necessary input-distinguishability* check. It does not prove that neural activity binds the attacker and blocker, that the relevant relation changes local efficacy, or that the MBON ranking uses it. All fixtures are developer-created and inspected; they are not training, validation, or final-test families. No graph activity, learning, Monte Carlo search or transfer test ran.

The next step is to construct disjoint position families with varied attacker/blocker roles and nuisance context, then statically verify role information and balance before freezing any graph assay. Do not tune this encoder on a final set.
