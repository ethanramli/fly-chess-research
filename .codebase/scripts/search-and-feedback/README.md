# Move search and feedback checks

[Scripts guide](../README.md) · [Code guide](../../README.md)

[Design and scientific boundaries](../../../documentation/design/search-and-feedback/README.md)

- [audit-consequences.mjs](audit-consequences.mjs)
- [audit-monte-carlo-review.mjs](audit-monte-carlo-review.mjs)
- [audit-pipeline-traces.mjs](audit-pipeline-traces.mjs)
- [compare-puzzle-search.mjs](compare-puzzle-search.mjs)
- [probe-consequence-clips.mjs](probe-consequence-clips.mjs)
- [probe-monte-carlo-review.mjs](probe-monte-carlo-review.mjs)
- [probe-verified-lines.mjs](probe-verified-lines.mjs)
- [audit-capture-retention-cues.mjs](audit-capture-retention-cues.mjs) · [raw audit](../../../archive/early-development/research/reports/capture-retention-cue-audit-2026-10-07/README.md)

Run from the repository root. Use the documented resource guards for experiments. Frozen protocols pin old source identities; use their archived sources for historical reproduction.

- [build-capture-retention-families.mjs](build-capture-retention-families.mjs) · [v2 generator](build-capture-retention-families-v2.mjs)
- [audit-capture-retention-role-ablation.mjs](audit-capture-retention-role-ablation.mjs) - [static preflight](../../../archive/early-development/research/reports/capture-retention-role-ablation-preflight-2026-10-07/README.md)
- [audit-capture-retention-nearest-cue.mjs](audit-capture-retention-nearest-cue.mjs) - [static baseline](../../../archive/early-development/research/reports/capture-retention-nearest-cue-baseline-2026-10-07/README.md)
- [audit-capture-retention-dataset.mjs](audit-capture-retention-dataset.mjs) · [audit result](../../../archive/early-development/research/reports/capture-retention-transfer-audit-v1-2026-10-07/README.md)

## Flip-pair benchmark

[check-concept-records.mjs](check-concept-records.mjs) checks the prepared boards against the landing-square checker and runs the shortcut controls. Use `--generate` to add 20 fresh constructed pairs of each type. Both commands run from the repository root.

```sh
node --max-old-space-size=256 .codebase/scripts/search-and-feedback/check-concept-records.mjs
node --max-old-space-size=256 .codebase/scripts/search-and-feedback/check-concept-records.mjs --generate --out flip-pair-check.json
```

The report counts a pair only when both best moves are chosen outright. The [roadmap evidence](../../../research/reports/combination-roadmap-2026-11-16/README.md) explains the controls and the scope of the result.
