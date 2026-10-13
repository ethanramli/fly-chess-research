# Adaptive temporal feedback loop repair

Registered 2026-10-09 before the new graph run. This repairs the orchestration
proposal; it does not assume a new biological learning law or claim plasticity
is solved. Latest user request authorizes fixes and bounded hypothesis testing.

## Corrections to earlier proposals and claims

1. `run-adaptive-target.mjs` selects the first error once and runs exactly two
   lessons. Its name and our description overstated ongoing adaptation. The
   cap-10 result changed the top error from Qg8 to Qd7, then stopped. The new
   runner checks all legal scores after every lesson and selects the current
   verified error at each pair boundary.
2. The proposed PAM02 addition lacks direct cue coverage: the current encoder
   pool is gamma KCs, while the coarse PAM02 plastic-edge pool is alpha-prime/
   beta-prime KCs. These sets must be checked before a pulse-only proposal.
   Indirect recurrent activity remains possible, so zero direct overlap does
   not prove zero physiological effect. Transferring the gamma2 timing law to
   PAM02 would also need separate source support and population handling (six
   PAM02 cells per side versus one PPL103). That extension was not installed.
3. Baseline-relative Qh7 ranking demonstrates a relative score change on one
   familiar position. It does not prove MBON01 is the sole cause, validate a
   new readout, or solve plasticity. Our previous causal wording was too strong.
4. Earlier finals claimed the full test suite passed without capturing its
   terminal summary. That claim is unverified. A fresh relevant suite run is
   required for this implementation.
5. The invalid PAM probe had syntax and FEN-property errors before an empty
   DAN target list made it a no-op. It also lacked the required RSS/free-RAM
   checks and duty pacing. It provides no PAM02 evidence. Its temporary file
   was removed in the previous turn; available error/output evidence remains
   in the conversation and journal. The attempted shared-memory patch failed
   to apply and therefore changed no source or identity.

## Frozen repair experiment

Four adaptive pairs maximum on the already used development puzzle. At each
pair boundary select the unique current top move only if independently proved
failure; contrast it with the independently proved Qh7 success. Stop on a
verified correct choice, unknown evidence, a tie, or the pair budget. The
teacher controls only stimulus delivery and supplies no parameter delta.

Run informative first. Swapped, absent and disabled arms replay its exact
action sequence with identical cue timing and lesson count. Swapped reverses
every success/failure pulse timing. A separate **fixed-target informative**
comparator repeats its original error and Qh7 for the same number of pairs,
to distinguish retargeting from additional teaching dose. It is intentionally
not action-matched; only the three causal controls are exact exposure matches.

Use cap-10 cues, dose, graph, model, memory, absolute readout and timing from
the prior frozen run. No coefficients or plasticity constants are tuned. All
122 permitted gains and traces remain able to update in active arms.

The primary behavioral prediction remains unique correct all-legal choice
under informative feedback, with failure in swapped/absent/disabled controls.
Report a failed primary prediction even if margin improves. Report separately
whether the strongest-competitor margin exceeds the equal-dose fixed-target
comparator by 1e-8. A positive comparator result alone is not useful acquisition.
Repeated assessment checks computational persistence only. No transfer,
biological retention, contingency reversal or reasoning claim is licensed.

The existing frame session supplies certificate rechecks, local traces,
transaction rollback and pending-frame state. The runner publishes each frame
receipt before its atomic checkpoint. A bounded intentional interruption after
three frames will exercise real disk resume into a new directory. Source pins,
schedule, proofs, references and received local rates are archived. The audit
streams receipts, independently replays local updates, verifies exact control
exposure and replays final all-legal graph scores. Numerical replay shares the
declared integrator; this does not validate the biology.

## Files

- [Runner](run.mjs), [auditor](audit.mjs), [registration builder](prepare.mjs)
- [Protocol](../../data/adaptive-temporal-loop-v1/protocol.json)
- [Successor-model handoff](../../../documentation/handoffs/plasticity-repair.md)

Results and exact commands will be appended after execution. Prior frozen
sources, protocols and failures are preserved.
