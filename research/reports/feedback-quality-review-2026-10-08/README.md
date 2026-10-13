# Retrospective feedback-quality evidence

2026-10-08. No new graph run or neural teaching in this package.

- [Timing pair-margin audit](timing-margin-audit.json): independently recomputed score arithmetic from existing receipts; no fresh graph replay.
- [Checked lesson example](example-lesson.json): saved unaided timing ranking plus independently rechecked training certificates; no lesson delivered to neurons.
- [Source-backed review](../../literature/feedback-quality-deep-review-2026-10-08/review.md).
- [Proposed improvement contract](../../../documentation/design/puzzle-learning/feedback-quality-improvement.md).

Reproduce from repository root:

```powershell
node .codebase/scripts/diagnostics/audit-feedback-quality-timing.mjs
node .codebase/scripts/diagnostics/prepare-checked-lesson-example.mjs
```

Positive teaching changed the safe-minus-unsafe margin by -0.0000624391; no-channel by -0.0000605001. Informative-minus-no-channel change is -0.00000193901. The safe move was already preferred. This is an inspected one-pair finding, not a population estimate, biological verdict or transfer test.

The metadata implementation passes four adversarial tests; the full project suite passes154/154. Richer teacher records are not evidence of richer neural learning. Effective 8/10 training remains an active goal.
