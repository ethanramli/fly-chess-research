# Fly connections memory: Properties 1–3, 2026-11-07

**Properties 1–3 remain unmet. Revision 2: BUILD ALLOWED; first scoped builds in progress, no dry/full run.** Volume 2, chapters 3 and 5. The first draft's SOURCE NO-GO remains valid; a numerical pass under that rejected design could not establish Property 1. No biological limit has been proved by its rejection.

1. [Prospective proposal, first draft](../../../documentation/design/neural-learning/fly-connections-memory-v1-proposal-2026-11-07.md).
2. [Independent strict Codex review, high effort](design-review-r1-retry.md): cross-trial dopamine subtraction is extra-circuit; APL locality is confounded with inhibition strength; PAM08 applicability is unsupported by a source naming PAM07; Property 2, seed roles and runtime need revision.
3. [Huang author-code source check](huang-source-applicability.md): exact primary code acquired and pinned; its effective negative weights and last-training decay switch prevent unqualified transplantation. No source model imported or executed.
4. [Journal and mistakes](../../journal/experiments/2026-11-07-fly-connections-memory.md); [next checkpoint](../../../documentation/next-checkpoint.md).

The first review invocation failed before starting its app-server client. Its logs remain as `design-review-r1.*`. The explicitly approved retry exited 0 and returned the linked SOURCE NO-GO; files are `design-review-r1-retry.*`. Model `gpt-6.1-sol`, `model_reasoning_effort=high`, read-only. Reviewer thread: `01a1b486-dc1c-7322-be53-f1fd765416fe`. The verdict is a review of this proposal, not an experimental audit or a source-validation certificate.

## Addendum: revision 2 allowed to build

[Revision 2](../../../documentation/design/neural-learning/fly-connections-memory-v1-revision-2-2026-11-07.md) received [BUILD ALLOWED](design-review-r2.md), same strict reviewer, high effort, exit 0. Actual local KC/PAM07 rates and the source's negative DPR branch remove the rejected counterfactual variable; computational source justification is sufficient to test, not measured physiology or a result. R association/reversal and APL conditional-current controls have explicitly bounded interpretations.

Two Haiku xhigh CLI tasks are in progress: isolated local APL adapter/fixtures and PAM07 mapping/actual-endpoint teaching extraction/fixtures. Tools are limited to file reads/edits/search, with no MCP tools, shell, installation, delegation or graph launch. The main agent will review and run fixtures. Compiler, task/metrics, runner, registration, independent auditor, code review and detached dry/full runs remain required; no partial module is a finished pipeline.

Next: review the generated modules and run the small synthetic checks, then complete the approved pipeline. Preserve the first draft and frozen sources.

## Addendum 2026-11-09: built, dry run, stop for decision

**Properties 1-3 remain unmet. No full run.** The pipeline was built and reviewed ([code review r1](code-review-r1.md): LAUNCH OK WITH REQUIRED CHANGES, all fixed). The dry run (development data, one seed, 8+8 boards) passed the P1 checks and failed every P2/P3 gate: the model's gamma Kenyon cells are all tonically active, moves on one board share about 97% of their KC pattern, and learning shifts all moves together. [Diagnosis](diagnosis-r1.md): STOP FOR RESEARCHER DECISION. Records: [journal items 11-17](../../journal/experiments/2026-11-07-fly-connections-memory.md).

## Addendum 2026-11-14: scale check for a proposed three-board test

A replay regenerated the zero-drive cell readings. The [scale check](calibration-replay-2026-11-14/README.md) finds that capping at 0.014047 touches one cell on one move per board, and keeps at least 99% of every move pair's activity difference. The [three-board feedback test](../../../documentation/design/neural-learning/three-board-feedback-test-2026-11-14.md) is proposed and awaits approval. No run launched. Properties 1–3 remain unmet.
