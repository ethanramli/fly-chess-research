# Babysit runtime Stockfish collection integration

Date: 2026-10-22

## Goal

Connect bounded, provenance-pinned Stockfish feedback collection to the Stage 1 Lichess runtime used by `fly babysit`, so a campaign registration can run its own review collection instead of requiring a separately prepared review file.

## Change

`.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory.mjs` still accepts the existing pinned `stockfishReviews` artifact. It now also accepts a registered `stockfishCollection` with an absolute executable path, expected binary SHA256, arguments, shared node budgets, bounded timeout/deadline, hash size and a cache directory under `runs/`.

Before the training matrix starts, the runtime analyzes every legal child from each registered training panel's exact PGN history. Existing panel/task certificates are checked and bound separately from engine estimates. Raw UCI input/output is retained. Completed review JSON is atomically published, and the cache manifest binds engine/configuration identity, exact panels, review hashes and raw-log hashes. On recovery, completed reviews are reused; a panel interrupted during engine collection keeps its earlier logs and is collected into a separately numbered attempt. Incomplete publications or identity mismatches stop rather than being silently accepted.

## Verification

- Runtime factory JavaScript syntax check passed.
- `lichess-curriculum-panel.test.mjs`: 6/6 passed, including bounded mock-analyzer collection and all-legal review binding.
- `stockfish-value-session.test.mjs`: 3/3 passed, including transactional feedback and independent replay.
- `curriculum-block-session.test.mjs`: 17/17 passed, including interruption recovery, controls, and replay.
- No real Stockfish process, connectome training, or G0 work was run.

## Limits and next action

This removes the separately prepared-review requirement from the Stage 1 runtime interface, but does not complete `fly babysit`. No default twelve-stage campaign registration exists; the current lesson/family audits still deny neural teaching and graph launch; no acceptance-observation artifact is available, so the callback correctly returns `unknown`; and Stages 2-12 lack production runtimes/verifiers. No campaign has yet exercised the new collection cache with a real pinned Stockfish binary. Next, register and independently verify a real engine collection after the data gate permits training, then finish Stage 1 acceptance and campaign wiring without changing frozen gates.

## Acceptance evidence binding follow-up

The Stage 1 runtime factory's acceptance callback no longer hardcodes a generic `unknown` for every case. It now requires a pinned `stageAcceptanceObservations` artifact bound to the exact matrix result digest and registration, checks every condition/replica against independent replay and memory-lineage hashes, then recomputes D1-D8 through the frozen replica acceptance function. Missing artifacts remain `unknown`; measured prerequisite or threshold failures remain failures. Syntax and the existing acceptance decision-rule suite pass6/6. This wires the promotion input contract but does not create observations or evaluation families; no Stage 1 acceptance is currently possible from the available artifacts.

## Scope correction

The prior goal turn ended after a status apology with no project change. This turn resumed the command path and did not continue validation-corpus expansion. The user's instruction not to work on G0 remains in force.

2026-10-22 - Bare `fly babysit` launch-path verification: `fly` resolves to this repository's `fly.cmd` even from `%TEMP%`; invoking `fly.cmd babysit` exits 2 with `readiness_blocked` because `python actions/curriculum-campaign.json` is absent, and explicitly reports that no experiment started. This proves the launcher is installed, not that the babysit process is complete. Do not add a placeholder campaign or bypass gates: the latest Stage 1 family audit has zero validation families, acceptance observations are not generated, and Stages 2-12 lack production runtimes. Next work is the missing Stage 1 evaluation/family path and a real campaign registration only after its gates are supportable. No G0 or learning run occurred.
