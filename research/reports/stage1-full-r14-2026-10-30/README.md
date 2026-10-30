# Full Stage 1 run r14: audit result and D4 diagnosis (2026-10-30)

Run: `runs/lichess-stage1-synthetic-v1-full-r14` (training), resumed into `runs/lichess-stage1-synthetic-v1-full-r14-resume-0001` (r3 training and the independent audit). Registration `research/data/lichess-stage1-synthetic-v1/stage1-full-r14-registration.json`: 3 replicas x 4 arms (informative, absent, disabled, shuffled) x 32 blocks, attack-map cue v2, outcome-only teaching, evaluator v2. The audit started 2026-10-29 17:41 and wrote `audit.json` at 2026-10-30 00:53 (sha256 `f3f9b2fa...c3e27a`).

## Result: gate-failed, on D4 only

The independent audit ran the full neural replay (memory continuity verified for all 12 lineages) and then the registered acceptance evaluation. Stage 1 is **not accepted**: every replica fails D4 and passes every other measured gate. Full table: [audit-report.txt](audit-report.txt).

| Replica | D1 train | D2 validation | D3 final | D4 probe signs | D5 pairs | D6 advantage (scratch/absent/shuffled/disabled) | D8 |
|---|---|---|---|---|---|---|---|
| r1 | 24/24 | 15/16 | 61/64 | **64/128** | 29/32 | 43 / 61 / 60 / 43, all lower95 > 0 | pass |
| r2 | 24/24 | 15/16 | 64/64 | **64/128** | 32/32 | 21 / 56 / 64 / 21, all lower95 > 0 | pass |
| r3 | 24/24 | 15/16 | 63/64 | **64/128** | 31/32 | 59 / 63 / 56 / 59, all lower95 > 0 | pass |

Thresholds are frozen: D4 needs >= 104/128. D7 is deferred to Stage 2 (policy B). The final families were evaluated once, by this registered audit; none of the diagnostics below reads final or validation data.

What this does show, by the registered gates: on 8 unfamiliar final families, every replica picks the safe capture on 61-64 of 64 boards, and it beats every matched control by 21-64 boards. On 29-32 of 32 counterfactual pairs it gets both boards right, where the safe and unsafe captures swap. This is a Stage 1 safe-capture result on a restricted, engineered input (attack-map cue v2), not reasoning. It is also not stage acceptance, because D4 failed.

## Why D4 is exactly 64/128 in every replica (measured on training data only)

D4 asks for "correct fixed-polarity signs for at least 104/128 balanced final probe actions; zero is incorrect" ([curriculum](../../../documentation/design/puzzle-learning/principles-curriculum.md)). The probes are the two captures of each final board's counterfactual pair, one verified safe (+1) and one verified unsafe (-1).

1. **The evaluator reads a channel the choice does not use.** Evaluator v2 (`.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v2.mjs:368`, the same in v1 and v3) sets `predictedSign = sign(provisionalMBONValue(row))`. That is `tanh(MBON12 - MBON01)` (`.codebase/src/search-and-feedback/stockfish-target.mjs:29-35`), the value proxy of the Stockfish-value prototype. Since brain v5 (2026-10-26) the choice readout has been `MBON12 - MBON01 - MBON07 + MBON14` (`coupled-stockfish-brain-v5.mjs:8`), because the lasting memory is in the alpha1/alpha3 stores (MBON07, MBON14). D4 was never updated.
2. **That channel has a constant sign.** On every training-board row in the receipts, MBON12 - MBON01 > 0: 1,412 of 1,412 rows, trained and naive (disabled) lineages, all three replicas, blocks 1 and 30-32 ([d4-restrained-sign-train.txt](d4-restrained-sign-train.txt)). So the predicted sign is always +1. Each board then gets its safe probe right and its unsafe probe wrong, which gives exactly 64/128 whatever the Fly has learned. D4 as implemented could not pass for this learner.
3. **The choice readout has no calibrated zero either.** On the training probe analogue, the 48 probe actions of the training plan (late blocks), the safe capture outscores the unsafe one in every covered pair (8/8 per replica). But the sign of the full score is right for only 8-10 of 16 probe actions, and centring on the board mean for only 10-12 of 16 ([d4-probe-analogue-train.txt](d4-probe-analogue-train.txt)). Switching D4 to the choice readout would very probably still fail. The Fly has a learned *ranking*, not a learned *absolute valence*.
4. **The learning is almost all aversive.** Relative to the naive response (disabled lineage, same boards), unsafe probe captures go down in every case: 16/16 in each replica. Safe captures go up in only 11/16 (r1), 0/16 (r2) and 5/16 (r3) ([d4-naive-delta-train.txt](d4-naive-delta-train.txt)). Feedback was balanced: 128 success and 128 failure task statuses per informative lineage. *Hypothesis, untested:* safe and unsafe captures share many cue cells (capture and landing facts), so reward on the safe capture is cancelled by punishment of the unsafe ones on the shared cells. The safe capture then leads through its distinctive cells. This matches the "interference through shared cue cells" item in the weakness map.

