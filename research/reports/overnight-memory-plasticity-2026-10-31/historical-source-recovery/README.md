# Checksum-verified historical source recovery, 2026-10-31

[memory-assay-run-asymmetric.mjs](memory-assay-run-asymmetric.mjs) reconstructs the earlier asymmetric-signal trajectory loop by reversing the declared punishment-line change and checking the exact original SHA-256:

`bf7ccbdf23ff231a29d369feca26cf01465cb08008d70b03a6fffcd5febd96b4`

It matches both the original grid-local-gated-v1-dev run.json source entry and session-state.json pins_v1_2. This is a later checksum-verified reconstruction, not a snapshot captured during the original run. It restores the precise source bytes for that version; no current module or old run was modified, no results were rerun, and the file's imports are not intended to execute from this archival location.

Earlier validity-v1 source versions have not all been recovered. Historical per-trial choices/certificates were never saved and are not recreated here. Fresh receipt-repair runs provide their own contemporaneous sources and events.

The [pre-harness-fix test](memory-assay-recorded-pre-harness-fix.test.mjs) and [previous package command](package-before-test-concurrency.json) were also reconstructed and verified against their exact V13 registration hashes. They preserve the90s timeout/unconditional temporary-cleanup version and the test command without its correctly positioned concurrency option. These are historical bytes, not files to execute from this directory; the failed temporary fixture itself was deleted by that old cleanup and is unavailable.
