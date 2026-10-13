# Feedback quality gate

The teacher must provide checked evidence about the consequence of the fly's own decision. A move label or a reinforcement pulse by itself is not enough to claim high-quality feedback.

## Before teaching

Record the exact board and move history, task criterion, legal candidate set, candidate scores, and unaided selected move before revealing any consequence. If the experiment evaluates only a candidate subset, state that limit and do not describe the result as an all-legal choice.

## Teacher evidence

Bind each teachable experience to the board/history, actor, candidate action, task horizon, and a complete independently replayable certificate. The certificate must cover the opponent replies required by the task's verification rule. Preserve its hash, verifier identity/version, checked status, proof scope, and resource result in the receipt. A search estimate, sampled weak reply, incomplete tree, timeout, or mismatched history is `unknown`; it sends no teaching event.

For a wrong selected move, provide a contrast when one is available: the verified consequence of the chosen action and a separately verified successful alternative from the same position. If a consequence depends on a later move, use only earlier action contexts that are independently bound to the complete certificate. Never credit a whole hypothetical line just because one displayed branch succeeds. Record whether the feedback addresses candidate omission, evaluation error, missed refutation, or search horizon; do not infer a diagnosis unsupported by the trace.

## Neural delivery and controls

The certificate is teacher-side evidence, not a parameter update. Deliver the declared candidate/context cue and only the reinforcement activity permitted by the frozen, identity-checked neural interface. Receipts must distinguish the verified consequence from the simplified neural signal and document the timing, pathway, memory update, and unknown handling. This distinction prevents a valid teacher proof from being mistaken for biologically validated reward signaling.

Replay the exact same verified board/action/certificate sequence, order, and timing in absent, matched-shuffled, and disabled-plasticity controls. Keep every legal action available at evaluation. Independently audit certificates, pre-feedback rankings, delivered events, memory recurrence, and post-feedback all-legal rankings.

## Current assay limit

The prepared capture-retention fixtures provide independently checkable one-ply capture/recapture consequences. They can test whether a narrow relation cue and the existing experimental reinforcement interface alter a candidate ranking. They do not exercise Monte Carlo search, multi-ply refutation diagnosis, delayed sequence credit, or strategic evaluation. They are therefore a mechanism assay, not high-quality reasoning feedback and not evidence of transferable reasoning.

2026-10-08 implementation: the unfrozen runner now records a fresh ranking before each replay, binds it to the update's starting memory and verified certificate, and explicitly labels candidate-subset coverage and chosen/alternative reviews. Four adversarial fixture tests pass; the full suite passes 144/144. A control-name mismatch that would have delivered reinforcement to `no-channel` was corrected before any execution. The fixed experience schedule still requires a frozen protocol, matched runs, recovery validation and independent neural replay; no new graph experiment or learning result is implied. See the [implementation record](../../../research/journal/experiments/2026-10-08-feedback-quality-binding.md).
