# Memory-plasticity development report — 2026-10-31

Updated after the researcher authorized the lead-written evidence repair. [The earlier report](MORNING-REPORT-before-receipt-repair.md) is preserved. Fresh per-trial recording/replay now works; the memory result has not improved.

## 1. Outcome: failed candidates, and a diagnosed test limitation

**FAILED AT shared-conflict retention G3; the original assay also has incompatible G4/G6 requirements in two cells. No candidate is ready for the real-graph memory test.** The bounded development/report package is complete with a negative decision. FlyChess memory, chess learning and reasoning remain unsolved.

Software: the original93 focused checks and new receipt/checker/replay checks cover their declared numerical/evidence contracts; [verification receipts](verification.json) retain the original, failed-harness and corrected full-suite outcomes. Biological mechanism: hypothesis only, with unresolved pathway/timing/receptor assumptions. Actual connectome learning/transfer: **not tested by this package**. All runs use synthetic rate fixtures. No held-out fixtures, sealed chess tests, graph training or eye test were opened/run.

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
| Persistence and audit | Original snapshots/isolation pass; fresh trial recording and separate replay now verified | [V3 recording](receipt-repair-v3-dev/result.json), [audit](receipt-repair-v3-audit/result.json):14,160records/6,912trials/48trajectories, including864unknown trials. Strict checking binds schedule, own choice and scores; replay checks control signals and pre/post state. [Original historical rows](record-coverage-audit.json) still lack trial receipts. Exactly-once pending checkpoint publication remains a written future contract |

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

The fresh recorded q=.25 conflicting,w=0,bg=0 cell is now fully replayed from scratch. [All48 trajectory summaries exactly equal the original results](receipt-repair-v3-equivalence.json). Median A-margin retention remains0.611021 against0.70 required. A stays the greedy correct choice in this cell; the failure is reduced association margin, not a claim of total erasure. Some higher-overlap original conditions also lose correct rankings. Recording verifies this distinction; it provides no new memory mechanism, consolidation or biological timescale.

A separate [oracle feasibility witness](low-overlap-feasibility.json) shows compatible bounded readout states exist for this lower-overlap cell, respecting the reciprocal gain-pair sum1.2. G1/G2/G3/G4/G6 readout constraints can coexist on all12 fixtures. This construction sees future patterns/answers, delivers no feedback, exports no learned state and does not establish reachability from scratch within the original trial budget. It isolates a learning/exposure question without claiming a learned solution. The two higher-overlap impossibility findings remain unchanged.

Every failed attempt is retained: validity-v1 measurement failure; unretained pre-pin exploratory script; action/pin errors; mistaken source reading/missing reciprocal signal; both slow settings; self-limit prediction miss; stale state; positive-control capacity oversight; missing historical events; failed Haiku delegation; initial receipt prose trial-count mistake; missing registration-copy guard in first new CLI; and the test-launch/timeout/temporary-cleanup mistakes. [Chronology and limits](loop-log.md). All six repair loops are now accounted for, across two mechanism families. Loop6 repaired evidence, not the learner. Lower-overlap G3 failures and exact visual physiology remain open; the two slow settings do not refute all slow-memory theories.

## 4. Verification, identities and resources

Before receipt repair, [focused config v10](../../../python%20actions/memory-assay-v10-step.json): **93 pass, 0 fail**, 6.79 s. Required `npm test -- --test-concurrency=1`: **618 pass, 6 fail of 624**, 139.39 s, exit 1; [full raw log](../../../runs/python-actions/20261031T034601-35f60aaa/stdout.txt). Failures reference historical report/data paths moved to the archive. The corresponding archived artifacts exist; they were not copied back and no unrelated test/archive was changed. This is not a wholly green repository. Full-suite peak RSS/CPU were not measured. The later final test-only adapter comparison is covered by the focused run.

