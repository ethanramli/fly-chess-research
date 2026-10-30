# 2026-10-22 — babysit campaign controller implementation

The active goal is to finish `fly babysit`; the researcher explicitly corrected the direction to stop spending work on G0. No G0 process, protocol or result was touched during this change.

Inspection found the existing single-run Python supervisor, Lichess preparation modules, a rehearsal planner, and a crash-safe four-event block runner/auditor. The block runner was not connected to the command, and no complete twelve-stage campaign registration or executable Stage 1 learning protocol exists. The old bare command would otherwise select the G0 step config.

Changed `python actions/curriculum.py` so bare `fly babysit` selects the campaign registration and returns `readiness_blocked` without starting an experiment if it is absent. `--curriculum PATH` selects a pinned campaign; `--config PATH babysit [train] [audit]` explicitly keeps the old one-cycle path. The campaign controller requires all twelve ordered stages, exact hashes for each step config and prerequisite artifact, explicit prerequisite booleans, full neural replay, scientific stage acceptance, memory-continuity audit, and matching initial/final memory hashes between stages. It records campaign state atomically, resumes the same in-progress stage and stops on missing, changed or failed evidence.

Verification: Python bytecode compilation succeeded. The bare `fly babysit` smoke invocation returned `readiness_blocked` for missing `python actions/curriculum-campaign.json` and started no experiment. No graph/training process was launched and no G0 work was done.

Limit: this is a campaign coordinator only. It does not yet connect the Lichess lesson data, verified outcome/Stockfish arms, rehearsal block runner, checkpoint/audit pipeline or twelve stage-specific gates. There is no full campaign registration, so `fly babysit` cannot yet run the requested process end to end. One Stage 1 development family and software fixtures do not satisfy the frozen training/validation/final family quotas. Do not report the babysit as finished.

Next: connect a registered lesson protocol to the existing block runner and independent audit, then add actual stage configs and condition/retention/composition gates. Preserve the receiver prerequisite, but do not resume or diagnose G0 as part of this implementation work.

## Follow-up: connect the Lichess adapter to trajectory memory

Code inspection found a direct runtime incompatibility: the curriculum specifies `RateTimingMemory`, whose `observe()` intentionally throws because it requires a complete frame trajectory, while the mapped, dual-valence and Stockfish puzzle adapters called only `observe(rest)`. Added one shared dispatch in `MappedPuzzleBrain`; subclasses inherit it. It calls `observeTrajectory({plasticityEnabled:true})` when available and preserves the established endpoint API otherwise. Required teaching DAN types are checked before neural activity. Since the current `RateTimingMemory` map contains PPL103 only, Stockfish events requiring PAM02 are refused until a dual-channel trajectory memory is registered.

Evidence: focused mapped and Stockfish brain checks pass 26/26. A Lichess replay into a four-cell `RateTimingMemory` fixture increments the memory event and returns through the adapter; a missing-PAM mapping is rejected. This is a software integration check, not full connectome or teaching efficacy. No graph run or G0 work occurred. The default babysit command remains blocked because production stage construction, eligible relation-family data and the campaign registration are still absent.

## Follow-up: failure receipts expose the diagnosis

The first campaign controller draft reported only which registered audit booleans were false or absent. That is not enough for the requested stop-with-diagnosis behavior. The current controller now preserves the false/missing gate list, cross-stage memory mismatch flag, SHA-256 identities and exact result/audit paths, plus a bounded selection of diagnosis/reason/scope/limitations/next-action fields reported by the learner and auditor. Missing result/audit paths are recorded explicitly. It does not infer a cause from a failed gate.

Rechecked: `py_compile` and `git diff --check` on `python actions/curriculum.py` pass. Bare `fly babysit` still exits readiness-blocked because the default full-curriculum registration does not exist; the smoke call started no process. This does not complete the Lichess/Stockfish/connectome runner integration.

## Follow-up: Lichess training panel to learner-choice bridge

Added `.codebase/src/puzzle-learning/lichess-curriculum-panel.mjs`. It binds one prepared Stage 1 training row to an externally pinned family assignment, verifies the prepared source-prefix hash and every legal task certificate, rejects non-training splits/unknowns/missing actions, and returns the exact `{panelId, stage, split, experiences, assessment}` shape consumed by the rehearsal planner. The assessment calls the learner's all-legal `brain.assess`, records ranked scores and the memory hash, and represents equal top scores as no unique choice. A shared bug in `MappedPuzzleBrain.assess` had instead selected the first tied move; fixed it at the shared source and added regression coverage.

Evidence: the focused panel tests pass3/3, covering full action conversion, invalid split/missing/forged certificate rejection, tie handling and planner consumption. The actual prepared Lichess training row `0vk5i` passed the bridge smoke:17 legal actions,1 certified success and16 certified failures. The preceding combined panel/mapped/planner/block suite passed26/26 before the small actual-row history-shape correction; after that correction the relevant panel/mapped/planner suite passed14/14. An initial one-off smoke command split the JSONL line with an over-escaped regex and failed before invoking the adapter; corrected the command and successfully checked the real row. No data was changed, no graph loaded, and no neural training occurred.

Limit: this only prepares a valid training observation for the rehearsal planner. The family registration must be independently audited and pinned by its caller; the current dataset does not provide the registered train/validation/final family quotas, the temporal block runner still has no stage-level caller, Stockfish teaching is not on this temporal path, and no full campaign registration exists. This is not a trained stage or completed babysit.
