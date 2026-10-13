# Adaptive all-legal review: useful-choice gate failed

## Relationship to the research objective

The researcher reaffirmed on 2026-10-06 that the goal is reasoning. This experiment is a diagnostic prerequisite, not a replacement objective or a reasoning benchmark. Repairing choices on this one board would not establish transferable consequence evaluation. The intended pipeline remains bounded investigation on a separate board, independently verified feedback about consequences and errors in investigation, supported persistent adaptation, and frozen evaluation on unfamiliar and counterfactual puzzle families. Measure unaided decisions and decisions under the same investigation budget separately. Repeated exposure counts, changed gains and successful external search do not establish reasoning. Long-delay credit assignment, richer consequence feedback and broader model adaptation remain unfinished.

2026-10-06. Completed researcher-proposed experiment; **both frozen gates fail**. Earlier puzzle-neural V1 improved selected preferences but missed full-root mate. Qd7's absolute score decreased; its pre-existing advantage over Qg7# survived. This motivated coverage investigation without uniquely establishing the cause.

[Frozen specification](../../../research/data/adaptive-review-v1/protocol.json): eight review attempts, all 26 legal moves always available, current maximum fixed MBON preference independently checked, known experiences replayed with the unchanged neural interface, and a full-root sweep after every attempt. No bad move is blacklisted or removed. Continue the predetermined budget after successful choices to measure whether they survive subsequent no-pulse experience. Unknowns consume an attempt but supply no teaching event. Actual known-event counts are reported.

Start every condition from naive gains with the same existing encoder seed 13007, model, local plasticity and numerical timing. Adaptive review is compared with the previous fixed eight-experience schedule at equal attempt budget. Absent/shuffled/disabled controls instead replay the **exact adaptive candidate/proof sequence**, even when their own preference differs. This prevents exposure differences from masquerading as feedback effects. Fixed sampling is a curriculum comparison, not an exposure-matched control.

Fixed versus adaptive can differ in external pulse count because their chosen outcomes differ. Equal attempt budgets do not isolate sampling from punishment dose. Report the counts explicitly; the three sequence-matched controls, rather than the fixed schedule, isolate effects under the adaptive exposures.

Shuffle only known-event pulse flags using the existing seeded permutation; preserve counts. If every adaptive event has the same outcome, shuffling is degenerate. Report that limitation and fail the specificity gate rather than manufacture safe exposures or claim informative superiority.

Per-event checkpoints separately capture verified selection, completed neural update and full-root measurement. Resume after an update must measure it without applying it twice. Raw receipts contain before/after gains, local measurements and complete candidate scores. Record directly reviewed bad moves that remain preferred and previously reviewed failures returning to the top. These ranking patterns motivate interference/plasticity tests, not unique causal conclusions.

Resumed scientific-state comparison excludes only checkpoint publication counters and certificate elapsed milliseconds; proof trees, statuses, actual scores, gain state, event counts and input/source/model identities must match exactly. Raw timing fields are preserved.

Fixture repair requires final adaptive unaided mate success, unchanged repeat/restoration, and reset to the initial non-mating preference. Descriptive feedback specificity additionally requires nondegenerate shuffled flags and failure of all three matched controls. These gates are frozen before learning, with no statistical generalization claim from one board. A favorable reviewed subset never replaces full-root evaluation.

```powershell
node --max-old-space-size=256 .codebase/scripts/adaptive-review.mjs --out research/reports/adaptive-review-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-adaptive-review.mjs --run research/reports/adaptive-review-v1-2026-10-06 --out research/reports/adaptive-review-v1-2026-10-06/audit.json
```

Use fresh outputs; `--resume STATE_JSON --max-events N` continues an exactly pinned cursor to a new directory. Presentations cap at 1,024 per condition, legal candidates at 64, attempts at eight and conditions at five. Sparse serial execution, heap 256, 768 MiB RSS/256 MiB free-memory guards and duty pacing remain. No new neural equation, fitted decoder, worker or dependency is introduced.

This is same-position repair, not held-out transfer, new biological validation or full-model adaptation. Freeze the resulting memories before any unfamiliar-position evaluation. Existing GF/fixture failures stay preserved. Short cue/feedback replay still does not implement eligibility through long calculation. This experiment has no search in its adaptive selection loop; the prior fixed schedule came from a separate bounded search/review round.

## Completed evidence

[Raw results, exact commands and preserved interruption](../../../research/reports/adaptive-review-resumed-2026-10-06/README.md): adaptive and fixed review both finish at non-mating Qd7. Adaptive choices after eight events are Kh6, Qf1, Qd7, Kh6, Qf6, Qf1, Kh6, Qd7. Five previously reviewed failures return to the top. Absent/disabled remain at Qf6. All adaptive outcomes are adverse, making count-matched shuffle identical and uninformative. The audit checks all 90 certificate uses, 40 local transitions and exact after-update resume; 52 tests pass. Passing consistency does not override either failed gate.

At every revived preference, 7–9 permitted edges associated with directly stimulated old-action cells outside the current cue recover; mean gain increases range 0.06721–0.13038. This fits a prediction of the existing recovery term but does not isolate it from shared representation or recurrent effects. The reversal assay rewards recovering an old action when contingencies change; this fixture instead requires retaining avoidance of several simultaneously bad actions. That mismatch is a concrete hypothesis for a controlled follow-up, not an established diagnosis or replacement rule. Compare representation and recovery separately before claiming a biological repair.

The existing resource guard interrupted the final control; resumed from its saved post-update/pre-measurement cursor without relaxing limits. Resumed invocation: 120.31 MiB peak RSS, 91.005 elapsed seconds, 45.359 CPU seconds. Initial invocation final metrics were not published; full-run peak/elapsed/CPU are unavailable. Do not use resumed metrics as the whole experiment's measurements.
