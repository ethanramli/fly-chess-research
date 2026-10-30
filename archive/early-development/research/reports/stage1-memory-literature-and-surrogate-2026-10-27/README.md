# Stage 1 memory and transfer: literature pass and no-graph surrogate (2026-10-27)

Scope: diagnosis only. No graph experiment ran, no pinned file changed, no registration made. Everything below is an engineering diagnostic or literature summary, not a learning result. Scripts are in `scripts/`. Run from the repository root, with S = `research/reports/stage1-memory-literature-and-surrogate-2026-10-27/scripts`: `node --max-old-space-size=512 S/<name>.mjs S/surrogate.mjs` for the validation and screens; `node --max-old-space-size=512 S/linear-regime.mjs` takes no argument. Each loads the pinned r11 factory once (one rest pass) and presents no stimulus.

## 1. Probe v7 status

- `runs/stage1-retention-probe-v7-spaced-alpha-three` stopped after 4 of 20 lineages (the eta 0.5 lineage). No `result.json`; the runner has no resume. Cause unverified; hypothesis: launched with `fly start`, not `fly detach` (ledger L037).
- Four eta-0.5 files on disk: f0-pin-p0a, f0-pin-p0b, f3-blocked-p0a unique-top after the final 10 lessons; f5-absent-p0a not (rank 4/7). The predeclared rule would select eta 0.5, but this is one replica, four boards, no published result.
- v6 -> v7 changed two things at once (alpha3 store and the MBON14 readout term), so the effect of the store alone is not isolated.
- Surrogate no-own-lesson control (same 20 interfering lessons, no lessons on A): 0/4 correct at the end, with and without the alpha stores. Surrogate only; the full-graph control is still missing.

## 2. Surrogate

`scripts/surrogate.mjs` is a direct-path linear model of the r11 learner: pinned r11 factory for weights, mappings, rest state and cue v4; r11 gain rules (restrained `g += eta*D*(k+g-1)`, alpha `g += eta*D*k`); no recurrence. Validation against the recorded v7 eta-0.5 pulses (`validate-surrogate.mjs`): scratch choice agrees on 20/24 boards (certified rank exact 14/24); over 92 lessons A-rank exact 71, within one rank 83; taught-board correctness agrees 91/92. It is an approximation, not the Fly.

Screens (eta 0.5, training boards only, `screen*.mjs`):

| Condition | v7 probe retained | boards correct by rotation round (24 boards) | leave-one-family-out |
|---|---|---|---|
| r11 as run | 3/4 | 7,9,12,11,13,11,12,12 | 2/24 (scratch 2/24) |
| no Stockfish pulse | 3/4 | 8,10,10,11,11,9,13,12 | 2 |
| restrained only (no alpha stores) | 0/4 | 3,1,3,2,3,3,4,4 | 2 |
| no restrained recovery [attribution only] | 1/4 | 6,7,11,15,16,17,18,18 | 5 |
| gains 0..3 [attribution only] | 3/4 | 9,10,15,12,15,13,11,12 | 2 |

Probe retention and training fit disagree when restrained recovery is removed (probe 3/4 -> 1/4, fit 12 -> 18/24). Unresolved; not a basis for registration. The "bidirectional prediction-error" variants scale a teacher pulse by the fly's own margin: attribution screens, not candidates; gain bounds 0..3 and no-recovery are unregistered changes.

Representation ceiling (`ceiling.mjs`, error-driven perceptron, supervised comparison baseline only): on cue-v4 tokens fit 24/24, leave-one-family-out 10/24; on hashed cue cells fit 24/24, 4/24. D2 needs 14/16 on validation. (answer.md reports 14/24 for a softmax scorer; the number depends on the learner.)

## 3. Static measurements (`linear-regime.mjs`)

