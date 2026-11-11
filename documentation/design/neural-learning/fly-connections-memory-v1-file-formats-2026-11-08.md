# Fly connections memory v1: run file formats (2026-11-08)

Shared contract for the runner, the job loop, the judge and the independent auditor. Gates: [gates file](fly-connections-memory-v1-gates-2026-11-08.md). All JSON is UTF-8 without BOM. All writes of whole files are atomic (write `X.partial`, then rename). JSONL lines are appended with `appendFileSync`.

## Registration (`python actions/fly-connections-memory-v1-step.json` and `-dryrun-step.json`)

```json
{
  "schema": 1, "name": "fly-connections-memory-v1", "paused": true, "purpose": "confirmation",
  "volume": "2", "chapter": "3 To Learn; 5 Evidence for Learning",
  "paths": { "run": "runs/...", "packet": "runs/.../packet-dir", "aplPackage": "runs/.../apl-package-midpoint-v1",
             "graph": ".cache/full.npz", "annotations": ".cache/flywire-annotations-v2.1.0.tsv",
             "gates": "documentation/design/neural-learning/fly-connections-memory-v1-gates-2026-11-08.md" },
  "seeds": [7301, 7302, 7303],
  "arms": ["informative-local", "off-local", "shuffled-local", "absent-local", "informative-matched", "informative-global"],
  "workers": 6,
  "model": { "steps": 8, "inputDim": 1, "outputs": 1, "seed": 47, "precision": "float32", "saturation": 1.5, "recurrentScale": 0.9, "normalization": "row" },
  "limits": { "rssMiB": 2048, "freeMiB": 256, "wallSecondsPerJob": 0, "passesPerJob": 0 },
  "gates": { "minAcquired": 24, "retention": 0.70, "epsilon": 1e-6, "success": 0.75, "bootstrapSeed": 20261109, "pressure": 0.01, "pressureShare": 0.25 },
  "pins": { "relative/path": "sha256 hex" }
}
```

`pins` lists every source file imported by the runner, worker, job loop, condition, packet, metrics, judge, baselines, APL, teaching, trainer, eyes and reversal-memory modules. This includes transitive imports inside `.codebase/src` and `.codebase/scripts`, plus `packet.json`, `boards.jsonl`, every `tapes/<seed>.json`, the APL `package.json` and `sites.npz`, the graph and the annotations. The runner and each worker check all pins before starting work.

## Packet directory (written by `prepare-fly-connections-packet-v1.mjs`)

`packet.json`, `boards.jsonl` (one `fly-connections-board-v1` record per line), `tapes/<seed>.json` (output of `buildExperienceTape`).

## Run directory

```
manifest.json      status running|complete|failed|interrupted, pid, argv, registrationSha256, pins, volume, chapter, startedAt, endedAt, jobs:[{seed, arm, exitCode, status}], resumedFrom (optional)
summary.json       { schema:'fly-connections-memory-v1-summary', perSeed:[judge output], baselines, verdict:'passes'|'does not pass', pass:boolean }
records.jsonl      one line per finished job: { seed, arm, resultSha256 } (index only)
jobs/<seed>-<arm>/
  state.json       { schema:'fly-connections-job-state-v1', seed, arm, tapeSha256, cursor, probesDone:[label], recordsBytes, fingerprint, snapshot }
  records.jsonl    lines below, in execution order
  snapshots/<label>.json   condition snapshot after that checkpoint's rankings
  result.json      { schema:'fly-connections-job-result-v1', seed, arm, tapeSha256, status:'complete', passes, events, wallSeconds, cpuSeconds, secondsPerPass, peakRssMiB, minFreeMiB, fingerprints:{label:hex}, describe }
```

`records.jsonl` line types:

1. `{ "type":"ranking", "label":"T0", "cursor":0, "boardId", "group", "phase":"chess"|"R1", "fingerprint", "ranking": <rankBoard result> }`. `ranking.ranked` is `[{move, score, mbon:[l,r]}]` in sorted UCI order. R boards are always ranked with phase `R1`. The judge derives phase-2 metrics from the same scores.
2. `{ "type":"ranking-reused", "label", "cursor", "boardId", "group", "from":"T0", "fingerprint" }`. This record is for the off arm only. Use it only when `fingerprint` equals the T0 fingerprint.
3. `{ "type":"event", "cursor", "receipt": <teach receipt> }`. The event's `cursor` equals `receipt.sequence`.

## Probe sets

| Label | Groups ranked |
|---|---|
| T0 | A, B, R, testA, testB |
| A-8, A-16 | A |
| A-end | A, R |
| R1-end | A, B, R |
| B-8, B-16 | A, B |
| B-end | A, B, R, testA, testB |
| R2-end | A, B, R, testA, testB |

Labels that a tape does not emit (for example A-16 with 8 A boards) are skipped. Within a probe, boards are ranked in `boardId` order.

## Resume and exactly-once

`state.json` holds the last acknowledged state before each record append. For each step, append the record line or lines first. Then write `state.json` with the new `cursor`/`probesDone`, `recordsBytes` (the file size after the append), `fingerprint` and `snapshot`. On restart in the same job directory, truncate `records.jsonl` to `state.recordsBytes` and restore `state.snapshot`. Require `fingerprint()` to equal `state.fingerprint` before continuing. A job directory with `result.json` is finished and is never rerun.
