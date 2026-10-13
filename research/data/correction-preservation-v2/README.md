# Frozen correction-preservation v2 screen

Prepared 2026-10-08. Protocol SHA-256: 331d2803c6982a9bbcb21a1256b438a5b90294995ff061492b2ef00787988cc1. The new source archive has 23 source identities and 43 hash-checked archived files. V1 evidence is preserved.

Two four-event schedules crossed with informative, no-channel, within-move shuffled and disabled conditions produce eight serial arms. The only encoder is bound-ray; learner rule, pulse current, graph and readouts stay fixed. Preflight rechecks 24 panel certificates, scheduled actions and exact shuffled channels without graph inference or final-family reads.

- [Protocol](protocol.json)
- [Preregistered acceptance criteria](registration.json)
- [Independent archive check](archive-audit.json)
- [Source archive](../../source-archives/correction-preservation-v2/manifest.json)
- [Runner](../../../.codebase/scripts/puzzle-learning/train-correction-preservation-v2.mjs)
- [Independent graph auditor](../../../.codebase/scripts/puzzle-learning/audit-correction-preservation-v2.mjs)
- [Pending-prefix fixture](../../../.codebase/scripts/diagnostics/prepare-correction-preservation-v2-recovery.mjs)
- [Exact recovery auditor](../../../.codebase/scripts/diagnostics/audit-correction-preservation-v2-recovery.mjs)

The design's recovery sequencing is clarified before any run: recovery tools are frozen first; exact neural recovery is checked from the completed informative run before results are interpreted. A fixture from a completed v2 run cannot exist before its first run. Controls remain required alongside informative teaching.

Run from the repository root, for example:

    node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-correction-preservation-v2.mjs --out research/reports/correction-preservation-v2-2026-10-08/selected-informative --schedule selected --condition informative --cpu-duty 0.5
    node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-correction-preservation-v2.mjs research/reports/correction-preservation-v2-2026-10-08/selected-informative

Repeat serially for the three matched controls and for uniform with all four conditions. Inspect authoritative processes before launch. Sources are frozen; any required correction needs a separately versioned source/protocol, not edits to this package.

This is a one-seed, one-ply candidate-pair screen. Acceptance requires target correction, sentinel preservation, no new regressions across the 12 panels, target margin gain exceeding each control, exact independent replay and pending recovery. The policy comparison is descriptive only. Biological retention, all-legal chess usefulness and unfamiliar reasoning remain untested.
