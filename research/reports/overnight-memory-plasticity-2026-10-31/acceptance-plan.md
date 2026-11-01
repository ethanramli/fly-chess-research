# Acceptance plan v1: memory candidate and assay

Written 2026-10-31, before any candidate code or result. Any later change gets a dated, versioned addendum in this folder. Results from before a change stay reported. No frozen source, protocol or restart-plan gate changes here. Numbers marked [choice] are engineering choices, not source values.

Scope: small synthetic rate fixtures only. A pass here is a software/assay result. It is not memory on the connectome and not chess learning.

## 1. Candidate identity

**Family 1, candidate `local-gated-v1`.** One rule on each plastic KC-to-MBON edge. Symbols: `k` = KC activity above rest, scaled and capped to [0,1]. `h` = DAN rate. `r` = DAN rest.

```
target eligibility  E = clamp((k - theta) / (1 - theta), 0, 1)
eligibility trace   e <- E + (e - E) * exp(-dt / tauE)
depression drive    a = eta * max(0, h - r) / scale
restoration drive   b = eta * max(0, r - h) / scale
gain                g <- gStar + (g - gStar) * exp(-e * (a + b) * dt)
                    gStar = (a * gMin + b * gMax) / (a + b); no change when a + b = 0
```

Fixed values [choice]: `eta = 0.5`, `scale = 1.5`, `theta = 0.2`, `tauE = 0.5` model time units, `gMin = 0.2`, `gMax = 1`. `gMax = 1` means restoration only: the gain cannot pass baseline.

What is source-backed and what is not: [candidate-spec.md](candidate-spec.md) and [anatomy/visual-pathway.md](anatomy/visual-pathway.md). In short: "active KC + DAN above rest weakens; active KC + DAN suppressed strengthens" is the fitted-model rule in Huang et al. 2024, not a measured synaptic rule. The threshold, the trace and the numbers are engineering choices.

**Baselines (pinned, unchanged classes):** `ReversalMemory` and `AlphaLobeMemory`, imported from `.codebase/src/neural-learning/`.

**Positive control (test instrument, not a candidate):** `SeparateTable`, one stored value per exact pattern identity, `v <- v + 0.25 * (r - v)`, `r = +0.8` for reward and `-0.8` for punishment.

## 2. Fixture

The circuit is one fly-shaped pair of compartments [choice]:

- **P compartment** (punishment side): approach MBON, written by DAN `P`.
- **R compartment** (reward side): avoid MBON, written by DAN `R`.
- `value(x) = (1/s) * sum_k act_k * (w^P_k * g^P_k - w^R_k * g^R_k)`, where `act_k` = pattern activity (h/1.5). This is the existing approach-minus-avoid convention. The readout is fixed and never fitted.

Sizes [choice]: `nKC = 200`, pattern size `s = 20`. Base weights `w` are uniform in [0.5, 1.5], drawn per edge from the seed. Focal KC activity is `h` uniform in [0.9, 1.5] (so `k` in [0.6, 1]), drawn per pattern and KC. Non-focal KC activity is `h = 1.5 * bg`.

**Pulse.** DAN rest `h = 0.75` for both DANs [choice]. Reward event: `R` goes to `1.5`, `P` goes to `0` (the measured sucrose suppression of PPL1 cells, Huang 2024). Punishment event: `P` goes to `1.5`, `R` stays at `0.75` (no measured basis found for a PAM dip, so none is modelled). The teacher only chooses reward, punishment or nothing. It never reads gains and never computes a change. This suppression link is a fixture assumption, not a graph result.

**Frames.** Every rule receives the same frames, with dt in model time units:

1. Scoring: for each candidate in fixed order, one image frame (dt 1, DAN at rest), then one gap frame (dt 4, no KC activity above rest except `bg`). The score is read on the image frame. Scoring never uses a pulse.
2. Chosen image: one image frame (dt 1), then one pulse frame (dt 1, image on, pulse), then one gap frame (dt 4).

Old rules take `dt = 1` on every frame. Their gap frames are no-ops because no DAN is above rest.

**Items.** Item = two candidate images. Items A, B, C. Consequence table: in a phase, `good` gets reward and `bad` gets punishment. Which image of a pair starts as good is set by the seed, balanced across seeds.

**Pinned overlap grid.** No level may be dropped after results.