5. **Follow-up (01:45-02:30): cancellation hypothesis refuted, and the cause located.**
   - *Synapses carry the right valence.* For every training probe action, I rebuilt its cue v2 cells (registered seed, no graph) and read the final informative memory gains on those cells' plastic edges ([valence-cells-train.mjs](valence-cells-train.mjs), [output](valence-cells-train.txt)). The current-weighted direct-path change raises the safe capture on 24/24 boards and lowers the unsafe one on 24/24, in every replica. Safe cells share 55-56% of their cells with the unsafe capture's. So reward and punishment do not cancel at the synapses. Overall, the alpha3 punishment store is depressed more than the alpha1 reward store: mean gain 0.82-0.85 against 0.92-0.95.
   - *The restrained pair adds a non-discriminating shift.* Splitting each probe action's trained-minus-naive readout change into its four MBON terms ([mbon-decomposition-train.cjs](mbon-decomposition-train.cjs), [output](mbon-decomposition-train.txt)) shows this. The MBON12 term (PPL103, restrained punishment compartment) falls by about 0.04 for safe and unsafe captures alike, and the MBON01 term rises by 0.02-0.03 for both. Only the alpha-lobe terms discriminate: MBON07 gives +0.025 safe against +0.015 unsafe, and MBON14 gives -0.016 safe against -0.024 unsafe.
   - *The alpha-lobe readout has an absolute valence.* Its sign, sign(MBON14 - MBON07), with no naive baseline, matches the verified outcome on 32/32, 32/32 and 31/32 training probe actions. In naive (disabled) brains it gets 16, 12 and 6 of 32, so learning created it. The restrained pair gets 16/32, constant, and the full choice readout 16-19/32 ([d4-candidate-readouts-train.cjs](d4-candidate-readouts-train.cjs), [output](d4-candidate-readouts-train.txt)).
   - *Within-training transfer (03:20).* At each training board's first look, before any lesson on it, sign(MBON14 - MBON07) is correct on 32-35/36 same-family probe actions and 9, 8 and 7 of 10 cross-family, against naive 5, 3 and 1 of 10 ([alpha-sign-first-visit-train.cjs](alpha-sign-first-visit-train.cjs), [output](alpha-sign-first-visit-train.txt)). Alpha-only top-1 choice is as good as the full readout: 21, 22 and 21 of 23 at first look against 21, 21 and 20; 16/16 late. The restrained pair alone gets 15-20/23 ([alpha-choice-train.cjs](alpha-choice-train.cjs), [output](alpha-choice-train.txt)).
   - *Interpretation (hypothesis; corrected 03:20).* The MBON-gamma2alpha'1 trace is short-term in flies (Berry, Phan and Davis 2018: stable for >= 15 min, nonsignificant by 1 hr; registered). The earlier attribution to Aso and Rubin 2016 was imprecise. Here they persist without decay, and they accumulate a generalised depression from all lessons that offsets the readout. The long-term alpha stores hold the move-specific valence. These are taught training boards. Whether the alpha-lobe sign transfers to unfamiliar boards is untested, and final boards will not be used to find out.

Sample limits: the receipts hold only the boards each lineage was taught in those blocks (16 of 48 probe actions in late blocks, 32 with naive pairing). These are training boards at block start, not the selected checkpoint on all boards.

## Mistake record

- **Measurement mistake (design and implementation):** when the readout changed in brain v5 (2026-10-26), D4's value channel was not moved with it. No test checked that the D4 value and the choice readout agree, and no D4 dry run was done on a trained brain. Smokes are validation-only, so full-r14 was the first time D4 was measured on a trained brain. The 2026-10-25 build weakness audit (C3) had already shown that this proxy is about 0 with a tiny spread, but only for the Stockfish target, not for D4.
- **Process mistake (mine, Claude Code):** before registering full-r14 I did not trace each gate's observation path to the current readout. The audit report tool (`report-stage1-audit.mjs`) also reports D4 without checking this.

## Parallel replay equivalence (engineering)

The runner v5 split replay of replica r1 (`runs/split-audit-test-v5-20261029/replay-r1.json`) equals the official audit's lineage audits for all 4 r1 lineages ([compare-replay-r1.txt](compare-replay-r1.txt)). The per-replica parallel audit is validated for the replay part. The merged acceptance step has not yet been compared on a full matrix.

## What this means and what is the researcher's call

