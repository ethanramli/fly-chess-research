# G0 neutral association assay v1

2026-10-11. [Frozen protocol](protocol.json) implements the curriculum's first prerequisite under the [registered design](../../../documentation/design/neural-learning/curriculum-g0-assay.md). Original acquisition/interference/reversal thresholds remain unchanged. Full-graph biological or chess-learning success is not claimed at registration.

29 local source/data files and three runtime dependency files are pinned. Graph/annotations/map identities, 122 positive KC-to-MBON12 edge endpoints and six MBON readout identities were checked before stimulation. The three input projection seeds are fixed and must produce different actual responses. Run the informative arm with all matched controls at 32/16/32 exposure, with continuous arm state and phase-level stopping on any unmet required gate. Unknown proof never teaches.

Commands from the repository root, preserving existing output directories:

```powershell
node --max-old-space-size=256 .codebase/scripts/neural-learning/run-curriculum-g0.mjs --protocol research/data/curriculum-g0-assay-v1/protocol.json --out runs/curriculum-g0-assay-v1 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/neural-learning/audit-curriculum-g0.mjs runs/curriculum-g0-assay-v1 --cpu-duty 0.5
```

Resume with --resume PATH_TO_LAST_COMPLETED_CHECKPOINT.json.gz into a new directory, the same frozen protocol/heap/duty/runtime/dependencies, and matching archived source bytes when live code changes. Never promote a .partial file. Every gzip checkpoint holds physiological and transient state plus pending receipt before acknowledgement; JSONL exposure and update chains are replayable. Initial injected-interruption and resumed invocations have separate resource records; partial-invocation numbers are not whole-run timing.

The small-graph V2 fixture has a separately frozen protocol in ../curriculum-g0-runner-fixture-v2. Preserve V1's mutable-publication failure and signed-zero audit rejection. The original [receiver-only preflight](../curriculum-g0-receiver-v1/README.md) remains historical software evidence; this package adds the actual frozen runner/auditor.
