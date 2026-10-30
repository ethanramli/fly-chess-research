# Evidence ledger — 2026-10-30

## E01 — Current supplied representation admits a perfect fixed training comparator

**Checked 2026-10-30; reproduced; high consequence for construct validity.** Source: `.codebase/src/chess-input/public-attack-map-cue-v2.mjs`; script [check-training-shortcut.mjs](check-training-shortcut.mjs); [output](training-shortcut-output.json).

A fixed, nonlearned rule over the actual current encoder's tokens predicts success when the action is a capture and every supplied attacker token says `none` or geometrically `pin`. The rule was selected from code semantics and not fitted to labels. All training certificates were independently rechecked through the production receiver checker before comparison. Results: 390/390 all-legal actions, including 52/52 captures; 24/24 unique all-legal board choices; 12/12 counterfactual pairs; 48/48 designated probe-action signs. No graph, learned weights or neural updates were involved; RSS 47.8 MiB, over 5.8 GiB free memory.

**What this establishes:** the current task's training consequences can be recovered exactly by a tiny fixed computation on supplied engineered input. Scratch/absent/shuffled/disabled neural controls do not test whether such a computation, or a minimal learned comparator on the same features, accounts for the claimed capability. The encoder performs chess-specific attack and pin analysis outside the neural model; this information must be counted in the claim and comparator budget.

**What it does not establish:** final or validation performance of the comparator, actual target-label leakage into the encoder, absence of neural learning, or impossibility of a useful future contribution. The pin mark is geometric and is not a universal legal-recapture oracle. No sealed rows were opened, and the comparator was not used to change any active model or experiment.

**Professor's likely question:** what computation did the learned connectome add beyond this supplied representation, and why should success be called reasoning rather than learning a small feature-to-valence mapping?

**Needed resolution:** preregister same-input fixed-rule, simple learned, memorization and appropriate circuit-null comparisons on a fresh sealed evaluation design; report learning and structural-novelty claims separately. The precise experiment remains the researcher's decision, not an automatic action authorized by this review.

## E02 — Eligibility and student contribution are separate evidence requirements

**Checked 2026-10-30; current official 2027 policy, target-year applicability unknown.** ISEF official rules distinguish permitted disclosed AI code assistance from prohibited initial AI writing of submission documents. Current 2027 Form 2A requires support and AI disclosure. Researcher targets 2028 or later; eventual-year rules, school/age status and affiliated-fair route must be checked then. Existing project venue notes already identify AI and selection-route uncertainty. This review does not determine misconduct or disqualification, and cannot assess interview mastery from repository files.

## E03 — eLife evaluates the evidence for a claim, not a pass/fail acceptance score

**Checked 2026-10-30; official current author/reviewer guides retrieved through the live peer-review page.** Working author guide: https://elife-rp.msubmit.net/html/elife-rp_author_instructions.html . Editors select submissions before peer review; reviewed articles are published with public reviews and separate significance/evidence assessments. Current guide requires reproducible methods and accessible source data/code, and makes authors accountable for disclosed AI use. The current target-paper absence is not scored as a scientific defect. Claims about a living organism require evidence outside the present computational model.

## E04 — Review scope and evidence status

The metadata inventory contains 57,567 files across selected trees, of which 3,116 have `.md`, `.mjs` or `.py` suffixes. Enumeration is not substantive review. Code/data/runs remain unchanged. The r15 `audit.json` was absent at the inspection; no terminal gate result is inferred from a process's existence or working set. The earlier seven-defect review is a source of leads and reproductions, not a substitute for this broader scientific review.

## E05 — Current data cleared; future code repairs distinguished from active pins

Read the [counts-only follow-up](../stage1-data-separation-check-2026-10-30/README.md), safe aggregate output and checker source. Its separately authorized check binds 24/16/64 boards, finds zero whole-position/symmetry overlap and verifies 12/8/32 distinct board pairs covering each board once. All inputs match r15 registration hashes according to that report. This review did not open sealed rows or independently repeat that all-split check. Same-template and near-duplicate generalization are separate unresolved questions.

New source-closure, matrix-v3 resume and data-audit-v2 files are future-run repairs; they do not mutate r15's frozen code. Four bounded test files passed 22/22 in this review: [raw output](bounded-followup-tests.txt). Their scope is synthetic/train-only data checks, local source closure and mocked resume selection. The new data-test directory is omitted by root package.json's npm test globs. The new data-audit acceptance schema needs a compatible evaluator; runtime/package metadata is not yet bound by the new builder. No graph recovery was run.

## E06 — Anatomical provenance does not prove functional irrelevance

The [provenance report](../connectome-provenance-check-2026-10-28/README.md), line 28, says five transmitter ambiguities affecting 15 optic-lobe edges have no Stage 1 effect because they are outside mushroom-body mappings. This is not a sufficient exclusion argument for a recurrent full-graph model: effects could propagate through intermediate neurons or alter baseline activity. No such effect is demonstrated here, and no graph was loaded to test it. A bounded dependency/reachability argument for the actual eight-step computation, or a matched sensitivity check, is needed before claiming no effect. This is a qualification of M17, not evidence that the whole anatomical file is invalid.