- full-r14 stays **gate-failed**. It is preserved as is, and nothing here changes its verdict.
- D4's threshold stays frozen. Two questions are not mine to settle alone, because the answers set what a Stage 1 pass can claim, and the final families have now been evaluated once:
  1. **Which readout D4 measures.** The choice readout, its sign relative to the naive response, or a separately defined value channel. It must be fixed before the next registration, with training-data evidence only.
  2. **Whether the next registered full run may reuse the same final families** after this one audit. All full registrations (base, r2, r5, r14) pin the same `final.jsonl`. full-r14 is the first full run that reached an audit, so this was the first time the final families were evaluated. Only aggregate counts were read, and no learner choice was made from them.
- Independent of those answers, the full choice readout lacks a zero (point 4). Point 5 locates the cause: the restrained short-term pair, not the cue. Two candidate fixes follow, both on training evidence only:
  - (a) D4 reads the long-term alpha-lobe valence, sign(MBON14 - MBON07). Training sign accuracy is 95/96, against 34/96 naive. This is a measurement definition, so it is the researcher's call.
  - (b) A learner change, so that the restrained short-term compartments do not accumulate a permanent generalised depression. Examples are decay between lessons, or a lower restrained eta; it needs primary-source support. The choice readout itself would then get a zero. It needs a new registration and a smoke.
  Before any new registration, a value-channel guard (`check-d4-value-channel.mjs`) checks on recorded rows that the D4 channel is not constant in sign and agrees with the choice order.

Files: diagnostics `d4-*.cjs` (read receipts and training data only, no graph) and their outputs `*.txt`.

## Guard added (02:40)

`.codebase/scripts/puzzle-learning/check-d4-value-channel.mjs` (Haiku agent, reviewed; test `.codebase/tests/puzzle-learning/check-d4-value-channel.test.mjs`, 5/5) checks recorded assessment rows. It flags a value channel with a constant sign, and a channel that does not order moves like the choice score (agreement >= 0.95). On r1 block 32 it fails the full-r14 D4 channel (48/48 positive) and passes the choice score. Limits found in review: a channel can pass without a calibrated zero (the choice score passes but gets only 16-19/32 probe signs right), and the order criterion fails the alpha-lobe channel (0.67), which has correct signs. Treat it as a necessary check. The sufficient pre-registration check is the training-probe sign accuracy (`d4-candidate-readouts-train.cjs`).

## Option (a) drafted (03:45, not registered)

`lichess-stage1-acceptance-evaluator-v4.mjs` is evaluator v2 with the D4 probe sign taken from `alphaLobeValenceSign` (`.codebase/src/puzzle-learning/alpha-lobe-valence.mjs`, sign(MBON14 - MBON07)). Everything else is unchanged. It is ready to pin in a new registration if the researcher chooses option (a). Ledger L090.

## 6. Graph test of option (b) on training panels (2026-10-30 01:24-01:37, read-only)

[restrained-decay-graph-train.mjs](restrained-decay-graph-train.mjs) (Haiku agent, reviewed) rebuilds each informative brain and restores the audit's frozen block-8 checkpoint. It assesses the 24 training panels and their 48 probe actions under four memories: naive, trained, trained with the restrained (short-term) gains reset to 1, and trained with the alpha-lobe gains reset. CPU duty 0.75; about 4.5 min per replica; RSS <= 213 MiB. Output: [restrained-decay-graph-train.jsonl](restrained-decay-graph-train.jsonl).

| | r1 | r2 | r3 |
|---|---|---|---|
| choices correct: naive / trained / restrained reset / alpha reset | 8 / 24 / 24 / 13 | 16 / 24 / 24 / 20 | 5 / 24 / 23 / 9 |
| full-score sign correct on probes (every variant) | 24/48 | 24/48 | 24/48 |
| legal rows with full score > 0: trained / restrained reset | 390 / 390 of 390 | 145 / 390 of 390 | 390 / 390 of 390 |
| alpha sign correct on probes: naive / trained | 24 / 46 | 15 / 48 | 13 / 47 |

- **Option (b) does not give the choice readout a zero.** With the short-term store fully reset, the full score is positive on every legal row in every replica. The offset is structural: the pinned wiring makes MBON12 - MBON01 positive even in naive brains. This corrects the interpretation in point 5, which put the hidden zero down to a learned generalised shift. That shift exists, but resetting it leaves the score positive.
- **The long-term stores carry the learned choices.** Resetting them drops choices to 13, 20 and 9 of 24, near naive. Resetting the short-term store changes at most one board.
- **The alpha-lobe sign is learned valence at the selected checkpoint.** It is correct on 141/144 training probe actions, against 52/144 naive.
- Still untested: transfer of the alpha sign to the final families. Only a registered run with a pre-declared D4 readout may test it.
