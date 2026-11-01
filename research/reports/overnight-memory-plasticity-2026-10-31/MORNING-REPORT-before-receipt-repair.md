# Memory-plasticity development report — 2026-10-31

## 1. Outcome: failed candidates, and a diagnosed test limitation

**FAILED AT shared-conflict retention G3; the original assay also has incompatible G4/G6 requirements in two cells. No candidate is ready for the real-graph memory test.** The bounded development/report package is complete with a negative decision. FlyChess memory, chess learning and reasoning remain unsolved.

Software: **93/93 focused checks pass.** Biological mechanism: hypothesis only, with unresolved pathway/timing/receptor assumptions. Actual model learning/transfer: **not tested by this package**. All runs use synthetic rate fixtures, not the connectome. No held-out fixtures, sealed chess tests, graph training or eye test were opened/run.

The decisive new result is an upper bound, not another failed rate setting: at q=.5 congruent,w=.5, the readout cannot keep B correct and reverse A strongly enough. Allowing the one B failure permitted across twelve seeds, the optimistic median normalized A bounds are **.276163** (bg=0) and **.274257** (bg=.1); G4 requires **.40**. [Math specification](readout-bound-spec.md), [all 108 cells and 1,296 seed certificates](readout-capacity-verified.json). Slow storage cannot exceed the same expressed gain/readout bounds. Other cells are not ruled out by this test; their learner failures remain unresolved.

SeparateTable passes by storing independent per-image values. It was a useful schedule/teacher control but could not establish neural-readout feasibility. Original validity-v2/v3 passed their own checks; the stronger candidate-readiness interpretation was wrong. Original gates/levels/results remain unchanged. This is not evidence that biological flies cannot remember or reason.

## 2. Six-component disposition

| Component | Current disposition | Exact evidence / unresolved requirement |
|---|---|---|
| Visual pathway and mapping | Static anatomy inspected; graph receiver not validated | [Visual-route counts and provenance](anatomy/visual-pathway.md). Candidate KCg-d→MBON32/35 and MBON05 route; subtype/compartment crosswalk and output valence unresolved. Li primary passages confirm some names, not the complete functional mapping |
| Eligibility and timing | Declared numerical properties pass | [Core and tests](../../../.codebase/tests/neural-learning/local-gated-memory.test.mjs): inactive protection, delay, stale trace, gain bounds and split-step math. Threshold/time constant are choices; shared active KCs still receive credit; no biological time calibration |
| Modulatory signal | Reciprocal fixture pulse only | [Candidate source distinctions](candidate-spec.md), [source register](../../literature/source-solution-register.md). Cohn calcium motivates reciprocal responses; Huang strengthening is a fitted model feature. Actual DAN rest/suppression route and visual plasticity physiology missing. Released fast signs preserved |
| Persistent plasticity | Local candidate improves disjoint retention/reversal; joint task fails | [Candidate outcome summaries](run-inventory.json), [loop log](loop-log.md). Slow states trade acquisition/reversal for a small retention change. Two static readout conditions are mathematically incompatible; no biological validation |
| Readout and behavior | Fixed unaided policy; assay adequacy insufficient | [Capacity proof](readout-bound-spec.md), [methodology review](methodology-review.md). All overlap levels preserved. Initial acquisition measured. No retrieval stage distinct from storage, no selected candidate, held-out result or learned concept |
| Persistence and audit | Snapshot/restore, state isolation and disabled-state checks pass; event audit absent | [93 focused checks](../../../runs/python-actions/20261031T035024-58d3b3d1/completion.json). Candidate/slow state includes gains, traces, slow values, time and pulse count. [52,236 saved rows contain no per-trial choices/certificates](record-coverage-audit.json); [checker scope probe](certificate-scope-probe.json) accepts an invented trial number. Exactly-once pending publication remains a written future contract |

## 3. Candidate, baseline and control results

Each grid includes 108 conditions, twelve development seeds and four arms. The original acceptance plan gates 28 conditions. Counts below are those original descriptive results, **not validated scientific successes**.

| Preserved development run | Cells passing all six / 28 | G1 acquire | G2 new | G3 retain | G4 revise | G5 controls | G6 B survives |
|---|---:|---:|---:|---:|---:|---:|---:|
| Reversal baseline | 0 | 21 | 0 | 2 | 20 | 17 | 12 |
| Alpha baseline | 0 | 14 | 14 | 15 | 0 | 14 | 25 |
| Local v1, original asymmetric signal | 0 | 28 | 22 | 24 | 0 | 28 | 26 |
| Local v1, reciprocal signal | 11 | 28 | 22 | 22 | 19 | 28 | 22 |
| Slow rho .25 | 0 | 0 | 2 | 22 | 0 | 28 | 23 |
| Slow rho .5 | 0 | 7 | 6 | 22 | 0 | 28 | 22 |
| Self-limit diagnostic, not selectable | 3 | 14 | 9 | 22 | 7 | 28 | 22 |

