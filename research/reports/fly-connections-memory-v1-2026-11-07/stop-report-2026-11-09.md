# Fly connections memory v1: stop report (2026-11-09)

**Properties 1–3 remain unmet. Stopped under the goal's stop clause: a required fact cannot be resolved from sources.** Volume 2, chapters 3 and 5. No full run was launched; the sealed test games (development bucket) remain unused.

## What does not hold (limits first)

1. The published gamma4 rule (Gkanias et al. 2022) never changed a choice in this model. In the dry run, 0/8 A and 0/8 B boards were acquired, and test success equalled learning-off (1/20). Development data only.
2. With the trainer's default drive (bias 0.01 in all 134,209 neurons, `trainer.mjs:44`), every gamma KC fires tonically. Two moves on one board share about 97% of their KC pattern, so learning shifts all moves together.
3. With zero drive, the code becomes sparse (14% of gamma KCs active, which sources describe as sparse), but KC rates fall to about 0.0005-0.0009, roughly 1,000 times below saturation. The rule's change is proportional to KC rate, so 16 events moved the practised move's score by 1.7e-7, and its rank did not change.
4. A 10-100 times stronger eye stimulus barely raises KC rates (0.0009), because early visual stages saturate.
5. Even gains chosen by an oracle at the rule's bounds (0.2 or 1.8), set to favour the safe capture over its top rival, never made a safe capture the top choice on 3 development boards; a second rival always overtook. Greedy construction: strong evidence, not a proof.
6. Not shown: any biological limit of the living fly, or a proof for the raw connectome model. These are finite measurements on 2-3 development boards.

## What was tried

| Step | Result | Evidence |
|---|---|---|
| Revision 2 build (packet, condition, judge, auditor, mapping check) | 135/135 tests; Codex code review r1 required changes, all fixed | journal items 11-14 |
| Dry run, 6 arms, seed 7300 | complete, "does not pass"; audit 9/10 PASS (pins FAIL from my post-registration edits only) | items 16, 19 |
| Codex diagnosis | dense-KC hypothesis supported; STOP FOR RESEARCHER DECISION | [diagnosis](diagnosis-r1.md) |
| KC threshold sweep | KCs stay active (network drive); all-or-none switch | item 18 |
| Zero drive | sparse (14%), 20 times more move-specific, but rates about 0.0005 | item 18 |
| Learning probe at zero drive | no ranking change after 16 events | item 18 |
| Eye-gain sweep | KC rates barely rise | item 18 |
| Probe v2: KC term on the model's own scale | scores move 18%, but all moves move together; margin levels off below 0 | item 21 |
| Oracle gains at the rule's bounds (greedy, 3 boards, both drives) | never makes a safe capture top; cycles between rivals; closest margin -1.5e-8 | item 22 |
| Multi-rival oracle bound (dual of max-min, exact verification) | zero drive: linear bound is negative on 2 of 3 boards; exact checks of tested settings lose; observed model error is 2-15%, not a global bound. Default drive: linear model is invalid and tested settings lose. | item 24 |

## Addendum 2026-11-09 05:00: revision 4 (widened, sourced mask)

Design review r4: BUILD ALLOWED WITH REQUIRED CHANGES (10 source modulation entries, one dopamine factor per MBON, narrowed claim; corrected in the revision-4 addendum). Its predeclared exact capacity gate (an exactly verified safe-capture win on at least 2 of 3 development boards) **failed: 1 of 3** (5XRGyGSj:13, margin +8.2e-9; the other two lose by 1.7e-6 and 9.8e-6). The single-shot surrogate is unreliable at the default drive, so this is not proof that no setting exists. Journal items 26-28.

## The unresolved fact

The rule is written for normalized activity (0-1). The model's KC rates are in different units, and the tonic drive level of each neuron type is an engineering default. To make the rule act, one must choose either a per-neuron baseline drive or a KC activity scale for the rule. No source gives either value for this rate model. Choosing it from chess outcomes would be tuning; choosing it from activity alone (for example, KC scale = maximum KC rate on development boards) is an unsourced engineering calibration that a strict reviewer would have to accept as such.

