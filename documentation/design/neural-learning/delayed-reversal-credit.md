# Delayed source-rule credit candidate

2026-10-08. Separate computational candidate; not biologically validated, not a completed feedback learner. Existing Gamma4Memory, ReversalMemory, frozen protocols and failures remain untouched.

## Source and adaptation

Pinned Gkanias IncentiveCircuit source `models_base.py`, commit `1610c80072fe8bb59bd397e7a61f716393a509b9`, lines424-455, implements `dw/dt = eta*D*(r_pre+w-w_rest)`. The local source and prior registration are authoritative for the inspected equation. The primary article request on this date encountered a browser challenge; do not claim newly inspected full-paper coverage. See [source register](../../../research/literature/source-solution-register.md).

The candidate replaces instantaneous presynaptic rate with a decaying measured root-action trace. This substitution is an engineering hypothesis, not the published equation. Normalize positive rest-relative KC activity by1.5 and clip to[0,1] at the action, then decay `e *= exp(-dt/tau)` during continuation. Default tau4 uses uncalibrated model units. Do not retag endpoint activity onto the earlier action.

For a feedback interval with fixed trace and nonnegative measured local DAN excess `d`, use the exact scalar source-rule solution under declared fixed polarity `D=-d`:

`equilibrium = 1-e`

`g_next = clamp(equilibrium+(g-equilibrium)*exp(-eta*d*dt), 0.2, 1.8)`

Default eta0.5 and source-independent gain bounds are engineering choices. Eligibility is held fixed within the numerical feedback interval; frame dynamics and model time do not establish biological timing. Negative modulatory polarity is the existing computational convention, not negative dopamine or an invented negative teacher reward. Teacher must supply only checked experiences/bounded stimulation. The memory reads model KC/DAN rates; it accepts no parameter delta or target.

This is not the full Incentive Circuit: source memory roles, interactions and fitted physiology are absent. The existing coarse mapping does not establish receptor/subcellular specificity. No anatomical transplantation is scientifically validated here.

## Persistent/transient state and limits

Only gains on existing positive mapped KC-to-MBON edges affect lasting efficacy; base magnitudes, topology/signs and all other parameters stay fixed. During an episode, eligibility, elapsed time and active flag are additional declared physiological state. Snapshots bind candidate schema, mapping/model/config/base identity, gains, events and eligibility. An actual resumable experiment must atomically publish these together with NeuralEpisode state and pending receipt before acknowledgment; this helper alone supplies no publication/recovery guarantee.

`tagAction` is permitted once per active episode; `advance` decays bounded traces; `observe` measures local DAN activity; `endEpisode` clears traces without restoring gains. Continuation frames must not call `tagAction` again. Disabled-plasticity and unknown handling belong to the checked receiver/runner; no graph experiment launched yet.

## Tested behavior, not a solution claim

Full project suite176/176 passes. Numeric recurrent fixtures show delayed feedback depresses the tagged earlier KC edge instead of the currently active endpoint edge, preserves edge signs, resumes the next update exactly after serialization, and rejects nonfinite activity/checkpoints without memory mutation. Zero reinforcement preserves tested gains.

Inactive depressed edges recover under later reinforcement even without an active tag. This is an intentional source-term property and potential interference mechanism. Tests explicitly expose it. Reinstating recovery is therefore not a retention solution, just as removing recovery previously failed to rescue chess choices. Association/coexistence/reversal gates and informative/no-channel/count-preserving-shuffled/disabled graph experiments remain required. No repaired target, retained sentinel, useful all-legal choice, transfer or8/10 claim.

Next integration must combine checked public lesson frames, pre-feedback unaided ranking, declared ordinal criterion readout, measured root tag and endpoint consequence stimulation, identical exposure/timing controls and atomic pending receipts. Preserve all intervening failures; no completed acceptance gate may be retuned.