Absent/disabled gain hashes stayed unchanged in the stored records; this is an aggregate hash check, not event replay. Pooled shuffled checks passed for these candidates, but repeated cells share seeds; do not treat the pooled choices as independent organisms or infer precise population uncertainty. True and delivered valence are distinguished in the implementation, but original event bodies were not saved. Unknown trials cause no pulse in the implementation and targeted checks.

Every failed attempt is retained: validity-v1 measurement failure; pre-pin exploratory probe with no retained script; initial missing action-config keys; pin mismatch; first candidate's missing reciprocal signal and mistaken source reading; both slow settings; self-limit prediction miss; stale session record; positive-control capacity oversight; missing event records; and failed Haiku CLI delegation. [Chronology and limits](loop-log.md). Five of six repair loops are accounted for conservatively, across two mechanism families. A sixth rate repair cannot pass a proven static bound. Lower-overlap G3 failures and exact visual physiology remain open; the two slow settings do not refute all slow-memory theories.

## 4. Verification, identities and resources

Final [focused config v10](../../../python%20actions/memory-assay-v10-step.json): **93 pass, 0 fail**, 6.79 s. Required `npm test -- --test-concurrency=1`: **618 pass, 6 fail of 624**, 139.39 s, exit 1; [full raw log](../../../runs/python-actions/20261031T034601-35f60aaa/stdout.txt). Failures reference historical report/data paths moved to the archive. The corresponding archived artifacts exist; they were not copied back and no unrelated test/archive was changed. This is not a wholly green repository. Full-suite peak RSS/CPU were not measured. The later final test-only adapter comparison is covered by the focused run.

The paced capacity check used 256 MiB Node heap, duty .5, RSS/free-memory assertions; **4.33 s wall, 1.80 s CPU, 57.20 MiB process high-water RSS**. These measurements describe this small math check, not graph performance. Original grids sampled peak RSS about 78.65–101.09 MiB; [inventory with exact commands/timing](run-inventory.json). No comparative speed or hard OS CPU-cap claim. Original CPU times were not recorded.

[Final artifact/source/config hashes](artifact-manifest.json), [verification receipts](verification.json), [session state](session-state.json), original starting Git HEAD/status and historical pre-candidate pins are preserved. The report directory retains its original 2026-10-31 identity and start time; the researcher removed the deadline. No commit/push/upload, new dependency, graph modification or final-test generation occurred. Lead wrote equations and mathematical checks; prior Haiku work wrote the fixture/adapters/tests. The attempted continuation Haiku CLI failed at the provider rate limit and supplied no code. No replacement provider or independent review is claimed.

The final working sources are copied into this package's source snapshot. The earlier asymmetric run kept hashes but no run-local source-byte snapshot, and its runner hash differs from the current reciprocal version. Do not use the final snapshot as that earlier source. The original failed results/hashes remain preserved; exact historical source recovery is not claimed.

## 5. Next decision and smallest decisive test

Review [the prospective assay/evidence correction](assay-correction-proposal.md). It requires a representation-matched feasibility instrument and persisted, independently replayable own-choice feedback before another selectable candidate. It does not change this run's gates or call its failed candidate successful. The smallest next software experiment is a jointly feasible, certified lower-overlap cell followed by one justified learning comparison; another broad rate sweep cannot resolve the current blockers.

The later graph memory test must first measure relevant resting DAN activity, map the supported visual receiver and evaluate reachable readout strength, then test acquisition→interference→reversal on the actual route with matched controls and independent audit. Its exact numerical protocol remains unapproved; this package authorizes no graph run and does not substitute for the restart eye test or memory-rule approval.

Required companion artifacts are present: [acceptance plan](acceptance-plan.md), [candidate specification](candidate-spec.md), [loop log](loop-log.md), [researcher decisions/equations](researcher-review.md), [written combination proposal with correction](combination-test-spec.md), [F03/F04 pre-data draft](pre-data-corrections.md), source records, raw test/run outputs and saved state. Combination remains a future two-relation mechanism probe, not demonstrated use of many unrelated concepts. All text here is AI-assisted advice, not a student's submission or independently established conclusion.
