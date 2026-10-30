# Stage 2 bounded avoid-mate feedback primitive

## Scope

This specification describes a verified consequence primitive for one part of Stage 2. It is not a Stage 2 runtime, puzzle corpus, acceptance gate, or authorization to start training. The existing curriculum's broader `avoid-loss` objective remains unsupported by this primitive.

## Fixed task

The defensive task is exactly `{ "objective": "avoid-mate", "plies": 3 }`. For a legal action by the learner, construct the hypothetical child board and ask whether the opponent, now to move, can force checkmate within the remaining two plies. The real task board and history are not mutated. Stage 2's attacking strata use the existing `{ "objective": "forced-mate", "plies": 1 | 3 }` certificate. A new Stage 2 public-frame encoder accepts these two task contracts and provides only board/history/action plus the task name and horizon.

The independent certificate checker replays the existing bounded AND/OR mate certificate against the child position and exact opponent color. It then maps the opponent's result into the learner's task:

- Verified opponent-forced mate within two plies means the learner action **fails** the bounded avoid-mate task.
- A complete proof that no such forced mate exists within two plies means the learner action **succeeds** at this bounded task.
- A missing certificate, construction limit, or checker limit means **unknown** and supplies no teaching event.

The certificate wrapper binds the root FEN and PGN, actor, exact legal action, task, nested mate proof, and wrapper hash. The opponent is the mate attacker. This prevents interpreting an opponent-side success label as learner-side success.

## Limits and next integration

Success only means that the opponent cannot force mate within the declared remaining two plies. It does not prove full-game safety, best play, or the absence of material losses. The task tests a narrow Stage 2 defensive consequence. It does not yet cover quiet mate threats with longer horizons, all `avoid-loss` consequences, or the full Stage 2 semantic strata.

The shared `verifiedExperience` path independently rechecks these certificates before feedback delivery. A Stage 2 panel binder now requires all legal actions, source-history binding, a six-piece limit, balanced success/failure outcomes, and the correct task for each of the four Stage 2 strata. The existing Stockfish panel reviewer and value session accept Stage 2 panels using bounded mate tasks and bind stage into review/session identities. The public-frame encoder accepts the declared Stage 2 task contracts. A Stage 2 learner constructor and runtime factory now connect those panels and pre-collected Stockfish reviews to the shared resumable block/replay path. The generic matrix preflight requires later stages to declare matching stage-specific data-audit schemas and, for later stages, a replica acceptance-gate export. The Stage 2 runtime has not been behaviorally tested or executed; its generated/audited data package, independent acceptance evaluator, and campaign registration remain absent, so Stage 2 cannot run.
## 23 October implementation addendum: continuity and rehearsal

The Stage 2 runtime now requires `previousStage` with `stage: 1`, the pinned
preceding `registrationPath`/`registrationSha256`, and repository-local `result`/`audit` paths. The
outputs' hashes are unknown before execution; runtime verification binds the
independent audit to the previous registration/result, its frozen checkpoint
selection artifact and the selected checkpoint bytes. The next stage carries
only the accepted neural memory for that exact condition/replica. Graph, mapping,
model/readouts, plasticity, replica seed and earlier projection settings must
match the pinned predecessor; only the declared task family expands. Its own
presentation counters, plans and pending transactions start with the new stage.
Training recovery and independent replay use the same predecessor source.

The cumulative `lichess-stage2-training-families-v1` document must assign both
Stage 2 current lessons and Stage 1 training rehearsal. All rows remain train
only; Stage 1 rows retain capture-retention certificates and Stage 2 rows retain
bounded mate certificates. Each panel retains its own Stockfish review schema.
The learner requires `encoder.taskFamily: "stage2-with-rehearsal"`; matching the
earlier mapping/projection settings preserves its capture-task stimulation.