## Best evidence now

- **Volume 2:** development evidence that teaching reaches identified PAM07 neurons and changes only the fly's KC-to-MBON05 synapses (Property 1 mechanics, audited), but no learning of safe-capture choice.
- **Volume 4 (linear-surrogate result):** at zero drive, the linear model's dual bound is negative on 2 of 3 development boards for the 2,096 KC-to-MBON05 gains; exact evaluation of the tested settings also loses. This excludes settings only within the linear model. The observed 2–15% fit error is not a global bound, so these results do not prove that every setting in the exact network loses. A later sequential search found exact witnesses after widening the mask to 6,046 gains; that is a different condition, and the post-gate search has not had independent review. Separately, the eye-to-KC path either drowns the board signal in tonic drive or attenuates it about 1,000-fold, a measured but unproven limit of the raw connectome rate model. A general proof needs a bound on changes in pairwise move-score differences over the declared domain.

## Decision at the time of the stop (superseded by later probes)

At this point in the chronology, the oracle result made the calibration route appear unlikely to pass even if authorized: the 2,096-gain mask seemed unable to separate moves that share most of their KCs. The question then was whether to authorize **one disclosed engineering calibration** (zero tonic drive plus a KC activity scale for the rule, fixed from development-board activity only, before any data), as revision 3 with new review and a new dry run. Later probes superseded that question; see the final addendum.

## Addendum 2026-11-09: valence probe result

The unregistered, one-arm development probe in [journal item 31](../../journal/experiments/2026-11-07-fly-connections-memory.md) completed after this stop report. On all three tested boards, the best safe capture and best other move stayed the same across the baseline and six teaching passes; the safe-capture margin remained negative. The raw [probe output](../../../runs/fly-connections-memory-2026-11-08/wide-learning-probe-v2/probe.json) records all 21 board checkpoints. This probe had no matched no-pulse arm or independent audit, so it does not change the stop status or establish a general learning limit. No revision-4 full build or run began. At this point in the chronology, the researcher decision above remained open; the later capacity and learning probes superseded it.

## Addendum 2026-11-09: later capacity and learning probes

After the predeclared single-shot capacity gate failed, a sequential exact search on the widened 6,046-gain mask found safe-capture settings on all three development boards ([journal item 29](../../journal/experiments/2026-11-07-fly-connections-memory.md); [raw results](../../../runs/fly-connections-memory-2026-11-08/wide-capacity-seq-v1.log)). This is an existence result from a stronger search chosen after seeing the gate failure; it uses a different mask from the 2,096-gain result above, and no independent review has decided whether it satisfies the gate.

The subsequent reward-only and valence probes (journal items 30–31) left the best safe capture below its best other move on all three boards. The reward-only probe included an absent arm; the valence probe was a single arm with baseline scores only. Neither probe had an independent audit. These are limited development diagnostics, not a registered full-run result.

This evidence supersedes the earlier calibration question: the probes used default drive, without a new activity-scale calibration. No full revision-4 learning run is present in the run records. The current decision is whether to request independent review of the post-gate capacity search and probes before authorizing a full run, or to record these as bounded development results. No sealed test games were used.

## Correction 2026-11-09: capacity-mask scope

The original Volume 4 summary overstated item 24. Its negative dual bound applies to the linear surrogate for the 2,096-gain KC-to-MBON05 mask; exact checks covered tested settings, and the observed 2–15% fit error is not a global bound. It cannot rule out every setting on the exact network or every learning rule confined to those synapses. Item 29 reports exact witnesses on all three boards after widening the mask to 6,046 gains. That is a different condition and a post-gate search; its independent audit is still pending. The predeclared single-shot gate remains failed. Next verification: independently review the search bounds, mask identity, exact margins and whether the post-gate construction satisfies the registered gate before any full run. No gate changed and no experiment launched for this correction.
