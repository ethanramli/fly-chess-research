# Fly connections memory v1, design revision 4: the full incentive circuit (2026-11-09)

**Draft for strict design review. No build or launch.** Volume 2, chapters 3 and 5; P1-P3 of the [memory handoff](../research-goals/memory-handoff-2026-11-07.md). Builds on [revision 2](fly-connections-memory-v1-revision-2-2026-11-07.md) and its pipeline; preserves revision 2, its dry run and every gate file as history. Evidence for this change: [journal items 16-26](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md) and the [stop report](../../../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md).

## 0. Why revision 2 cannot pass, and what this changes

1. Revision 2 made only the gamma-KC inputs to MBON05 plastic. Its dry run learned nothing, and a multi-rival oracle bound (exactly verified at zero drive) shows that no setting of those 2,096 gains in [0.2, 1.8] can make a safe capture top on 2 of 3 development boards (item 24). The limit is that one mask, not the KC code: a linear readout of all KCs separates the moves on every board (item 25).
2. A capacity screen of the **full incentive circuit mask** (every positive KC input to the six MBON types of Gkanias et al. 2022, read out by the source's valences) finds positive margins on all 3 boards at the trainer's default drive (item 26; a proxy without dynamics, so a screen, not a guarantee).
3. Therefore: widen the plastic mask to the source's 8 DAN-to-MBON connections, keep the default drive and the rule's units unchanged (no unsourced calibration), keep Eyes v2, and keep every other revision-2 rule.

## 1. Sources and identities

Gkanias, McCurdy, Nitabach & Webb (2022), eLife 11:e75611, Table 1 (connections) and text (roles), read from the publisher page. Connectome types from the pinned FBbt ontology synonyms (`.cache/fbbt.obo`).

| Role (paper) | Neuron | Type | Valence used in the readout |
|---|---|---|---|
| sat | MBON-γ1pedc | MBON11 | +1 (attraction) |
| sav | MBON-γ4>γ1γ2 | MBON05 | -1 (avoidance) |
| rat | MBON-γ2α′1 | MBON12 | +1 |
| rav | MBON-γ5β′2a | MBON01 | -1 |
| mat | MBON-β2β′2a | MBON02 | +1 |
| mav | MBON-α′1 | MBON15 (prefix also matched MBON31: resolve before build) | -1 |
| dat (reward, verbatim) | PAM-γ4<γ1γ2 | PAM07 | teaching target |
| cat | PAM-β′2a | PAM02 | teaching target if its reward encoding is verified verbatim (open item) |
| dav, cav | PPL1-γ1pedc, PPL1-γ2α′1 | PPL101, PPL103 | no external current (positive valence only) |
| fav | PAM-β2β′2a | PAM03 | no external current |

Plastic connections = the 8 "DAN ⊸ MBON" rows of Table 1 (for example dat⊸sav, cat⊸rav, cat⊸mat, cav⊸rat, fat⊸mav, fav⊸mat, and the remaining rows transcribed exactly at build). Each connection's mask = existing positive-sign KC edges onto that MBON's cells; each uses its own DAN population's actual endpoint rate in the unchanged ReversalMemory rule (eta 0.5, gains [0.2, 1.8], activity scale 1.5). An MBON receiving two DAN rows gets one gain per (edge, DAN row), combined multiplicatively. **Open:** the exact equation by which the paper combines several DANs on one compartment; if the paper sums dopamine factors instead, follow it.

Not adopted from the source: its MBON-to-DAN feedback weights (the connectome's own wiring stays as it is) and its biases.

## 2. Readout

Score of a candidate = mean rate of attraction MBON cells minus mean rate of avoidance MBON cells at the endpoint (source valences; fixed before data). All legal moves are scored, as before.

## 3. Unchanged from revision 2

Packet, tapes (with the full-run packet already sealed), arms (the four gate arms; strength-matched and global APL arms dropped as declared in gates 4b.4), checkpoints, R probes, job loop, resume, auditor structure, resources, sealed development-bucket test games, every gate in the gates file plus: P2.2 split by group (A and B each beat absent, off and shuffled; review r2 red criterion), the B-end test rankings kept and budgeted, and the file-format doc corrected (no reused rankings).

## 4. Before the full run

1. Exact capacity check (not the proxy): the multi-rival oracle bound with the widened mask and the exact network on development boards; it must find at least one exactly verified safe-capture win per board on at least 2 of 3 boards, or the design stops before the full run.
2. Code changes, all small: mapping (multiple MBON/DAN groups), condition (valence readout, per-group teaching targets), auditor (same arithmetic per group), judge (unchanged). Haiku builds, strict code review, a new dry run on development data with its audit.
3. Budget: the dry run measures cost; the full run is registered only within the 2 GB process limit and a measured wall budget.

## 5. What a pass would and would not show

Would show: P1-P3 for a published, multi-compartment dopamine circuit in the fly's own synapses, through the unchanged eyes. Would not show: that the gamma4 compartment alone suffices (it does not, item 24), biological timescales or receptor kinetics, reasoning (P4), or replication across independent data (seeds share boards). Clues remain as in gates section 0 (task-selected boards, teacher-chosen practice, positive valence only).

## 6. Questions for the reviewer

1. Is widening to the source's full circuit a faithful P1 implementation, given that the MBON-to-DAN feedback weights of the model are not imposed?
2. Is teaching through PAM07 (and PAM02 if verified) with no current to punishment DANs an acceptable positive-valence protocol?
3. Is the multiplicative combination of two DAN rows on one compartment acceptable, or must the source's exact combination be found first?
4. Does keeping the default 0.01 drive (no calibration) avoid the source-less-calibration problem of the stop report?

## Addendum 2026-11-09: corrections required by design review r4 (BUILD ALLOWED WITH REQUIRED CHANGES)

[Review](../../../research/reports/fly-connections-memory-v1-2026-11-07/design-review-r4.md). The sections above are kept as written; these corrections replace them where they differ.

1. **Ten plastic modulation entries, one dopamine factor per MBON, one gain per synapse.** From the pinned author code (`.cache/incentive-circuit-1610c800/circuit.py` lines 100-180; `models_base.py` line 290: `D = max(v, 0) . w_d2k`; default weights in the constructor): dat PAM07 to MBON05 -1; dav PPL101 to MBON11 -1; cat PAM02 to MBON01 -1 and to MBON02 +0.3; cav PPL103 to MBON12 -1 and to MBON15 +0.3; fat (PPL1-gamma2alpha'1, role 1) to MBON15 -1 and to MBON12 -0.3; fav PAM03 to MBON02 -1 and to MBON01 -0.3. Rule: the unchanged DPR form (`dopaminergic`, w_rest 1) per synapse with D_m = sum_d W[d, m] * mean_d(max(0, rate)) / 1.5. **Identity limit:** cav and fat are both PPL1-gamma2alpha'1 (PPL103); the connectome type does not split them, so the PPL103 population serves both roles (disclosed approximation). DAN rates are averaged over all cells of a type (both sides): disclosed simplification.
2. **Claim narrowed:** this is a connectome model applying a published plasticity rule and modulation matrix to fly-mapped KC-to-MBON synapses, not the full incentive circuit. The source's MBON-to-DAN and MBON-to-MBON weights and biases are not imposed; the connectome's own wiring stays.
3. **Teaching:** +0.75 to the PAM07 and PAM02 cells is a computational teaching intervention, not the source's reinforcement protocol. Endogenous rates of every mapped DAN enter D.
4. **Engineering assumptions, stated as such:** the trainer's uniform 0.01 drive and the rate/1.5 activity scale are not source-derived. Keeping them avoids a new tuning step; it does not resolve the calibration question.
5. **Evidence wording corrected:** item 24 is a bound for a linear surrogate plus exact checks of selected settings, not an exact-network impossibility; items 25-26 are oracle and proxy capacity evidence. MBON15 (alpha'1) is pinned; MBON31 (alpha'1a) is a distinct term and is excluded.
6. **Gate before the full build (new, from LAUNCH 1):** an exact capacity check on the widened mask: dump per-edge rates, solve the surrogate, then set those gains in the exact network and rank; preserve every candidate vector and exact result. Proceed to the full build only if at least 2 of 3 development boards have an exactly verified safe-capture win.