| Factor | Levels |
|---|---|
| Across-item overlap `q` = shared focal KCs of B with A, as a fraction of `s` | 0, 0.1, 0.25, 0.5, 0.75, 0.9 |
| Relation | congruent (B+ shares with A+, B- with A-); conflicting (B+ shares with A-, B- with A+) |
| Within-item overlap `w` = shared focal KCs of X+ and X-, fraction of `s` | 0, 0.5, 0.9 |
| Weak shared background `bg` | 0, 0.1, 0.3 |

C is always disjoint from A and B: it tests inactive edges. B tests shared edges. Pattern construction is fixed in `memory-assay-fixture.mjs`; shared KCs are taken first from the distinct part of each A image, then from A's shared part. Actual overlaps (focal fraction and graded cosine) are recorded for every run.

## 3. Schedule

One continuous memory trajectory per run:

| Step | What | Trials |
|---|---|---|
| ACQ_A | train A | 24 |
| T1 | test | none |
| ACQ_BC | train B and C, seeded fixed interleave | 24 + 24 |
| T2 | test A, B, C | none |
| REV1 | swap A's consequences, train A | 24 |
| T3 | test | none |
| REV2 | swap back, train A | 24 |
| T4 | test | none |
| REV3 | swap again, train A | 24 |
| T5 | test | none |

The order is fixed from the seed before the run. It never depends on errors. Every 8th trial's certificate is `unknown`: the trial still shows images, the checker returns unknown, and there is no pulse.

**Choice.** Softmax over the item's two values with temperature `0.1` [choice] and a seeded PRNG. The learner's own values are logged first. Only the chosen action gets a consequence check.

**Certificate.** Each event binds fixture hash, phase, trial index, situation, history hash chain, chosen action, the logged pre-feedback scores, and the consequence. A separate module recomputes the consequence from the table and rejects any mismatch. A rejected certificate gives no event.

**Arms** (same seed, same presentation order; each makes its own choices):

1. `informative`: true consequence.
2. `absent`: no pulse.
3. `shuffled`: true consequence still recorded, delivered valence = the informative run's realized pulse sequence for this seed, permuted within each phase by a seeded shuffle, applied to this arm's own chosen action. It is reported as degenerate if a phase has only one valence or if agreement with truth is 100%.
4. `disabled`: pulses are delivered, plasticity is off.

Fixed exposure only. Acquisition-matched analysis is not run.

**Information-conflict control** (separate fresh learner, not part of memory scores): one image pair shown in two situations with opposite consequences, 48 trials. Identical full input means no rule can solve it. Failure there is an information limit, not forgetting.

## 4. Metrics

For item X at test T, with `good`/`bad` by the consequence table in force at T:

- `m = value(good) - value(bad)`.
- `mNorm = m / (1.6 * (1 - w))`. 1.6 is the largest possible margin per unit weight and activity. It is a scale only.
- `greedyCorrect = m > 0`. Also logged: `value(good)`, `value(bad)` separately, so competitor changes are visible.
- `R = m_A(T2) / m_A(T1)`: retention, computed only when `m_A(T1) > 0`; otherwise counted as a retention failure (a run that never acquired A has no retained A).
- `floorOcc` per compartment on A's focal edges: fraction with `g <= gMin + 0.01`.
- Inactive drift: largest `|change in g|` on edges whose KC had `k = 0` through a phase.
- Trace reports: gains for A's edges, so erasure (trace moved) and competitor change can be told apart.

Failure labels: **acquisition failure** (T1 gate failed), **erasure** (A's own gains moved back), **competitor change** (A's good image kept its value and bad rose), **input ambiguity** (information-conflict only). The fixture has no separate retrieval stage, so a retrieval failure with an intact trace cannot occur here. That is a limit of this fixture, not a finding.

## 5. Gates

Each gate is evaluated per cell on the informative arm, over seeds. `Gated cells`: `w` in {0, 0.5}, `bg` in {0, 0.1}, and either (`q` in {0, 0.1, 0.25}, both relations) or (`q = 0.5`, congruent). All other cells are **report-only**. They are always reported and never dropped. The final report must state the boundary where gates stop passing, because real overlap on the graph is unmeasured and may be high.

| Gate | Requirement |
|---|---|
| G1 acquire A | median `mNorm_A(T1) >= 0.40`; `greedyCorrect` in at least 90% of seeds |
| G2 acquire new | same for B and C at T2 |
| G3 retain A | median `R >= 0.70`; `greedyCorrect` for A at T2 in at least 90% of seeds |
| G4 revise A | at each of T3, T4, T5: median `mNorm_A >= 0.40`, `greedyCorrect` in at least 90% of seeds |
| G5 controls | `absent`, `disabled`: all gains unchanged. Paired `mNorm_A(T1)` informative minus each control `>= 0.20` in at least 90% of seeds. Same for B at T2 |
| G6 B survives | B's `greedyCorrect` at T3 in at least 90% of seeds (revising A must not destroy B) |

