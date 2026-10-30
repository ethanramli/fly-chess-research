# Independent WASM audit work log

## 2026-10-10: Scope and process inspection

Read both original user attachments, repository instructions, Ponytail skill, latency protocols, current-status latency entries, research-goal designs and production call paths. Authoritative Win32 process inspection found only Codex Node processes, with no graph experiment or play server. No implementation repairs are authorized in this audit. Historical artifacts will remain unchanged.

The previous builder turn produced inspectable adoption artifacts and therefore counts as progress. This audit must independently establish their scope and defects before completion.

## Inspection mistakes

Initial batched reads printed oversized current-status and dirty-worktree output, truncating results. Corrected to focused source reads and selected status lines. A guessed `checkpoint.mjs` path did not exist; use file discovery to locate `checkpoint`/memory code. PowerShell `rg` filename globs were passed literally and rejected; use directory searches instead. These were inspection failures, not simulation failures. No source or run changed. The next checks recompute raw statistics and exercise actual production imports.

## Provisional statistical finding

Both frozen benchmark implementations use nearest-rank p50, the lower middle order statistic for four samples, while reports label it median. Recompute conventional middle-pair medians and frozen gates separately. Do not assume this reverses the adoption verdict before checking raw data.

## Further inspection failures and regression retry

Additional guesses for test/checkpoint filenames were absent; actual discovery located `runtime/storage.mjs` and the evaluation-and-performance test directory. The audit's first npm regression was blocked by sandbox `spawn EPERM`, so its raw failure is preserved and the same suite was retried with tool escalation into a separate output file. No implementation or guard was changed. Some further oversized batched output truncated; individual sources or focused excerpts are required for claims.

## Raw statistics result and checkpoint hypothesis

Independent raw recomputation confirms all WASM per-fixture gates still pass with conventional medians, yielding 26.16%, 40.18%, 23.29%, 19.13% reductions. Zero-reset still fails. Production differs from the frozen WASM candidate by import relocation only; recorded completion evidence hashes match. The historical source manifest's trainer mismatch is the documented adoption, not unexplained drift. Zero-reset package manifests also changed subsequently; its original environment cannot be recreated solely from those hash listings.

Static inspection found `loadCheckpoint` writes magnitude arrays but never refreshes `signedMagnitude`. The optimized forward recopies that derived array, not the canonical magnitudes. This is a candidate inherited defect, requiring an independently reproduced stale inference result before a definitive finding. Next check compares real checkpoint load against a freshly synchronized model and the archived oracle.

## Confirmed findings and independent software checks

Unfiltered production npm test completed 221/221 with zero failures in the escalated retry (42.145 s), without modifying implementation. Original sandbox failure remains preserved. Additional absent filename guesses included `fly-policy.test.mjs`, `play.test.mjs`, `checkpoints.mjs` and `storage.test.mjs`; discovery established these checks instead live in other existing files. These mistakes had no runtime effect.

Actual production-import probes pass 36 numerical/gradient/SGD/Adam cases, synthetic local-memory snapshot restoration, logical bounds, buffer immutability and policy failure/history checks. The real production generator emitted a valid binary, preserved as `generated-accumulator.wasm`.

Checkpoint defect is confirmed in both current production and the archived oracle. Complete canonical parameters match after real disk save/load, but predictions differ (production loaded output 0.0018844943 versus donor 0.0025622980 for output 0). Refreshing only the disposable model's derived signed weights restores exact outputs. No implementation was repaired. This invalidates a broad assertion that recopying avoids stale weights after checkpoint changes, but does not show a WASM-introduced arithmetic regression.

A later sandbox CIM query returned access denied. Treat it as an observation failure, not terminal state; re-request authoritative inspection using escalation before graph verification.

## Completed independent replay and HTTP

All 92 original full-graph successors exactly match current production, archived oracle trajectories and original hashes. Replay ended normally (75.222 s elapsed, 37.578 s CPU, 179.477 MiB peak RSS) before starting the owned HTTP server. Binary disassembly and additional nonfinite probes passed. New loader-free HTTP checks passed both colours, exact responses/history, illegal human move, wrong turns and concurrent-new-game rejection. The owned server terminated; final authoritative inspection found only Codex Node processes.

The final scientific inspection guessed a nonexistent `comparison.json`; discovery found `result.md`, `evidence.json` and the original run's `result.json`/`audit.json` instead. Another rg wildcard in PowerShell was rejected literally. The verified raw learning audit distinguishes execution pass from false useful/causal-choice gates. No extra neural experiment or scientific success was claimed.

## Documentation publication mistake

An attempted patch of current-status failed before writing because that existing file contains an invalid UTF-8 byte at offset 63502. Preserve its original bytes and append the dated audit addendum using byte-preserving filesystem append, rather than converting/replacing the historical file. The failed patch changed no file. The next publication step links the audit and verifies all local report links and evidence hashes.

The first finalizer validated evidence and report links, then appended all four navigation/status addenda with verified byte preservation. Its evidence collector mistakenly attempted to hash the synthetic checkpoint directories as files, failing `EISDIR: illegal operation on a directory, read` at finalize.mjs:38. No completion.json was written. Correct the collector to enumerate files recursively, including checkpoint contents, and recognize the exact already-published addenda to avoid duplicates on retry. This is an audit publication failure, not a model or scientific result.