- Share of each readout MBON's input weight from mapped plastic KCs: MBON12 0.78, MBON01 0.13, MBON07 0.94, MBON14 0.96.
- Signed MBON -> teaching-DAN weight per DAN: MBON07 -> PAM11 -0.050; MBON14 -> PPL106 +0.025; MBON12 -> PPL103 +0.016; MBON12 -> PAM02 +0.007. The transmitter-to-sign convention source was not located in the repo (grep found none), so whether the alpha1 loop is truly inhibitory is unverified.
- Stockfish pulses in v7 (eta 0.5): 182 with a channel; 74 oppose the verified outcome (61 success lessons punished, 13 failure lessons rewarded). Interfering boards correct right after their own lesson: 20/24 (83%) when the pulse agreed on a success lesson, 20/40 (50%) when it punished the certified move.

## 4. Diagnosis (ranked, partly hypothesis)

1. Transfer: held-out-family accuracy of the registered learner equals scratch in the surrogate; a perceptron on the same tokens gets 10/24. D2 is not reachable by memory fixes alone (hypothesis).
2. The restrained store forgets by rule: inactive KCs recover toward 1 on every pulse of their compartment. Consistent with Berry et al. 2018 (second odour restores the first odour's gamma2alpha'1 response, abstract level).
3. Stockfish absolute target opposes the verified outcome on about 41% of pulses; relative/regret target not yet implemented.
4. Readout asymmetry: MBON01 is 13% plastic input.
5. Possible inhibitory alpha1 loop sign (unverified).
6. Correction: the "f3-blocked-p0a never acquired" finding (answer.md Q6) applies to earlier revisions; in v5-v7 it is acquired (rank 1 after each own lesson).
7. Correction: answer.md proposes claw threshold theta = 2 of 7; Gruntman and Turner 2013 report that more than half of claws must be active (about 4 of 7).

## 5. Literature (evidence level as read this session)

Five Haiku subagents extracted text; their quotes were not checked verbatim. Not yet entered in `research/literature/source-solution-register.md` (required before experimental use).

- Gkanias et al. 2022, eLife 11:e75611 [full text, summarised]: rule `dW = delta*(k + W - w_rest)`, w_rest = 1; long-term memory via MBON -> own-DAN positive loop; reviewer replies flag equation errors and conflicting time constants.
- Bennett, Philippides, Nowotny 2021, Nat Commun [full text]: update proportional to KC activity times (d+ - d-); silent KCs unchanged; consolidation and forgetting not modelled.
- Rajagopalan et al. 2023, PNAS [full text, SI missing]: covariance rule with expectations subtracted.
- Shen, Dasgupta, Navlakha 2023 [arXiv v2 PDF]: 50 PN -> 2000 KC, top 5%, update only active-KC weights to the target output, no forgetting; supervised teacher.
- Aso and Rubin 2016 [full text]: alpha1 resists DAN-alone reduction, capacity >= 2; PPL1-alpha3 single pairing barely detectable, spaced training gives 1- and 4-day memory.
- Jacob and Waddell 2020 [full text]; Wu et al. 2017 [full text]: alpha3 aversive trace; protein-synthesis windows alpha3 0-12 h, gamma3 2-14 h, beta'2mp 4-16 h.
- Hige et al. 2015 [full text]: odour-specific depression, forward order required.
- Ichinose et al. 2015 [full text], Felsenberg et al. 2017 [full text], Li et al. 2020 [full text]: MBON -> DAN feedback; alpha1 loop direction anatomical inference.
- Coding: Honegger 2011, Caron 2013, Gruntman and Turner 2013, Lin 2014, Litwin-Kumar 2017, Dasgupta 2017, Huerta and Nowotny 2009 [full text or HTML-extracted]; Peng and Chittka 2017 [full text]; Devaud 2015, Cope 2018 [summaries]; Giurfa 2001 [abstract].

## 6. Open items

Verify transmitter sign; surrogate test of a claw-threshold cue; relative Stockfish target from the existing cache; raw KC -> MBON01 synapse counts; rerun probe v7 detached with a no-own-lesson arm and a second replica; register sources. Researcher decisions: D2 data/feature path, Stockfish target for D9, whether the restrained store stays in the teaching path.