Software gates, for all candidates:

| Gate | Requirement |
|---|---|
| S1 math | closed form matches independent small-step integration to 1e-6; finite and bounded on adversarial input |
| S2 inactive | at `k = 0` and settled trace, gain change below 1e-9 per pulse |
| S3 delay | a delayed pulse lowers the update size; `gStar` and the direction never change |
| S4 stale | a trace from an earlier image, after the declared gap, moves any gain by less than 1e-3 per pulse |
| S5 snapshot | snapshot/restore mid-trajectory reproduces later results bit-exactly; identity mismatch and corrupt state are rejected before any change |
| S6 disabled | plasticity off leaves all state hashes unchanged |
| S7 isolation | two instances share no mutable arrays |
| S8 unknown | unknown or rejected certificate gives no event and no gain change |
| S9 signs | fast edge signs and topology unchanged; only `setMagnitude` on mapped edges |

## 6. Validity check (runs before any candidate)

All at the primary settings, on development seeds, in the cell `q = 0`, `w = 0`, `bg = 0`, unless stated.

**V1 `ReversalMemory` loses A by inactive recovery.** Derivation: with `a = eta*dt*d = 0.25` and `k = 0`, each pulse in a compartment gives `g <- g + a*(1 - g)`, so after `N` pulses `1 - g` shrinks by `(1 - a)^N`. Prediction, both required:

1. For A's edges during ACQ_BC, `g(T2) = 1 + (g(T1) - 1) * 0.75^N_c` to within 1e-9, where `N_c` is that compartment's realized pulse count. This holds for edges whose `k = 0`.
2. G3 fails: median `R < 0.35`. Reason: `R <= 0.75^min(N_R, N_P)` and punishment pulses during B and C are at least about 4.

**V2 `AlphaLobeMemory` saturates at its floor.** Derivation: `dg = -a*k` with no recovery, so gains fall monotonically and floor after about `0.8/(0.25*k)` pulses (3.2 to 5.3 pulses). Prediction, all required:

1. No gain rises in any phase.
2. G3 passes at this cell: `k = 0` edges do not move, so median `R >= 0.70`. This is the rule's real strength.
3. G4 fails at T5: median `mNorm_A(T5) < 0.10`, with median `floorOcc >= 0.9` in both compartments. Once both compartments floor, `value` is only `0.2 * naive`.

**V3 positive control passes.** `SeparateTable` passes G1 to G4 and G6 in every cell of the grid, including report-only cells and high overlap.

**V4 controls and information conflict.** `absent` and `disabled` leave gains unchanged for both old rules. On the information-conflict control, every rule's final `|mean greedy accuracy - 0.5| <= 0.25` over seeds, and the positive control also fails it.

**V5 overlap is real.** Actual `q` and `w` match the pinned levels within `1/s`, and shuffled runs in the validity cell are non-degenerate in at least 90% of seeds.

If any of V1 to V5 fails, the assay is invalid, candidate results do not count, and repairing the assay uses one repair loop.

## 7. Falsifiable candidate hypotheses

Stated before results. "Predicted" values come from the rule equations, by hand, and may be wrong.

| ID | Hypothesis | What a miss would mean |
|---|---|---|
| H1 | G1, G2 pass in gated cells | The rule, the dose or the schedule cannot acquire; check dose and choice exploration |
| H2 | At `q = 0`, `R` is about 1 (inactive edges protected) | A software defect or a stale trace |
| H3 | G4 passes at T3, T4, T5, where `AlphaLobeMemory` fails | The restoration route does not prevent saturation |
| H4 | Shared KCs are not protected. Conflicting `R` falls with `q`, roughly `1 - 1.4*q`: about 0.86 at 0.1, 0.65 at 0.25, 0.3 at 0.5, below 0 at 0.75 | If `R` does not fall, the assay is not testing sharing |
| H5 | So G3 may fail at `q = 0.25` conflicting (predicted about 0.65 against 0.70) | Named residual failure, which is the trigger for family 2 |
| H6 | `bg = 0.3` exceeds `theta` and leaks credit to every KC. Report-only cell; predicted to degrade | If not degraded, the threshold is not doing the work assumed |
| H7 | R-compartment gains on used KCs floor and stay floored, because no PAM dip is modelled. This does not stop revision, since the P side carries it | If revision fails while P-side range remains, the two-store argument is wrong |