18 focused offline checks pass, including a mixed-stage block and receipt
replay with a mock learner. This does not qualify the receiver, teach a Fly,
validate Stockfish assistance, or supply the missing Stage 2 acceptance/data
pipeline. [Implementation and open gate defects](../../../research/journal/experiments/2026-10-23-babysit-stage-memory-handoff.md).

## Additional interference phase (23 October)

The Stage 2 factory exposes `runRetentionChallenge` and `auditRetentionChallenge`.
Supply the already-frozen current-stage checkpoint path, file hash and memory hash
for every condition/replica, plus the parent registration hash. The phase starts
at those exact memories, creates a new session on Stage 1 training panels, and
runs eight additional four-event blocks. Controls replay the informative plans
with the same ordered task events; matching neural presentation exposure remains
an open feedback defect. Existing stage/matrix checkpoints preserve interruption
recovery; the separate auditor replays every delivered update. Its delivery
report remains scientifically unknown until post-interference validation and
previously mastered sentinels are independently observed. This is implemented
execution machinery, not a completed or registered curriculum stage.

Registrations also require `outcomeShuffle` with schema
`matched-task-outcome-shuffle-v1`, a complete array of balanced four-label `blocks`
and `sha256` equal to `digest` of that object without its hash. Every block has
two success and two failure signals. The schedule must cover the registered
exposure. It cannot be selected using live performance or sealed final families.
The task-shuffled receiver preserves the actual checked certificate while using
the scheduled control valence. Stockfish-error shuffling remains a distinct arm.

Do not promote the pre-interference snapshot in place of the tested end state.
Post-challenge memory publication/promotion and the independent Stage 2
acceptance evaluator remain unfinished. [Implementation and failures](../../../research/journal/experiments/2026-10-23-babysit-checkpoint-retention.md).
## Measured retention and promotion (23 October)

The interference audit can receive registered `evaluationPanels`: 16 current
validation panels and, for each earlier stage, 16 validation panels plus four
previously mastered training sentinels. It reconstructs the preceding accepted
memory, selected current memory and actual post-challenge memory, independently
rechecks every rule certificate and records fresh unaided all-legal choices.
Current validation must remain at least14/16; earlier validation counts may not
fall from baseline or the selected snapshot, and all earlier sentinels must stay
correct. Missing/stale evidence is unknown; forgetting is a measured gate failure.

`curriculum-post-interference-promotion-v1` preserves the frozen source selection
and separately pins the replayed challenge result/audit, observations and final
checkpoint bytes. Later-stage acceptance and memory handoff validate this artifact
and carry its post-challenge memory. The original selection/result is unchanged.
Publication is idempotent only for identical bytes; changed evidence is rejected.
This does not replace the remaining Stage 2 learning/transfer gate or create a
Stage 3 runtime. [Implementation record](../../../research/journal/experiments/2026-10-23-babysit-post-interference-promotion.md).


## 23 October: validation-only selector

The [checkpoint selector](../../../.codebase/scripts/puzzle-learning/lichess-stage2-checkpoint-selector.mjs)
now supplies the pre-retention selection function for a future pinned acceptance
evaluator. Acceptance-data schema is `lichess-stage2-acceptance-data-v1`.
Validation family assignments may include Stage1 and Stage2 panels, while current
`panelIds.validation` names exactly16 Stage2 positions (four per stratum).
`retention.earlierPrinciples` names Stage1's16 validation positions and four
training sentinels using `validationPanelIds` and `sentinelPanelIds`.

The data audit binds training/validation/final row and family hashes. Selection
loads training and validation only, checks source pins/certificates and requires
incoming earlier mastery, current validation quality and no earlier regression.
It freezes the earliest qualifying block8/16/24/32; controls inherit that block.
Missing observations remain unknown. This neither completes final evaluation nor
authorizes data or graph training. Final evaluator must independently rederive
selection and replay/measure the completed retention challenge before promotion.
[Implementation and software evidence](../../../research/journal/experiments/2026-10-23-babysit-stage2-checkpoint-selection.md).
