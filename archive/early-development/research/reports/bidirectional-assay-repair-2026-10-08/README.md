# Bidirectional assay infrastructure repair

Started 2026-10-08, final verification 2026-10-09. The five independently reviewed software defects are repaired. **The software infrastructure works with inert fixtures; a biologically supported graph-backed learner remains blocked.** No graph load, neural forward pass, learner training or prospective simulation was run.

## Changes

- Explicit durable stages prevent repeated assessment/delivery/readout during recovery. Disabled persistent physiology is checked throughout every slot.
- Bound pre/post rankings and independently verified comparison actions determine behavioral margins. Checkpoint receipt digests reject changed acknowledged records. Full board/history/task/action identity prevents context regressions being merged.
- Reviewed adapter loading resolves paths correctly, checks source identity and separate arm state, and excludes teacher truth from factory configuration. The primary CLI verifies all prerequisites before import.
- Work records include cue dose, presentations and simulation steps. Resource guards surround state publication. Compact checkpoints avoid redundant full-array clones. Recovery handles partial trailing JSONL without altering old evidence.
- Reversal requires registered opposite outcomes in distinct contexts, pinned encoder/cue evidence, a shared measured cue identity and bounded events in each direction. The current development dataset still has no such registered association.
- [V4 protocol](../../data/bidirectional-plasticity-assay-v4/README.md) pins local import dependencies alongside existing inputs. V1-v3 and six reviewed v3 snapshots remain preserved.

## Evidence

Final full project suite: **195/195 passed**, zero failed/skipped. This includes 13 new repair tests and existing fixture groups. [Final test log](npm-test-final.txt), [earlier passing full suite](npm-test-unsandboxed.txt), [sandbox worker failure](npm-test.txt), [static final verification](final-verification.json). PowerShell raw redirected logs use UTF-16LE; the final verification JSON is UTF-8.

Static preflight intentionally refuses: all 36 pinned file hashes match; mapping, known certificates, unknown/no-teaching behavior and exact feasibility-report hash pass their checks. Biology/anatomy, model/readout/encoder/policy/adapter identity and certified reversal remain blocked. The actual run CLI is fixture-tested to refuse before importing a sentinel adapter or creating its output directory.

Commands run:

```powershell
node --test .codebase/tests/puzzle-learning/plasticity-assay-repair.test.mjs .codebase/tests/puzzle-learning/plasticity-mechanism-assay.test.mjs
npm test
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs --preflight --anatomy-report research/reports/plasticity-signal-anatomy-preflight-v2-2026-10-08.json
node research/reports/bidirectional-assay-repair-2026-10-08/verify-final-artifacts.mjs
```

Source-edit scripts in this folder record the construction changes; they are not run/training commands. V4 refresh tooling refuses after its FROZEN marker exists. New supported mechanism inputs require a new protocol version. Every failed edit, environmental failure and pivot is recorded in the [dated repair journal](../../journal/experiments/2026-10-08-bidirectional-assay-repair.md).

## Limit

These results establish infrastructure contracts exercised by fixtures. They do not establish full-graph memory use, actual graph-adapter completeness, causal neural learning, retention biology or reasoning. A working fly learner cannot be promised on a deadline while its local plasticity drive, anatomical targets and reversible teaching schedule remain unsupported. No frozen learned-weight substitute or teacher-computed neural update was introduced.