## 8. Development and held-out separation

- **Development:** seeds 1001 to 1012, `nKC = 200`, `s = 20`. Candidate choices may use only these.
- **Held-out H1:** seeds 9001 to 9024, same sizes.
- **Held-out H2:** seeds 9101 to 9112, `nKC = 400`, `s = 40`.
- A candidate version is frozen before it sees held-out seeds. Held-out results run once per frozen selected candidate and are all reported. Held-out seeds never drive a repair; a held-out failure ends that candidate as failed.

## 9. Sensitivity (report-only, frozen candidate, development seeds, no selection)

One factor at a time from the primary settings: `eta` in {0.25, 0.5}; temperature in {0.05, 0.1, 0.2}; `theta` in {0.1, 0.2, 0.3}; dip size (P falls to `0.375` instead of `0`). These do not choose anything; they show how fragile a pass is.

## 10. Caps

- Two mechanism families and six repair loops in total. Family 2 is a minimal fast/slow variant, allowed only if family 1 acquires and then fails G3.
- Three failed attempts on one assumption stop that assumption.
- Run budget: one full grid in at most 30 minutes wall clock; RSS at most 2048 MiB (expected far less); Node heap 256 MiB; duty 0.5 between cells.

## 11. What each outcome means

- Validity fails: the assay cannot tell good from bad. No candidate result counts.
- Candidate passes all gates on development and held-out: **READY FOR THE REAL-GRAPH MEMORY TEST**, meaning a small fixture passed. Not memory on the connectome. An earlier surrogate failed to reproduce the real graph's r13 collapse.
- Candidate fails a gate within the caps: **FAILED AT [gate]**, with evidence.
- A required fact is unavailable: **BLOCKED BY [fact]**.

## Addendum v1.1 (2026-10-31, before any assay or candidate result)

Implementation notes found while reviewing the fixture code. No gate, level or threshold changed.

1. "Which image of a pair starts as good is set by the seed, balanced across seeds." Implemented this way: `X+` is always the image that starts good, and images are random seeded draws, so `+` and `-` are exchangeable. The seed balances presentation order (`flip`, odd seeds show `X-` first).
2. G5 and V4 "gains unchanged" compare a hash of gains, not the rule's full state hash, because the pinned old classes count every `observe` call as an event.
3. Certificate limit: the checker can verify the binding and the consequence, but it cannot know the learner's real choice. Determinism of the whole run is checked instead: the same seed gives the same record, and a replay must match.

## Addendum v1.2 (2026-10-31, after validity-v1, before any candidate code ran). Assay repair, loop 1 of 6

**Result that forced this.** [validity-v1](validity-v1/validity.json) returned `valid: false`. V1 to V4 and overlap V5 passed exactly as predicted. Two problems remain, both in the assay. Results from v1 stay reported.

1. **V5 degeneracy definition was wrong.** It called a shuffled run degenerate if any phase of the informative run had only one valence. 6 of 12 seeds met that for both old rules. But a learner that has settled gets one valence in a phase because it chooses correctly. The shuffled arm receives that valence on its own choices regardless of what it chose, so contingency is still broken. The right test of degeneracy is whether delivered valence still tracks the true consequence.
   **New definition:** degenerate if overall agreement with truth is at least 0.95, or the whole trajectory has only one valence. Single-valence phases are still counted and reported (`singleValencePhases`). Pass mark for V5 (at least 90% non-degenerate) is unchanged.
2. **G5's shuffled requirement cannot be met by any rule, including the positive control.** Paired `mNorm` informative minus shuffled at least 0.20 in 90% of seeds gave a share of 0.67 at A/T1 for `SeparateTable`, cell 0, and 0/28 gated cells passed. Reason (a diagnosis from the rule equations, not separately tested): non-contingent reward on the arm's own choice produces rich-get-richer preferences, so the shuffled margin is large in a random direction, including the correct one. Per-cell comparison at 12 seeds cannot resolve that.
   **New G5:** per cell, `absent` and `disabled` requirements are unchanged. Shuffled moves to a pooled check over all gated cells (**G5s**): shuffled `greedyCorrect` share for A at T1 and for B at T2 must lie in [0.35, 0.65], and the informative share minus the shuffled share must be at least 0.25. Per-cell shuffled medians stay reported.
3. **V3 now also requires G5 and G5s.** The positive control has to pass every gate a candidate must pass. Without this, V3 would have missed problem 2.