After evidence repair, [nine repair checks](../../../runs/python-actions/20261031T041804-e88cef89/completion.json) passed standalone. The first new full run was627pass/7fail of634: six old-path failures plus a child killed at the harness's90s timeout. [Probe](regression-concurrency-probe/result.json) showed the appended concurrency flag did not serialize this Node runtime. The shared npm script now places it before paths; harness limits allow the existing CLI300s guard to finish, and failed temporary fixtures are preserved. No assertion/test was skipped or memory/CLI execution gate relaxed. [Final registered npm check](../../../python%20actions/memory-assay-v14-step.json) and terminal counts are recorded in [verification.json](verification.json).

**Final npm result:**628pass,6 unchanged historical-path failures of634,0skipped;637.27s wall for the now-serial suite. All102 memory-package checks pass, including the9 new repair checks. [Terminal receipt](../../../runs/python-actions/20261031T043316-f41c8eab/completion.json), [complete raw output](../../../runs/python-actions/20261031T043316-f41c8eab/stdout.txt). Different scheduling/test counts make this unsuitable as a model-performance comparison.

The paced capacity check used 256 MiB Node heap, duty .5, RSS/free-memory assertions; **4.33 s wall, 1.80 s CPU, 57.20 MiB process high-water RSS**. These measurements describe this small math check, not graph performance. Original grids sampled peak RSS about 78.65–101.09 MiB; [inventory with exact commands/timing](run-inventory.json). No comparative speed or hard OS CPU-cap claim. Original CPU times were not recorded.

[Final artifact/source/config hashes](artifact-manifest.json), [verification receipts](verification.json), [session state](session-state.json), original starting Git HEAD/status and historical pre-candidate pins are preserved. The report directory retains its original 2026-10-31 identity and start time; the researcher removed the deadline. No commit/push/upload, new dependency, graph modification or final-test generation occurred. Lead wrote equations and mathematical checks; prior Haiku work wrote the fixture/adapters/tests. The attempted continuation Haiku CLI failed at the provider rate limit and supplied no code. No replacement provider or independent review is claimed.

The final working sources and new receipt-source snapshot are preserved separately. The asymmetric runner was later [recovered to its exact original SHA-256](historical-source-recovery/README.md), resolving that version's source-byte gap. It is a later verified reconstruction, not a contemporaneous snapshot. Earlier validity-source versions are not all recovered, and original historical receipts cannot be reconstructed. New runs have contemporaneous source/config/event files; none replaces old failed data.

V3 recording used22.54s wall/11.42s CPU/65.95MiB process high-water RSS; separate replay24.72s/13.33s/105.85MiB. Heap256MiB, duty.5 and RSS/free/wall guards were retained. V2 and V3 event/summary hashes match exactly, so they add no independent sample size. [Streaming Python comparison](../../../python%20actions/check_memory_receipt_equivalence.py) verifies the old/new48-trajectory equality.

## 5. Next decision and smallest decisive test

Review [the remaining capacity/memory experiment proposal](assay-correction-proposal.md). The own-choice recording/checker/replay portion is implemented, and a mathematical witness confirms compatible states in the lower-overlap cell. The next substantive task is to make a from-scratch learner reach useful retention/reversal states through its permitted feedback, without oracle pattern selection. It needs a newly authorized development scope beyond the used two-family/six-loop allowance and a prospectively fixed capacity-aware protocol; the present repair is not authority to exceed that cap or change old gates.

The later graph memory test must first measure relevant resting DAN activity, map the supported visual receiver and evaluate reachable readout strength, then test acquisition→interference→reversal on the actual route with matched controls and independent audit. Its exact numerical protocol remains unapproved; this package authorizes no graph run and does not substitute for the restart eye test or memory-rule approval.

Required companion artifacts are present: [acceptance plan](acceptance-plan.md), [candidate specification](candidate-spec.md), [loop log](loop-log.md), [researcher decisions/equations](researcher-review.md), [written combination proposal with correction](combination-test-spec.md), [F03/F04 pre-data draft](pre-data-corrections.md), source records, raw test/run outputs and saved state. Combination remains a future two-relation mechanism probe, not demonstrated use of many unrelated concepts. All text here is AI-assisted advice, not a student's submission or independently established conclusion.