**Disclosure.** These pass marks changed after seeing old-rule and positive-control results, but before any candidate code existed, so no candidate result influenced them. The change weakens a per-cell requirement into a pooled one: a per-cell shuffled failure is no longer a gate failure.

## Addendum v1.3 (2026-10-31, after candidate dev run 1). Mechanism repair, loop 2 of 6

**No gate, level or threshold changes.** One causal factor changes: the fixture's punishment signal. The candidate equation is unchanged. Results from before this stay reported in [grid-local-gated-v1-dev](grid-local-gated-v1-dev/summary.json).

**Named failure.** G4 failed in 28 of 28 gated cells. At `q=0, w=0, bg=0`: `mNorm_A` was 0.22, 0.37, 0.25 at T3, T4, T5 against 0.40 required. `vBad` at T3 was about 0.03. The R-side gains of a formerly rewarded image sit at the floor (floor occupancy about 0.5 of A's edges), and with no R-side restoration a formerly good image cannot fall below value 0. So the largest possible reversal margin is about 0.64, which is exactly the pass mark. H7 said this would not stop revision. That was wrong.

**Mistake found in the plan.** Section 2 said "no measured basis found for a PAM dip, so none is modelled". A targeted source check found one. Cohn, Morantte and Ruta, Cell 2015, Results "DANs Represent Context through Coordinated Patterns of Activity" (presynaptic calcium in DAN terminals): "while sugar feeding activated the γ4 and γ5 DANs… we observed that sucrose ingestion also inhibited the γ2 and γ3 DANs", and "a brief electric shock … activated the γ2 DAN, but found that it also excited the γ3 DANs and inhibited the γ4 and γ5 DANs". This is reciprocal, on exactly the γ2/γ4 route chosen in [visual-pathway.md](anatomy/visual-pathway.md). The earlier search read only Huang 2024, which imaged PPL1 cells only.

**Change.** Punishment event: `P` goes to `1.5`, `R` goes to the same dip as reward uses (`0` at primary settings). Before: `R` stayed at `0.75`. This does not touch old rules, whose DAN term is rectified, or `SeparateTable`.

**Predictions, written before the run, from the equations by hand:**

1. G4 passes: `vBad` can now fall below 0, so the cap is gone. Own-choice sampling may still stop punishments once the margin is a few temperatures wide, so a median near but above 0.40 is expected, with no guarantee.
2. H4 gets worse, because shared KCs now flip further: at `q=0.25` conflicting, `R` drops from 0.68 to about 0.5, and G3 fails more clearly. Acquisition and `q=0` retention are unchanged within noise (speed rises because both compartments move).
3. If G4 passes and G3 fails at conflicting overlap, that is the named residual failure allowing family 2.

**Evidence that argues against the candidate, found in the same paper.** Cohn 2015 reports "robust potentiation induced by activation of DANs alone" and "odor-independent synaptic potentiation", with paired and unpaired trials at `<500 ms` and `>45 s`. So real unpaired dopamine can restore KC-MBON output without KC activity. Candidate rule protects inactive edges from pulses, so it departs from that result. Handler 2019 partly offsets this: "the brief episodes of odor and dopaminergic reinforcement (1–2 sec) … are insufficient to overwrite an olfactory association when presented independently". The conflict is unresolved. It is recorded in [candidate-spec.md](candidate-spec.md).

## Addendum v1.4 (2026-10-31, after dev run 2). Family 2, repair loops 3 and 4 of 6

**No gate, level or threshold changes.** Residual failure after loop 2: [local-gated-signal2-dev](local-gated-signal2-dev/summary.json) passes all gates in 11 of 28 gated cells. G1 passes 28/28. At `q = 0, bg = 0`, G3, G4 and G6 pass with `R` = 1. Failures: G3 on conflicting overlap (`R` 0.87 at `q=0.1, w=0`; 0.64 at `q=0.1, w=0.5`; 0.61 at `q=0.25, w=0`; 0.19 at `q=0.25, w=0.5`), G6 on congruent overlap once A is reversed, and G2/G4 at `bg = 0.1`, where the margin is about 0.41 against 0.40 and contrast falls by about `(0.8-0.1)/0.8` (a diagnosis by hand, not tested).

The family 2 condition in section 10 is met: family 1 acquires and fails G3.

**Candidate `local-slow-v1`.** Fast gain `u` follows the `local-gated-v1` equation. Add one slow state `s` on each plastic edge:

```
rate = e * (a + b)                     // same local rate as u; zero when not eligible
s <- u + (s - u) * exp(-rho * rate * dt)
effective gain g = (u + s) / 2         // written to the KC-to-MBON edge; the readout is unchanged
```

`s` only moves toward `u`, and only on eligible edges during a pulse. There is no free decay, no time-driven consolidation and no task label. It stays revisable: opposite pulses move `u`, and `s` follows. The equal mix is an engineering choice; it is not from a source. Benna and Fusi 2016 motivate a coupled hidden variable. This is a much simpler one-way approximation, with no back-coupling, and it inherits none of their capacity results.

**Exactly two settings, declared before any result. No other values will be tried:** loop 3 `rho = 0.25`; loop 4 `rho = 0.5`, run only if loop 3 fails G1 or G4 and improves G3.

**Predictions, by hand, before any run:**

1. `rho = 0.25`: after 20 rewards `s` has moved about 60% of the way. T1 margin falls to about 0.36 in `mNorm` (G1 **fails** or is marginal), because half the readout lags.
2. G3 at `q = 0.25` conflicting, `w = 0`: `R` rises from 0.61 to about 0.70.
3. `rho = 0.5`: G1 about 0.41, marginal. `R` at that cell about 0.63: small gain.
4. **Overall prediction: family 2 will not pass G1 and G3 together in all gated cells.** Reason: B gets as many pulses as A in this schedule, so a slow store fed by the same pulses ends up about as overwritten as the fast one. It only helps by lagging, and that lag costs A the same margin. A setting that passes everything would refute this reasoning.
5. `q = 0` cells stay at `R` near 1, because inactive edges still do not move.

## Addendum v1.5 (2026-10-31, after loop 3). One targeted diagnostic; not a candidate

**No gate, level or threshold changes.** Loop 3 result: [local-slow-rho0.25-dev](local-slow-rho0.25-dev/summary.json) passes 0 of 28 gated cells. G1 0, G2 2, G3 22, G4 0. `mNorm_A(T1)` 0.34 (predicted about 0.36). `R` at `q=0.25` conflicting, `w=0`: 0.64 (predicted about 0.70), against 0.61 for family 1. Loop 4 condition: G3's count is unchanged at 22, but `R` improved in every conflicting gated cell (0.87 to 0.87, 0.64 to 0.69, 0.61 to 0.64, 0.19 to 0.31), so `rho = 0.5` runs as declared.

**Rule applied.** Goal section 6: after three failed attempts on one assumption, stop coding that assumption, state a falsifiable alternative and use one targeted diagnostic. The assumption: "shared-KC overwriting can be fixed by per-edge state". Attempts: `local-gated-v1`, `rho = 0.25`, `rho = 0.5`.

**Falsifiable alternative.** Overwriting comes mostly from **overtraining**. The good image of B keeps collecting reward pulses after the learner already prefers it: about 20 of 24 trials. Each pulse keeps writing on KCs shared with A. If the DAN deviation falls as the fixed readout's value approaches the outcome, shared KCs should flip much less. This is the idea in restart plan section 5 ("let real wires limit learning"), Bennett et al. 2021 (abstract only) and review finding F09.

**Diagnostic `diag-selflimit-local-gated-v1`. Labelled diagnostic: it cannot be selected, cannot earn READY, and is not a third mechanism family.** It uses the same rule and equation as `local-gated-v1`. Inside the adapter only, on pulse frames, DAN deviations from rest are multiplied by:

```
reward:     clamp(1 - v / V0, 0, 1)
punishment: clamp(1 + v / V0, 0, 1)
```

`v` is the fixed readout's value of the image on screen, and `V0 = 0.64` is the largest value reachable at mean activity 0.8 [choice]. No other setting will be tried. Limits declared now: the fixture has no MBON-to-DAN wiring, so this is a direct numerical stand-in for it. Real-graph anatomy does not support it clearly: `MBON05` to `PAM08` is mixed (81 excitatory, 141 inhibitory synapses), and `MBON32` to `PPL103` is 14 inhibitory synapses. Huang 2024 fitted some excitatory feedback to negligible strength, according to the review.

**Predictions, by hand, before any run:**

1. `R` at `q = 0.25` conflicting `w = 0` rises above 0.70 (from 0.61). This is the main test: if `R` does not rise, overtraining is not the main cause and the alternative is refuted.
2. G6 improves at `q = 0.5` congruent.
3. `mNorm_A(T1)` falls, because pulses shrink as values grow. It may fall below 0.40, which would be a cost and not a refutation.
4. `q = 0` retention stays at about 1.
